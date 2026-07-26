export type GuideNodeAmountLike = {
  id: string
  amount?: number
}

const normalizeGuideNodeAmount = (rawAmount: unknown) => {
  return Math.max(0, Math.floor(Number(rawAmount ?? 1) || 0))
}

export const parseGuideNodes = (raw: Array<{ id?: string; amount?: number }> | null | undefined) => {
  if (!Array.isArray(raw)) return [] as GuideNodeAmountLike[]

  const parsed: GuideNodeAmountLike[] = []
  for (const entry of raw) {
    const id = (entry.id ?? "").trim()
    const amount = normalizeGuideNodeAmount(entry.amount)

    if (id.length === 0 || amount <= 0) continue
    if (amount === 1) parsed.push({ id })
    else parsed.push({ id, amount })
  }

  return parsed
}

export const buildGuideNodeAmountMap = (nodes: GuideNodeAmountLike[]) => {
  const nodeAmounts = new Map<string, number>()

  for (const node of nodes) {
    const nodeId = node.id.trim()
    if (nodeId.length === 0) continue

    const amount = normalizeGuideNodeAmount(node.amount)
    nodeAmounts.set(nodeId, amount)
  }

  return nodeAmounts
}
