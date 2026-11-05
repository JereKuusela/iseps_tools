import { describe, expect, it } from "vitest"
import {
  calculateFactoryProductionFillEmptyManufacturers,
  calculateFactoryProductionOptimalManufacturers,
  calculateFactoryProduction,
  getAdditiveBaseSell,
  getEffectiveSellPrice,
  normalizePricingInput,
  normalizeQualityControlLevel,
} from "./factoryProductionCalculator"
import { FACTORY_PRODUCTION_ITEM_BY_ID, FACTORY_PRODUCTION_NONE_PRODUCT_ID } from "./factoryProductionTypes"

describe("factoryProduction pricing", () => {
  it("clamps quality control level to 0..20", () => {
    expect(normalizeQualityControlLevel(-5)).toBe(0)
    expect(normalizeQualityControlLevel(7.9)).toBe(7)
    expect(normalizeQualityControlLevel(200)).toBe(20)
  })

  it("applies additive base sell from shifts + quality control", () => {
    expect(getAdditiveBaseSell(false, 0)).toBe(0)
    expect(getAdditiveBaseSell(true, 3)).toBe(31)
  })

  it.each([
    ["battery", 1],
    ["bucket", 1.5],
    ["shocklate_bar", 2],
    ["metal_pipe", 2.5],
    ["smart_toilet", 3],
  ] as const)("derives %s rarity multiplier from ingredient types alongside other bonuses", (productId, multiplier) => {
    const item = FACTORY_PRODUCTION_ITEM_BY_ID[productId]
    const pricing = normalizePricingInput({
      twentyFourHourShifts: true,
      qualityControlLevel: 2,
      globalSellMultiplier: 3,
      categoryMultipliers: {
        household: 1,
        electronics: 1.5,
        industrial: 1,
        consumables: 1,
      },
    })

    expect(item.ingredientCount).toBe(multiplier * 2 - 1)
    expect(getEffectiveSellPrice(item, pricing)).toBe(
      (item.baseSellPrice + 21) * 3 * pricing.categoryMultipliers[item.category] * multiplier,
    )
  })
})

