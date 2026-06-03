import { getApps, initializeApp } from "firebase/app"
import { get, getDatabase, ref, set } from "firebase/database"
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"
import { firebaseSyncConfig } from "./firebaseConfig"
import { readFromStorage, writeToStorage } from "./storage"
import { updateSignal } from "./persistedSignal"

export const SYNC_HASH_KEY = "sync.hash"
export const SYNC_ENABLED_KEY = "sync.enabled"
export const SYNC_TIMESTAMP_KEY = "sync.timestamp"

const PUSH_DEBOUNCE_MS = 5_000
const REMOTE_SYNC_VERSION = 1
const HASH_LENGTH = 16

type SyncRecord = {
  version: number
  timestamp: number
  payload: string
}

let pushTimer: ReturnType<typeof setTimeout> | undefined
let applyingRemote = false

export const createRandomSyncHash = () => {
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, HASH_LENGTH)
}

const shouldSyncKey = (key: string) => {
  // Exclude sync-related metadata keys from being synced themselves
  if (key === SYNC_HASH_KEY) return false
  if (key === SYNC_TIMESTAMP_KEY) return false
  if (key === SYNC_ENABLED_KEY) return false
  // Sync everything else by default
  return true
}

const getSyncPath = () => firebaseSyncConfig.syncPath.replace(/^\/+|\/+$/g, "")

const getSyncDatabase = () => {
  const app = getApps()[0]
    ? getApps()[0]
    : initializeApp({
        apiKey: firebaseSyncConfig.apiKey,
        authDomain: firebaseSyncConfig.authDomain,
        databaseURL: firebaseSyncConfig.databaseURL,
        projectId: firebaseSyncConfig.projectId,
        storageBucket: firebaseSyncConfig.storageBucket,
        messagingSenderId: firebaseSyncConfig.messagingSenderId,
        appId: firebaseSyncConfig.appId,
      })

  const db = getDatabase(app)
  if (!db) throw new Error("Failed to initialize sync database")
  return db
}

const collectSyncData = () => {
  const data: Record<string, string> = {}

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !shouldSyncKey(key)) continue

    const rawValue = localStorage.getItem(key)
    if (rawValue == null) continue
    data[key] = rawValue
  }

  return data
}

const applyRemoteData = (data: Record<string, string>) => {
  applyingRemote = true

  try {
    for (const [key, rawValue] of Object.entries(data)) {
      if (!shouldSyncKey(key)) continue
      updateSignal(key, rawValue)
    }
  } finally {
    applyingRemote = false
  }
}

const pushData = async () => {
  try {
    cancelPush()
    if (applyingRemote) return

    const database = getSyncDatabase()

    const hash = readFromStorage(SYNC_HASH_KEY, "")
    if (!hash) return

    const timestamp = Date.now()
    updateSignal(SYNC_TIMESTAMP_KEY, timestamp)

    const data = collectSyncData()
    const payload = compressToEncodedURIComponent(JSON.stringify(data))
    const path = `${getSyncPath()}/${hash}`
    await set(ref(database, path), {
      version: REMOTE_SYNC_VERSION,
      timestamp,
      payload,
    } satisfies SyncRecord)
  } catch (error) {
    console.error("Error during pushData:", error)
  }
}

const getRemoteTimestamp = (record: Partial<SyncRecord>) => {
  if (typeof record.timestamp === "number" && Number.isFinite(record.timestamp)) return record.timestamp
  if (typeof record.timestamp === "string") {
    const parsed = Number(record.timestamp)
    if (Number.isFinite(parsed)) return parsed
  }

  return 0
}

export const pullData = async () => {
  try {
    const database = getSyncDatabase()

    const hash = readFromStorage(SYNC_HASH_KEY, "")
    if (!hash) return
    const path = `${getSyncPath()}/${hash}`
    const snapshot = await get(ref(database, path))
    if (!snapshot.exists()) return

    const record = snapshot.val() as Partial<SyncRecord>
    if (!record || typeof record.payload !== "string") return

    const decodedPayload = decompressFromEncodedURIComponent(record.payload)
    if (!decodedPayload) return

    const remoteData = JSON.parse(decodedPayload) as Record<string, string>

    const localTimestamp = readFromStorage(SYNC_TIMESTAMP_KEY, 0)
    const remoteTimestamp = getRemoteTimestamp(record)

    if (remoteTimestamp <= localTimestamp) return
    applyRemoteData(remoteData)
    updateSignal(SYNC_TIMESTAMP_KEY, remoteTimestamp)
  } catch (error) {
    console.error("Error during pullData:", error)
  }
}

const schedulePush = () => {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(pushData, PUSH_DEBOUNCE_MS)
}

export const cancelPush = () => {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = undefined
  }
}

const pushImmediately = () => {
  if (!pushTimer) return
  pushData()
}

export const handleStorageChange = (key: string) => {
  if (applyingRemote) return
  if (!readFromStorage(SYNC_ENABLED_KEY, false)) return
  if (!shouldSyncKey(key)) return
  schedulePush()
}

export const initCloudSync = () => {
  window.addEventListener("visibilitychange", (e) => {
    if (document.visibilityState === "visible") pullData()
    else pushImmediately()
  })
  window.addEventListener("beforeunload", pushImmediately)

  pullData()
}
