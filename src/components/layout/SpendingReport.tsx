import { ArrowDown, ArrowUp, ChartPie } from "lucide-solid"
import { createMemo, createSignal, For, Show } from "solid-js"
import {
  sortSpendingRows,
  type SpendingReport as SpendingReportData,
  type SpendingReportSort,
} from "../../lib/spendingReport"
import { ReportDialog } from "../ui/ReportDialog"
import { SpendingDonut } from "../ui/SpendingDonut"
import { Tooltip } from "../ui/Tooltip"
import { DataTable, TABLE_ROW_CLASS } from "./dataTable"

type SpendingReportProps = {
  title: string
  currency: string
  report: SpendingReportData
  disabled?: boolean
  formatAmount: (value: number) => string
}

export const SpendingReport = (props: SpendingReportProps) => {
  const [sort, setSort] = createSignal<SpendingReportSort | null>(null)
  const [groupBySection, setGroupBySection] = createSignal(true)
  const displayedSections = createMemo(() =>
    groupBySection()
      ? props.report.sections
      : [
          {
            id: "all",
            name: "",
            spent: props.report.total,
            rows: props.report.sections.flatMap((section) => section.rows),
          },
        ],
  )
  const columns = [
    { key: "name", label: "Upgrade" },
    { key: "level", label: "Level" },
    { key: "spent", label: "Spent" },
  ] as const
  const toggleSort = (column: SpendingReportSort["column"]) => {
    const initial = column === "name" ? "ascending" : "descending"
    setSort((current) => {
      if (current?.column !== column) return { column, direction: initial }
      if (current.direction !== initial) return null
      return { column, direction: initial === "ascending" ? "descending" : "ascending" }
    })
  }

  return (
    <ReportDialog
      title={props.title}
      description={`Spending implied by current upgrade levels at current prices, in ${props.currency}.`}
      disabled={props.disabled}
      trigger={<ChartPie size={18} aria-hidden="true" />}
    >
      <SpendingDonut sections={props.report.sections} currency={props.currency} formatAmount={props.formatAmount} />
      <div class="mb-2 mt-5 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <h3 class="text-sm font-bold">Upgrades</h3>
          <Tooltip raw content="Click a column header to sort upgrades." />
        </div>
        <label class="flex cursor-pointer items-center gap-2 text-xs">
          <span>Group by section</span>
          <input
            type="checkbox"
            role="switch"
            checked={groupBySection()}
            onChange={(event) => setGroupBySection(event.currentTarget.checked)}
            class="peer sr-only"
          />
          <span
            aria-hidden="true"
            class="relative h-5 w-9 shrink-0 rounded-full bg-ink/25 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand dark:bg-white/25"
          />
        </label>
      </div>
      <Show
        when={props.report.sections.some((section) => section.rows.some((row) => row.level > 0))}
        fallback={
          <p class="border-t border-ink/15 py-5 text-center text-sm text-ink/65 dark:border-white/15 dark:text-white/65">
            No purchases.
          </p>
        }
      >
        <DataTable>
          <colgroup>
            <col />
            <col class="w-[20%]" />
            <col class="w-[35%]" />
          </colgroup>
          <thead class="bg-mist text-xs dark:bg-[#22344d]">
            <tr>
              <For each={columns}>
                {(column) => (
                  <th
                    scope="col"
                    aria-sort={sort()?.column === column.key ? sort()!.direction : "none"}
                    class="font-semibold"
                  >
                    <button
                      type="button"
                      class={`flex min-h-10 w-full items-center gap-1 p-2 ${column.key === "name" ? "justify-start" : "justify-end"}`}
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                      <span class="inline-flex h-3 w-3 shrink-0 items-center justify-center">
                        <Show when={sort()?.column === column.key}>
                          <Show
                            when={sort()?.direction === "ascending"}
                            fallback={<ArrowDown size={12} aria-hidden="true" />}
                          >
                            <ArrowUp size={12} aria-hidden="true" />
                          </Show>
                        </Show>
                      </span>
                    </button>
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <For each={displayedSections()}>
            {(section) => (
              <Show when={section.rows.some((row) => row.level > 0)}>
                <tbody>
                  <Show when={groupBySection()}>
                    <tr class="border-y border-ink/15 bg-mist/80 dark:border-white/15 dark:bg-[#22344d]">
                      <th scope="rowgroup" colSpan={2} class="break-words p-2 font-semibold">
                        {section.name}
                      </th>
                      <td class="break-all p-2 text-right font-mono font-semibold">
                        {props.formatAmount(section.spent)}
                      </td>
                    </tr>
                  </Show>
                  <For each={sortSpendingRows(section.rows, sort())}>
                    {(row) => (
                      <tr class={TABLE_ROW_CLASS}>
                        <th scope="row" class="break-words p-2 font-normal">
                          {row.name}
                        </th>
                        <td class="p-2 text-right font-mono text-xs tabular-nums">
                          {row.maxLevel === 1 ? (row.level > 0 ? "Bought" : "-") : row.level.toLocaleString("en-US")}
                        </td>
                        <td class="break-all p-2 text-right font-mono tabular-nums">{props.formatAmount(row.spent)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </Show>
            )}
          </For>
        </DataTable>
      </Show>
    </ReportDialog>
  )
}
