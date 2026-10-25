import type { ParentProps } from "solid-js"

export const TABLE_FRAME_CLASS =
  "overflow-hidden rounded-xl border border-ink/10 bg-white dark:border-white/15 dark:bg-[#22344d]"
export const TABLE_ROW_CLASS = "border-t border-ink/10 dark:border-white/10"
export const TABLE_HEAD_CELL_CLASS = "px-2 py-1.5"
export const GRID_CELL_BORDER_CLASS = "border border-ink/15 dark:border-white/15"

export const DataTable = (props: ParentProps<{ class?: string }>) => (
  <table class={`w-full table-fixed border-collapse text-left text-xs sm:text-sm ${props.class ?? ""}`.trim()}>
    {props.children}
  </table>
)

type TableHeadProps = ParentProps<{
  /** Narrower letter spacing below the `sm` breakpoint. */
  tight?: boolean
}>

export const TableHead = (props: TableHeadProps) => (
  <thead
    class={`bg-mist/80 text-[11px] uppercase text-ink/70 dark:bg-[#1a2a3f] dark:text-white/70 sm:text-xs ${
      props.tight ? "tracking-[0.04em] sm:tracking-[0.08em]" : "tracking-[0.08em]"
    }`}
  >
    {props.children}
  </thead>
)
