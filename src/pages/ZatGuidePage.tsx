import { createMemo, For, Show } from "solid-js"
import { NumberField, SelectField } from "../components/ui/formControls"
import { Panel } from "../components/layout/Panel"
import { createPersistedSignal } from "../lib/persistedSignal"
import { useZatData } from "../lib/zatContext"

type GuideRunType = "se_push" | "g_points" | "juno" | "cash"

type GuideEntry = {
  cycle: number
  run: string
  nodes: number[]
  note?: string
}

type GuideNodeView = {
  id: number
  name: string
  x: number
  y: number
  req?: number
  maxLv: number
  activeLevel: number
  boost: number
  isSingleLevel: boolean
}

const guideRunOptions: { value: GuideRunType; label: string }[] = [
  { value: "se_push", label: "SE Push" },
  { value: "g_points", label: "G-Points" },
  { value: "juno", label: "Juno" },
  { value: "cash", label: "Cash" },
]

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const formatMultiplier = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "x0"
  if (value < 1000) return `x${value.toFixed(2)}`

  const exponent = Math.floor(Math.log10(value))
  const mantissa = value / 10 ** exponent
  const signedExponent = exponent >= 0 ? `+${exponent}` : String(exponent)
  return `x${mantissa.toFixed(2)}E${signedExponent}`
}

