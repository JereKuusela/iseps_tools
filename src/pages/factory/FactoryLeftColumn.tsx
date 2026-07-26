import { createEffect, createMemo, createSignal, Show, type Accessor } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { DisplayField, IntegerField, TextInputField } from "../../components/ui/formControls"
import type { TooltipKey } from "../../lib/tooltips"
import { Tooltip } from "../../components/ui/Tooltip"
import {
  FACTORY_NODE_DEFINITIONS,
  emptyFactoryNodeLevels,
  type FactoryNodeId,
  type FactoryNodeLevels,
} from "./factoryTypes"
import { useFactoryContext } from "./factoryContext"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const notationOrder = FACTORY_NODE_DEFINITIONS.map((node) => node.id)
const nodeById = FACTORY_NODE_DEFINITIONS.reduce(
  (lookup, node) => {
    lookup[node.id] = node
    return lookup
  },
  {} as Record<FactoryNodeId, (typeof FACTORY_NODE_DEFINITIONS)[number]>,
)

const toShortNotation = (levels: FactoryNodeLevels) => {
  const values = notationOrder.map((id) => levels[id])

  while (values.length > 1 && values[values.length - 1] === 0) {
    values.pop()
  }

  return values.join("/")
}

const parseNotation = (raw: string): FactoryNodeLevels => {
  const next = emptyFactoryNodeLevels()
  const chunks = raw
    .split("/")
    .map((entry) => entry.trim())
    .filter((entry, index, all) => entry.length > 0 || index < all.length - 1)

  for (let index = 0; index < notationOrder.length; index += 1) {
    const id = notationOrder[index]
    const rawLevel = chunks[index] ?? "0"
    const parsed = Math.max(0, Math.floor(parseNumberish(rawLevel)))
    next[id] = Math.min(nodeById[id].maxLevel, parsed)
  }

  return next
}

const particleWeightOptions = [
  { value: "0.125", label: "1/8x" },
  { value: "0.25", label: "1/4x" },
  { value: "0.5", label: "1/2x" },
  { value: "1", label: "1x" },
  { value: "2", label: "2x" },
  { value: "4", label: "4x" },
  { value: "8", label: "8x" },
]

const getParticleWeightIndex = (value: string) => {
  const parsed = parseNumberish(value)
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < particleWeightOptions.length; index += 1) {
    const candidate = parseNumberish(particleWeightOptions[index].value)
    const distance = Math.abs(candidate - parsed)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  }

  return nearestIndex
}

type SliderFieldProps = {
  label: string
  tooltip?: TooltipKey
  value: Accessor<string>
  onInput: (next: string) => string
  min: number
  max: number
  step: number
}

const SliderField = (props: SliderFieldProps) => {
  const parsed = createMemo(() => {
    const value = Math.floor(parseNumberish(props.value()))
    return Math.max(props.min, Math.min(props.max, value))
  })

  return (
    <div class="grid gap-1.5">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex items-center gap-2">
          <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </label>
          <Show when={props.tooltip}>
            <Tooltip content={props.tooltip!} />
          </Show>
        </div>
        <span class="text-xs font-bold text-ink/80 dark:text-white/80">{parsed()}%</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={String(parsed())}
        onInput={(event) => props.onInput(String(Math.floor(parseNumberish(event.currentTarget.value))))}
        class="h-2 w-full cursor-pointer appearance-none rounded-full bg-ink/15 accent-[#12a89d] dark:bg-white/20"
      />
      <div class="flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/55 dark:text-white/55">
        <span>{props.min}%</span>
        <span>{props.max}%</span>
      </div>
    </div>
  )
}

type ParticleWeightSliderProps = {
  label: string
  value: Accessor<string>
  onInput: (next: string) => string
  tooltip?: TooltipKey
}

const ParticleWeightSlider = (props: ParticleWeightSliderProps) => {
  const selectedIndex = createMemo(() => getParticleWeightIndex(props.value()))
  const selectedOption = createMemo(() => particleWeightOptions[selectedIndex()])

  return (
    <div class="grid gap-1.5">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex items-center gap-2">
          <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </label>
          <Show when={props.tooltip}>
            <Tooltip content={props.tooltip!} />
          </Show>
        </div>
        <span class="text-xs font-bold text-ink/80 dark:text-white/80">{selectedOption().label}</span>
      </div>
      <input
        type="range"
        min={0}
        max={particleWeightOptions.length - 1}
        step={1}
        value={String(selectedIndex())}
        onInput={(event) => {
          const index = Math.max(
            0,
            Math.min(particleWeightOptions.length - 1, Math.floor(parseNumberish(event.currentTarget.value))),
          )
          props.onInput(particleWeightOptions[index].value)
        }}
        class="h-2 w-full cursor-pointer appearance-none rounded-full bg-ink/15 accent-[#12a89d] dark:bg-white/20"
      />
      <div class="flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/55 dark:text-white/55">
        <span>{particleWeightOptions[0].label}</span>
        <span>{particleWeightOptions[particleWeightOptions.length - 1].label}</span>
      </div>
    </div>
  )
}

export const FactoryLeftColumn = () => {
  const factory = useFactoryContext()
  const [notationInput, setNotationInput] = createSignal("")
  const [isNotationEditing, setIsNotationEditing] = createSignal(false)

  const shortNotation = createMemo(() => toShortNotation(factory.nodeLevels()))

  const applyNotation = (raw: string) => {
    const parsedLevels = parseNotation(raw)
    factory.setNodeLevels(parsedLevels)
    setNotationInput(toShortNotation(parsedLevels))
  }

  createEffect(() => {
    const nextShortNotation = shortNotation()
    if (!isNotationEditing()) {
      setNotationInput(nextShortNotation)
    }
  })

  return (
    <>
      <InfoCard>
        <div class="grid gap-1">
          <IntegerField
            label="Particle levels"
            value={factory.totalParticleLevel()}
            onInput={factory.setTotalParticleLevel}
            min={0}
            step={1}
            tooltip="factory.particleLevel"
          />
          <IntegerField
            label="Prestige fills"
            value={factory.prestigesDone()}
            onInput={factory.setPrestigesDone}
            min={0}
            step={1}
            tooltip="factory.prestiges"
          />
          <DisplayField
            label="Points"
            tooltip="factory.points"
            value={`${factory.availablePoints()} / ${factory.totalPoints()}`}
          />
          <TextInputField
            tooltip="factory.notation"
            label="Build"
            value={notationInput()}
            onInput={setNotationInput}
            onFocus={() => setIsNotationEditing(true)}
            onBlur={(next) => {
              applyNotation(next)
              setIsNotationEditing(false)
            }}
          />
        </div>
      </InfoCard>

      <InfoCard title="Evaluation weights" tooltip="factory.weights">
        <div class="grid gap-3">
          <SliderField
            label="Fabricator output"
            value={factory.productionWeightPercent}
            onInput={factory.setProductionWeightPercent}
            min={0}
            max={50}
            step={10}
          />
          <ParticleWeightSlider
            label="Particle output"
            value={factory.particleWeightMultiplier}
            onInput={factory.setParticleWeightMultiplier}
          />
        </div>
      </InfoCard>
    </>
  )
}
