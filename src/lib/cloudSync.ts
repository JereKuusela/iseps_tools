import { getApps, initializeApp } from "firebase/app"
import { get, getDatabase, ref, set, type Database } from "firebase/database"
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"
import { firebaseSyncConfig } from "./firebaseConfig"
import { STORAGE_UPDATED_EVENT, writeStoredRawValue, type StorageUpdatedDetail } from "./persistedSignal"

export const SYNC_HASH_KEY = "sync.hash"
export const SYNC_TIMESTAMP_KEY = "sync.timestamp"

const PUSH_DEBOUNCE_MS = 5_000
const PULL_DEBOUNCE_MS = 1_500
const REMOTE_SYNC_VERSION = 1
const HASH_LENGTH = 16
const SYNC_KEY_PREFIXES = ["sc.", "zat.", "premium.", "ui.", "penrose.", "info-card:", "sync."]

type SyncRecord = {
  version: number
  timestamp: number
  payload: string
}

let pushTimer: ReturnType<typeof setTimeout> | undefined
let pullTimer: ReturnType<typeof setTimeout> | undefined
let hasInitialized = false
let applyingRemote = false

const hasLocalStorage = () => "localStorage" in globalThis

const readJsonStoredValue = (key: string): unknown => {
  if (!hasLocalStorage()) return undefined

  const rawValue = globalThis.localStorage.getItem(key)
  if (rawValue == null) return undefined

  try {
    return JSON.parse(rawValue)
  } catch {
    return undefined
  }
}

const readStoredHash = () => {
  const parsed = readJsonStoredValue(SYNC_HASH_KEY)
  return typeof parsed === "string" ? parsed.trim() : ""
}

const randomHashChunk = () => {
  const randomBytes = new Uint8Array(HASH_LENGTH)
  globalThis.crypto.getRandomValues(randomBytes)
  return Array.from(randomBytes, (value) => (value % 36).toString(36)).join("")
}

export const createRandomSyncHash = () => {
  if (!("crypto" in globalThis) || !("getRandomValues" in globalThis.crypto)) {
    return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, HASH_LENGTH)
  }

  return randomHashChunk()
}

export const getOrCreateSyncHash = () => {
  const existingHash = readStoredHash()
  if (existingHash) return existingHash

  const generatedHash = createRandomSyncHash()
  writeStoredRawValue(SYNC_HASH_KEY, JSON.stringify(generatedHash))
  return generatedHash
}

const shouldSyncKey = (key: string) => {
  if (key === SYNC_HASH_KEY) return false
  if (key === SYNC_TIMESTAMP_KEY) return false
  return SYNC_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
}

const getSyncPath = () => firebaseSyncConfig.syncPath.replace(/^\/+|\/+$/g, "")

const getSyncDatabase = (): Database | null => {
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

  return getDatabase(app)
}

const getLocalTimestamp = () => {
  const parsed = readJsonStoredValue(SYNC_TIMESTAMP_KEY)
  if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed
  if (typeof parsed === "string") {
    const next = Number(parsed)
    return Number.isFinite(next) ? next : 0
  }
  return 0
}

const setLocalTimestamp = (timestamp: number) => {
  writeStoredRawValue(SYNC_TIMESTAMP_KEY, JSON.stringify(timestamp))
}

const collectSyncData = () => {
  const data: Record<string, string> = {}
  if (!hasLocalStorage()) return data

  for (let index = 0; index < globalThis.localStorage.length; index += 1) {
    const key = globalThis.localStorage.key(index)
    if (!key || !shouldSyncKey(key)) continue

    const rawValue = globalThis.localStorage.getItem(key)
    if (rawValue == null) continue
    data[key] = rawValue
  }

  return data
}

const applyRemoteData = (data: Record<string, string>) => {
  applyingRemote = true

  try {
    for (const [key, rawValue] of Object.entries(data)) {
      if (key === SYNC_HASH_KEY || !shouldSyncKey(key)) continue
      writeStoredRawValue(key, rawValue)
    }
  } finally {
    applyingRemote = false
  }
}

const uploadNow = async () => {
  if (!hasLocalStorage() || applyingRemote) return

  const database = getSyncDatabase()
  if (!database) return

  const hash = getOrCreateSyncHash()
  if (!hash) return

  const timestamp = Date.now()
  setLocalTimestamp(timestamp)

  const data = collectSyncData()
  const payload = compressToEncodedURIComponent(JSON.stringify(data))
  const path = `${getSyncPath()}/${hash}`

  await set(ref(database, path), {
    version: REMOTE_SYNC_VERSION,
    timestamp,
    payload,
  } satisfies SyncRecord)
}

const getRemoteTimestamp = (record: Partial<SyncRecord>) => {
  if (typeof record.timestamp === "number" && Number.isFinite(record.timestamp)) return record.timestamp
  if (typeof record.timestamp === "string") {
    const parsed = Number(record.timestamp)
    if (Number.isFinite(parsed)) return parsed
  }

  return 0
}

const pullNow = async () => {
  if (!hasLocalStorage()) return

  const database = getSyncDatabase()
  if (!database) return

  const hash = getOrCreateSyncHash()
  const path = `${getSyncPath()}/${hash}`
  const snapshot = await get(ref(database, path))
  if (!snapshot.exists()) return

  const record = snapshot.val() as Partial<SyncRecord>
  if (!record || typeof record.payload !== "string") return

  const decodedPayload = decompressFromEncodedURIComponent(record.payload)
  if (!decodedPayload) return

  let remoteData: Record<string, string>
  try {
    remoteData = JSON.parse(decodedPayload) as Record<string, string>
  } catch {
    return
  }

  const localTimestamp = getLocalTimestamp()
  const remoteTimestamp = getRemoteTimestamp(record)

  if (remoteTimestamp <= localTimestamp) return
  applyRemoteData(remoteData)
}

const schedulePush = () => {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void uploadNow().catch(() => {
      // Ignore sync failures to keep local UX unaffected.
    })
  }, PUSH_DEBOUNCE_MS)
}

const schedulePull = () => {
  if (pullTimer) clearTimeout(pullTimer)
  pullTimer = setTimeout(() => {
    void pullNow().catch(() => {
      // Ignore sync failures to keep local UX unaffected.
    })
  }, PULL_DEBOUNCE_MS)
}

const handleStorageChange = (key: string | null) => {
  if (!key || applyingRemote) return

  if (key === SYNC_HASH_KEY) {
    schedulePull()
    return
  }

  if (key === SYNC_TIMESTAMP_KEY) return
  if (shouldSyncKey(key)) schedulePush()
}

export const initCloudSync = () => {
  if (hasInitialized || !("window" in globalThis) || !hasLocalStorage()) return
  hasInitialized = true

  getOrCreateSyncHash()

  window.addEventListener(STORAGE_UPDATED_EVENT, (event) => {
    const detail = (event as CustomEvent<StorageUpdatedDetail>).detail
    if (!detail) return
    handleStorageChange(detail.key)
  })

  window.addEventListener("storage", (event) => {
    handleStorageChange(event.key)
  })

  schedulePull()
}
