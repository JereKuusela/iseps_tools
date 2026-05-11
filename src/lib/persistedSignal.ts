import { createSignal, onCleanup, Setter, type Signal } from "solid-js"
import { handleStorageChange } from "./cloudSync"
import { readFromStorage, writeToStorage } from "./storage"

export const updateSignal = (key: string, value: unknown) => {
  if (signals[key]) signals[key](value)
  else writeToStorage(key, value)
}

const signals: Record<string, Setter<any>> = {}

export const createSyncedSignal = <T>(key: string, initialValue: T): Signal<T> => {
  const [value, setValue] = createSignal(readFromStorage(key, initialValue))

  const setSyncedValue = ((...args: unknown[]) => {
    const resolvedValue = (setValue as (...setterArgs: unknown[]) => T)(...args)
    writeToStorage(key, resolvedValue)
    handleStorageChange(key)
    return resolvedValue
  }) as typeof setValue

  signals[key] = setSyncedValue

  onCleanup(() => {
    delete signals[key]
  })

  return [value, setSyncedValue]
}

export const createPersistedSignal = <T>(key: string, initialValue: T): Signal<T> => {
  const [value, setValue] = createSignal(readFromStorage(key, initialValue))

  const setPersistedValue = ((...args: unknown[]) => {
    const resolvedValue = (setValue as (...setterArgs: unknown[]) => T)(...args)
    writeToStorage(key, resolvedValue)
    return resolvedValue
  }) as typeof setValue

  signals[key] = setPersistedValue

  onCleanup(() => {
    delete signals[key]
  })

  return [value, setPersistedValue]
}
