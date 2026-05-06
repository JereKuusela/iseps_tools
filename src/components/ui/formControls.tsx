import * as TextField from "@kobalte/core/text-field"
import { createMemo, createSignal, type JSX } from "solid-js"
import { formatFixed, formatMultiplier, formatPercentFromRatio } from "../../lib/numberFormat"
import type { TooltipKey } from "../../lib/tooltips"
import { Tooltip } from "./Tooltip"

type NumberFieldProps = {
  label: string
  value: string
  onInput: (next: string) => void
  placeholder?: string
  min?: number
  max?: number
  step?: number
  tooltip?: TooltipKey
  inlineAccessory?: JSX.Element
}

type DecimalFieldProps = NumberFieldProps & {
  digits?: number
}

type IntegerFieldProps = {
  label: string
  value: string
  onInput: (next: string) => void
  placeholder?: string
  hint?: string
  min?: number
  max?: number
  step?: number
  tooltip?: TooltipKey
}

type PercentFieldProps = {
  label: string
  value: string
  onInput: (next: string) => void
  placeholder?: string
  tooltip?: TooltipKey
}

type MultiplierFieldProps = {
  label: string
  value: string
  onInput: (next: string) => void
  placeholder?: string
  tooltip?: TooltipKey
}

type LabelFieldProps = {
  label: string
  value: string
  tooltip?: TooltipKey
}

type MetricFieldProps = {
  label: string
  value: string
  onInput: (next: string) => void
  tooltip?: TooltipKey
  withBorder?: boolean
}

export const sanitizeNumberishInput = (value: string) => {
  const trimmed = value.trim()

  if (trimmed.length >= 2) {
    const first = trimmed[0]
    const last = trimmed[trimmed.length - 1]
    const wrappedInDoubleQuotes = first === '"' && last === '"'
    const wrappedInSingleQuotes = first === "'" && last === "'"

    if (wrappedInDoubleQuotes || wrappedInSingleQuotes) {
      return trimmed.slice(1, -1).trim()
    }
  }
  return trimmed
}

export const isValidNumberishInput = (value: string) => {
  if (value === "") return true
  if (!/^[0-9eE+\-.]+$/.test(value)) return false

  const [mantissa, exponent, ...rest] = value.split(/[eE]/)
  if (rest.length > 0) return false

  if (exponent !== undefined) {
    // Allow transient leading exponent states during typing ("e", "e+", "e-").
    if (mantissa == "") return /^[+-]?\d*$/.test(exponent)
    const hasMantissa = /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(mantissa)
    if (!hasMantissa) return false
    return /^[+-]?\d*$/.test(exponent)
  }

  return /^[+-]?(?:\d*\.?\d*)$/.test(mantissa)
}

export const blurOnEnterOrEscape = (event: KeyboardEvent) => {
  if (event.key !== "Enter" && event.key !== "Escape") return

  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.blur()
  }
}

