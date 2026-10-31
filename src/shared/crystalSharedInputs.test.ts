import { beforeEach, describe, expect, it } from "vitest"
import { getCrystalKey, migrateCrystalSharedInputs } from "./crystalSharedInputs"

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

describe("migrateCrystalSharedInputs", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMockLocalStorage(),
      configurable: true,
      writable: true,
    })
  })

  it("moves level values to crystal keys", () => {
    localStorage.setItem("zat.og.junoOutput", "120")
    localStorage.setItem("premium.tokenBooster", "40")

    migrateCrystalSharedInputs()

    expect(localStorage.getItem(getCrystalKey("output.juno"))).toBe("120")
    expect(localStorage.getItem(getCrystalKey("special.tokenBooster"))).toBe("40")
  })

  it("converts legacy boolean flags to 0/1 levels", () => {
    localStorage.setItem("zat.og.bundle.juno", "true")
    localStorage.setItem("zat.og.bundle.ixion", "false")
    localStorage.setItem("zat.og.meltdown", "true")

    migrateCrystalSharedInputs()

    expect(localStorage.getItem(getCrystalKey("bundle.juno"))).toBe("1")
    expect(localStorage.getItem(getCrystalKey("bundle.ixionJuno"))).toBe("0")
    expect(localStorage.getItem(getCrystalKey("bundle.meltdown"))).toBe("1")
    expect(localStorage.getItem(getCrystalKey("bundle.junoKappa"))).toBeNull()
  })

  it("does not overwrite an existing crystal key", () => {
    localStorage.setItem(getCrystalKey("output.juno"), "300")
    localStorage.setItem("zat.og.junoOutput", "1")

    migrateCrystalSharedInputs()

    expect(localStorage.getItem(getCrystalKey("output.juno"))).toBe("300")
  })
})
