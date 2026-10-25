import { splitProps, type JSX } from "solid-js"

const BASE_CLASS =
  "border border-ink/25 bg-white/90 text-ink/85 transition hover:bg-ink hover:text-white disabled:cursor-not-allowed dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"

const SIZE_CLASSES = {
  xs: "rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] disabled:opacity-40",
  sm: "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] disabled:opacity-40",
  menu: "grid h-8 min-w-[78px] place-items-center rounded-lg px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] hover:-translate-y-0.5 disabled:opacity-40",
  icon: "h-6 w-6 rounded-md text-xs hover:-translate-y-0.5 disabled:opacity-35",
  tile: "h-14 w-14 rounded-xl text-2xl hover:-translate-y-0.5 disabled:opacity-35",
  tileText:
    "h-14 w-14 rounded-xl px-1 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] hover:-translate-y-0.5 disabled:opacity-35",
} as const

export type ActionButtonSize = keyof typeof SIZE_CLASSES

type ActionButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ActionButtonSize
}

export const ActionButton = (props: ActionButtonProps) => {
  const [local, rest] = splitProps(props, ["size", "class", "type"])

  return (
    <button
      type={local.type ?? "button"}
      class={`${BASE_CLASS} ${SIZE_CLASSES[local.size ?? "xs"]} ${local.class ?? ""}`.trim()}
      {...rest}
    />
  )
}
