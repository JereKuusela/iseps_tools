import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import type { JSX } from "solid-js"
import { ActionButton } from "../ui/ActionButton"
import { InfoCard } from "./contentBlocks"
import { DataTable, TABLE_FRAME_CLASS, TABLE_HEAD_CELL_CLASS, TABLE_ROW_CLASS, TableHead } from "./dataTable"

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
  footer?: JSX.Element
  rows: BestNextRow[]
  minRows?: number
  dataHeader: string
  columnRatios?: [number, number, number]
  hideValue?: boolean
}

export const BestNextSummary = (props: BestNextSummaryProps) => {
  const [isActionsOpen, setIsActionsOpen] = createSignal(false)
  let actionsMenuRef: HTMLDivElement | undefined
  const hasRowAction = () => !!props.rowAction
  const bestRow = () => props.rows[0]
  const tableRows = () => props.rows.slice(1)
  const emptyRows = () =>
    Array.from({ length: Math.max(0, (props.minRows ?? 0) - tableRows().length) }, (_, index) => index)
  const columnWidths = createMemo(() => {
    const ratios = props.columnRatios ?? [50, 25, 25]
    const sanitized = ratios.map((value) => (Number.isFinite(value) && value > 0 ? value : 1)) as [
      number,
      number,
      number,
    ]
    const total = sanitized[0] + sanitized[2] + (props.hideValue ? 0 : sanitized[1])
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
            <ActionButton
              size="tile"
              onClick={props.buyAction}
              disabled={props.buyDisabled}
              title={props.buyLabel ?? "Buy best next"}
              aria-label={props.buyLabel ?? "Buy best next"}
            >
              🛒
            </ActionButton>

            <Show when={(props.bulkActions?.length ?? 0) > 0} fallback={<div class="h-14 w-14" />}>
              <div class="relative" ref={actionsMenuRef}>
                <ActionButton
                  size="tileText"
                  aria-haspopup="menu"
                  aria-expanded={isActionsOpen()}
                  onClick={() => setIsActionsOpen((current) => !current)}
                >
                  Bulk buy
                </ActionButton>
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

        <Show when={props.footer}>
          <div class={`${TABLE_FRAME_CLASS} lg:col-start-1 lg:row-start-2`}>{props.footer}</div>
        </Show>

        <div class={`${TABLE_FRAME_CLASS} lg:col-start-2 lg:row-span-2`}>
          <DataTable>
            <colgroup>
              <col style={{ width: columnWidths()[0] }} />
              <Show when={!props.hideValue}>
                <col style={{ width: columnWidths()[1] }} />
              </Show>
              <col style={{ width: columnWidths()[2] }} />
              <Show when={hasRowAction()}>
                <col style={{ width: "2.5rem" }} />
              </Show>
            </colgroup>
            <TableHead>
              <tr>
                <th class={TABLE_HEAD_CELL_CLASS}>Item</th>
                <Show when={!props.hideValue}>
                  <th class={TABLE_HEAD_CELL_CLASS}>Value</th>
                </Show>
                <th class={TABLE_HEAD_CELL_CLASS}>{props.dataHeader}</th>
                <Show when={hasRowAction()}>
                  <th class={`${TABLE_HEAD_CELL_CLASS} text-center`}></th>
                </Show>
              </tr>
            </TableHead>
            <tbody>
              <For each={tableRows()}>
                {(row) => (
                  <tr class={TABLE_ROW_CLASS}>
                    <td class="truncate px-2 py-1 font-semibold text-ink dark:text-white">{row.item}</td>
                    <Show when={!props.hideValue}>
                      <td class="whitespace-nowrap px-2 py-1 text-ink/80 dark:text-white/80">{row.value}</td>
                    </Show>
                    <td class="whitespace-nowrap px-2 py-1 text-ink/80 dark:text-white/80">{row.data}</td>
                    <Show when={hasRowAction()}>
                      <td class="px-2 py-1 text-center">
                        <ActionButton
                          size="icon"
                          onClick={() => props.rowAction?.(row.id ?? row.item)}
                          aria-label={"Buy next level for " + row.item}
                        >
                          🛒
                        </ActionButton>
                      </td>
                    </Show>
                  </tr>
                )}
              </For>
              <For each={emptyRows()}>
                {() => (
                  <tr class={TABLE_ROW_CLASS} aria-hidden="true">
                    <td class="px-2 py-1" colSpan={props.hideValue ? 2 : 3}>
                      {"\u00a0"}
                    </td>
                    <Show when={hasRowAction()}>
                      <td class="px-2 py-1 text-center">
                        <ActionButton size="icon" class="invisible" disabled>
                          🛒
                        </ActionButton>
                      </td>
                    </Show>
                  </tr>
                )}
              </For>
            </tbody>
          </DataTable>
        </div>
      </div>
    </InfoCard>
  )
}
