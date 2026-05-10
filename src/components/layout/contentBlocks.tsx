import { Show, createSignal } from "solid-js"
import type { JSX, ParentProps } from "solid-js"
import { createPersistedSignal } from "../../lib/persistedSignal"
import type { TooltipKey } from "../../lib/tooltips"
import { Tooltip } from "../ui/Tooltip"

type InfoCardProps = ParentProps<{
  title?: string
  tooltip?: TooltipKey
  closable?: boolean
  class?: string
  titleClass?: string
  contentClass?: string
}>

export const InfoCard = (props: InfoCardProps) => {
  const persistKey = props.title
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const [isClosed, setIsClosed] = persistKey
    ? createPersistedSignal(`info-card:${persistKey}:closed`, false)
    : createSignal(false)
  const cardClass = `rounded-2xl border border-ink/15 bg-white/70 p-3 dark:border-white/15 dark:bg-[#182538]/75 ${props.class ?? ""}`
  const headingClass = `text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80 ${props.titleClass ?? ""}`
  const closeClass = `rounded border border-ink/20 bg-white px-2 py-1 text-xs font-bold text-ink transition hover:bg-ink/5 dark:border-white/20 dark:bg-[#233752] dark:text-white dark:hover:bg-[#2f496b] ${isClosed() ? "" : "md:hidden"}`

  const handleToggleClosed = () => {
    setIsClosed((current) => !current)
  }

  return (
    <div class={cardClass.trim()}>
      {props.title || props.closable ? (
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            {props.title ? <h3 class={headingClass.trim()}>{props.title}</h3> : null}
            {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
          </div>
          {props.closable ? (
            <button
              type="button"
              class={closeClass.trim()}
              onClick={handleToggleClosed}
              aria-label={isClosed() ? "Expand section" : "Collapse section"}
            >
              <span aria-hidden="true">{isClosed() ? "▼" : "▲"}</span>
            </button>
          ) : null}
        </div>
      ) : null}
      <Show when={!isClosed()}>
        <div class={props.contentClass ?? (props.title || props.closable ? "mt-3" : "")}>{props.children}</div>
      </Show>
    </div>
  )
}

type MetricRowProps = {
  label: JSX.Element | string
  value: JSX.Element | string
  withBorder?: boolean
  class?: string
  labelClass?: string
  valueClass?: string
}

export const MetricRow = (props: MetricRowProps) => {
  const rowClass = `grid grid-cols-[1fr_auto] px-2 py-1.5 font-mono text-md font-bold dark:text-white ${props.withBorder === false ? "" : "border-b border-ink/15 dark:border-white/15"} ${props.class ?? ""}`

  return (
    <div class={rowClass.trim()}>
      <span class={props.labelClass}>{props.label}</span>
      <span class={props.valueClass ?? "text-accent dark:text-[#8ce3ff]"}>{props.value}</span>
    </div>
  )
}
