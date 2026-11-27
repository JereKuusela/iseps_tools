import { For, type JSX } from "solid-js"
import { IntegerField } from "./formControls"

export type UpgradeCardRow = { label: string; value: JSX.Element | string; valueClass?: string }

type UpgradeCardProps = {
  title: JSX.Element
  level: string
  onLevelInput: (next: string) => void
  min?: number
  max?: number
  rows: UpgradeCardRow[]
  locked?: boolean
  highlight?: boolean
  footer?: JSX.Element
}

export const UpgradeCard = (props: UpgradeCardProps) => (
  <article
    class="rounded-xl border bg-white p-3 dark:bg-[#23344d]"
    classList={{
      "border-ink/15 dark:border-white/15": !props.highlight,
      "border-emerald-500 ring-1 ring-emerald-500/60": props.highlight,
      "opacity-50 grayscale": props.locked,
    }}
  >
    <IntegerField
      label={
        <span class="text-base font-bold normal-case tracking-normal text-ink dark:text-white">{props.title}</span>
      }
      value={props.level}
      onInput={props.onLevelInput}
      step={1}
      min={props.min ?? 0}
      max={props.max}
      align="right"
      dimmed={props.locked}
    />
    <div class="mt-2 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs text-ink/75 dark:text-white/75">
      <For each={props.rows}>
        {(row) => (
          <>
            <span class="font-semibold uppercase tracking-[0.08em] text-ink/60 dark:text-white/60">{row.label}</span>
            <span class={`text-right font-mono ${row.valueClass ?? ""}`}>{row.value}</span>
          </>
        )}
      </For>
    </div>
    {props.footer}
  </article>
)
