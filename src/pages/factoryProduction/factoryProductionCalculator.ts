import {
  createDefaultCategoryMultiplierMap,
  createEmptyResourceOutputMap,
  FACTORY_PRODUCTION_ITEMS,
  FACTORY_PRODUCTION_ITEM_BY_ID,
  FACTORY_PRODUCTION_NONE_PRODUCT_ID,
  FACTORY_PRODUCTION_RESOURCES,
  type FactoryProductionCategoryId,
  type FactoryProductionItem,
  type FactoryProductionManufacturerInput,
  type FactoryProductionResourceId,
} from "./factoryProductionTypes"

export type FactoryProductionPricingInput = {
  twentyFourHourShifts: boolean
  qualityControlLevel: number
  globalSellMultiplier: number
  categoryMultipliers: Record<FactoryProductionCategoryId, number>
}

export type FactoryProductionManufacturerResult = {
  id: string
  productId: string
  productName: string
  category: FactoryProductionCategoryId
  effectiveSellPrice: number
  outputPerSecond: number
  profitPerSecond: number
  resourceDemandPerSecond: Record<FactoryProductionResourceId, number>
}

export type FactoryProductionResourceBalance = {
  resource: FactoryProductionResourceId
  enabled: boolean
  suppliedPerHour: number
  requiredPerHour: number
  wastedPercent: number
}

export type FactoryProductionResult = {
  additiveBaseSell: number
  totalOutputPerSecond: number
  totalProfitPerSecond: number
  manufacturers: FactoryProductionManufacturerResult[]
  resourceBalances: Record<FactoryProductionResourceId, FactoryProductionResourceBalance>
}

export type FactoryProductionOptimizerInput = {
  pricing: FactoryProductionPricingInput
  resourceOutputs: Partial<Record<FactoryProductionResourceId, number>>
}

export type FactoryProductionOptimizerResult = {
  manufacturers: FactoryProductionManufacturerInput[]
  result: FactoryProductionResult
}

const SECONDS_PER_HOUR = 3600
const MAX_MANUFACTURERS_PER_RESOURCE = 3

const sanitizeNumber = (value: number, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback
  return value
}

const toNonNegative = (value: number, fallback = 0) => {
  return Math.max(0, sanitizeNumber(value, fallback))
}

export const normalizeQualityControlLevel = (value: number) => {
  return Math.min(20, Math.max(0, Math.floor(sanitizeNumber(value, 0))))
}

export const normalizePricingInput = (raw: FactoryProductionPricingInput): FactoryProductionPricingInput => {
  const multipliers = createDefaultCategoryMultiplierMap()

  for (const category of Object.keys(multipliers) as FactoryProductionCategoryId[]) {
    multipliers[category] = toNonNegative(raw.categoryMultipliers[category], 1)
  }

  return {
    twentyFourHourShifts: !!raw.twentyFourHourShifts,
    qualityControlLevel: normalizeQualityControlLevel(raw.qualityControlLevel),
    globalSellMultiplier: toNonNegative(raw.globalSellMultiplier, 1),
    categoryMultipliers: multipliers,
  }
}

export const normalizeResourceOutputs = (
  raw: Partial<Record<FactoryProductionResourceId, number>>,
): Record<FactoryProductionResourceId, number> => {
  const normalized = createEmptyResourceOutputMap()

  for (const resource of FACTORY_PRODUCTION_RESOURCES) {
    normalized[resource] = toNonNegative(raw[resource] ?? 0)
  }

  return normalized
}

export const normalizeManufacturers = (
  raw: FactoryProductionManufacturerInput[],
): FactoryProductionManufacturerInput[] => {
  return raw.map((entry, index) => ({
    id: entry.id || String(index + 1),
    productId: entry.productId,
  }))
}

export const getAdditiveBaseSell = (twentyFourHourShifts: boolean, qualityControlLevel: number) => {
  return (twentyFourHourShifts ? 1 : 0) + normalizeQualityControlLevel(qualityControlLevel) * 10
}

export const getEffectiveSellPrice = (item: FactoryProductionItem, pricing: FactoryProductionPricingInput) => {
  const additiveBase = getAdditiveBaseSell(pricing.twentyFourHourShifts, pricing.qualityControlLevel)
  return (item.baseSellPrice + additiveBase) * pricing.globalSellMultiplier * pricing.categoryMultipliers[item.category]
}

const emptyDemand = (): Record<FactoryProductionResourceId, number> => ({
  orange: 0,
  blue: 0,
  green: 0,
  purple: 0,
  gray: 0,
})

