import { createSignal, type Signal } from "solid-js";

function readStoredValue<T>(key: string, fallbackValue: T): T {
  if (!("localStorage" in globalThis)) return fallbackValue;

  try {
    const rawValue = globalThis.localStorage.getItem(key);
    if (rawValue == null) return fallbackValue;
    return JSON.parse(rawValue) as T;
  } catch {
    return fallbackValue;
  }
}

function writeStoredValue<T>(key: string, value: T): void {
  if (!("localStorage" in globalThis)) return;

  try {
    globalThis.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures so signal updates continue to work.
  }
}

export function createPersistedSignal<T>(
  key: string,
  initialValue: T,
): Signal<T> {
  const [value, setValue] = createSignal(readStoredValue(key, initialValue));

  const setPersistedValue = ((...args: unknown[]) => {
    const resolvedValue = (setValue as (...setterArgs: unknown[]) => T)(
      ...args,
    );
    writeStoredValue(key, resolvedValue);
    return resolvedValue;
  }) as typeof setValue;

  return [value, setPersistedValue];
}
