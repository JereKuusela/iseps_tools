import itemJson from "../../../data/factory_production_items.json"
import resourceJson from "../../../data/factory_production_resources.json"

const FACTORY_PRODUCTION_RESOURCE_IDS = ["orange", "blue", "green", "purple", "gray"] as const
export const FACTORY_PRODUCTION_CATEGORIES = ["household", "electronics", "industrial", "consumables"] as const

export type FactoryProductionResourceId = (typeof FACTORY_PRODUCTION_RESOURCE_IDS)[number]
export type FactoryProductionCategoryId = (typeof FACTORY_PRODUCTION_CATEGORIES)[number]

export type FactoryProductionResourceMeta = {
  id: FactoryProductionResourceId
  name: string
  color: string
}

export type FactoryProductionItem = {
  id: string
  name: string
  category: FactoryProductionCategoryId
  baseSellPrice: number
  costs: Record<FactoryProductionResourceId, number>
  ingredientCount: number
}

export type FactoryProductionManufacturerInput = {
  id: string
  productId: string
}

const sanitizeNumber = (value: number, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback
  return value
}

const toNonNegative = (value: number, fallback = 0) => {
  return Math.max(0, sanitizeNumber(value, fallback))
}

const isResourceId = (value: string): value is FactoryProductionResourceId => {
  return FACTORY_PRODUCTION_RESOURCE_IDS.some((entry) => entry === value)
}

const isCategory = (value: string): value is FactoryProductionCategoryId => {
  return FACTORY_PRODUCTION_CATEGORIES.some((entry) => entry === value)
}

const buildResources = (): FactoryProductionResourceMeta[] => {
  const resources = resourceJson
    .map((raw) => ({
      id: String(raw.id ?? "").trim() as FactoryProductionResourceId,
      name: String(raw.name ?? "").trim(),
      color: String(raw.color ?? "").trim(),
    }))
    .filter((resource) => isResourceId(resource.id) && resource.name.length > 0 && resource.color.length > 0)
    .map((resource) => ({
      id: resource.id,
      name: resource.name,
      color: resource.color,
    }))

  const seen = new Set<FactoryProductionResourceId>()
  for (const resource of resources) {
    if (seen.has(resource.id)) {
      throw new Error(`Duplicate factory production resource id: ${resource.id}`)
    }
    seen.add(resource.id)
  }

  for (const id of FACTORY_PRODUCTION_RESOURCE_IDS) {
    if (!seen.has(id)) {
      throw new Error(`Missing factory production resource metadata for id: ${id}`)
    }
  }

  return resources
}

export type FactoryProductionTimeUnit = "s" | "m" | "h" | "d"

export const FACTORY_PRODUCTION_TIME_UNITS: { value: FactoryProductionTimeUnit; label: string; seconds: number }[] = [
  { value: "s", label: "Second", seconds: 1 },
  { value: "m", label: "Minute", seconds: 60 },
  { value: "h", label: "Hour", seconds: 3600 },
  { value: "d", label: "Day", seconds: 86400 },
]

export const FACTORY_PRODUCTION_TIME_UNIT_SECONDS = (unit: FactoryProductionTimeUnit) =>
  FACTORY_PRODUCTION_TIME_UNITS.find((entry) => entry.value === unit)?.seconds ?? 3600

export const FACTORY_PRODUCTION_RESOURCE_META = buildResources()
export const FACTORY_PRODUCTION_RESOURCES = FACTORY_PRODUCTION_RESOURCE_META.map((entry) => entry.id)

export const FACTORY_PRODUCTION_RESOURCE_BY_ID: Record<FactoryProductionResourceId, FactoryProductionResourceMeta> =
  FACTORY_PRODUCTION_RESOURCE_META.reduce(
    (lookup, resource) => {
      lookup[resource.id] = resource
      return lookup
    },
    {} as Record<FactoryProductionResourceId, FactoryProductionResourceMeta>,
  )

const createEmptyResourceMap = (): Record<FactoryProductionResourceId, number> => {
  const next = {} as Record<FactoryProductionResourceId, number>
  for (const resource of FACTORY_PRODUCTION_RESOURCES) {
    next[resource] = 0
  }
  return next
}

const emptyCosts = (): Record<FactoryProductionResourceId, number> => createEmptyResourceMap()

const normalizeItem = (raw: {
  id?: string
  name?: string
  category?: string
  baseSellPrice?: number
  costs?: Partial<Record<FactoryProductionResourceId | "grey", number>>
}): FactoryProductionItem => {
  const id = (raw.id ?? "").trim()
  const name = (raw.name ?? id).trim()
  const rawCategory = raw.category ?? ""
  const category: FactoryProductionCategoryId = isCategory(rawCategory) ? rawCategory : "household"

  const costs = emptyCosts()

  for (const resource of FACTORY_PRODUCTION_RESOURCES) {
    costs[resource] = toNonNegative(raw.costs?.[resource] ?? 0)
  }

  // Accept either spelling from historical notes.
  costs.gray = Math.max(costs.gray, toNonNegative(raw.costs?.grey ?? 0))

  return {
    id,
    name,
    category,
    baseSellPrice: toNonNegative(raw.baseSellPrice ?? 0),
    costs,
    ingredientCount: FACTORY_PRODUCTION_RESOURCES.filter((resource) => costs[resource] > 0).length,
  }
}

const buildItems = () => {
  const seen = new Set<string>()
  const normalized = itemJson
    .map((raw) => normalizeItem(raw))
    .filter((item) => item.id.length > 0 && item.name.length > 0)

  for (const item of normalized) {
    if (seen.has(item.id)) {
      throw new Error(`Duplicate factory production item id: ${item.id}`)
    }
    seen.add(item.id)
  }

  return normalized
}

export const FACTORY_PRODUCTION_ITEMS = buildItems()
export const FACTORY_PRODUCTION_NONE_PRODUCT_ID = "none"
export const FACTORY_PRODUCTION_ITEM_BY_ID: Record<string, FactoryProductionItem> = FACTORY_PRODUCTION_ITEMS.reduce(
  (lookup, item) => {
    lookup[item.id] = item
    return lookup
  },
  {} as Record<string, FactoryProductionItem>,
)

export const createEmptyResourceOutputMap = (): Record<FactoryProductionResourceId, number> => ({
  ...createEmptyResourceMap(),
})

export const createDefaultCategoryMultiplierMap = (): Record<FactoryProductionCategoryId, number> => ({
  household: 1,
  electronics: 1,
  industrial: 1,
  consumables: 1,
})
