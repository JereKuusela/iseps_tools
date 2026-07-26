import { For, createMemo } from "solid-js"
import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import {
  FACTORY_PRODUCTION_ITEM_BY_ID,
  FACTORY_PRODUCTION_NONE_PRODUCT_ID,
  FACTORY_PRODUCTION_RESOURCE_BY_ID,
  FACTORY_PRODUCTION_RESOURCES,
} from "./factoryProductionTypes"
import { useFactoryProductionContext } from "./factoryProductionContext"

const SECONDS_PER_HOUR = 3600

const toPerHour = (valuePerSecond: number) => valuePerSecond * SECONDS_PER_HOUR

const formatValue = (value: number, digits = 2) => {
  if (!Number.isFinite(value)) return "0"
  const abs = Math.abs(value)
  if (abs === 0) return "0"
  if (abs >= 1e6) return value.toExponential(2)
  if (abs >= 1000) return value.toFixed(0)
  return value.toFixed(digits)
}

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return "0%"
  return `${Math.max(0, value).toFixed(1)}%`
}

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
    <div class="grid gap-3">
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
          <table class="w-full min-w-[500px] table-fixed border-collapse text-left text-xs sm:text-sm">
            <thead class="bg-mist/80 text-[11px] uppercase tracking-[0.08em] text-ink/70 dark:bg-[#1a2a3f] dark:text-white/70 sm:text-xs">
              <tr>
                <th class="px-2 py-1.5">Product</th>
                <th class="px-2 py-1.5">Output/h</th>
                <th class="px-2 py-1.5">Sell</th>
                <th class="px-2 py-1.5">Profit/h</th>
              </tr>
            </thead>
            <tbody>
              <For each={factory.result().manufacturers}>
                {(row) => (
                  <tr class="border-t border-ink/10 dark:border-white/10">
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
          </table>
        </div>
      </InfoCard>

      <InfoCard title="Resource balance">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[520px] table-fixed border-collapse text-left text-xs sm:text-sm">
            <thead class="bg-mist/80 text-[11px] uppercase tracking-[0.08em] text-ink/70 dark:bg-[#1a2a3f] dark:text-white/70 sm:text-xs">
              <tr>
                <th class="px-2 py-1.5">Resource</th>
                <th class="px-2 py-1.5">Supplied/h</th>
                <th class="px-2 py-1.5">Required/h</th>
                <th class="px-2 py-1.5">Wasted %</th>
              </tr>
            </thead>
            <tbody>
              <For each={FACTORY_PRODUCTION_RESOURCES}>
                {(resource) => {
                  return (
                    <tr class="border-t border-ink/10 dark:border-white/10">
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
                        {formatPercent(factory.result().resourceBalances[resource].wastedPercent)}
                      </td>
                    </tr>
                  )
                }}
              </For>
            </tbody>
          </table>
        </div>
      </InfoCard>
    </div>
  )
}