describe("factoryProduction aggregation", () => {
  it("derives manufacturer throughput from supplied resources", () => {
    const result = calculateFactoryProduction({
      pricing: {
        twentyFourHourShifts: false,
        qualityControlLevel: 0,
        globalSellMultiplier: 1,
        categoryMultipliers: {
          household: 1,
          electronics: 1,
          industrial: 1,
          consumables: 1,
        },
      },
      resourceOutputs: {
        orange: 10,
        blue: 6,
        green: 0,
        purple: 0,
        gray: 0,
      },
      manufacturers: [
        { id: "1", productId: "rubber_duck" },
        { id: "2", productId: "battery" },
      ],
    })

    expect(result.totalOutputPerSecond).toBeCloseTo(6)
    expect(result.totalProfitPerSecond).toBeCloseTo(14)
    expect(result.resourceBalances.orange.requiredPerHour).toBeCloseTo(36000)
    expect(result.resourceBalances.blue.requiredPerHour).toBeCloseTo(21600)
    expect(result.resourceBalances.orange.wastedPercent).toBeCloseTo(0)
    expect(result.resourceBalances.blue.wastedPercent).toBeCloseTo(0)
  })

  it("marks resource enabled when output is greater than zero", () => {
    const result = calculateFactoryProduction({
      pricing: {
        twentyFourHourShifts: false,
        qualityControlLevel: 0,
        globalSellMultiplier: 1,
        categoryMultipliers: {
          household: 1,
          electronics: 1,
          industrial: 1,
          consumables: 1,
        },
      },
      resourceOutputs: {
        orange: 0,
        blue: 0,
        green: 0,
        purple: 1,
        gray: 0,
      },
      manufacturers: [{ id: "1", productId: "instant_noodles" }],
    })

    expect(result.resourceBalances.purple.enabled).toBe(true)
    expect(result.resourceBalances.orange.enabled).toBe(false)
  })

  it("evenly splits shared resources between manufacturers", () => {
    const result = calculateFactoryProduction({
      pricing: {
        twentyFourHourShifts: false,
        qualityControlLevel: 0,
        globalSellMultiplier: 1,
        categoryMultipliers: {
          household: 1,
          electronics: 1,
          industrial: 1,
          consumables: 1,
        },
      },
      resourceOutputs: {
        orange: 10,
        blue: 0,
        green: 0,
        purple: 0,
        gray: 0,
      },
      manufacturers: [
        { id: "1", productId: "rubber_duck" },
        { id: "2", productId: "rubber_duck" },
      ],
    })

    expect(result.manufacturers[0]?.outputPerSecond).toBeCloseTo(2)
    expect(result.manufacturers[1]?.outputPerSecond).toBeCloseTo(2)
    expect(result.resourceBalances.orange.requiredPerHour).toBeCloseTo(36000)
  })

  it("allows none product without consuming resources", () => {
    const pricing = {
      twentyFourHourShifts: false,
      qualityControlLevel: 0,
      globalSellMultiplier: 1,
      categoryMultipliers: {
        household: 1,
        electronics: 1,
        industrial: 1,
        consumables: 1,
      },
    }

    const resourceOutputs = {
      orange: 10,
      blue: 5,
      green: 0,
      purple: 0,
      gray: 0,
    }

    const result = calculateFactoryProduction({
      pricing,
      resourceOutputs,
      manufacturers: [
        { id: "1", productId: "none" },
        { id: "2", productId: "battery" },
      ],
    })

    const batteryOnly = calculateFactoryProduction({
      pricing: {
        ...pricing,
      },
      resourceOutputs,
      manufacturers: [{ id: "2", productId: "battery" }],
    })

    expect(result.manufacturers).toHaveLength(1)
    expect(result.manufacturers[0]?.id).toBe("2")
    expect(result.totalOutputPerSecond).toBeCloseTo(batteryOnly.totalOutputPerSecond)
    expect(result.totalProfitPerSecond).toBeCloseTo(batteryOnly.totalProfitPerSecond)
    for (const resource of ["orange", "blue", "green", "purple", "gray"] as const) {
      expect(result.resourceBalances[resource].requiredPerHour).toBeCloseTo(
        batteryOnly.resourceBalances[resource].requiredPerHour,
      )
    }
  })
})

