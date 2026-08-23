import { beforeEach, describe, expect, it } from "vitest"
import { migrateTokenSharedInputs, TOKEN_SHARED_KEYS } from "./tokenSharedInputs"

const createMockLocalStorage = () => {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

describe("migrateTokenSharedInputs", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMockLocalStorage(),
      configurable: true,
      writable: true,
    })

    localStorage.clear()
  })

  it("prefers sc hours over premium hours", () => {
    localStorage.setItem("sc.onlineHoursPerDay", "12")
    localStorage.setItem("premium.averageHoursPerDay", "9")

    migrateTokenSharedInputs()

    expect(localStorage.getItem(TOKEN_SHARED_KEYS.onlineHoursPerDay)).toBe("12")
  })

  it("migrates alpha supplies and juno output from legacy keys", () => {
    localStorage.setItem("sc.alphaSuppliesLevel", "3")
    localStorage.setItem("zat.og.junoOutput", "555")

    migrateTokenSharedInputs()

    expect(localStorage.getItem(TOKEN_SHARED_KEYS.alphaSuppliesLevel)).toBe("3")
    expect(localStorage.getItem(TOKEN_SHARED_KEYS.junoOutputLevel)).toBe("555")
  })
})
