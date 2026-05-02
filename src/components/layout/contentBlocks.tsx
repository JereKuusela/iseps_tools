import type { JSX, ParentProps } from "solid-js"

type InfoCardProps = ParentProps<{
  title?: string
  class?: string
  titleClass?: string
  contentClass?: string
}>

export const InfoCard = (props: InfoCardProps) => {
  const cardClass = `rounded-2xl border border-ink/15 bg-white/70 p-4 dark:border-white/15 dark:bg-[#182538]/75 ${props.class ?? ""}`
  const headingClass = `text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80 ${props.titleClass ?? ""}`

  return (
    <div class={cardClass.trim()}>
      {props.title ? <h3 class={headingClass.trim()}>{props.title}</h3> : null}
      <div class={props.contentClass ?? (props.title ? "mt-3" : "")}>{props.children}</div>
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
