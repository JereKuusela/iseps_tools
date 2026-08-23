export const STORAGE_WRITE_EVENT = "app:storage-write"

export const readFromStorage = <T>(key: string, fallbackValue: T) => {
  const rawValue = localStorage.getItem(key)
  if (rawValue == null) return fallbackValue
  if (typeof fallbackValue === "string") return clearQuotes(rawValue) as unknown as T
  if (typeof fallbackValue === "number") {
    const parsed = Number(rawValue)
    return (Number.isFinite(parsed) ? parsed : fallbackValue) as unknown as T
  }
  if (typeof fallbackValue === "boolean") {
    if (rawValue === "true") return true as unknown as T
    if (rawValue === "false") return false as unknown as T
    return fallbackValue
  }
  return JSON.parse(rawValue) as T
}

const clearQuotes = (str: string) => str.replace(/^"(.*)"$/, "$1")

export const writeToStorage = (key: string, value: unknown) => {
  if (typeof value == "string") localStorage.setItem(key, value)
  else if (typeof value == "number" || typeof value == "boolean") localStorage.setItem(key, value.toString())
  else localStorage.setItem(key, JSON.stringify(value))

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(STORAGE_WRITE_EVENT, { detail: { key } }))
  }
}
