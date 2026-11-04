import { For, Show } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { Tooltip } from "../../components/ui/Tooltip"
import { talentConnections, talentDefById, talentGrid, type TalentSide } from "./talentGuideData"
import { TALENT_THEMES } from "./talentGuideTypes"
import { useTalentGuideContext } from "./talentGuideContext"

const iconModules = import.meta.glob("../../assets/talents/*.png", { eager: true, import: "default" }) as Record<
  string,
  string
>
const iconById = new Map(
  Object.entries(iconModules).map(([path, url]) => [path.split("/").pop()!.replace(".png", ""), url]),
)

const ROWS = 6
const COLS = 3

const TalentCell = (props: { id: string; side: TalentSide }) => {
  const { allocation } = useTalentGuideContext()
  const def = talentDefById.get(props.id)!
  const theme = TALENT_THEMES[props.side]
  const level = () => allocation().levels[props.id] ?? 0

  return (
    <Tooltip content={def.tooltip} raw asChild>
      <div class="relative z-10 flex flex-col items-center gap-1">
        <img
          src={iconById.get(props.id)}
          alt={props.id}
          class="h-12 w-auto rounded border-2 transition-opacity"
          style={{ "border-color": theme.cell, opacity: level() > 0 ? 1 : 0.4 }}
          draggable={false}
        />
        <span
          class="rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
          style={{ "background-color": theme.label, opacity: level() > 0 ? 1 : 0.6 }}
        >
          {level()} of {def.max}
        </span>
      </div>
    </Tooltip>
  )
}

const TalentConnections = (props: { side: TalentSide }) => {
  const { allocation } = useTalentGuideContext()
  const theme = TALENT_THEMES[props.side]
  const position = (id: string) => {
    const def = talentDefById.get(id)!
    return { x: def.col - 0.5, y: def.row - 0.5 }
  }
  const lines = talentConnections.filter(([from]) => talentDefById.get(from)?.side === props.side)

  return (
    <svg
      class="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${COLS} ${ROWS}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <For each={lines}>
        {([from, to]) => {
          const a = position(from)
          const b = position(to)
          const active = () => (allocation().levels[from] ?? 0) > 0 && (allocation().levels[to] ?? 0) > 0
          return (
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={theme.cell}
              stroke-width="3"
              stroke-opacity={active() ? 0.9 : 0.25}
              vector-effect="non-scaling-stroke"
            />
          )
        }}
      </For>
    </svg>
  )
}

const TalentSideGrid = (props: { side: TalentSide }) => {
  const { allocation } = useTalentGuideContext()
  const theme = TALENT_THEMES[props.side]
  const spent = () => (props.side === "PP" ? allocation().spentPP : allocation().spentIC)

  return (
    <div class="overflow-hidden rounded-xl border border-white/20" style={{ "background-color": theme.background }}>
      <div class="px-3 py-2 text-center text-white" style={{ "background-color": theme.header }}>
        <p class="text-xs font-bold tracking-[0.12em]">{theme.title}</p>
        <p class="text-[11px] font-semibold opacity-80">LP SPENT: {spent()}</p>
      </div>
      <div class="p-2">
        <div class="relative grid grid-cols-3" style={{ "grid-template-rows": `repeat(${ROWS}, 5.5rem)` }}>
          <TalentConnections side={props.side} />
          <For each={talentGrid[props.side].flat()}>
            {(id) => (
              <div class="flex items-center justify-center">
                <Show when={id}>
                  <TalentCell id={id!} side={props.side} />
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

export const TalentGuideResults = () => (
  <InfoCard>
    <div class="grid gap-3 md:grid-cols-2">
      <TalentSideGrid side="PP" />
      <TalentSideGrid side="IC" />
    </div>
  </InfoCard>
)
