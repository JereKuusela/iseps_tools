import { For } from "solid-js"
import { capitalize } from "../../lib/textFormat"
import { InfoCard } from "../../components/layout/contentBlocks"
import { DataTable, GRID_CELL_BORDER_CLASS, TableHead } from "../../components/layout/dataTable"
import { CheckboxField, IntegerField } from "../../components/ui/formControls"
import { setHoverTitle } from "../../components/ui/hoverTitle"
import {
  GRID_LABEL_CELL_CLASS as labelCellClass,
  GRID_VALUE_CELL_CLASS as valueCellClass,
  GridEmptyCell,
  GridNumberInput,
} from "../../components/ui/GridCellInputs"
import { ResourceLabel } from "../../components/ui/ResourceLabel"
import { PARTICLE_ORDER } from "../../lib/particles"
import { useCrystalsContext } from "./crystalsContext"
import type { CrystalUpgrade } from "./crystalsTypes"

const GP_BOOSTER_ID = "special.gpBooster"

const GROUPS = [
  { group: "output", label: "Output" },
  { group: "cost", label: "Cost" },
  { group: "oneTimer", label: "Bundle" },
] as const

export const CrystalsLevelInputs = () => {
  const crystals = useCrystalsContext()

  const isDimmed = (id: string) => !crystals.isUnlocked(id) && Number(crystals.levelText(id)) <= 0
  const requirementTitle = (id: string) => (isDimmed(id) ? crystals.unmetRequirements(id).join("\n") : undefined)

  const find = (group: CrystalUpgrade["group"], particle: string) =>
    crystals.upgrades().find((upgrade) => upgrade.group === group && upgrade.particle === particle)

  const renderCell = (upgrade: CrystalUpgrade | undefined) => {
    if (!upgrade) return <GridEmptyCell />

    const dimmed = () => (isDimmed(upgrade.id) ? " opacity-40" : "")

    if (upgrade.maxLevel === 1) {
      return (
        <input
          type="checkbox"
          onMouseEnter={(event) => setHoverTitle(event.currentTarget, () => requirementTitle(upgrade.id))}
          checked={crystals.levelText(upgrade.id) === "1"}
          onChange={(event) => crystals.setLevel(upgrade.id, event.currentTarget.checked ? "1" : "0")}
          class={`accent-accent${dimmed()}`}
          aria-label={upgrade.name}
        />
      )
    }

    return (
      <GridNumberInput
        value={crystals.levelText(upgrade.id)}
        max={upgrade.maxLevel}
        title={() => requirementTitle(upgrade.id)}
        dimmed={isDimmed(upgrade.id)}
        onInput={(next) => crystals.setLevel(upgrade.id, next)}
      />
    )
  }

  const specialUpgrades = () =>
    crystals
      .upgrades()
      .filter((upgrade) => upgrade.group === "special" || (upgrade.group === "output" && !upgrade.particle))
  const oneTimers = () => crystals.upgrades().filter((upgrade) => upgrade.group === "oneTimer" && !upgrade.particle)

  const renderWideTable = () => (
    <div class="overflow-x-auto">
      <DataTable>
        <TableHead>
          <tr>
            <th class={`${labelCellClass} bg-mist/80 dark:bg-[#1a2a3f]`}>Track</th>
            <For each={PARTICLE_ORDER}>
              {(particle) => (
                <th class={`${GRID_CELL_BORDER_CLASS} px-1 py-1.5 text-center`}>
                  <ResourceLabel resource={particle}>{capitalize(particle)}</ResourceLabel>
                </th>
              )}
            </For>
          </tr>
        </TableHead>
        <tbody>
          <For each={GROUPS}>
            {({ group, label }) => (
              <tr>
                <td class={`${labelCellClass} bg-white font-semibold text-ink dark:bg-[#22344d] dark:text-white`}>
                  {label}
                </td>
                <For each={PARTICLE_ORDER}>
                  {(particle) => <td class={valueCellClass}>{renderCell(find(group, particle))}</td>}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </DataTable>
    </div>
  )

  const renderTallTable = () => (
    <div class="overflow-x-auto">
      <DataTable>
        <TableHead tight>
          <tr>
            <th class={`${labelCellClass} bg-mist/80 dark:bg-[#1a2a3f]`}>Particle</th>
            <For each={GROUPS}>
              {({ label }) => <th class={`${GRID_CELL_BORDER_CLASS} px-1 py-1.5 text-center`}>{label}</th>}
            </For>
          </tr>
        </TableHead>
        <tbody>
          <For each={PARTICLE_ORDER}>
            {(particle) => (
              <tr>
                <td class={`${labelCellClass} bg-white font-semibold text-ink dark:bg-[#22344d] dark:text-white`}>
                  <ResourceLabel resource={particle}>{capitalize(particle)}</ResourceLabel>
                </td>
                <For each={GROUPS}>
                  {({ group }) => <td class={valueCellClass}>{renderCell(find(group, particle))}</td>}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </DataTable>
    </div>
  )

  return (
    <div class="grid gap-3">
      <InfoCard title="Particle upgrades">
        <div class="lg:hidden">{renderTallTable()}</div>
        <div class="hidden lg:block">{renderWideTable()}</div>
      </InfoCard>

      <div class="grid gap-3 xl:grid-cols-2 xl:items-start">
        <InfoCard title="Special levels">
          <div class="grid gap-1">
            <For each={specialUpgrades()}>
              {(upgrade) => (
                <IntegerField
                  label={upgrade.name}
                  tooltip={upgrade.id === GP_BOOSTER_ID ? "crystal.gpBooster" : undefined}
                  value={crystals.levelText(upgrade.id)}
                  dimmed={isDimmed(upgrade.id)}
                  title={() => requirementTitle(upgrade.id)}
                  min={0}
                  max={upgrade.maxLevel}
                  step={1}
                  onInput={(next) => crystals.setLevel(upgrade.id, next)}
                />
              )}
            </For>
          </div>
        </InfoCard>

        <InfoCard title="One-timers">
          <div class="grid gap-x-10 gap-y-1 sm:grid-cols-2">
            <For each={oneTimers()}>
              {(upgrade) => (
                <CheckboxField
                  label={upgrade.name}
                  checked={crystals.levelText(upgrade.id) === "1"}
                  dimmed={isDimmed(upgrade.id)}
                  title={() => requirementTitle(upgrade.id)}
                  onChange={(checked) => crystals.setLevel(upgrade.id, checked ? "1" : "0")}
                />
              )}
            </For>
          </div>
        </InfoCard>
      </div>
    </div>
  )
}
