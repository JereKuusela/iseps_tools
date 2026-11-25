import { createSignal, getOwner, onCleanup, type Signal } from "solid-js"
import { handleStorageChange } from "./cloudSync"
import { readFromStorage, writeToStorage } from "./storage"

type StoredEntry = {
  signal: Signal<any>
  reload: () => void
  refs: number
}

// One live signal per key so every component using the same key stays in sync.
const entries = new Map<string, StoredEntry>()

export const updateSignal = (key: string, value: unknown) => {
  const entry = entries.get(key)
  if (entry) entry.signal[1](() => value)
  else writeToStorage(key, value)
}

// Writes the raw stored string and re-parses it into the live signal using its original type.
export const applyRawValue = (key: string, rawValue: string) => {
  localStorage.setItem(key, rawValue)
  entries.get(key)?.reload()
}

const createStoredSignal = <T>(key: string, initialValue: T, onWrite?: (key: string) => void): Signal<T> => {
  let entry = entries.get(key)

  if (!entry) {
    const [value, setValue] = createSignal(readFromStorage(key, initialValue))

    const setStoredValue = ((...args: unknown[]) => {
      const resolvedValue = (setValue as (...setterArgs: unknown[]) => T)(...args)
      writeToStorage(key, resolvedValue)
      onWrite?.(key)
      return resolvedValue
    }) as typeof setValue

    entry = {
      signal: [value, setStoredValue],
      reload: () => {
        const next = readFromStorage(key, initialValue)
        setValue(() => next)
      },
      refs: 0,
    }
    entries.set(key, entry)
  }

  const current = entry
  if (getOwner()) {
    current.refs += 1
    onCleanup(() => {
      current.refs -= 1
      if (current.refs <= 0 && entries.get(key) === current) entries.delete(key)
    })
  }

  return current.signal as Signal<T>
}

export const createSyncedSignal = <T>(key: string, initialValue: T): Signal<T> =>
  createStoredSignal(key, initialValue, handleStorageChange)

export const createPersistedSignal = <T>(key: string, initialValue: T): Signal<T> =>
  createStoredSignal(key, initialValue)