const getCandidateItems = (resourceOutputs: Record<FactoryProductionResourceId, number>) => {
  const enabledResources = new Set<FactoryProductionResourceId>(
    FACTORY_PRODUCTION_RESOURCES.filter((resource) => resourceOutputs[resource] > 0),
  )

  const candidates = FACTORY_PRODUCTION_ITEMS.filter((item) => {
    for (const resource of FACTORY_PRODUCTION_RESOURCES) {
      if (item.costs[resource] > 0 && !enabledResources.has(resource)) {
        return false
      }
    }
    return true
  })

  return candidates.sort((left, right) => {
    if (right.baseSellPrice !== left.baseSellPrice) {
      return right.baseSellPrice - left.baseSellPrice
    }
    return left.id.localeCompare(right.id)
  })
}

const cloneManufacturers = (
  manufacturers: FactoryProductionManufacturerInput[],
): FactoryProductionManufacturerInput[] => {
  return manufacturers.map((entry) => ({
    id: entry.id,
    productId: entry.productId,
  }))
}

const getConsumerCountsByResource = (manufacturers: FactoryProductionManufacturerInput[]) => {
  const counts: Record<FactoryProductionResourceId, number> = {
    orange: 0,
    blue: 0,
    green: 0,
    purple: 0,
    gray: 0,
  }

  for (const row of manufacturers) {
    const item = FACTORY_PRODUCTION_ITEM_BY_ID[row.productId]
    if (!item) continue

    for (const resource of FACTORY_PRODUCTION_RESOURCES) {
      if (item.costs[resource] > 0) {
        counts[resource] += 1
      }
    }
  }

  return counts
}

const canAssignItemWithResourceLimit = (
  currentManufacturers: FactoryProductionManufacturerInput[],
  item: FactoryProductionItem,
) => {
  const consumerCounts = getConsumerCountsByResource(currentManufacturers)

  for (const resource of FACTORY_PRODUCTION_RESOURCES) {
    if (item.costs[resource] <= 0) continue
    if (consumerCounts[resource] >= MAX_MANUFACTURERS_PER_RESOURCE) return false
  }

  return true
}

const calculateGreedyAddition = (
  input: FactoryProductionOptimizerInput,
  startManufacturers: FactoryProductionManufacturerInput[],
  targetCount: number,
): FactoryProductionOptimizerResult => {
  const pricing = normalizePricingInput(input.pricing)
  const resourceOutputs = normalizeResourceOutputs(input.resourceOutputs)
  const candidates = getCandidateItems(resourceOutputs)
  const current = cloneManufacturers(startManufacturers)

  let baseline = calculateFactoryProduction({
    pricing,
    resourceOutputs,
    manufacturers: current,
  })

  let nextId =
    current.reduce((max, row) => {
      const parsed = Number(row.id)
      if (!Number.isFinite(parsed)) return max
      return Math.max(max, Math.floor(parsed))
    }, 0) + 1

  while (current.length < targetCount) {
    const rowId = String(nextId)
    nextId += 1

    let bestProductId = FACTORY_PRODUCTION_NONE_PRODUCT_ID
    let bestDelta = 0
    let bestResult = baseline

    for (const item of candidates) {
      if (!canAssignItemWithResourceLimit(current, item)) {
        continue
      }

      const trialRows = [...current, { id: rowId, productId: item.id }]
      const trial = calculateFactoryProduction({
        pricing,
        resourceOutputs,
        manufacturers: trialRows,
      })
      const delta = trial.totalProfitPerSecond - baseline.totalProfitPerSecond

      if (delta > bestDelta + 1e-9) {
        bestDelta = delta
        bestProductId = item.id
        bestResult = trial
      }
    }

    current.push({
      id: rowId,
      productId: bestProductId,
    })

    if (bestProductId !== FACTORY_PRODUCTION_NONE_PRODUCT_ID) {
      baseline = bestResult
    }
  }

  const result = calculateFactoryProduction({
    pricing,
    resourceOutputs,
    manufacturers: current,
  })

  return {
    manufacturers: current,
    result,
  }
}

export const calculateFactoryProductionOptimalManufacturers = (
  input: FactoryProductionOptimizerInput & { manufacturerCount: number },
): FactoryProductionOptimizerResult => {
  const manufacturerCount = Math.max(0, Math.floor(sanitizeNumber(input.manufacturerCount, 0)))
  return calculateGreedyAddition(input, [], manufacturerCount)
}

export const calculateFactoryProductionFillEmptyManufacturers = (
  input: FactoryProductionOptimizerInput & { manufacturers: FactoryProductionManufacturerInput[] },
): FactoryProductionOptimizerResult => {
  const normalizedManufacturers = normalizeManufacturers(input.manufacturers)
  const kept = normalizedManufacturers.filter((entry) => entry.productId !== FACTORY_PRODUCTION_NONE_PRODUCT_ID)

  const targetCount = normalizedManufacturers.length
  const optimized = calculateGreedyAddition(input, kept, targetCount)

  const additions = optimized.manufacturers.slice(kept.length).map((entry) => entry.productId)
  let additionIndex = 0

  const manufacturers = normalizedManufacturers.map((entry) => {
    if (entry.productId !== FACTORY_PRODUCTION_NONE_PRODUCT_ID) {
      return entry
    }

    const nextProductId = additions[additionIndex] ?? FACTORY_PRODUCTION_NONE_PRODUCT_ID
    additionIndex += 1
    return {
      id: entry.id,
      productId: nextProductId,
    }
  })

  const result = calculateFactoryProduction({
    pricing: normalizePricingInput(input.pricing),
    resourceOutputs: normalizeResourceOutputs(input.resourceOutputs),
    manufacturers,
  })

  return {
    manufacturers,
    result,
  }
}

