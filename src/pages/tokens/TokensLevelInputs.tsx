import { For } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { DataTable, GRID_CELL_BORDER_CLASS, TableHead } from "../../components/layout/dataTable"
import { IntegerField } from "../../components/ui/formControls"
import {
  GRID_LABEL_CELL_CLASS as labelCellClass,
  GRID_VALUE_CELL_CLASS as valueCellClass,
  GridEmptyCell,
  GridNumberInput,
} from "../../components/ui/GridCellInputs"
import { PARTICLE_ORDER } from "../../lib/particles"
import { useTokensContext } from "./tokensContext"
import type { TokenId } from "./tokenTypes"

const RESOURCE_ORDER = ["cash", ...PARTICLE_ORDER] as const
const GROUPS = ["output", "supplies", "bbbot"] as const
const SPECIAL_UPGRADE_IDS = [
  "supplies.tokenBonus",
  "supplies.crystalBonus",
  "bbbot.duration",
  "bbbot.tokenBonus",
] as const

const GROUP_LABELS = {
  output: "Output",
  supplies: "Supplies",
  bbbot: "BB-Bot",
} as const

type SpecialRow = {
  id: (typeof SPECIAL_UPGRADE_IDS)[number]
  label: string
  maxLevel: number
}

const toTitle = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const borderClass = GRID_CELL_BORDER_CLASS

export const TokensLevelInputs = () => {
  const tokens = useTokensContext()
  const upgradeMaxById = () => new Map(tokens.upgrades().map((upgrade) => [upgrade.id, upgrade.maxLevel] as const))
  const upgradeById = () => new Map(tokens.upgrades().map((upgrade) => [upgrade.id, upgrade] as const))

  const resourceRank = (resource: string) => PARTICLE_ORDER.indexOf(resource as (typeof PARTICLE_ORDER)[number])
  const unlockedRank = () => resourceRank(tokens.unlockedParticle())

  const isOutputUnlocked = (resource: string) => {
    if (resource === "cash") return true
    const rank = resourceRank(resource)
    if (rank < 0) return false
    return rank <= unlockedRank()
  }

  const isSupplyOrBbBotUnlocked = (resource: string) => {
    if (resource === "gamma") return tokens.unlockGammaSuppliesBbBot()
    if (resource === "helion") return tokens.unlockHelionSuppliesBbBot()
    return true
  }

  const getUpgradeId = (group: "supplies" | "bbbot", resource: string) => {
    const id = `${group}.${resource}` as TokenId
    return tokens.upgrades().some((upgrade) => upgrade.id === id) ? id : null
  }

  const getOutputUpgradeId = (resource: string) => {
    const id = `output.${resource}` as TokenId
    return tokens.upgrades().some((upgrade) => upgrade.id === id) ? id : null
  }

  const clampToRange = (value: string, max: number) =>
    String(Math.min(max, Math.max(0, Math.floor(Number(value) || 0))))

  const specialRows = (): SpecialRow[] =>
    SPECIAL_UPGRADE_IDS.flatMap((id) => {
      const upgrade = upgradeById().get(id)
      if (!upgrade) return []

      return [
        {
          id,
          label: upgrade.label,
          maxLevel: upgrade.maxLevel,
        },
      ]
    })

  const renderCell = (group: "output" | "supplies" | "bbbot", resource: string) => {
    if (group === "output") {
      const unlocked = isOutputUnlocked(resource)
      const outputId = getOutputUpgradeId(resource)
      if (!outputId) return <GridEmptyCell />

      const maxLevel = upgradeMaxById().get(outputId) ?? 0

      return (
        <GridNumberInput
          value={tokens.outputLevelsByResource()[resource] ?? "0"}
          max={maxLevel}
          disabled={!unlocked}
          onInput={(next) => tokens.setOutputLevelByResource(resource, clampToRange(next, maxLevel))}
        />
      )
    }

    const id = getUpgradeId(group, resource)
    if (!id) return <GridEmptyCell />

    const unlocked = isSupplyOrBbBotUnlocked(resource)
    const maxLevel = upgradeMaxById().get(id) ?? 0
    return (
      <GridNumberInput
        value={tokens.levels()[id] ?? "0"}
        max={maxLevel}
        disabled={!unlocked}
        onInput={(next) => tokens.setUpgradeLevel(id, clampToRange(next, maxLevel))}
      />
    )
  }

  const renderWideTable = () => (
    <div class="overflow-x-auto">
      <DataTable>
        <TableHead>
          <tr>
            <th class={`${labelCellClass} bg-mist/80 dark:bg-[#1a2a3f]`}>Track</th>
            <For each={RESOURCE_ORDER}>
              {(resource) => <th class={`${borderClass} px-1 py-1.5 text-center`}>{toTitle(resource)}</th>}
            </For>
          </tr>
        </TableHead>
        <tbody>
          <For each={GROUPS}>
            {(group) => (
              <tr>
                <td class={`${labelCellClass} bg-white font-semibold text-ink dark:bg-[#22344d] dark:text-white`}>
                  {GROUP_LABELS[group]}
                </td>
                <For each={RESOURCE_ORDER}>
                  {(resource) => <td class={valueCellClass}>{renderCell(group, resource)}</td>}
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
            <th class={`${labelCellClass} bg-mist/80 dark:bg-[#1a2a3f]`}>Resource</th>
            <For each={GROUPS}>
              {(group) => <th class={`${borderClass} px-1 py-1.5 text-center`}>{GROUP_LABELS[group]}</th>}
            </For>
          </tr>
        </TableHead>
        <tbody>
          <For each={RESOURCE_ORDER}>
            {(resource) => (
              <tr>
                <td class={`${labelCellClass} bg-white font-semibold text-ink dark:bg-[#22344d] dark:text-white`}>
                  {toTitle(resource)}
                </td>
                <For each={GROUPS}>{(group) => <td class={valueCellClass}>{renderCell(group, resource)}</td>}</For>
              </tr>
            )}
          </For>
        </tbody>
      </DataTable>
    </div>
  )

  return (
    <div class="grid gap-3">
      <InfoCard title="Upgrade levels">
        <div class="lg:hidden">{renderTallTable()}</div>
        <div class="hidden lg:block">{renderWideTable()}</div>
      </InfoCard>

      <InfoCard title="Special levels" class="xl:max-w-[calc((100%-0.75rem)/3)]">
        <div class="grid gap-1">
          <For each={specialRows()}>
            {(row) => (
              <IntegerField
                label={row.label}
                value={tokens.levels()[row.id] ?? "0"}
                min={0}
                max={row.maxLevel}
                step={1}
                onInput={(next) => tokens.setUpgradeLevel(row.id, clampToRange(next, row.maxLevel))}
              />
            )}
          </For>
        </div>
      </InfoCard>
    </div>
  )
}
