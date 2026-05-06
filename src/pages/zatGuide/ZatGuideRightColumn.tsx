import { For } from "solid-js"
import { formatLargeNumberMultiplier } from "../../lib/numberFormat"
import type { GuideNodeView } from "./zatGuideTypes"
import { useZatGuideContext } from "./zatGuideContext"

type Position = { x: number; y: number }

const TREE_MIN_Y = -8
const TREE_MAX_Y = 8
const TREE_MIN_X = -6
const TREE_MAX_X = 6
const TREE_UNIT_PX = 32
const TREE_PADDING_PX = 72
const TREE_WIDTH = 540
const TREE_HEIGHT = 620

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const nodePosition = (node: GuideNodeView): Position => {
  const normalizedX = clamp(toFiniteNumber(node.x), TREE_MIN_X, TREE_MAX_X)
  const normalizedY = clamp(toFiniteNumber(node.y), TREE_MIN_Y, TREE_MAX_Y)

  const x = TREE_PADDING_PX + (normalizedX - TREE_MIN_X) * TREE_UNIT_PX
  const y = TREE_PADDING_PX + (TREE_MAX_Y - normalizedY) * TREE_UNIT_PX

  return { x, y }
}

export const ZatGuideRightColumn = () => {
  const guide = useZatGuideContext()

  return (
    <section class="relative bg-ink h-[540px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(255,255,255,0.04),transparent_42%)] sm:h-[620px]">
      <div class="relative mx-auto" style={{ width: `${TREE_WIDTH}px`, height: `${TREE_HEIGHT}px` }}>
        <svg
          class="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${TREE_WIDTH} ${TREE_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <For each={guide.nodeViews().filter((node) => node.req != undefined)}>
            {(node) => {
              const fromNode = guide.nodeViews().find((candidate) => candidate.id === node.req)
              if (!fromNode) return null

              const from = nodePosition(fromNode)
              const to = nodePosition(node)
              const active = fromNode.activeLevel > 0 && node.activeLevel > 0
              const color = active ? "rgba(221, 94, 21, 0.9)" : "rgba(255,255,255,0.1)"

              return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} stroke-width="3" />
            }}
          </For>
        </svg>

        <For each={guide.nodeViews()}>
          {(node) => {
            const position = nodePosition(node)
            const isActive = node.activeLevel > 0
            const isSelected = () => guide.selectedNodeId() === node.id
            const nodeSize = node.isSingleLevel ? "90px" : "68px"

            return (
              <article
                class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer border text-center shadow-lg transition focus-visible:outline-none"
                classList={{
                  "border-slate-500 bg-slate-700 text-white": !isActive,
                  "border-brand bg-brand text-white": isActive,
                  "ring-4 ring-accent/90 ring-offset-2 ring-offset-ink scale-110 z-10": isSelected(),
                  "rounded-full": true,
                }}
                style={{
                  left: `${position.x}px`,
                  top: `${position.y - 10}px`,
                  width: nodeSize,
                  height: nodeSize,
                }}
                role="button"
                tabindex={0}
                onClick={() => guide.selectNode(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    guide.selectNode(node.id)
                  }
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
                    {formatLargeNumberMultiplier(node.boost)}
                  </p>
                </div>
              </article>
            )
          }}
        </For>
      </div>
    </section>
  )
}
