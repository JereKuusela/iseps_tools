import * as TextField from "@kobalte/core/text-field";
import { InfoTooltip } from "./tooltip";

type NumberFieldProps = {
  label: string;
  value: string;
  onInput: (next: string) => void;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  tooltip?: string;
};

export function NumberField(props: NumberFieldProps) {
  return (
    <TextField.Root
      value={props.value}
      onChange={props.onInput}
      class="grid gap-1.5"
    >
      <div class="flex items-center gap-2">
        <TextField.Label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75">
          {props.label}
        </TextField.Label>
        {props.tooltip ? <InfoTooltip content={props.tooltip} /> : null}
      </div>
      <TextField.Input
        type="number"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        placeholder={props.placeholder}
        class="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring"
      />
      {props.hint ? <p class="text-xs text-ink/60">{props.hint}</p> : null}
    </TextField.Root>
  );
}

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  tooltip?: string;
};

export function ToggleField(props: ToggleFieldProps) {
  return (
    <label class="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-ink/15 bg-white/70 px-3 py-2.5 transition hover:border-ink/30">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-ink/90">{props.label}</span>
          {props.tooltip ? <InfoTooltip content={props.tooltip} /> : null}
        </div>
        {props.hint ? (
          <p class="mt-0.5 text-xs text-ink/60">{props.hint}</p>
        ) : null}
      </div>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
        class="mt-1 h-4 w-4 rounded border border-ink/40 accent-accent"
      />
    </label>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: SelectOption[];
  tooltip?: string;
};

export function SelectField(props: SelectFieldProps) {
  return (
    <div class="grid gap-1.5">
      <div class="flex items-center gap-2">
        <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75">
          {props.label}
        </label>
        {props.tooltip ? <InfoTooltip content={props.tooltip} /> : null}
      </div>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        class="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring"
      >
        {props.options.map((option) => (
          <option value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
