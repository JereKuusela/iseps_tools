import { Show, createMemo, createSignal, type JSX } from "solid-js"
import { Tooltip } from "./Tooltip"
import { TooltipKey } from "../../lib/tooltips"
import { blurOnEnterOrEscape, isValidNumberishInput, sanitizeNumberishInput } from "./formControls"

type SummaryInputModalProps = {
  label: string
  value: string
  tooltip?: TooltipKey
  onInput?: (next: string) => void
  valueFormat?: "plain" | "multiplier"
  children: JSX.Element
}

export const SummaryInputModal = (props: SummaryInputModalProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [isInputFocused, setIsInputFocused] = createSignal(false)
  const [editingValue, setEditingValue] = createSignal("")

  const valueFormat = () => props.valueFormat ?? "plain"
  const isEditable = () => !!props.onInput

  const formatMultiplier = (value: string) => {
    const normalized = sanitizeNumberishInput(value)
    if (normalized === "") return "x0.00"
    if (!isValidNumberishInput(normalized)) return normalized

    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) return "x0.00"
    return `x${parsed.toFixed(2)}`
  }

  const toEditableMultiplier = (value: string) => {
    const normalized = sanitizeNumberishInput(value)
    if (normalized === "") return ""
    if (!isValidNumberishInput(normalized)) return ""

    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) return ""
    return parsed.toString()
  }

  const displayedValue = createMemo(() => {
    if (isEditable() && isInputFocused()) return editingValue()
    if (valueFormat() === "multiplier") return formatMultiplier(props.value)
    return props.value
  })

  const handleEditableInput = (next: string) => {
    if (!props.onInput) return

    if (valueFormat() === "multiplier") {
      const normalized = sanitizeNumberishInput(next.replace(/^x/i, ""))
      if (normalized === "") {
        setEditingValue("")
        props.onInput("")
        return
      }

      if (!isValidNumberishInput(normalized)) return
      setEditingValue(normalized)

      const parsed = Number(normalized)
      if (!Number.isFinite(parsed)) return
      props.onInput(parsed.toString())
      return
    }

    setEditingValue(next)
    props.onInput(next)
  }

  return (
    <div
      class="relative"
      onFocusOut={(event) => {
        const related = event.relatedTarget
        if (related instanceof Node && event.currentTarget.contains(related)) return
        setIsOpen(false)
      }}
      onKeyDown={(event) => event.key === "Escape" && setIsOpen(false)}
    >
      <div class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-2">
        <div class="min-w-0 flex items-center gap-1.5 pt-1.5">
          <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </label>
          <Show when={props.tooltip}>
            <Tooltip content={props.tooltip!} />
          </Show>
        </div>

        <input
          type="text"
          readOnly={!isEditable()}
          value={displayedValue()}
          onInput={(event) => handleEditableInput(event.currentTarget.value)}
          onKeyDown={blurOnEnterOrEscape}
          onFocus={() => {
            if (isEditable()) {
              setEditingValue(valueFormat() === "multiplier" ? toEditableMultiplier(props.value) : props.value)
              setIsInputFocused(true)
            }
            setIsOpen(true)
          }}
          onBlur={() => setIsInputFocused(false)}
          onClick={() => setIsOpen(true)}
          class={`w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white ${isEditable() ? "" : "cursor-pointer"}`}
        />
      </div>

      <Show when={isOpen()}>
        <div class="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 rounded-2xl border border-ink/20 bg-white p-3 shadow-xl dark:border-white/20 dark:bg-[#1a2638]">
          <div class="grid gap-2">{props.children}</div>
        </div>
      </Show>
    </div>
  )
}
