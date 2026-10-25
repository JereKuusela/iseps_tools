import { For, createMemo } from "solid-js"
import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import { DataTable, TABLE_HEAD_CELL_CLASS, TABLE_ROW_CLASS, TableHead } from "../../components/layout/dataTable"
import { formatCompactValue as formatValue, formatPercent } from "../../lib/numberFormat"
import { toPerHour } from "../../lib/timeFormat"
import {
  FACTORY_PRODUCTION_ITEM_BY_ID,
  FACTORY_PRODUCTION_NONE_PRODUCT_ID,
  FACTORY_PRODUCTION_RESOURCE_BY_ID,
  FACTORY_PRODUCTION_RESOURCES,
} from "./factoryProductionTypes"
import { useFactoryProductionContext } from "./factoryProductionContext"

export const FactoryProductionRightColumn = () => {
  const factory = useFactoryProductionContext()

  const optimalProductSummary = createMemo(() => {
    const counts = new Map<string, number>()

    for (const row of factory.optimalManufacturerRows()) {
      if (row.productId === FACTORY_PRODUCTION_NONE_PRODUCT_ID) continue
      counts.set(row.productId, (counts.get(row.productId) ?? 0) + 1)
    }

    return [...counts.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) return right[1] - left[1]
        const leftName = FACTORY_PRODUCTION_ITEM_BY_ID[left[0]]?.name ?? left[0]
        const rightName = FACTORY_PRODUCTION_ITEM_BY_ID[right[0]]?.name ?? right[0]
        return leftName.localeCompare(rightName)
      })
      .map(([productId, count]) => ({
        count,
        name: FACTORY_PRODUCTION_ITEM_BY_ID[productId]?.name ?? productId,
      }))
  })

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-3">
      <InfoCard title="Optimizer">
        <div class="space-y-2">
          <p class="text-xs font-semibold text-ink/80 dark:text-white/80">
            Your setup is {factory.optimality()} optimal.
          </p>
          <MetricRow label="Current profit / h" value={formatValue(toPerHour(factory.result().totalProfitPerSecond))} />
          <MetricRow
            label="Optimal profit / h"
            value={formatValue(toPerHour(factory.optimalResult().totalProfitPerSecond))}
            withBorder={false}
          />
          <div class="rounded-lg border border-ink/10 bg-white/60 px-2.5 py-2 text-xs text-ink/80 dark:border-white/15 dark:bg-[#182336]/70 dark:text-white/80">
            <p class="mb-1 font-semibold uppercase tracking-[0.08em] text-ink/70 dark:text-white/70">Optimal mix</p>
            <For each={optimalProductSummary()}>
              {(entry) => (
                <p>
                  {entry.count}x {entry.name}
                </p>
              )}
            </For>
            <p class="text-ink/60 dark:text-white/60" classList={{ hidden: optimalProductSummary().length > 0 }}>
              No profitable assignment with current resources.
            </p>
          </div>
        </div>
      </InfoCard>

      <InfoCard title="Summary">
        <div>
          <MetricRow label="Items / h" value={formatValue(toPerHour(factory.result().totalOutputPerSecond))} />
          <MetricRow
            label="Profit / h"
            value={formatValue(toPerHour(factory.result().totalProfitPerSecond))}
            valueClass="text-emerald-600 dark:text-emerald-300"
            withBorder={false}
          />
        </div>
      </InfoCard>

      <InfoCard title="Manufacturer output">
        <div class="overflow-x-auto">
          <DataTable>
            <TableHead>
              <tr>
                <th class={TABLE_HEAD_CELL_CLASS}>Product</th>
                <th class={TABLE_HEAD_CELL_CLASS}>Output/h</th>
                <th class={TABLE_HEAD_CELL_CLASS}>Sell</th>
                <th class={TABLE_HEAD_CELL_CLASS}>Profit/h</th>
              </tr>
            </TableHead>
            <tbody>
              <For each={factory.result().manufacturers}>
                {(row) => (
                  <tr class={TABLE_ROW_CLASS}>
                    <td class="px-2 py-1.5">{row.productName}</td>
                    <td class="px-2 py-1.5">{formatValue(toPerHour(row.outputPerSecond))}</td>
                    <td class="px-2 py-1.5">{formatValue(row.effectiveSellPrice)}</td>
                    <td class="px-2 py-1.5 text-emerald-600 dark:text-emerald-300">
                      {formatValue(toPerHour(row.profitPerSecond))}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </DataTable>
        </div>
      </InfoCard>

      <InfoCard title="Resource balance">
        <div class="overflow-x-auto">
          <DataTable>
            <TableHead>
              <tr>
                <th class={TABLE_HEAD_CELL_CLASS}>Resource</th>
                <th class={TABLE_HEAD_CELL_CLASS}>Supplied/h</th>
                <th class={TABLE_HEAD_CELL_CLASS}>Required/h</th>
                <th class={TABLE_HEAD_CELL_CLASS}>Wasted %</th>
              </tr>
            </TableHead>
            <tbody>
              <For each={FACTORY_PRODUCTION_RESOURCES}>
                {(resource) => {
                  return (
                    <tr class={TABLE_ROW_CLASS}>
                      <td class="px-2 py-1.5">
                        <span class="inline-flex items-center gap-2">
                          <span
                            class="h-2.5 w-2.5 rounded-full"
                            style={{ "background-color": FACTORY_PRODUCTION_RESOURCE_BY_ID[resource].color }}
                          />
                          <span>{FACTORY_PRODUCTION_RESOURCE_BY_ID[resource].name}</span>
                        </span>
                      </td>
                      <td class="px-2 py-1.5">
                        {formatValue(factory.result().resourceBalances[resource].suppliedPerHour)}
                      </td>
                      <td class="px-2 py-1.5">
                        {formatValue(factory.result().resourceBalances[resource].requiredPerHour)}
                      </td>
                      <td class="px-2 py-1.5 text-emerald-700 dark:text-emerald-300">
                        {formatPercent(Math.max(0, factory.result().resourceBalances[resource].wastedPercent), 1)}
                      </td>
                    </tr>
                  )
                }}
              </For>
            </tbody>
          </DataTable>
        </div>
      </InfoCard>
    </div>
  )
}
