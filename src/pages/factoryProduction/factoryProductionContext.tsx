import { createContext, createMemo, type ParentProps, useContext } from "solid-js"
import { createDebounced } from "../../lib/createDebounced"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { parseLargeNumberish } from "../../lib/parseNumber"
import { formatOptimality } from "../../lib/numberFormat"
import {
  calculateFactoryProductionFillEmptyManufacturers,
  calculateFactoryProductionOptimalManufacturers,
  calculateFactoryProduction,
  createDefaultFactoryProductionInput,
  type FactoryProductionPricingInput,
} from "./factoryProductionCalculator"
import {
  createDefaultCategoryMultiplierMap,
  createEmptyResourceOutputMap,
  FACTORY_PRODUCTION_ITEMS,
  FACTORY_PRODUCTION_NONE_PRODUCT_ID,
  FACTORY_PRODUCTION_RESOURCES,
  FACTORY_PRODUCTION_TIME_UNIT_SECONDS,
  type FactoryProductionCategoryId,
  type FactoryProductionResourceId,
  type FactoryProductionTimeUnit,
} from "./factoryProductionTypes"

const OPTIMIZER_DEBOUNCE_MS = 300

type PersistedManufacturerRow = {
  id: string
  productId: string
}

type FactoryProductionContextValue = {
  resourceUnit: () => FactoryProductionTimeUnit
  setResourceUnit: (next: FactoryProductionTimeUnit) => FactoryProductionTimeUnit
  statsUnit: () => FactoryProductionTimeUnit
  setStatsUnit: (next: FactoryProductionTimeUnit) => FactoryProductionTimeUnit
  twentyFourHourShifts: () => boolean
  setTwentyFourHourShifts: (next: boolean) => boolean
  qualityControlLevel: () => string
  setQualityControlLevel: (next: string) => string
  globalSellMultiplier: () => string
  setGlobalSellMultiplier: (next: string) => string
  categoryMultipliers: () => Record<FactoryProductionCategoryId, string>
  setCategoryMultiplier: (category: FactoryProductionCategoryId, next: string) => void
  resourceOutputs: () => Record<FactoryProductionResourceId, string>
  setResourceOutput: (resource: FactoryProductionResourceId, next: string) => void
  manufacturerRows: () => PersistedManufacturerRow[]
  hasEmptyManufacturers: () => boolean
  addManufacturer: () => void
  popManufacturer: () => void
  removeManufacturer: (id: string) => void
  setManufacturerProduct: (id: string, productId: string) => void
  clearManufacturerProducts: () => void
  applyOptimal: () => void
  fillEmptyManufacturers: () => void
  optimalManufacturerRows: () => PersistedManufacturerRow[]
  optimalResult: () => ReturnType<typeof calculateFactoryProduction>
  isOptimal: () => boolean
  optimality: () => string
  canFillEmptyManufacturers: () => boolean
  resetAll: () => void
  productOptions: () => { value: string; label: string }[]
  result: () => ReturnType<typeof calculateFactoryProduction>
}

const FactoryProductionContext = createContext<FactoryProductionContextValue>()
const RESOURCE_DOT_BY_ID: Record<FactoryProductionResourceId, string> = {
  orange: "🟠",
  blue: "🔵",
  green: "🟢",
  purple: "🟣",
  gray: "⚪",
}

const clampToFiniteNonNegative = (value: number, fallback = 1) => {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, value)
}

const parseMultiplierish = (value: string) => {
  const parsed = parseLargeNumberish(value)
  return clampToFiniteNonNegative(parsed, 1)
}

const parseResourceOutput = (value: string) => {
  const parsed = parseLargeNumberish(value)
  return clampToFiniteNonNegative(parsed, 0)
}

