import { createMemo, Show, type Accessor } from "solid-js"
import { parseNumberish } from "../../lib/parseNumber"
import type { TooltipKey } from "../../lib/tooltips"
import { Tooltip } from "./Tooltip"

const SLIDER_CLASS =
  "h-2 w-full cursor-pointer appearance-none rounded-full bg-ink/15 accent-[#12a89d] dark:bg-white/20"
const LABEL_CLASS = "text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75"
const RANGE_LABELS_CLASS =
  "flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/55 dark:text-white/55"

type SliderHeaderProps = {
  label: string
  tooltip?: TooltipKey
  display: string
}

const SliderHeader = (props: SliderHeaderProps) => (
  <div class="flex items-center justify-between gap-2">
    <div class="min-w-0 flex items-center gap-2">
      <label class={LABEL_CLASS}>{props.label}</label>
      <Show when={props.tooltip}>
        <Tooltip content={props.tooltip!} />
      </Show>
    </div>
    <span class="text-xs font-bold text-ink/80 dark:text-white/80">{props.display}</span>
  </div>
)

type SliderFieldProps = {
  label: string
  tooltip?: TooltipKey
  value: Accessor<string>
  onInput: (next: string) => string
  min: number
  max: number
  step: number
}

export const SliderField = (props: SliderFieldProps) => {
  const parsed = createMemo(() => {
    const value = Math.floor(parseNumberish(props.value()))
    return Math.max(props.min, Math.min(props.max, value))
  })

  return (
    <div class="grid gap-1.5">
      <SliderHeader label={props.label} tooltip={props.tooltip} display={`${parsed()}%`} />
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={String(parsed())}
        onInput={(event) => props.onInput(String(Math.floor(parseNumberish(event.currentTarget.value))))}
        class={SLIDER_CLASS}
      />
      <div class={RANGE_LABELS_CLASS}>
        <span>{props.min}%</span>
        <span>{props.max}%</span>
      </div>
    </div>
  )
}

export type SliderOption = { value: string; label: string }

type OptionSliderFieldProps = {
  label: string
  tooltip?: TooltipKey
  options: SliderOption[]
  value: Accessor<string>
  onInput: (next: string) => string
}

const getNearestOptionIndex = (options: SliderOption[], value: string) => {
  const parsed = parseNumberish(value)
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < options.length; index += 1) {
    const distance = Math.abs(parseNumberish(options[index].value) - parsed)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  }

  return nearestIndex
}

export const OptionSliderField = (props: OptionSliderFieldProps) => {
  const selectedIndex = createMemo(() => getNearestOptionIndex(props.options, props.value()))

  return (
    <div class="grid gap-1.5">
      <SliderHeader label={props.label} tooltip={props.tooltip} display={props.options[selectedIndex()].label} />
      <input
        type="range"
        min={0}
        max={props.options.length - 1}
        step={1}
        value={String(selectedIndex())}
        onInput={(event) => {
          const index = Math.max(
            0,
            Math.min(props.options.length - 1, Math.floor(parseNumberish(event.currentTarget.value))),
          )
          props.onInput(props.options[index].value)
        }}
        class={SLIDER_CLASS}
      />
      <div class={RANGE_LABELS_CLASS}>
        <span>{props.options[0].label}</span>
        <span>{props.options[props.options.length - 1].label}</span>
      </div>
    </div>
  )
}