export const calculateFactoryProduction = (input: {
  pricing: FactoryProductionPricingInput
  resourceOutputs: Partial<Record<FactoryProductionResourceId, number>>
  manufacturers: FactoryProductionManufacturerInput[]
}): FactoryProductionResult => {
  const pricing = normalizePricingInput(input.pricing)
  const resourceOutputs = normalizeResourceOutputs(input.resourceOutputs)
  const manufacturers = normalizeManufacturers(input.manufacturers)

  const resultRows: FactoryProductionManufacturerResult[] = []
  const required = createEmptyResourceOutputMap()

  const withItems = manufacturers
    .map((row) => ({
      row,
      item: FACTORY_PRODUCTION_ITEM_BY_ID[row.productId],
    }))
    .filter((entry): entry is { row: FactoryProductionManufacturerInput; item: FactoryProductionItem } => !!entry.item)

  const consumersByResource: Record<FactoryProductionResourceId, number> = {
    orange: 0,
    blue: 0,
    green: 0,
    purple: 0,
    gray: 0,
  }

  for (const { item } of withItems) {
    for (const resource of FACTORY_PRODUCTION_RESOURCES) {
      if (item.costs[resource] > 0) {
        consumersByResource[resource] += 1
      }
    }
  }

  for (const { row, item } of withItems) {
    let outputPerSecond = Number.POSITIVE_INFINITY
    let hasInputCosts = false

    for (const resource of FACTORY_PRODUCTION_RESOURCES) {
      const costPerItem = item.costs[resource]
      if (costPerItem <= 0) continue

      hasInputCosts = true
      const consumers = consumersByResource[resource]
      if (consumers <= 0) continue

      const allocatedSupply = resourceOutputs[resource] / consumers
      const resourceLimitedOutput = allocatedSupply / costPerItem
      outputPerSecond = Math.min(outputPerSecond, resourceLimitedOutput)
    }

    if (!hasInputCosts || !Number.isFinite(outputPerSecond)) {
      outputPerSecond = 0
    }
    outputPerSecond = toNonNegative(outputPerSecond)

    const demand = emptyDemand()
    for (const resource of FACTORY_PRODUCTION_RESOURCES) {
      demand[resource] = item.costs[resource] * outputPerSecond
      required[resource] += demand[resource]
    }

    const effectiveSellPrice = getEffectiveSellPrice(item, pricing)
    const profitPerSecond = outputPerSecond * effectiveSellPrice

    resultRows.push({
      id: row.id,
      productId: item.id,
      productName: item.name,
      category: item.category,
      effectiveSellPrice,
      outputPerSecond,
      profitPerSecond,
      resourceDemandPerSecond: demand,
    })
  }

  const resourceBalances = createEmptyResourceOutputMap() as unknown as Record<
    FactoryProductionResourceId,
    FactoryProductionResourceBalance
  >

  for (const resource of FACTORY_PRODUCTION_RESOURCES) {
    const supplied = resourceOutputs[resource]
    const needed = required[resource]
    const consumed = Math.min(needed, supplied)
    const wastedPercent = supplied > 0 ? ((supplied - consumed) / supplied) * 100 : 0

    resourceBalances[resource] = {
      resource,
      enabled: supplied > 0,
      suppliedPerHour: supplied * SECONDS_PER_HOUR,
      requiredPerHour: needed * SECONDS_PER_HOUR,
      wastedPercent,
    }
  }

  const totalOutputPerSecond = resultRows.reduce((sum, row) => sum + row.outputPerSecond, 0)
  const totalProfitPerSecond = resultRows.reduce((sum, row) => sum + row.profitPerSecond, 0)

  return {
    additiveBaseSell: getAdditiveBaseSell(pricing.twentyFourHourShifts, pricing.qualityControlLevel),
    totalOutputPerSecond,
    totalProfitPerSecond,
    manufacturers: resultRows,
    resourceBalances,
  }
}

export const createDefaultFactoryProductionInput = () => ({
  pricing: {
    twentyFourHourShifts: false,
    qualityControlLevel: 0,
    globalSellMultiplier: 1,
    categoryMultipliers: createDefaultCategoryMultiplierMap(),
  },
  resourceOutputs: createEmptyResourceOutputMap(),
  manufacturers: [
    {
      id: "1",
      productId: FACTORY_PRODUCTION_ITEMS[0]?.id ?? "",
    },
  ],
})