export const NumberField = (props: NumberFieldProps) => {
  const onChange = (next: string) => {
    const normalized = sanitizeNumberishInput(next)
    if (!isValidNumberishInput(normalized)) return
    props.onInput(normalized)
  }

  return (
    <TextField.Root value={props.value} onChange={onChange} class="grid gap-1.5">
      <div class={"grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2"}>
        <div class={"min-w-0 flex items-center gap-2"}>
          <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </TextField.Label>
          {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
        </div>
        <div class={"min-w-0"}>
          <div class={props.inlineAccessory ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1" : undefined}>
            <TextField.Input
              type="text"
              autocapitalize="off"
              autocomplete="off"
              autocorrect="off"
              spellcheck={false}
              value={props.value}
              placeholder={props.placeholder}
              onKeyDown={blurOnEnterOrEscape}
              class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
            />
            {props.inlineAccessory}
          </div>
        </div>
      </div>
    </TextField.Root>
  )
}

export const MetricField = (props: MetricFieldProps) => {
  const onChange = (next: string) => {
    const normalized = sanitizeNumberishInput(next)
    if (!isValidNumberishInput(normalized)) return
    props.onInput(normalized)
  }

  const rowClass = `grid grid-cols-[1fr_auto] px-2 py-1.5 font-mono text-md font-bold dark:text-white ${props.withBorder === false ? "" : "border-b border-ink/15 dark:border-white/15"}`

  return (
    <TextField.Root value={props.value} onChange={onChange} class="grid gap-0">
      <div class={rowClass}>
        <div class="min-w-0 flex items-center gap-2">
          <TextField.Label>{props.label}</TextField.Label>
          {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
        </div>
        <TextField.Input
          type="text"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          spellcheck={false}
          value={props.value}
          onKeyDown={blurOnEnterOrEscape}
          class="w-[9ch] min-w-[9ch] max-w-[12ch] rounded-xl border border-ink/20 bg-white px-2 py-0.5 text-right text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
        />
      </div>
    </TextField.Root>
  )
}

const zeroDecimalString = (digits: number) => {
  if (digits <= 0) return "0"
  return `0.${"0".repeat(digits)}`
}

const formatDecimalValue = (value: string, digits = 2) => {
  const normalized = sanitizeNumberishInput(value)
  const fallback = zeroDecimalString(digits)
  if (normalized === "") return fallback
  if (!isValidNumberishInput(normalized)) return fallback

  const parsed = Number(normalized)
  return formatFixed(parsed, digits, fallback)
}

export const DecimalField = (props: DecimalFieldProps) => {
  const [isFocused, setIsFocused] = createSignal(false)
  const [editingValue, setEditingValue] = createSignal("")
  const digits = () => props.digits ?? 2
  const fallback = () => zeroDecimalString(digits())

  const displayedValue = createMemo(() => {
    if (isFocused()) return editingValue()
    return formatDecimalValue(props.value, digits())
  })

  const onInput = (next: string) => {
    const normalized = sanitizeNumberishInput(next)
    if (!isValidNumberishInput(normalized)) return

    setEditingValue(normalized)
    props.onInput(normalized)
  }

  const onBlur = (next: string) => {
    const normalized = sanitizeNumberishInput(next)
    if (normalized === "") {
      props.onInput(fallback())
      setEditingValue(fallback())
      setIsFocused(false)
      return
    }

    if (!isValidNumberishInput(normalized)) {
      const normalizedFallback = formatDecimalValue(props.value, digits())
      setEditingValue(normalizedFallback)
      props.onInput(normalizedFallback)
      setIsFocused(false)
      return
    }

    const parsed = Number(normalized)
    const fixed = formatFixed(parsed, digits(), fallback())
    props.onInput(fixed)
    setEditingValue(fixed)
    setIsFocused(false)
  }

  return (
    <TextField.Root value={displayedValue()} class="grid gap-1.5">
      <div class={"grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2"}>
        <div class={"min-w-0 flex items-center gap-2"}>
          <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </TextField.Label>
          {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
        </div>
        <div class={"min-w-0"}>
          <div class={props.inlineAccessory ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1" : undefined}>
            <TextField.Input
              type="text"
              autocapitalize="off"
              autocomplete="off"
              autocorrect="off"
              spellcheck={false}
              value={displayedValue()}
              placeholder={props.placeholder}
              min={props.min}
              max={props.max}
              step={props.step}
              onInput={(event) => onInput(event.currentTarget.value)}
              onKeyDown={blurOnEnterOrEscape}
              onBlur={(event) => onBlur(event.currentTarget.value)}
              onFocus={() => {
                setEditingValue(sanitizeNumberishInput(props.value))
                setIsFocused(true)
              }}
              class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
            />
            {props.inlineAccessory}
          </div>
        </div>
      </div>
    </TextField.Root>
  )
}

const isValidIntegerInput = (value: string) => {
  if (value === "") return true
  return /^[+-]?\d*$/.test(value)
}

export const IntegerField = (props: IntegerFieldProps) => {
  const onChange = (next: string) => {
    const normalized = sanitizeNumberishInput(next)
    if (!isValidIntegerInput(normalized)) return
    props.onInput(normalized)
  }

  const onBlur = (next: string) => {
    if (sanitizeNumberishInput(next) !== "") return
    props.onInput("0")
  }

  return (
    <TextField.Root value={props.value} onChange={onChange} class="grid gap-1.5">
      <div class={"grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2"}>
        <div class={"min-w-0 flex items-center gap-2"}>
          <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </TextField.Label>
          {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
        </div>
        <div class={"min-w-0"}>
          <TextField.Input
            type="number"
            inputMode="numeric"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            min={props.min}
            max={props.max}
            step={props.step}
            value={props.value || "0"}
            placeholder={props.placeholder}
            onKeyDown={blurOnEnterOrEscape}
            onBlur={(event) => onBlur(event.currentTarget.value)}
            class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          />
        </div>
      </div>
    </TextField.Root>
  )
}

const normalizePercentInput = (value: string) => {
  return sanitizeNumberishInput(value.replace(/%/g, ""))
}

const formatPercentValue = (value: string) => {
  const normalized = sanitizeNumberishInput(value)
  if (normalized === "") return "0%"
  if (!isValidNumberishInput(normalized)) return normalized

  const parsed = Number(normalized)
  return formatPercentFromRatio(parsed, undefined, "0%")
}

const toEditablePercentValue = (value: string) => {
  const normalized = sanitizeNumberishInput(value)
  if (normalized === "") return ""
  if (!isValidNumberishInput(normalized)) return ""

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return ""
  return (parsed * 100).toString()
}

export const PercentField = (props: PercentFieldProps) => {
  const [isFocused, setIsFocused] = createSignal(false)
  const [editingValue, setEditingValue] = createSignal("")

  const displayedValue = createMemo(() => {
    if (isFocused()) return editingValue()
    return formatPercentValue(props.value)
  })

  const onInput = (next: string) => {
    const normalized = normalizePercentInput(next)
    if (normalized === "") {
      setEditingValue("")
      props.onInput("")
      return
    }

    if (!isValidNumberishInput(normalized)) return

    setEditingValue(normalized)

    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) return
    props.onInput((parsed / 100).toString())
  }

  return (
    <TextField.Root value={displayedValue()} class="grid gap-1.5">
      <div class={"grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2"}>
        <div class={"min-w-0 flex items-center gap-2"}>
          <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </TextField.Label>
          {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
        </div>
        <div class={"min-w-0"}>
          <TextField.Input
            type="text"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            value={displayedValue()}
            onInput={(event) => onInput(event.currentTarget.value)}
            onKeyDown={blurOnEnterOrEscape}
            onFocus={() => {
              setEditingValue(toEditablePercentValue(props.value))
              setIsFocused(true)
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={props.placeholder}
            class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          />
        </div>
      </div>
    </TextField.Root>
  )
}

const normalizeMultiplierInput = (value: string) => {
  return sanitizeNumberishInput(value.replace(/^x/i, ""))
}

const formatMultiplierValue = (value: string) => {
  const normalized = sanitizeNumberishInput(value)
  if (normalized === "") return "x0.00"
  if (!isValidNumberishInput(normalized)) return normalized

  const parsed = Number(normalized)
  return formatMultiplier(parsed, 2, "x0.00")
}

const toEditableMultiplierValue = (value: string) => {
  const normalized = sanitizeNumberishInput(value)
  if (normalized === "") return ""
  if (!isValidNumberishInput(normalized)) return ""

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return ""
  return parsed.toString()
}

export const MultiplierField = (props: MultiplierFieldProps) => {
  const [isFocused, setIsFocused] = createSignal(false)
  const [editingValue, setEditingValue] = createSignal("")

  const displayedValue = createMemo(() => {
    if (isFocused()) return editingValue()
    return formatMultiplierValue(props.value)
  })

  const onInput = (next: string) => {
    const normalized = normalizeMultiplierInput(next)
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
  }

  return (
    <TextField.Root value={displayedValue()} class="grid gap-1.5">
      <div class={"grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2"}>
        <div class={"min-w-0 flex items-center gap-2"}>
          <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </TextField.Label>
          {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
        </div>
        <div class={"min-w-0"}>
          <TextField.Input
            type="text"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            value={displayedValue()}
            onInput={(event) => onInput(event.currentTarget.value)}
            onKeyDown={blurOnEnterOrEscape}
            onFocus={() => {
              setEditingValue(toEditableMultiplierValue(props.value))
              setIsFocused(true)
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={props.placeholder}
            class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          />
        </div>
      </div>
    </TextField.Root>
  )
}

export const LabelField = (props: LabelFieldProps) => {
  return (
    <div class="grid gap-1.5">
      <div class={"grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2"}>
        <div class={"min-w-0 flex items-center gap-2"}>
          <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </label>
          {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
        </div>
        <div class={"min-w-0"}>
          <p class="w-full bg-white px-2.5 py-1.5 text-sm font-medium text-ink dark:bg-[#1a2638] dark:text-white">
            {props.value}
          </p>
        </div>
      </div>
    </div>
  )
}

type ToggleFieldProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
  tooltip?: TooltipKey
}

export const ToggleField = (props: ToggleFieldProps) => {
  return (
    <label class="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-ink/15 bg-white/70 px-3 py-2.5 transition hover:border-ink/30 dark:border-white/15 dark:bg-[#182336]/75 dark:hover:border-white/30">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-ink/90 dark:text-white/90">{props.label}</span>
          {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
        </div>
        {props.hint ? <p class="mt-0.5 text-xs text-ink/60 dark:text-white/60">{props.hint}</p> : null}
      </div>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
        onKeyDown={blurOnEnterOrEscape}
        class="mt-1 h-4 w-4 rounded border border-ink/40 accent-accent dark:border-white/40"
      />
    </label>
  )
}

type SelectOption = {
  value: string
  label: string
}

type SelectFieldProps = {
  label: string
  value: string
  onChange: (next: string) => void
  options: SelectOption[]
  tooltip?: TooltipKey
}

export const SelectField = (props: SelectFieldProps) => {
  return (
    <div class="grid gap-1.5">
      <div class={"grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2"}>
        <div class={"min-w-0 flex items-center gap-2"}>
          <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </label>
          {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
        </div>
        <div class={"min-w-0"}>
          <select
            value={props.value}
            onChange={(event) => props.onChange(event.currentTarget.value)}
            onKeyDown={blurOnEnterOrEscape}
            class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          >
            {props.options.map((option) => (
              <option value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