const parseQualityControl = (value: string) => {
  const parsed = parseLargeNumberish(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const parseCategoryMultiplier = (value: string, fallback: number) => {
  const parsed = parseMultiplierish(value)
  if (parsed <= 0) return fallback
  return parsed
}

const defaultState = createDefaultFactoryProductionInput()

const defaultRows = (): PersistedManufacturerRow[] => [
  {
    id: "1",
    productId: FACTORY_PRODUCTION_NONE_PRODUCT_ID,
  },
]

export const FactoryProductionProvider = (props: ParentProps) => {
  const [resourceUnit, setResourceUnit] = createSyncedSignal<FactoryProductionTimeUnit>(
    "factoryProduction.resourceUnit",
    "h",
  )
  const [statsUnit, setStatsUnit] = createSyncedSignal<FactoryProductionTimeUnit>("factoryProduction.statsUnit", "h")
  const [twentyFourHourShifts, setTwentyFourHourShifts] = createSyncedSignal(
    "factoryProduction.twentyFourHourShifts",
    defaultState.pricing.twentyFourHourShifts,
  )
  const [qualityControlLevel, setQualityControlLevel] = createSyncedSignal(
    "factoryProduction.qualityControlLevel",
    String(defaultState.pricing.qualityControlLevel),
  )
  const [globalSellMultiplier, setGlobalSellMultiplier] = createSyncedSignal(
    "factoryProduction.globalSellMultiplier",
    String(defaultState.pricing.globalSellMultiplier),
  )
  const [categoryMultipliers, setCategoryMultipliers] = createSyncedSignal<Record<FactoryProductionCategoryId, string>>(
    "factoryProduction.categoryMultipliers",
    {
      household: "1",
      electronics: "1",
      industrial: "1",
      consumables: "1",
    },
  )

  const [resourceOutputs, setResourceOutputs] = createSyncedSignal<Record<FactoryProductionResourceId, string>>(
    "factoryProduction.resourceOutputs",
    {
      orange: "0",
      blue: "0",
      green: "0",
      purple: "0",
      gray: "0",
    },
  )

  const [manufacturerRows, setManufacturerRows] = createSyncedSignal<PersistedManufacturerRow[]>(
    "factoryProduction.manufacturerRows",
    defaultRows(),
  )

  const setCategoryMultiplier = (category: FactoryProductionCategoryId, next: string) => {
    setCategoryMultipliers((previous) => ({ ...previous, [category]: next }))
  }

  const setResourceOutput = (resource: FactoryProductionResourceId, next: string) => {
    setResourceOutputs((previous) => ({ ...previous, [resource]: next }))
  }

  const addManufacturer = () => {
    setManufacturerRows((previous) => {
      const nextId =
        previous.reduce((max, row) => {
          const parsed = Number(row.id)
          if (!Number.isFinite(parsed)) return max
          return Math.max(max, Math.floor(parsed))
        }, 0) + 1

      return [
        ...previous,
        {
          id: String(nextId),
          productId: FACTORY_PRODUCTION_NONE_PRODUCT_ID,
        },
      ]
    })
  }

  const removeManufacturer = (id: string) => {
    setManufacturerRows((previous) => {
      if (previous.length <= 1) {
        return defaultRows()
      }
      return previous.filter((row) => row.id !== id)
    })
  }

  const popManufacturer = () => {
    setManufacturerRows((previous) => {
      if (previous.length <= 1) {
        return defaultRows()
      }
      return previous.slice(0, -1)
    })
  }

  const setManufacturerProduct = (id: string, productId: string) => {
    setManufacturerRows((previous) => previous.map((row) => (row.id === id ? { ...row, productId } : row)))
  }

  const normalizedPricing = createMemo<FactoryProductionPricingInput>(() => {
    const defaults = createDefaultCategoryMultiplierMap()
    return {
      twentyFourHourShifts: twentyFourHourShifts(),
      qualityControlLevel: parseQualityControl(qualityControlLevel()),
      globalSellMultiplier: parseMultiplierish(globalSellMultiplier()),
      categoryMultipliers: {
        household: parseCategoryMultiplier(
          categoryMultipliers().household || String(defaults.household),
          defaults.household,
        ),
        electronics: parseCategoryMultiplier(
          categoryMultipliers().electronics || String(defaults.electronics),
          defaults.electronics,
        ),
        industrial: parseCategoryMultiplier(
          categoryMultipliers().industrial || String(defaults.industrial),
          defaults.industrial,
        ),
        consumables: parseCategoryMultiplier(
          categoryMultipliers().consumables || String(defaults.consumables),
          defaults.consumables,
        ),
      },
    }
  })

  const normalizedResourceOutputs = createMemo(() => {
    const normalized = createEmptyResourceOutputMap()
    for (const resource of FACTORY_PRODUCTION_RESOURCES) {
      // UI uses per-unit values; calculator expects /s.
      normalized[resource] =
        parseResourceOutput(resourceOutputs()[resource] ?? "0") / FACTORY_PRODUCTION_TIME_UNIT_SECONDS(resourceUnit())
    }
    return normalized
  })

  const normalizedManufacturers = createMemo(() => {
    return manufacturerRows().map((row) => ({
      id: row.id,
      productId: row.productId,
    }))
  })

  const hasEmptyManufacturers = createMemo(() =>
    normalizedManufacturers().some((row) => row.productId === FACTORY_PRODUCTION_NONE_PRODUCT_ID),
  )

  const result = createMemo(() =>
    calculateFactoryProduction({
      pricing: normalizedPricing(),
      resourceOutputs: normalizedResourceOutputs(),
      manufacturers: normalizedManufacturers(),
    }),
  )

  const optimizerPricing = createDebounced(normalizedPricing, OPTIMIZER_DEBOUNCE_MS)
  const optimizerResourceOutputs = createDebounced(normalizedResourceOutputs, OPTIMIZER_DEBOUNCE_MS)

  const optimalManufacturers = createMemo(() =>
    calculateFactoryProductionOptimalManufacturers({
      pricing: optimizerPricing(),
      resourceOutputs: optimizerResourceOutputs(),
      manufacturerCount: normalizedManufacturers().length,
    }),
  )

  const fillEmptyManufacturersResult = createMemo(() => {
    if (!hasEmptyManufacturers()) {
      return { manufacturers: normalizedManufacturers(), result: result() }
    }
    return calculateFactoryProductionFillEmptyManufacturers({
      pricing: optimizerPricing(),
      resourceOutputs: optimizerResourceOutputs(),
      manufacturers: normalizedManufacturers(),
    })
  })

  const optimalManufacturerRows = createMemo<PersistedManufacturerRow[]>(() => {
    const optimalProducts = optimalManufacturers().manufacturers.map((row) => row.productId)
    return normalizedManufacturers().map((row, index) => ({
      id: row.id,
      productId: optimalProducts[index] ?? FACTORY_PRODUCTION_NONE_PRODUCT_ID,
    }))
  })

  const areRowsEqual = (left: PersistedManufacturerRow[], right: PersistedManufacturerRow[]) => {
    if (left.length !== right.length) return false
    for (let index = 0; index < left.length; index += 1) {
      if (left[index].id !== right[index].id) return false
      if (left[index].productId !== right[index].productId) return false
    }
    return true
  }

  const isOptimal = createMemo(() => areRowsEqual(normalizedManufacturers(), optimalManufacturerRows()))

  const optimality = createMemo(() =>
    formatOptimality(result().totalProfitPerSecond, optimalManufacturers().result.totalProfitPerSecond),
  )

  const canFillEmptyManufacturers = createMemo(
    () =>
      hasEmptyManufacturers() && !areRowsEqual(normalizedManufacturers(), fillEmptyManufacturersResult().manufacturers),
  )

  const productOptions = createMemo(() => [
    {
      value: FACTORY_PRODUCTION_NONE_PRODUCT_ID,
      label: "None",
    },
    ...FACTORY_PRODUCTION_ITEMS.map((item) => {
      const dots = FACTORY_PRODUCTION_RESOURCES.map((resource) =>
        item.costs[resource] > 0 ? RESOURCE_DOT_BY_ID[resource] : "⚫",
      ).join("")

      return {
        value: item.id,
        label: dots.length > 0 ? ` ${dots} ${item.name}` : item.name,
      }
    }),
  ])

  const clearManufacturerProducts = () => {
    setManufacturerRows((previous) =>
      previous.map((row) => ({
        ...row,
        productId: FACTORY_PRODUCTION_NONE_PRODUCT_ID,
      })),
    )
  }

  const applyOptimal = () => {
    setManufacturerRows(optimalManufacturerRows())
  }

  const fillEmptyManufacturers = () => {
    setManufacturerRows(fillEmptyManufacturersResult().manufacturers)
  }

  const resetAll = () => {
    clearManufacturerProducts()
  }

  return (
    <FactoryProductionContext.Provider
      value={{
        resourceUnit,
        setResourceUnit,
        statsUnit,
        setStatsUnit,
        twentyFourHourShifts,
        setTwentyFourHourShifts,
        qualityControlLevel,
        setQualityControlLevel,
        globalSellMultiplier,
        setGlobalSellMultiplier,
        categoryMultipliers,
        setCategoryMultiplier,
        resourceOutputs,
        setResourceOutput,
        manufacturerRows,
        hasEmptyManufacturers,
        addManufacturer,
        popManufacturer,
        removeManufacturer,
        setManufacturerProduct,
        clearManufacturerProducts,
        applyOptimal,
        fillEmptyManufacturers,
        optimalManufacturerRows,
        optimalResult: () => optimalManufacturers().result,
        isOptimal,
        optimality,
        canFillEmptyManufacturers,
        resetAll,
        productOptions,
        result,
      }}
    >
      {props.children}
    </FactoryProductionContext.Provider>
  )
}

export const useFactoryProductionContext = () => {
  const context = useContext(FactoryProductionContext)
  if (!context) throw new Error("useFactoryProductionContext must be used within FactoryProductionProvider")
  return context
}
