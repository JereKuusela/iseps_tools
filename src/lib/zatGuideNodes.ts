export type GuideNodeAmountLike = {
  id: number
  amount?: number
}

export type ParsedGuideNodeAmount = {
  id: number
  amount: number
}

type ParseGuideNodesOptions = {
  omitAmountWhenOne?: boolean
}

const normalizeGuideNodeAmount = (rawAmount: unknown) => {
  return Math.max(0, Math.floor(Number(rawAmount ?? 1) || 0))
}

export const parseGuideNodes = (raw: unknown, options?: ParseGuideNodesOptions) => {
  if (!Array.isArray(raw)) return [] as GuideNodeAmountLike[]

  const parsed: GuideNodeAmountLike[] = []
  for (const entry of raw) {
    const candidate = entry as { id?: number; amount?: number }
    const id = Number(candidate.id)
    const amount = normalizeGuideNodeAmount(candidate.amount)

    if (!Number.isFinite(id) || amount <= 0) continue
    if (options?.omitAmountWhenOne && amount === 1) parsed.push({ id })
    else parsed.push({ id, amount })
  }

  return parsed
}

export const buildGuideNodeAmountMap = (nodes: GuideNodeAmountLike[]) => {
  const nodeAmounts = new Map<number, number>()

  for (const node of nodes) {
    const nodeId = Number(node.id)
    if (!Number.isFinite(nodeId)) continue

    const amount = normalizeGuideNodeAmount(node.amount)
    nodeAmounts.set(nodeId, amount)
  }

  return nodeAmounts
}
