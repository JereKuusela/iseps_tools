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
import { SECONDS_PER_HOUR } from "../../lib/timeFormat"

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
  const rarityMultiplier = Math.max(1, (item.ingredientCount + 1) / 2)
  return (
    (item.baseSellPrice + additiveBase) *
    pricing.globalSellMultiplier *
    pricing.categoryMultipliers[item.category] *
    rarityMultiplier
  )
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

const calculateGreedyAddition = (
  input: FactoryProductionOptimizerInput,
  startManufacturers: FactoryProductionManufacturerInput[],
  targetCount: number,
): FactoryProductionOptimizerResult => {
  const pricing = normalizePricingInput(input.pricing)
  const resourceOutputs = normalizeResourceOutputs(input.resourceOutputs)
  const candidates = getCandidateItems(resourceOutputs)
  const current = cloneManufacturers(startManufacturers)

  let nextId =
    current.reduce((max, row) => {
      const parsed = Number(row.id)
      if (!Number.isFinite(parsed)) return max
      return Math.max(max, Math.floor(parsed))
    }, 0) + 1

  // Exhaustive search over multisets: resources are split evenly, so greedy addition can miss better combinations.
  const slots = targetCount - current.length
  const resourceCount = FACTORY_PRODUCTION_RESOURCES.length
  const supply = FACTORY_PRODUCTION_RESOURCES.map((resource) => resourceOutputs[resource])
  const prices = candidates.map((item) => getEffectiveSellPrice(item, pricing))
  const uses = candidates.map((item) =>
    FACTORY_PRODUCTION_RESOURCES.flatMap((resource, r) => (item.costs[resource] > 0 ? [r] : [])),
  )
  const costs = candidates.map((item) => FACTORY_PRODUCTION_RESOURCES.map((resource) => item.costs[resource]))
  // Profit earned per unit of resource r consumed by item i.
  const ratios = candidates.map((_, i) => costs[i].map((cost, r) => (cost > 0 ? prices[i] / cost : 0)))

  const consumers = new Array<number>(resourceCount).fill(0)
  const counts = candidates.map(() => 0)
  const fixedCounts = candidates.map(() => 0)
  const candidateIndexById = new Map(candidates.map((item, i) => [item.id, i]))
  for (const row of current) {
    const item = FACTORY_PRODUCTION_ITEM_BY_ID[row.productId]
    if (!item) continue
    FACTORY_PRODUCTION_RESOURCES.forEach((resource, r) => {
      if (item.costs[resource] > 0) consumers[r] += 1
    })
    const index = candidateIndexById.get(row.productId)
    if (index !== undefined) fixedCounts[index] += 1
  }

  // B dominates A when B uses a subset of A's resources and earns at least as much per unit on each:
  // swapping A for B never lowers profit nor raises any consumer count, so A need not be searched.
  const dominates = (b: number, a: number) => {
    for (const r of uses[b]) if (costs[a][r] <= 0 || ratios[b][r] < ratios[a][r]) return false
    if (uses[b].length < uses[a].length) return true
    return uses[b].some((r) => ratios[b][r] > ratios[a][r]) || b < a
  }
  const searchable = candidates
    .map((_, i) => i)
    .filter((a) => uses[a].length > 0 && !candidates.some((_, b) => b !== a && dominates(b, a)))

  // suffixMax[p][r]: best ratio on resource r among searchable[p..].
  const suffixMax = Array.from({ length: searchable.length + 1 }, () => new Array<number>(resourceCount).fill(0))
  for (let p = searchable.length - 1; p >= 0; p -= 1) {
    const i = searchable[p]
    for (let r = 0; r < resourceCount; r += 1) suffixMax[p][r] = Math.max(suffixMax[p + 1][r], ratios[i][r])
  }

  const presentMax = new Array<number>(resourceCount).fill(0)

  // Returns current profit and fills presentMax with the best ratio per resource among chosen items.
  const evaluate = () => {
    presentMax.fill(0)
    let total = 0
    for (let i = 0; i < candidates.length; i += 1) {
      const n = counts[i] + fixedCounts[i]
      if (n <= 0) continue
      const itemUses = uses[i]
      if (itemUses.length === 0) continue
      let output = Number.POSITIVE_INFINITY
      for (const r of itemUses) {
        output = Math.min(output, supply[r] / consumers[r] / costs[i][r])
        if (ratios[i][r] > presentMax[r]) presentMax[r] = ratios[i][r]
      }
      total += n * output * prices[i]
    }
    return total
  }

  // Each item's revenue is capped by any one of its resources, and a resource's consumers share its supply,
  // so profit <= sum over r of supply[r] * (best ratio among items that may end up using r).
  const upperBound = (start: number, remaining: number) => {
    let bound = 0
    for (let r = 0; r < resourceCount; r += 1) {
      let best = presentMax[r]
      if (remaining > 0 && consumers[r] < MAX_MANUFACTURERS_PER_RESOURCE) best = Math.max(best, suffixMax[start][r])
      bound += supply[r] * best
    }
    return bound
  }

  const improves = (value: number, best: number) => value > best * (1 + 1e-9) + 1e-12

  let bestProfit = evaluate()
  let bestCounts = [...counts]

  const search = (start: number, remaining: number) => {
    if (remaining <= 0) return
    for (let p = start; p < searchable.length; p += 1) {
      const index = searchable[p]
      const itemUses = uses[index]
      if (itemUses.some((r) => consumers[r] >= MAX_MANUFACTURERS_PER_RESOURCE)) continue
      for (const r of itemUses) consumers[r] += 1
      counts[index] += 1

      const profit = evaluate()
      if (improves(profit, bestProfit)) {
        bestProfit = profit
        bestCounts = [...counts]
      }
      if (remaining > 1 && improves(upperBound(p, remaining - 1), bestProfit)) search(p, remaining - 1)

      counts[index] -= 1
      for (const r of itemUses) consumers[r] -= 1
    }
  }
  search(0, slots)

  bestCounts.forEach((n, index) => {
    for (let i = 0; i < n; i += 1) {
      current.push({ id: String(nextId), productId: candidates[index].id })
      nextId += 1
    }
  })
  while (current.length < targetCount) {
    current.push({ id: String(nextId), productId: FACTORY_PRODUCTION_NONE_PRODUCT_ID })
    nextId += 1
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
