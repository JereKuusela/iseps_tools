import { For, Show, createMemo } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { Tooltip } from "../../components/ui/Tooltip"
import { usePerkData, type PerkExtraKey, type Perk, type PerkRowId } from "../../lib/perkContext"
import { usePerkGuideContext } from "./perkGuideContext"

const colorDotStyle = (hex: string) => ({
  "background-color": hex,
  "border-color": hex.toUpperCase() === "#F4F4F4" ? "#94A3B8" : hex,
})

const inactiveDotStyle = {
  "background-color": "transparent",
  "border-color": "#94A3B8",
}

const sortPerks = (perks: Perk[]) => perks.slice().sort((a, b) => a.tier - b.tier)

const tableCellClass =
  "align-middle border border-ink/15 bg-white/70 px-2 py-1 text-center text-xs dark:border-white/15 dark:bg-[#131f31]"

const tableUnavailableContentClass =
  "inline-flex h-5 w-5 items-center justify-center leading-none text-ink/60 dark:text-white/60"

const tableCellInnerClass = "flex min-h-8 items-center justify-center"

const levelsOneToSeven = [1, 2, 3, 4, 5, 6, 7]
const levelsEightToTen = [8, 9, 10]
const levelsOneToTen = [...levelsOneToSeven, ...levelsEightToTen]
const extrasLabels = ["IP", "M1", "M2", "M3"]

const TableUnavailableContent = () => <span class={tableUnavailableContentClass}>-</span>

const TableEmptyNodeSlot = () => <span class="inline-block h-5 w-5" aria-hidden="true" />

const TableDot = (props: { color: string; inactive?: boolean }) => (
  <span
    class="inline-block h-5 w-5 rounded-full border"
    style={props.inactive ? inactiveDotStyle : colorDotStyle(props.color)}
    aria-hidden="true"
  />
)

const PerkTierCell = (props: { perk: Perk | undefined; isTaken: boolean; color: string }) => (
  <td class={tableCellClass}>
    <div class={tableCellInnerClass}>
      <Show when={props.perk} fallback={<TableUnavailableContent />}>
        <Tooltip content={props.perk!.tooltip} raw asChild>
          <span class="inline-flex h-5 w-5 items-center justify-center">
            <Show when={props.isTaken} fallback={<TableEmptyNodeSlot />}>
              <TableDot color={props.color} />
            </Show>
          </span>
        </Tooltip>
      </Show>
    </div>
  </td>
)

const ExtraValueCell = (props: { tooltip: string | undefined; value: number }) => (
  <td class={tableCellClass}>
    <div class={tableCellInnerClass}>
      <Show when={props.tooltip} fallback={<TableUnavailableContent />}>
        <Tooltip content={props.tooltip!} raw asChild>
          <span class="inline-flex h-5 min-w-5 items-center justify-center leading-none">{props.value}</span>
        </Tooltip>
      </Show>
    </div>
  </td>
)

const ExtraDotCell = (props: { tooltip: string | undefined; active: number | boolean | undefined; color: string }) => (
  <td class={tableCellClass}>
    <div class={tableCellInnerClass}>
      <Show when={props.tooltip} fallback={<TableUnavailableContent />}>
        <Tooltip content={props.tooltip!} raw asChild>
          <span class="inline-flex h-5 w-5 items-center justify-center">
            <Show when={props.active} fallback={<TableEmptyNodeSlot />}>
              <TableDot color={props.color} />
            </Show>
          </span>
        </Tooltip>
      </Show>
    </div>
  </td>
)

