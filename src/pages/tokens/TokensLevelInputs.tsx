import { For } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { IntegerField } from "../../components/ui/formControls"
import { PARTICLE_ORDER, useTokensContext } from "./tokensContext"
import type { TokenId } from "./tokenTypes"

const RESOURCE_ORDER = ["cash", ...PARTICLE_ORDER] as const
const SPECIAL_UPGRADE_IDS = [
  "supplies.tokenBonus",
  "supplies.crystalBonus",
  "bbbot.duration",
  "bbbot.tokenBonus",
] as const

type SpecialRow = {
  id: (typeof SPECIAL_UPGRADE_IDS)[number]
  label: string
  maxLevel: number
}

const toTitle = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

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
      if (!outputId) return <span class="text-ink/40 dark:text-white/40">-</span>

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
          class="w-[72px] rounded border border-ink/20 bg-white px-1.5 py-0.5 text-right text-xs font-medium text-ink outline-none ring-brand/40 transition focus:ring disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
        />
      )
    }

    const id = getUpgradeId(group, resource)
    if (!id) return <span class="text-ink/40 dark:text-white/40">-</span>

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
        class="w-[72px] rounded border border-ink/20 bg-white px-1.5 py-0.5 text-right text-xs font-medium text-ink outline-none ring-brand/40 transition focus:ring disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
      />
    )
  }

  return (
    <div class="grid gap-3">
      <InfoCard title="Upgrade levels">
        <div class="overflow-x-auto">
          <table class="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
            <thead class="bg-mist/80 text-[11px] uppercase tracking-[0.08em] text-ink/70 dark:bg-[#1a2a3f] dark:text-white/70 sm:text-xs">
              <tr>
                <th class="sticky left-0 z-10 bg-mist/80 px-2 py-1.5 dark:bg-[#1a2a3f]">Track</th>
                <For each={RESOURCE_ORDER}>
                  {(resource) => <th class="px-2 py-1.5 text-center">{toTitle(resource)}</th>}
                </For>
              </tr>
            </thead>
            <tbody>
              <tr class="border-t border-ink/10 dark:border-white/10">
                <td class="sticky left-0 z-10 bg-white px-2 py-1 font-semibold text-ink dark:bg-[#22344d] dark:text-white">
                  Output
                </td>
                <For each={RESOURCE_ORDER}>
                  {(resource) => <td class="px-2 py-1 text-center align-middle">{renderCell("output", resource)}</td>}
                </For>
              </tr>
              <tr class="border-t border-ink/10 dark:border-white/10">
                <td class="sticky left-0 z-10 bg-white px-2 py-1 font-semibold text-ink dark:bg-[#22344d] dark:text-white">
                  Supplies
                </td>
                <For each={RESOURCE_ORDER}>
                  {(resource) => <td class="px-2 py-1 text-center align-middle">{renderCell("supplies", resource)}</td>}
                </For>
              </tr>
              <tr class="border-t border-ink/10 dark:border-white/10">
                <td class="sticky left-0 z-10 bg-white px-2 py-1 font-semibold text-ink dark:bg-[#22344d] dark:text-white">
                  BB-Bot
                </td>
                <For each={RESOURCE_ORDER}>
                  {(resource) => <td class="px-2 py-1 text-center align-middle">{renderCell("bbbot", resource)}</td>}
                </For>
              </tr>
            </tbody>
          </table>
        </div>
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
