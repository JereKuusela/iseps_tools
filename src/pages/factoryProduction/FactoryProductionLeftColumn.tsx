import { For } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { IntegerField, MultiplierField, NumberField, SelectField, ToggleField } from "../../components/ui/formControls"
import { FACTORY_PRODUCTION_RESOURCE_BY_ID, FACTORY_PRODUCTION_RESOURCES } from "./factoryProductionTypes"
import { useFactoryProductionContext } from "./factoryProductionContext"

export const FactoryProductionLeftColumn = () => {
  const factory = useFactoryProductionContext()

  return (
    <>
      <InfoCard title="Resource output">
        <div class="grid gap-1">
          <For each={FACTORY_PRODUCTION_RESOURCES}>
            {(resource) => (
              <NumberField
                label={`${FACTORY_PRODUCTION_RESOURCE_BY_ID[resource].name} /h`}
                value={factory.resourceOutputs()[resource]}
                onInput={(next) => factory.setResourceOutput(resource, next)}
              />
            )}
          </For>
        </div>
      </InfoCard>
      <InfoCard title="Pricing" tooltip="factoryProduction.pricing">
        <div class="grid gap-3">
          <ToggleField
            label="24 hour shifts"
            checked={factory.twentyFourHourShifts()}
            onChange={factory.setTwentyFourHourShifts}
            tooltip="factoryProduction.shifts"
          />
          <IntegerField
            label="Quality Control"
            value={factory.qualityControlLevel()}
            onInput={factory.setQualityControlLevel}
            min={0}
            max={20}
            step={1}
            tooltip="factoryProduction.qualityControl"
          />
          <MultiplierField
            label="Global sell"
            value={factory.globalSellMultiplier()}
            onInput={factory.setGlobalSellMultiplier}
            tooltip="factoryProduction.globalMultiplier"
          />
          <MultiplierField
            label="Household"
            value={factory.categoryMultipliers().household}
            onInput={(next) => factory.setCategoryMultiplier("household", next)}
            tooltip="factoryProduction.categoryMultiplier"
          />
          <MultiplierField
            label="Industrial"
            value={factory.categoryMultipliers().industrial}
            onInput={(next) => factory.setCategoryMultiplier("industrial", next)}
            tooltip="factoryProduction.categoryMultiplier"
          />
          <MultiplierField
            label="Electronics"
            value={factory.categoryMultipliers().electronics}
            onInput={(next) => factory.setCategoryMultiplier("electronics", next)}
            tooltip="factoryProduction.categoryMultiplier"
          />
          <MultiplierField
            label="Consumables"
            value={factory.categoryMultipliers().consumables}
            onInput={(next) => factory.setCategoryMultiplier("consumables", next)}
            tooltip="factoryProduction.categoryMultiplier"
          />
        </div>
      </InfoCard>

      <InfoCard
        title="Manufacturers"
        headerActions={
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="rounded-lg border border-ink/20 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/85 transition hover:bg-ink hover:text-white dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
              onClick={factory.addManufacturer}
              title="Append manufacturer"
            >
              +
            </button>
            <button
              type="button"
              class="rounded-lg border border-ink/20 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/85 transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
              onClick={factory.popManufacturer}
              disabled={factory.manufacturerRows().length <= 1}
              title="Remove last manufacturer"
            >
              -
            </button>
          </div>
        }
      >
        <div class="space-y-2">
          <For each={factory.manufacturerRows()}>
            {(row, index) => (
              <div class="rounded-xl border border-ink/10 bg-white/60 p-2.5 dark:border-white/15 dark:bg-[#182336]/70">
                <div class="grid gap-2">
                  <SelectField
                    label={`Manufacturer ${index() + 1}`}
                    value={row.productId}
                    onChange={(next) => factory.setManufacturerProduct(row.id, next)}
                    options={factory.productOptions()}
                  />
                </div>
              </div>
            )}
          </For>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-ink/25 bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/85 transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
              onClick={factory.fillEmptyManufacturers}
              disabled={!factory.canFillEmptyManufacturers()}
              title="Fill empty manufacturers with best products"
            >
              Fill empty
            </button>
            <button
              type="button"
              class="rounded-lg border border-ink/25 bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/85 transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
              onClick={factory.applyOptimal}
              disabled={factory.isOptimal()}
              title="Apply optimal manufacturer setup"
            >
              Apply optimal
            </button>
            <button
              type="button"
              class="rounded-lg border border-ink/25 bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/85 transition hover:bg-ink hover:text-white dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
              onClick={factory.resetAll}
              title="Clear selected products"
            >
              Reset
            </button>
          </div>
        </div>
      </InfoCard>
    </>
  )
}
