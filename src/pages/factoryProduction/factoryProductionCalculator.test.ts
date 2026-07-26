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

  it("computes effective sell price with global and category multipliers", () => {
    const battery = FACTORY_PRODUCTION_ITEM_BY_ID.battery
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

    expect(getEffectiveSellPrice(battery, pricing)).toBe((5 + 21) * 3 * 1.5)
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
    expect(optimized.result.totalProfitPerSecond).toBeCloseTo(60)
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
    expect(optimized.result.totalProfitPerSecond).toBeCloseTo(35)
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
