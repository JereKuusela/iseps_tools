export type GuideNode = {
  id: string
  amount?: number
}

export type GuideNodeRequirement = {
  id: string
  req?: string
}

const normalizeGuideNodeAmount = (rawAmount: unknown) => {
  return Math.max(0, Math.floor(Number(rawAmount ?? 1) || 0))
}

export const parseGuideNodes = (raw: unknown, requirements: readonly GuideNodeRequirement[] = []): GuideNode[] => {
  if (!Array.isArray(raw)) return []

  const parsed = new Map<string, number>()
  for (const entry of raw) {
    if (typeof entry !== "string") continue

    const value = entry.trim()
    const amountPrefix = /^(\d+)\s+(.+)$/.exec(value)
    const id = (amountPrefix?.[2] ?? value).trim()
    const amount = normalizeGuideNodeAmount(amountPrefix?.[1])

    if (id.length === 0 || amount <= 0) continue
    parsed.set(id, amount)
  }

  const requirementById = new Map(requirements.map((node) => [node.id, node.req]))
  if (requirements.length > 0) {
    for (const id of parsed.keys()) {
      if (!requirementById.has(id)) parsed.delete(id)
    }
  }

  const addRequirements = (id: string, visited: Set<string>) => {
    if (visited.has(id)) return
    visited.add(id)

    const requirement = requirementById.get(id)
    if (!requirement) return
    if (!requirementById.has(requirement)) return

    if (!parsed.has(requirement)) parsed.set(requirement, 1)
    addRequirements(requirement, visited)
  }

  for (const id of parsed.keys()) addRequirements(id, new Set())

  return Array.from(parsed, ([id, amount]) => (amount === 1 ? { id } : { id, amount }))
}

export const buildGuideNodeAmountMap = (nodes: GuideNode[]) => {
  const nodeAmounts = new Map<string, number>()

  for (const node of nodes) {
    const nodeId = node.id.trim()
    if (nodeId.length === 0) continue

    const amount = normalizeGuideNodeAmount(node.amount)
    nodeAmounts.set(nodeId, amount)
  }

  return nodeAmounts
}