export const PerkGuideRightColumn = () => {
  const data = usePerkData()
  const { selectedEntry, rowViews } = usePerkGuideContext()

  const perksByRow = createMemo(() => {
    const mapping = new Map(rowViews().map((row) => [row.row.id, sortPerks(row.activePerks)]))
    return mapping
  })

  const allPerksByRow = createMemo(() => {
    const mapping = new Map<PerkRowId, Perk[]>()

    for (const perk of data().definitions.perks) {
      const current = mapping.get(perk.rowId)
      if (!current) {
        mapping.set(perk.rowId, [perk])
        continue
      }
      current.push(perk)
    }

    for (const perks of mapping.values()) {
      perks.sort((a, b) => a.tier - b.tier)
    }

    return mapping
  })

  const extraByRow = createMemo(() => {
    const mapping = new Map(rowViews().map((row) => [row.row.id, row]))
    return mapping
  })

  const mobileRowViews = createMemo(() => rowViews().filter((row) => row.activePerks.length > 0))

  const hasMobileSecondRow = (rowId: PerkRowId) => {
    const rowPerks = perksByRow().get(rowId) ?? []
    const extra = extraByRow().get(rowId)
    const hasHighTierPerk = rowPerks.some((perk) => perk.tier >= 8 && perk.tier <= 10)
    const hasIp = (extra?.ip ?? 0) > 0
    const hasMilestone = Boolean(extra?.milestones.m1 || extra?.milestones.m2 || extra?.milestones.m3)
    return hasHighTierPerk || hasIp || hasMilestone
  }

  const getExtraTooltip = (rowId: PerkRowId, key: PerkExtraKey) => data().definitions.extrasTooltips?.[rowId]?.[key]

  return (
    <InfoCard>
      <Show
        when={selectedEntry()}
        fallback={<p class="text-sm text-ink/70 dark:text-white/70">No perk grid available for this selection.</p>}
      >
        <div class="space-y-3 lg:hidden">
          <Show
            when={mobileRowViews().length > 0}
            fallback={<p class="text-sm text-ink/70 dark:text-white/70">No active perks selected for mobile rows.</p>}
          >
            <div class="overflow-x-auto rounded-xl border border-ink/15 bg-white/70 dark:border-white/15 dark:bg-[#172335]/80">
              <table class="min-w-full border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th class="sticky left-0 z-10 border border-ink/15 bg-[#f3f8ff] px-2 py-1 text-left font-bold uppercase tracking-[0.08em] text-ink/75 dark:border-white/15 dark:bg-[#203048] dark:text-white/80">
                      <span class="sr-only">Row continuation</span>
                    </th>
                    <For each={levelsOneToSeven}>
                      {(level) => (
                        <th class="border border-ink/15 bg-[#f3f8ff] px-2 py-1 text-center font-bold text-ink/75 dark:border-white/15 dark:bg-[#203048] dark:text-white/80">
                          {level}
                        </th>
                      )}
                    </For>
                  </tr>
                  <tr>
                    <th class="sticky left-0 z-10 border border-ink/15 bg-[#f3f8ff] px-2 py-1 text-left font-bold uppercase tracking-[0.08em] text-ink/75 dark:border-white/15 dark:bg-[#203048] dark:text-white/80">
                      Row
                    </th>
                    <For each={levelsEightToTen}>
                      {(level) => (
                        <th class="border border-ink/15 bg-[#f3f8ff] px-2 py-1 text-center font-bold text-ink/75 dark:border-white/15 dark:bg-[#203048] dark:text-white/80">
                          {level}
                        </th>
                      )}
                    </For>
                    <For each={extrasLabels}>
                      {(label) => (
                        <th class="border border-ink/15 bg-[#f3f8ff] px-2 py-1 text-center font-bold text-ink/75 dark:border-white/15 dark:bg-[#203048] dark:text-white/80">
                          {label}
                        </th>
                      )}
                    </For>
                  </tr>
                </thead>
                <tbody>
                  <For each={mobileRowViews()}>
                    {(rowView) => {
                      const rowPerks = () => perksByRow().get(rowView.row.id) ?? []
                      const allRowPerks = () => allPerksByRow().get(rowView.row.id) ?? []
                      const extra = () => extraByRow().get(rowView.row.id)
                      const ipTooltip = getExtraTooltip(rowView.row.id, "IP")
                      const m1Tooltip = getExtraTooltip(rowView.row.id, "M1")
                      const m2Tooltip = getExtraTooltip(rowView.row.id, "M2")
                      const m3Tooltip = getExtraTooltip(rowView.row.id, "M3")
                      const showSecondRow = () => hasMobileSecondRow(rowView.row.id)
                      return (
                        <>
                          <tr>
                            <th class="sticky left-0 z-10 align-middle border border-ink/15 bg-white/90 px-2 py-1 text-left font-bold uppercase tracking-[0.08em] text-ink/85 dark:border-white/15 dark:bg-[#172335] dark:text-white/85">
                              <span class="inline-flex items-center gap-2">
                                <span
                                  class="h-3.5 w-3.5 rounded-full border"
                                  style={colorDotStyle(rowView.row.color)}
                                  aria-hidden="true"
                                />
                                {rowView.row.id}
                              </span>
                            </th>
                            <For each={levelsOneToSeven}>
                              {(level) => {
                                const perk = allRowPerks().find((entry) => entry.tier === level)
                                const isTaken = rowPerks().some((entry) => entry.tier === level)
                                return <PerkTierCell perk={perk} isTaken={isTaken} color={rowView.row.color} />
                              }}
                            </For>
                          </tr>

                          <Show when={showSecondRow()}>
                            <tr>
                              <td class="sticky left-0 z-10 align-middle border border-ink/15 bg-white/90 px-2 py-1 dark:border-white/15 dark:bg-[#172335]">
                                <span class="sr-only">{rowView.row.id} continuation</span>
                              </td>
                              <For each={levelsEightToTen}>
                                {(level) => {
                                  const perk = allRowPerks().find((entry) => entry.tier === level)
                                  const isTaken = rowPerks().some((entry) => entry.tier === level)
                                  return <PerkTierCell perk={perk} isTaken={isTaken} color={rowView.row.color} />
                                }}
                              </For>
                              <ExtraValueCell tooltip={ipTooltip} value={extra()?.ip ?? 0} />
                              <ExtraDotCell
                                tooltip={m1Tooltip}
                                active={extra()?.milestones.m1}
                                color={rowView.row.color}
                              />
                              <ExtraDotCell
                                tooltip={m2Tooltip}
                                active={extra()?.milestones.m2}
                                color={rowView.row.color}
                              />
                              <ExtraDotCell
                                tooltip={m3Tooltip}
                                active={extra()?.milestones.m3}
                                color={rowView.row.color}
                              />
                            </tr>
                          </Show>
                        </>
                      )
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>

        <div class="hidden lg:block">
          <div class="overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th class="sticky left-0 z-10 border border-ink/15 bg-[#f3f8ff] px-2 py-1 text-left text-xs font-bold uppercase tracking-[0.08em] text-ink/75 dark:border-white/15 dark:bg-[#203048] dark:text-white/80">
                    Row
                  </th>
                  <For each={levelsOneToTen}>
                    {(level) => (
                      <th class="border border-ink/15 bg-[#f3f8ff] px-2 py-1 text-center text-xs font-bold text-ink/75 dark:border-white/15 dark:bg-[#203048] dark:text-white/80">
                        {level}
                      </th>
                    )}
                  </For>
                  <For each={["IP", "M1", "M2", "M3"]}>
                    {(label) => (
                      <th class="border border-ink/15 bg-[#f3f8ff] px-2 py-1 text-center text-xs font-bold text-ink/75 dark:border-white/15 dark:bg-[#203048] dark:text-white/80">
                        {label}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={rowViews()}>
                  {(rowView) => {
                    const rowPerks = () => perksByRow().get(rowView.row.id) ?? []
                    const allRowPerks = () => allPerksByRow().get(rowView.row.id) ?? []
                    const extra = () => extraByRow().get(rowView.row.id)
                    const ipTooltip = getExtraTooltip(rowView.row.id, "IP")
                    const m1Tooltip = getExtraTooltip(rowView.row.id, "M1")
                    const m2Tooltip = getExtraTooltip(rowView.row.id, "M2")
                    const m3Tooltip = getExtraTooltip(rowView.row.id, "M3")
                    return (
                      <tr>
                        <th class="sticky left-0 z-10 align-middle border border-ink/15 bg-white/90 px-2 py-1 text-left text-xs font-bold uppercase tracking-[0.08em] text-ink/85 dark:border-white/15 dark:bg-[#172335] dark:text-white/85">
                          <span class="inline-flex items-center gap-2">
                            <span
                              class="h-3.5 w-3.5 rounded-full border"
                              style={colorDotStyle(rowView.row.color)}
                              aria-hidden="true"
                            />
                            {rowView.row.id}
                          </span>
                        </th>
                        <For each={levelsOneToTen}>
                          {(level) => {
                            const perk = allRowPerks().find((entry) => entry.tier === level)
                            const isTaken = rowPerks().some((entry) => entry.tier === level)
                            return <PerkTierCell perk={perk} isTaken={isTaken} color={rowView.row.color} />
                          }}
                        </For>
                        <ExtraValueCell tooltip={ipTooltip} value={extra()?.ip ?? 0} />
                        <ExtraDotCell tooltip={m1Tooltip} active={extra()?.milestones.m1} color={rowView.row.color} />
                        <ExtraDotCell tooltip={m2Tooltip} active={extra()?.milestones.m2} color={rowView.row.color} />
                        <ExtraDotCell tooltip={m3Tooltip} active={extra()?.milestones.m3} color={rowView.row.color} />
                      </tr>
                    )
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>
    </InfoCard>
  )
}
