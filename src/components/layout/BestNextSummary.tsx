import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import type { JSX } from "solid-js"
import { InfoCard } from "./contentBlocks"

export type BestNextRow = {
  item: string
  targetLevel: string | number | null
  value: string
  data: string
  id?: string | number
}

export type BulkActionOption = {
  label: string
  onClick: () => void
}

type BestNextSummaryProps = {
  buyAction: () => void
  buyDisabled?: boolean
  buyLabel?: string
  bulkActions?: BulkActionOption[]
  rowAction?: (id: string | number) => void
  footer: JSX.Element
  rows: BestNextRow[]
  dataHeader: string
  columnRatios?: [number, number, number]
}

export const BestNextSummary = (props: BestNextSummaryProps) => {
  const [isActionsOpen, setIsActionsOpen] = createSignal(false)
  let actionsMenuRef: HTMLDivElement | undefined
  const hasRowAction = () => !!props.rowAction
  const bestRow = () => props.rows[0]
  const tableRows = () => props.rows.slice(1)
  const columnWidths = createMemo(() => {
    const ratios = props.columnRatios ?? [50, 25, 25]
    const sanitized = ratios.map((value) => (Number.isFinite(value) && value > 0 ? value : 1)) as [
      number,
      number,
      number,
    ]
    const total = sanitized[0] + sanitized[1] + sanitized[2]
    return sanitized.map((value) => `${(value / total) * 100}%`) as [string, string, string]
  })

  onMount(() => {
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!actionsMenuRef) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (!actionsMenuRef.contains(target)) {
        setIsActionsOpen(false)
      }
    }

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActionsOpen(false)
      }
    }

    document.addEventListener("pointerdown", onDocumentPointerDown)
    document.addEventListener("keydown", onDocumentKeyDown)

    onCleanup(() => {
      document.removeEventListener("pointerdown", onDocumentPointerDown)
      document.removeEventListener("keydown", onDocumentKeyDown)
    })
  })

  const handleBulkAction = (action: () => void) => {
    action()
    setIsActionsOpen(false)
  }

  return (
    <InfoCard contentClass="">
      <div class={`grid gap-3 lg:grid-cols-[390px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start`}>
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 lg:col-start-1 lg:row-start-1">
          <div class="rounded-xl border border-ink/10 bg-gradient-to-br from-mist via-white to-mist/70 p-3 dark:border-white/15 dark:from-[#263954] dark:via-[#22344d] dark:to-[#1c2c41]">
            <p class="text-xs uppercase tracking-[0.12em] text-ink/65 dark:text-white/65">Best next</p>
            <p class="mt-1 text-lg font-black text-ink dark:text-white">
              {bestRow()
                ? bestRow()!.targetLevel === null
                  ? bestRow()!.item
                  : `${bestRow()!.item} → ${bestRow()!.targetLevel}`
                : "-"}
            </p>
            <p class="mt-1 text-2xl font-black leading-none text-accent dark:text-[#8ce3ff]">
              {bestRow()?.data ?? "-"}
            </p>
          </div>

          <div class="grid grid-rows-2 gap-2">
            <button
              type="button"
              class="h-14 w-14 rounded-xl border border-ink/25 bg-white/90 text-2xl text-ink/85 transition hover:-translate-y-0.5 hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
              onClick={props.buyAction}
              disabled={props.buyDisabled}
              title={props.buyLabel ?? "Buy best next"}
              aria-label={props.buyLabel ?? "Buy best next"}
            >
              🛒
            </button>

            <Show when={(props.bulkActions?.length ?? 0) > 0} fallback={<div class="h-14 w-14" />}>
              <div class="relative" ref={actionsMenuRef}>
                <button
                  type="button"
                  class="h-14 w-14 rounded-xl border border-ink/25 bg-white/90 px-1 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-ink/85 transition hover:-translate-y-0.5 hover:bg-ink hover:text-white dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
                  aria-haspopup="menu"
                  aria-expanded={isActionsOpen()}
                  onClick={() => setIsActionsOpen((current) => !current)}
                >
                  Bulk buy
                </button>
                <Show when={isActionsOpen()}>
                  <div class="absolute right-0 top-full z-50 pt-1">
                    <div class="w-40 overflow-hidden rounded-lg border border-ink/15 bg-white shadow-lg dark:border-white/20 dark:bg-[#22344d]">
                      <For each={props.bulkActions ?? []}>
                        {(option) => (
                          <button
                            type="button"
                            class="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-ink/85 transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white focus-visible:outline-none dark:text-white/85 dark:hover:bg-white dark:hover:text-ink dark:focus-visible:bg-white dark:focus-visible:text-ink"
                            onClick={() => handleBulkAction(option.onClick)}
                          >
                            {option.label}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-ink/10 bg-white dark:border-white/15 dark:bg-[#22344d] lg:col-start-1 lg:row-start-2">
          {props.footer}
        </div>

        <div class="overflow-hidden rounded-xl border border-ink/10 bg-white dark:border-white/15 dark:bg-[#22344d] lg:col-start-2 lg:row-span-2">
          <table class="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
            <colgroup>
              <col style={{ width: columnWidths()[0] }} />
              <col style={{ width: columnWidths()[1] }} />
              <col style={{ width: columnWidths()[2] }} />
              <Show when={hasRowAction()}>
                <col style={{ width: "2.5rem" }} />
              </Show>
            </colgroup>
            <thead class="bg-mist/80 text-[11px] uppercase tracking-[0.08em] text-ink/70 dark:bg-[#1a2a3f] dark:text-white/70 sm:text-xs">
              <tr>
                <th class="px-2 py-1.5">Item</th>
                <th class="px-2 py-1.5">Value</th>
                <th class="px-2 py-1.5">{props.dataHeader}</th>
                <Show when={hasRowAction()}>
                  <th class="px-2 py-1.5 text-center"></th>
                </Show>
              </tr>
            </thead>
            <tbody>
              <For each={tableRows()}>
                {(row) => (
                  <tr class="border-t border-ink/10 dark:border-white/10">
                    <td class="truncate px-2 py-1 font-semibold text-ink dark:text-white">{row.item}</td>
                    <td class="whitespace-nowrap px-2 py-1 text-ink/80 dark:text-white/80">{row.value}</td>
                    <td class="whitespace-nowrap px-2 py-1 text-ink/80 dark:text-white/80">{row.data}</td>
                    <Show when={hasRowAction()}>
                      <td class="px-2 py-1 text-center">
                        <button
                          type="button"
                          class="h-6 w-6 rounded-md border border-ink/25 bg-white/90 text-xs text-ink/85 transition hover:-translate-y-0.5 hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
                          onClick={() => props.rowAction?.(row.id ?? row.item)}
                          aria-label={"Buy next level for " + row.item}
                        >
                          🛒
                        </button>
                      </td>
                    </Show>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </InfoCard>
  )
}
