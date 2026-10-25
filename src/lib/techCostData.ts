import { LargeNumber } from "./largeNumber"

const parseCostCell = (raw: string): LargeNumber => {
  try {
    return LargeNumber.parse(raw)
  } catch {
    return LargeNumber.zero()
  }
}

const parseTechCostCsv = (rawCsv: string): Map<string, LargeNumber> => {
  const lines = rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const [, ...rows] = lines
  const byKey = new Map<string, LargeNumber>()

  for (const line of rows) {
    const [id, level, cost] = line.split(",")
    if (!id || !level || !cost) continue
    byKey.set(`${id}:${level}`, parseCostCell(cost))
  }

  return byKey
}

let techCostByKey: Map<string, LargeNumber> | null = null
let loadingPromise: Promise<Map<string, LargeNumber>> | null = null

export const loadTechCostData = async (): Promise<Map<string, LargeNumber>> => {
  if (techCostByKey) return techCostByKey

  if (!loadingPromise) {
    loadingPromise = import("../../data/tech_costs.csv?raw").then((module) => {
      techCostByKey = parseTechCostCsv(module.default)
      return techCostByKey
    })
  }

  return loadingPromise
}

export const getPrecomputedTechCost = (id: number, level: number): LargeNumber | null => {
  if (!techCostByKey) return null
  return techCostByKey.get(`${id}:${level}`) ?? null
}
