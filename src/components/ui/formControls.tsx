import * as TextField from "@kobalte/core/text-field"
import { createMemo, createSignal } from "solid-js"
import { Tooltip } from "./Tooltip"

type NumberFieldProps = {
  label: string
  value: string
  onInput: (next: string) => void
  placeholder?: string
  hint?: string
  min?: number
  max?: number
  step?: number
  tooltip?: string
  inline?: boolean
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
  tooltip?: string
  inline?: boolean
}

type PercentFieldProps = {
  label: string
  value: string
  onInput: (next: string) => void
  placeholder?: string
  hint?: string
  tooltip?: string
  inline?: boolean
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
    const hasMantissa = /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(mantissa)
    if (!hasMantissa) return false
    return /^[+-]?\d*$/.test(exponent)
  }

  return /^[+-]?(?:\d*\.?\d*)$/.test(mantissa)
}

export const NumberField = (props: NumberFieldProps) => {
  const onChange = (next: string) => {
    const normalized = sanitizeNumberishInput(next)
    if (!isValidNumberishInput(normalized)) return
    props.onInput(normalized)
  }

  return (
    <TextField.Root value={props.value} onChange={onChange} class="grid gap-1.5">
      {props.inline ? (
        <div class="grid grid-cols-[auto_1fr] items-center gap-2">
          <div class="flex items-center gap-2">
            <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              {props.label}
            </TextField.Label>
            {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
          </div>
          <TextField.Input
            type="text"
            inputMode="decimal"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            value={props.value}
            placeholder={props.placeholder}
            class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          />
        </div>
      ) : (
        <>
          <div class="flex items-center gap-2">
            <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              {props.label}
            </TextField.Label>
            {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
          </div>
          <TextField.Input
            type="text"
            inputMode="decimal"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            value={props.value}
            placeholder={props.placeholder}
            class="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          />
        </>
      )}
      {props.hint ? <p class="text-xs text-ink/60 dark:text-white/60">{props.hint}</p> : null}
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

  return (
    <TextField.Root value={props.value} onChange={onChange} class="grid gap-1.5">
      {props.inline ? (
        <div class="grid grid-cols-[auto_1fr] items-center gap-2">
          <div class="flex items-center gap-2">
            <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              {props.label}
            </TextField.Label>
            {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
          </div>
          <TextField.Input
            type="number"
            inputMode="numeric"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            value={props.value}
            placeholder={props.placeholder}
            class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          />
        </div>
      ) : (
        <>
          <div class="flex items-center gap-2">
            <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              {props.label}
            </TextField.Label>
            {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
          </div>
          <TextField.Input
            type="text"
            inputMode="numeric"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            value={props.value}
            placeholder={props.placeholder}
            class="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          />
        </>
      )}
      {props.hint ? <p class="text-xs text-ink/60 dark:text-white/60">{props.hint}</p> : null}
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
  if (!Number.isFinite(parsed)) return "0%"
  return `${(parsed * 100).toString()}%`
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
      {props.inline ? (
        <div class="grid grid-cols-[auto_1fr] items-center gap-2">
          <div class="flex items-center gap-2">
            <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              {props.label}
            </TextField.Label>
            {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
          </div>
          <TextField.Input
            type="text"
            inputMode="decimal"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            value={displayedValue()}
            onInput={(event) => onInput(event.currentTarget.value)}
            onFocus={() => {
              setEditingValue(toEditablePercentValue(props.value))
              setIsFocused(true)
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={props.placeholder}
            class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          />
        </div>
      ) : (
        <>
          <div class="flex items-center gap-2">
            <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              {props.label}
            </TextField.Label>
            {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
          </div>
          <TextField.Input
            type="text"
            inputMode="decimal"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            value={displayedValue()}
            onInput={(event) => onInput(event.currentTarget.value)}
            onFocus={() => {
              setEditingValue(toEditablePercentValue(props.value))
              setIsFocused(true)
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={props.placeholder}
            class="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          />
        </>
      )}
      {props.hint ? <p class="text-xs text-ink/60 dark:text-white/60">{props.hint}</p> : null}
    </TextField.Root>
  )
}

type ToggleFieldProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
  tooltip?: string
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
  tooltip?: string
  inline?: boolean
}

export const SelectField = (props: SelectFieldProps) => {
  return (
    <div class="grid gap-1.5">
      {props.inline ? (
        <div class="grid grid-cols-[auto_1fr] items-center gap-2">
          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              {props.label}
            </label>
            {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
          </div>
          <select
            value={props.value}
            onChange={(event) => props.onChange(event.currentTarget.value)}
            class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          >
            {props.options.map((option) => (
              <option value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              {props.label}
            </label>
            {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
          </div>
          <select
            value={props.value}
            onChange={(event) => props.onChange(event.currentTarget.value)}
            class="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          >
            {props.options.map((option) => (
              <option value={option.value}>{option.label}</option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}
