import { For } from "solid-js"
import { blurOnEnterOrEscape, isValidNumberishInput, sanitizeNumberishInput } from "../../components/ui/formControls"
import { INPUT_BASE_CLASS } from "../../components/ui/inputStyles"
import { Tooltip } from "../../components/ui/Tooltip"
import type { TooltipKey } from "../../lib/tooltips"

export const PremiumNumberSelectField = (props: {
  id: string
  label: string
  value: string
  onInput: (next: string) => void
  options: number[]
  min: number
  max: number
  step?: number
  tooltip?: TooltipKey
}) => {
  const listId = `premium-${props.id}-list`

  return (
    <div class="grid gap-1.5">
      <div class="flex items-center gap-2">
        <label for={props.id} class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
          {props.label}
        </label>
        {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
      </div>
      <input
        id={props.id}
        list={listId}
        type="text"
        value={props.value}
        onKeyDown={blurOnEnterOrEscape}
        onInput={(event) => {
          const next = sanitizeNumberishInput(event.currentTarget.value)
          if (!isValidNumberishInput(next)) return
          props.onInput(next)
        }}
        class={`w-full ${INPUT_BASE_CLASS} px-3 py-2 text-sm font-medium`}
      />
      <datalist id={listId}>
        <For each={props.options}>{(option) => <option value={option} />}</For>
      </datalist>
    </div>
  )
}
