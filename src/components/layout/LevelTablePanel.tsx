import { Index, Show, type JSX } from "solid-js"
import { formatCompactMultiplier, formatPercentFromRatio } from "../../lib/numberFormat"
import { parseNumberish } from "../../lib/parseNumber"
import { ActionButton } from "../ui/ActionButton"
import { DataTable, TABLE_FRAME_CLASS, TABLE_HEAD_CELL_CLASS, TABLE_ROW_CLASS, TableHead } from "./dataTable"

export type LevelTableRow<Id extends string> = {
  id: Id
  label: string
  level: number
  maxLevel: number
  unlocked: boolean
  affordable: boolean
  nextCost: number | null
  nextBonusMultiplier: number
  nextBonusPerPoint: number
  relativeBonusPerPoint: number
}

type LevelTablePanelProps<Id extends string> = {
  rows: LevelTableRow<Id>[]
  bestNodeId: Id | null
  optimalLevels: Record<Id, number>
  isOptimal: boolean
  optimality: string
  onBuyNext: () => void
  onApplyOptimal: () => void
  onReset: () => void
  onSetLevel: (id: Id, level: number) => void
  footer?: JSX.Element
}

const cellClass = "px-2 py-1 text-ink/80 dark:text-white/80"

export const LevelTablePanel = <Id extends string>(props: LevelTablePanelProps<Id>) => {
  const bestRow = () => props.rows.find((row) => row.id === props.bestNodeId) ?? null
  const showOptimalColumn = () => !props.isOptimal

  return (
    <div class="grid gap-3">
      <div class={TABLE_FRAME_CLASS}>
        <div class="space-y-2 border-b border-ink/10 px-2.5 py-2 dark:border-white/10">
          <p class="text-xs font-semibold text-ink/80 dark:text-white/80">Your build is {props.optimality} optimal.</p>
          <div class="flex flex-wrap items-center gap-1.5">
            <ActionButton onClick={props.onBuyNext} disabled={!bestRow()?.affordable} title="Buy next best">
              Buy next
            </ActionButton>
            <ActionButton onClick={props.onApplyOptimal} disabled={!showOptimalColumn()} title="Apply optimal build">
              Apply optimal
            </ActionButton>
            <ActionButton onClick={props.onReset} title="Reset all nodes">
              Reset
            </ActionButton>
          </div>
        </div>
        <DataTable>
          <TableHead>
            <tr>
              <th class={TABLE_HEAD_CELL_CLASS} colSpan={2}>
                Node
              </th>
              <Show when={showOptimalColumn()}>
                <th class={TABLE_HEAD_CELL_CLASS}>Optimal</th>
              </Show>
              <th class={TABLE_HEAD_CELL_CLASS}>Cost</th>
              <th class={`${TABLE_HEAD_CELL_CLASS} max-[400px]:hidden`}>Bonus</th>
              <th class={TABLE_HEAD_CELL_CLASS}>Value</th>
            </tr>
          </TableHead>
          <tbody>
            <Index each={props.rows}>
              {(row) => {
                const hasNext = () => row().nextCost !== null && row().nextBonusPerPoint > 0
                return (
                  <tr
                    class={TABLE_ROW_CLASS}
                    classList={{
                      "bg-[#12a89d]/10 dark:bg-[#8ce3ff]/10": props.bestNodeId === row().id && row().affordable,
                      "opacity-55": !row().unlocked,
                    }}
                  >
                    <td class="px-2 py-1 font-semibold text-ink dark:text-white">{row().label}</td>
                    <td class="px-2 py-1">
                      <input
                        type="number"
                        value={String(row().level)}
                        min={0}
                        max={row().maxLevel}
                        step={1}
                        disabled={!row().unlocked}
                        onInput={(event) =>
                          props.onSetLevel(row().id, Math.floor(parseNumberish(event.currentTarget.value)))
                        }
                        class="w-12 rounded border border-ink/20 bg-white px-1.5 py-0.5 text-right text-xs font-medium text-ink outline-none ring-brand/40 transition focus:ring disabled:cursor-not-allowed disabled:bg-ink/5 dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
                      />
                    </td>
                    <Show when={showOptimalColumn()}>
                      <td class="px-2 py-1">
                        <div class="w-14 px-1.5 py-0.5 text-xs font-medium text-ink/85 dark:text-white/85">
                          {props.optimalLevels[row().id]}
                        </div>
                      </td>
                    </Show>
                    <td class={cellClass}>{hasNext() ? row().nextCost : "-"}</td>
                    <td class={`${cellClass} max-[400px]:hidden`}>
                      {hasNext() ? formatCompactMultiplier(row().nextBonusMultiplier) : "-"}
                    </td>
                    <td class={cellClass}>
                      {hasNext() ? formatPercentFromRatio(row().relativeBonusPerPoint, 0) : "-"}
                    </td>
                  </tr>
                )
              }}
            </Index>
          </tbody>
        </DataTable>
        <Show when={props.footer}>
          <div class="border-t border-ink/10 px-2.5 py-2 dark:border-white/10">{props.footer}</div>
        </Show>
      </div>
    </div>
  )
}