describe("factoryProduction optimizer", () => {
  const basePricing = {
    twentyFourHourShifts: false,
    qualityControlLevel: 0,
    globalSellMultiplier: 1,
    categoryMultipliers: {
      household: 1,
      electronics: 1,
      industrial: 1,
      consumables: 1,
    },
  }

  it("finds a profitable full assignment for manufacturer count", () => {
    const optimized = calculateFactoryProductionOptimalManufacturers({
      pricing: basePricing,
      resourceOutputs: {
        orange: 10,
        blue: 6,
        green: 0,
        purple: 0,
        gray: 0,
      },
      manufacturerCount: 2,
    })

    expect(optimized.manufacturers).toHaveLength(2)
    expect(optimized.result.totalProfitPerSecond).toBeCloseTo(90)
    expect(optimized.manufacturers.map((entry) => entry.productId).sort()).toEqual([
      "bucket",
      FACTORY_PRODUCTION_NONE_PRODUCT_ID,
    ])
  })

  it("fills empty manufacturers without changing existing selections", () => {
    const optimized = calculateFactoryProductionFillEmptyManufacturers({
      pricing: basePricing,
      resourceOutputs: {
        orange: 10,
        blue: 6,
        green: 0,
        purple: 0,
        gray: 0,
      },
      manufacturers: [
        { id: "1", productId: "battery" },
        { id: "2", productId: FACTORY_PRODUCTION_NONE_PRODUCT_ID },
      ],
    })

    expect(optimized.manufacturers).toEqual([
      { id: "1", productId: "battery" },
      { id: "2", productId: "bucket" },
    ])
    expect(optimized.result.totalProfitPerSecond).toBeCloseTo(50)
  })

  it("returns none when no profitable assignment can run", () => {
    const optimized = calculateFactoryProductionOptimalManufacturers({
      pricing: basePricing,
      resourceOutputs: {
        orange: 0,
        blue: 0,
        green: 0,
        purple: 0,
        gray: 0,
      },
      manufacturerCount: 3,
    })

    expect(optimized.manufacturers).toHaveLength(3)
    expect(optimized.manufacturers.every((entry) => entry.productId === FACTORY_PRODUCTION_NONE_PRODUCT_ID)).toBe(true)
    expect(optimized.result.totalProfitPerSecond).toBe(0)
  })

  it("prefers 2x shocklate bar + gear over a single shocklate bar", () => {
    const pricing = {
      twentyFourHourShifts: true,
      qualityControlLevel: 15,
      globalSellMultiplier: 1.04e5,
      categoryMultipliers: {
        household: 3.54,
        industrial: 2.5,
        electronics: 2.78,
        consumables: 2.5,
      },
    }
    const resourceOutputs = { orange: 28.08, blue: 13.76, green: 10.26, purple: 0, gray: 0 }

    const single = calculateFactoryProduction({
      pricing,
      resourceOutputs,
      manufacturers: [{ id: "1", productId: "shocklate_bar" }],
    })
    const combo = calculateFactoryProduction({
      pricing,
      resourceOutputs,
      manufacturers: [
        { id: "1", productId: "shocklate_bar" },
        { id: "2", productId: "shocklate_bar" },
        { id: "3", productId: "gear" },
      ],
    })
    expect(combo.totalProfitPerSecond).toBeGreaterThan(single.totalProfitPerSecond)

    for (const manufacturerCount of [1, 2, 3]) {
      const optimized = calculateFactoryProductionOptimalManufacturers({ pricing, resourceOutputs, manufacturerCount })
      expect(optimized.result.totalProfitPerSecond).toBeGreaterThanOrEqual(
        manufacturerCount === 3 ? combo.totalProfitPerSecond - 1e-6 : 0,
      )
    }
  })

  it("optimizes the in-game max of 4 manufacturers quickly", () => {
    const start = performance.now()
    const optimized = calculateFactoryProductionOptimalManufacturers({
      pricing: basePricing,
      resourceOutputs: { orange: 28, blue: 14, green: 10, purple: 5, gray: 3 },
      manufacturerCount: 4,
    })
    const elapsedMs = performance.now() - start
    console.log(`optimizer 4 manufacturers: ${elapsedMs.toFixed(1)} ms`)

    expect(optimized.manufacturers).toHaveLength(4)
    expect(elapsedMs).toBeLessThan(200)
  })

  it("respects max 3 manufacturers per resource in optimizer", () => {
    const optimized = calculateFactoryProductionOptimalManufacturers({
      pricing: basePricing,
      resourceOutputs: {
        orange: 100,
        blue: 0,
        green: 0,
        purple: 0,
        gray: 0,
      },
      manufacturerCount: 4,
    })

    const consumerCounts = {
      orange: 0,
      blue: 0,
      green: 0,
      purple: 0,
      gray: 0,
    }

    for (const manufacturer of optimized.manufacturers) {
      const item = FACTORY_PRODUCTION_ITEM_BY_ID[manufacturer.productId]
      if (!item) continue

      for (const resource of ["orange", "blue", "green", "purple", "gray"] as const) {
        if (item.costs[resource] > 0) {
          consumerCounts[resource] += 1
        }
      }
    }

    for (const resource of ["orange", "blue", "green", "purple", "gray"] as const) {
      expect(consumerCounts[resource]).toBeLessThanOrEqual(3)
    }
  })
})
