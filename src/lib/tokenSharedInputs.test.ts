import { beforeEach, describe, expect, it } from "vitest"
import { getTokenKey, migrateTokenSharedInputs, TOKEN_SHARED_KEYS } from "./tokenSharedInputs"

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

  it("migrates shared juno token output from legacy keys", () => {
    localStorage.setItem("token.junoOutputLevel", "555")

    migrateTokenSharedInputs()

    expect(localStorage.getItem(getTokenKey("output.juno"))).toBe("555")
  })

  it("migrates map-based legacy levels into flat per-upgrade keys", () => {
    localStorage.setItem("token.outputLevelsByResource", '{"cash":"101","juno":"11"}')
    localStorage.setItem(
      "token.upgradeLevels",
      '{"supplies.alpha":"8","special.suppliesToken":"2","special.bbbotDuration":"30"}',
    )

    migrateTokenSharedInputs()

    expect(localStorage.getItem(getTokenKey("output.cash"))).toBe("101")
    expect(localStorage.getItem(getTokenKey("output.juno"))).toBe("11")
    expect(localStorage.getItem(getTokenKey("supplies.alpha"))).toBe("8")
    expect(localStorage.getItem(getTokenKey("supplies.tokenBonus"))).toBe("2")
    expect(localStorage.getItem(getTokenKey("bbbot.duration"))).toBe("30")
  })

  it("does not overwrite an existing canonical flat key", () => {
    localStorage.setItem(getTokenKey("output.juno"), "999")
    localStorage.setItem("token.junoOutputLevel", "1")
    localStorage.setItem("zat.og.junoOutput", "2")

    migrateTokenSharedInputs()

    expect(localStorage.getItem(getTokenKey("output.juno"))).toBe("999")
  })
})
