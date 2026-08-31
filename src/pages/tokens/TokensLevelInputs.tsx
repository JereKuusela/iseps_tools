import { For } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { IntegerField } from "../../components/ui/formControls"
import { PARTICLE_ORDER, useTokensContext } from "./tokensContext"
import type { TokenId } from "./tokenTypes"

const RESOURCE_ORDER = ["cash", ...PARTICLE_ORDER] as const
const MOBILE_SPLIT_INDEX = Math.ceil(RESOURCE_ORDER.length / 2)
const MOBILE_RESOURCE_GROUPS = [RESOURCE_ORDER.slice(0, MOBILE_SPLIT_INDEX), RESOURCE_ORDER.slice(MOBILE_SPLIT_INDEX)]
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

const borderClass = "border border-ink/15 dark:border-white/15"
const labelCellClass = `${borderClass} px-2 py-1`
// Outline instead of border color so the highlight is not swallowed by collapsed borders.
const valueCellClass = `${borderClass} p-0 text-center align-middle focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-brand/40`
const inputClass =
  "w-full bg-transparent px-1 py-1 text-center text-xs font-medium text-ink outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:text-white"
const emptyCellClass = "block px-1 py-1 text-ink/40 dark:text-white/40"

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
      if (!outputId) return <span class={emptyCellClass}>-</span>

      const maxLevel = upgradeMaxById().get(outputId) ?? 0

      return (
        <input
          type="number"
          value={tokens.outputLevelsByResource()[resource] ?? "0"}
          min={0}
          max={maxLevel}
          step={1}
          disabled={!unlocked}
          onInput={(event) =>
            tokens.setOutputLevelByResource(resource, clampToRange(event.currentTarget.value, maxLevel))
          }
          class={inputClass}
        />
      )
    }

    const id = getUpgradeId(group, resource)
    if (!id) return <span class={emptyCellClass}>-</span>

    const unlocked = isSupplyOrBbBotUnlocked(resource)
    const maxLevel = upgradeMaxById().get(id) ?? 0
    return (
      <input
        type="number"
        value={tokens.levels()[id] ?? "0"}
        min={0}
        max={maxLevel}
        step={1}
        disabled={!unlocked}
        onInput={(event) => tokens.setUpgradeLevel(id, clampToRange(event.currentTarget.value, maxLevel))}
        class={inputClass}
      />
    )
  }

  const renderTable = (resources: readonly string[]) => (
    <div class="overflow-x-auto">
      <table class="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
        <thead class="bg-mist/80 text-[11px] uppercase tracking-[0.08em] text-ink/70 dark:bg-[#1a2a3f] dark:text-white/70 sm:text-xs">
          <tr>
            <th class={`${labelCellClass} sticky left-0 z-10 bg-mist/80 dark:bg-[#1a2a3f]`}>Track</th>
            <For each={resources}>
              {(resource) => <th class={`${borderClass} px-1 py-1.5 text-center`}>{toTitle(resource)}</th>}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={["output", "supplies", "bbbot"] as const}>
            {(group) => (
              <tr>
                <td
                  class={`${labelCellClass} sticky left-0 z-10 bg-white font-semibold text-ink dark:bg-[#22344d] dark:text-white`}
                >
                  {GROUP_LABELS[group]}
                </td>
                <For each={resources}>
                  {(resource) => <td class={valueCellClass}>{renderCell(group, resource)}</td>}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  )

  return (
    <div class="grid gap-3">
      <InfoCard title="Upgrade levels">
        <div class="grid gap-3 lg:hidden">
          <For each={MOBILE_RESOURCE_GROUPS}>{(resources) => renderTable(resources)}</For>
        </div>
        <div class="hidden lg:block">{renderTable(RESOURCE_ORDER)}</div>
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
