import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"
import { batch, createSignal, untrack } from "solid-js"
import { firebaseSyncConfig } from "./firebaseConfig"
import { readFromStorage, writeToStorage } from "./storage"
import { applyRawValue, updateSignal } from "./persistedSignal"

export const SYNC_HASH_KEY = "sync.hash"
export const SYNC_ENABLED_KEY = "sync.enabled"
export const SYNC_TIMESTAMP_KEY = "sync.timestamp"

const PUSH_DEBOUNCE_MS = 5_000
const RESUME_PULL_MIN_GAP_MS = 60_000
const REMOTE_SYNC_VERSION = 1
const HASH_LENGTH = 16
const excludedSyncKeys = new Set([SYNC_HASH_KEY, SYNC_TIMESTAMP_KEY, SYNC_ENABLED_KEY])

type SyncRecord = {
  version: number
  timestamp: number
  payload: string
}

let pushTimer: ReturnType<typeof setTimeout> | undefined
let applyingRemote = false
let lastPullAt = 0

const [syncEnabled, setSyncEnabledSignal] = createSignal(false)
export { syncEnabled }

export const setSyncEnabled = (enabled: boolean) => {
  writeToStorage(SYNC_ENABLED_KEY, enabled)
  setSyncEnabledSignal(enabled)
}

const refreshSyncEnabled = () => {
  try {
    setSyncEnabledSignal(readFromStorage(SYNC_ENABLED_KEY, false))
  } catch (error) {
    console.error("Error reading cloud sync setting:", error)
  }
}

export const createRandomSyncHash = () => {
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, HASH_LENGTH)
}

const shouldSyncKey = (key: string) => !excludedSyncKeys.has(key)

const getSyncPath = () => firebaseSyncConfig.syncPath.replace(/^\/+|\/+$/g, "")

// Firebase is loaded on demand so visitors without sync don't download it.
let syncDbPromise: ReturnType<typeof loadSyncDatabase> | undefined

const loadSyncDatabase = async () => {
  const [{ getApps, initializeApp }, { get, getDatabase, ref, set }] = await Promise.all([
    import("firebase/app"),
    import("firebase/database"),
  ])
  const app =
    getApps()[0] ??
    initializeApp({
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
  return {
    read: (path: string) => get(ref(db, path)),
    write: (path: string, value: unknown) => set(ref(db, path), value),
  }
}

const getSyncDatabase = () => {
  syncDbPromise ??= loadSyncDatabase().catch((error) => {
    syncDbPromise = undefined
    throw error
  })
  return syncDbPromise
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
    batch(() => {
      for (const [key, rawValue] of Object.entries(data)) {
        if (!shouldSyncKey(key)) continue
        if (typeof rawValue === "string") applyRawValue(key, rawValue)
      }
    })
  } finally {
    applyingRemote = false
  }
}

const pushData = async () => {
  try {
    cancelPush()
    if (applyingRemote) return

    const database = await getSyncDatabase()

    const hash = readFromStorage(SYNC_HASH_KEY, "")
    if (!hash) return

    const timestamp = Date.now()
    const data = collectSyncData()
    const payload = compressToEncodedURIComponent(JSON.stringify(data))
    const path = `${getSyncPath()}/${hash}`
    await database.write(path, {
      version: REMOTE_SYNC_VERSION,
      timestamp,
      payload,
    } satisfies SyncRecord)
    updateSignal(SYNC_TIMESTAMP_KEY, timestamp)
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
    if (!untrack(syncEnabled)) return
    const hash = readFromStorage(SYNC_HASH_KEY, "")
    if (!hash) return

    lastPullAt = Date.now()
    const database = await getSyncDatabase()
    const path = `${getSyncPath()}/${hash}`
    const snapshot = await database.read(path)
    if (!snapshot.exists()) return

    const record = snapshot.val() as Partial<SyncRecord>
    if (!record || typeof record.payload !== "string") return
    // Data written by a newer app build may not be understood by this one.
    if (typeof record.version === "number" && record.version > REMOTE_SYNC_VERSION) return

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
  if (applyingRemote || !shouldSyncKey(key) || !untrack(syncEnabled)) return
  schedulePush()
}

export const initCloudSync = () => {
  refreshSyncEnabled()
  window.addEventListener("storage", (event) => {
    if (event.key === SYNC_ENABLED_KEY || event.key === null) refreshSyncEnabled()
  })
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") pushImmediately()
    else if (Date.now() - lastPullAt >= RESUME_PULL_MIN_GAP_MS) pullData()
  })
  window.addEventListener("beforeunload", pushImmediately)

  pullData()
}
