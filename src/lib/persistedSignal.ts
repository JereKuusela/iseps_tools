import { createSignal, onCleanup, type Signal } from "solid-js"

export const STORAGE_UPDATED_EVENT = "iseps:storage-updated"

export type StorageUpdatedDetail = {
  key: string
  rawValue: string | null
}

const readStoredValue = <T>(key: string, fallbackValue: T) => {
  if (!("localStorage" in globalThis)) return fallbackValue

  try {
    const rawValue = globalThis.localStorage.getItem(key)
    if (rawValue == null) return fallbackValue
    return JSON.parse(rawValue) as T
  } catch {
    return fallbackValue
  }
}

const parseStoredValue = <T>(rawValue: string | null, fallbackValue: T) => {
  if (rawValue == null) return fallbackValue

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return fallbackValue
  }
}

export const emitStorageUpdated = (key: string, rawValue: string | null) => {
  if (!("window" in globalThis)) return

  window.dispatchEvent(
    new CustomEvent<StorageUpdatedDetail>(STORAGE_UPDATED_EVENT, {
      detail: { key, rawValue },
    }),
  )
}

export const writeStoredRawValue = (key: string, rawValue: string | null) => {
  if (!("localStorage" in globalThis)) return

  try {
    if (rawValue == null) {
      globalThis.localStorage.removeItem(key)
      emitStorageUpdated(key, null)
      return
    }

    globalThis.localStorage.setItem(key, rawValue)
    emitStorageUpdated(key, rawValue)
  } catch {
    // Ignore storage failures so signal updates continue to work.
  }
}

const writeStoredValue = <T>(key: string, value: T) => {
  writeStoredRawValue(key, JSON.stringify(value))
}

export const createPersistedSignal = <T>(key: string, initialValue: T): Signal<T> => {
  const [value, setValue] = createSignal(readStoredValue(key, initialValue))

  const applyRawValue = (rawValue: string | null) => {
    ;(setValue as (next: T) => T)(parseStoredValue(rawValue, initialValue))
  }

  if ("window" in globalThis) {
    const handleStorageUpdated = (event: Event) => {
      const detail = (event as CustomEvent<StorageUpdatedDetail>).detail
      if (!detail || detail.key !== key) return
      applyRawValue(detail.rawValue)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return
      applyRawValue(event.newValue)
    }

    window.addEventListener(STORAGE_UPDATED_EVENT, handleStorageUpdated)
    window.addEventListener("storage", handleStorage)

    onCleanup(() => {
      window.removeEventListener(STORAGE_UPDATED_EVENT, handleStorageUpdated)
      window.removeEventListener("storage", handleStorage)
    })
  }

  const setPersistedValue = ((...args: unknown[]) => {
    const resolvedValue = (setValue as (...setterArgs: unknown[]) => T)(...args)
    writeStoredValue(key, resolvedValue)
    return resolvedValue
  }) as typeof setValue

  return [value, setPersistedValue]
}