export const ZatGuidePage = (props: { cycles: string; setCycles: (next: string) => void }) => {
  const TREE_MIN_Y = -8
  const TREE_MAX_Y = 8
  const TREE_MIN_X = -6
  const TREE_MAX_X = 6
  const TREE_UNIT_PX = 32
  const TREE_PADDING_PX = 72
  const data = useZatData()

  const [runType, setRunType] = createPersistedSignal<GuideRunType>("zat.guide.runType", "se_push")
  const [sharesPercent, setSharesPercent] = createPersistedSignal("zat.guide.shares", "0")
  const [techCount, setTechCount] = createPersistedSignal("zat.guide.techCount", "0")

  const normalizedCycles = createMemo(() => Math.max(1, Math.floor(parseNumberish(props.cycles))))
  const shareAmount = createMemo(() => Math.max(0, parseNumberish(sharesPercent()) / 0.05))
  const normalizedTechCount = createMemo(() => Math.max(0, Math.floor(parseNumberish(techCount()))))

  const runGuides = createMemo(() => {
    return (data().zatGuides as GuideEntry[])
      .filter((entry) => entry.run === runType())
      .sort((a, b) => a.cycle - b.cycle)
  })

  const selectedGuide = createMemo<GuideEntry | null>(() => {
    const guides = runGuides()
    if (guides.length === 0) return null

    const targetCycle = normalizedCycles()
    let selected = guides[0]

    for (const entry of guides) {
      if (entry.cycle > targetCycle) break
      selected = entry
    }

    return selected
  })

  const nodeViews = createMemo<GuideNodeView[]>(() => {
    const counts = new Map<number, number>()
    for (const nodeId of selectedGuide()?.nodes ?? []) {
      counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1)
    }

    const techLevels = normalizedTechCount()
    const shares = shareAmount()

    return data()
      .zatNodes.slice()
      .sort((a, b) => a.id - b.id)
      .map((node) => {
        const maxLv = node.maxLv ?? 1
        const rawCount = counts.get(node.id) ?? 0
        const activeLevel = Math.min(rawCount, maxLv)
        const isSingleLevel = maxLv === 1

        const baseBoost = (1 + techLevels * (node.techMul ?? 0)) * (1 + shares * (node.shareMul ?? 0))
        const exponentScale = Math.max(1, Math.floor(techLevels * 0.5))

        let boost = baseBoost ** exponentScale
        if (node.sqrt) {
          boost = Math.sqrt(Math.max(boost, 0))
        }

        return {
          id: node.id,
          name: node.name,
          x: toFiniteNumber(node.x),
          y: toFiniteNumber(node.y),
          req: node.req,
          maxLv,
          activeLevel,
          boost,
          isSingleLevel,
        }
      })
  })

  const nodePosition = (node: GuideNodeView) => {
    const normalizedX = clamp(toFiniteNumber(node.x), TREE_MIN_X, TREE_MAX_X)
    const normalizedY = clamp(toFiniteNumber(node.y), TREE_MIN_Y, TREE_MAX_Y)

    const x = TREE_PADDING_PX + (normalizedX - TREE_MIN_X) * TREE_UNIT_PX
    const y = TREE_PADDING_PX + (TREE_MAX_Y - normalizedY) * TREE_UNIT_PX

    return { x, y }
  }

  const recommendationLines = createMemo(() => {
    const nodesById = new Map(nodeViews().map((node) => [node.id, node]))
    const lines: string[] = []

    for (const nodeId of selectedGuide()?.nodes ?? []) {
      const node = nodesById.get(nodeId)
      if (!node) continue
      if (lines.includes(node.name)) continue

      if (node.maxLv === 1) {
        lines.push(node.name)
      } else {
        lines.push(`${node.name} Lv ${node.activeLevel}`)
      }
    }

    return lines
  })

  return (
    <Panel title="ZAT Guide" tooltip="zatGuide.panel">
      <div class="grid gap-6 xl:grid-cols-[0.92fr_1.4fr]">
        <section class="space-y-4">
          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4 dark:border-white/15 dark:bg-[#182538]/75">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Guide Inputs</h3>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <NumberField label="Cycles" value={props.cycles} onInput={props.setCycles} min={1} max={100} step={1} />
              <SelectField
                label="Run type"
                value={runType()}
                onChange={(next) => setRunType(next as GuideRunType)}
                options={guideRunOptions}
              />
              <NumberField
                label="OG tech levels"
                value={techCount()}
                onInput={setTechCount}
                min={0}
                step={1}
                hint="Used for per-node boost preview."
              />
              <NumberField
                label="Shares %"
                value={sharesPercent()}
                onInput={setSharesPercent}
                min={0}
                max={100}
                step={0.01}
                hint={`Shares amount: ${shareAmount().toFixed(2)}`}
              />
            </div>
          </div>

          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4 dark:border-white/15 dark:bg-[#182538]/75">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Recommendation</h3>
            <Show
              when={selectedGuide()}
              fallback={
                <p class="mt-3 text-sm text-ink/70 dark:text-white/70">No guide data found for this run type.</p>
              }
            >
              <p class="mt-3 text-xs text-ink/65 dark:text-white/65">
                Using cycle {selectedGuide()!.cycle} recommendation
                {selectedGuide()!.cycle !== normalizedCycles() ? ` (closest at or below ${normalizedCycles()})` : ""}.
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <For each={recommendationLines()}>
                  {(line) => (
                    <span class="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-ink/85 dark:text-white/85">
                      {line}
                    </span>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4 dark:border-white/15 dark:bg-[#182538]/75">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Notes</h3>
            <p class="mt-3 text-sm leading-6 text-ink/80 dark:text-white/80">
              {selectedGuide()?.note ?? "No special note for this cycle and run type."}
            </p>
          </div>
        </section>

        <section class="rounded-2xl border border-ink/15 bg-ink p-4 text-white sm:p-5">
          <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-white/85">Tree View</h3>
          <p class="mt-1 text-xs text-white/65">Node badges show selected levels from the current recommendation.</p>

          <div class="relative mt-4 h-[540px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(255,255,255,0.04),transparent_42%)] sm:h-[620px]">
            <div class="relative mx-auto" style={{ width: `540px`, height: `620px` }}>
              <svg class="absolute inset-0 h-full w-full" viewBox={`0 0 540 620`} preserveAspectRatio="xMidYMid meet">
                <For each={nodeViews().filter((node) => node.req != undefined)}>
                  {(node) => {
                    const fromNode = nodeViews().find((candidate) => candidate.id === node.req)
                    if (!fromNode) return null

                    const from = nodePosition(fromNode)
                    const to = nodePosition(node)
                    const active = fromNode.activeLevel > 0 && node.activeLevel > 0
                    const color = active ? "rgba(221, 94, 21, 0.9)" : "rgba(255,255,255,0.1)"

                    return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} stroke-width="3" />
                  }}
                </For>
              </svg>

              <For each={nodeViews()}>
                {(node) => {
                  const position = nodePosition(node)
                  const isActive = node.activeLevel > 0
                  const nodeSize = node.isSingleLevel ? "90px" : "68px"

                  return (
                    <article
                      class="absolute -translate-x-1/2 -translate-y-1/2 border text-center shadow-lg transition"
                      classList={{
                        "border-slate-500 bg-slate-700 text-white": !isActive,
                        "border-brand bg-brand text-white": isActive,
                        "rounded-full": true,
                      }}
                      style={{
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        width: nodeSize,
                        height: nodeSize,
                      }}
                    >
                      <div class="flex h-full w-full flex-col items-center justify-center px-2 py-1.5">
                        <div
                          class="inline-flex h-5 min-w-5 items-center justify-center rounded-md border px-1 text-[11px] font-bold"
                          classList={{
                            "mb-1": !node.isSingleLevel,
                            "mb-2": node.isSingleLevel,
                            "border-slate-300 bg-slate-600": !isActive,
                            "border-white bg-ink": isActive,
                          }}
                        >
                          {node.activeLevel > 0 ? (node.maxLv === 1 ? "X" : String(node.activeLevel)) : "0"}
                        </div>
                        <p
                          class="font-semibold"
                          classList={{
                            "text-[11px] leading-3.5": !node.isSingleLevel,
                            "text-sm leading-4": node.isSingleLevel,
                          }}
                        >
                          {node.name}
                        </p>
                        <p
                          class="text-white/80"
                          classList={{
                            "mt-0.5 text-[10px]": !node.isSingleLevel,
                            "mt-1 text-[11px]": node.isSingleLevel,
                          }}
                        >
                          {formatMultiplier(node.boost)}
                        </p>
                      </div>
                    </article>
                  )
                }}
              </For>
            </div>
          </div>

          <p class="mt-3 text-xs text-white/65">
            Multipliers preview uses OG tech levels and shares inputs from this page.
          </p>
        </section>
      </div>
    </Panel>
  )
}
