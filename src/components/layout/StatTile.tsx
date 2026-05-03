import type { JSX } from "solid-js"

type StatTileProps = {
  label: string
  value: JSX.Element | string
  secondary?: JSX.Element | string
  action?: JSX.Element
  class?: string
}

export const StatTile = (props: StatTileProps) => {
  const tileClass = `rounded-xl border border-ink/10 bg-mist/70 p-3 dark:border-white/15 dark:bg-[#23344d] ${props.class ?? ""}`

  return (
    <div class={tileClass.trim()}>
      <p class="text-xs uppercase tracking-[0.12em] text-ink/65 dark:text-white/65">{props.label}</p>
      <p class="mt-1 text-lg font-bold text-ink dark:text-white">{props.value}</p>
      {props.secondary ? <p class="text-xs text-ink/70 dark:text-white/70">{props.secondary}</p> : null}
      {props.action ? <div class="mt-2">{props.action}</div> : null}
    </div>
  )
}
