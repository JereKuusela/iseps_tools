import { For } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { ActionButton } from "../../components/ui/ActionButton"
import {
  CheckboxField,
  IntegerField,
  MultiplierField,
  NumberField,
  SelectField,
} from "../../components/ui/formControls"
import {
  FACTORY_PRODUCTION_RESOURCE_BY_ID,
  FACTORY_PRODUCTION_RESOURCES,
  FACTORY_PRODUCTION_TIME_UNITS,
  type FactoryProductionTimeUnit,
} from "./factoryProductionTypes"
import { useFactoryProductionContext } from "./factoryProductionContext"

export const FactoryProductionInputs = () => {
  const factory = useFactoryProductionContext()

  return (
    <>
      <InfoCard title="Resources">
        <div class="grid gap-1">
          <For each={FACTORY_PRODUCTION_RESOURCES}>
            {(resource) => (
              <NumberField
                label={
                  <span class="inline-flex items-center gap-2">
                    <span
                      class="h-2.5 w-2.5 rounded-full"
                      style={{ "background-color": FACTORY_PRODUCTION_RESOURCE_BY_ID[resource].color }}
                    />
                    {FACTORY_PRODUCTION_RESOURCE_BY_ID[resource].name}
                  </span>
                }
                value={factory.resourceOutputs()[resource]}
                onInput={(next) => factory.setResourceOutput(resource, next)}
              />
            )}
          </For>
          <SelectField
            label="Resources per"
            value={factory.resourceUnit()}
            onChange={(next) => factory.setResourceUnit(next as FactoryProductionTimeUnit)}
            options={FACTORY_PRODUCTION_TIME_UNITS}
          />
          <SelectField
            label="Stats per"
            value={factory.statsUnit()}
            onChange={(next) => factory.setStatsUnit(next as FactoryProductionTimeUnit)}
            options={FACTORY_PRODUCTION_TIME_UNITS}
          />
        </div>
      </InfoCard>
      <InfoCard title="Pricing" tooltip="factoryProduction.pricing">
        <div class="grid gap-3">
          <CheckboxField
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
            label="Sell value"
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
            <ActionButton onClick={factory.addManufacturer} title="Append manufacturer">
              +
            </ActionButton>
            <ActionButton
              onClick={factory.popManufacturer}
              disabled={factory.manufacturerRows().length <= 1}
              title="Remove last manufacturer"
            >
              -
            </ActionButton>
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

          <div class="flex flex-wrap items-center gap-2">
            <ActionButton
              size="sm"
              onClick={factory.fillEmptyManufacturers}
              disabled={!factory.canFillEmptyManufacturers()}
              title="Fill empty manufacturers with best products"
            >
              Fill empty
            </ActionButton>
            <ActionButton
              size="sm"
              onClick={factory.applyOptimal}
              disabled={factory.isOptimal()}
              title="Apply optimal manufacturer setup"
            >
              Apply optimal
            </ActionButton>
            <ActionButton size="sm" onClick={factory.resetAll} title="Clear selected products">
              Reset
            </ActionButton>
          </div>
        </div>
      </InfoCard>
    </>
  )
}
