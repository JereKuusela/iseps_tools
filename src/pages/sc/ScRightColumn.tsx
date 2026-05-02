import { For, Show } from "solid-js"
import { MetricRow } from "../../components/layout/contentBlocks"
import { blurOnEnterOrEscape } from "../../components/ui/formControls"
import { NumberField } from "../../components/ui/formControls"
import type { ScGoalType } from "../../lib/scCalculator"
import { useScContext } from "../../lib/scContext"
import { formatLocalTimestampFromMinutes, formatTimeDuration } from "../../lib/timeFormat"
import type { PanelOutput, ScGoalOption } from "./scTypes"

type ScRightColumnProps = {
  outputs: PanelOutput[]
  totalSkipMinutes: number
  goalOptions: ScGoalOption[]
  formatLargeNumber: (value: PanelOutput["dcCost"], decimals?: number) => string
  formatPercent: (value: number, digits?: number) => string
  formatMultiplier: (value: number) => string
}

export const ScRightColumn = (props: ScRightColumnProps) => {
  const sc = useScContext()

  return (
    <section class="w-max min-w-[560px]">
      <div class="flex w-max min-w-[560px] items-start gap-2.5">
        <For each={props.outputs}>
          {(panel, index) => (
            <article class="w-[260px] shrink-0 rounded-xl border border-ink/15 bg-white/85 p-2 dark:border-white/15 dark:bg-[#1c2c43]">
              <div class="grid grid-cols-[1fr_auto] gap-2">
                <select
                  value={panel.goalType}
                  onChange={(event) => sc.setPanelGoal(panel.id, event.currentTarget.value as ScGoalType)}
                  onKeyDown={blurOnEnterOrEscape}
                  class="rounded border border-ink/20 bg-white px-2 py-1.5 font-mono text-lg font-black text-ink outline-none ring-brand/40 focus:ring dark:border-white/20 dark:bg-[#253a56] dark:text-white"
                >
                  <For each={props.goalOptions}>{(option) => <option value={option.value}>{option.label}</option>}</For>
                </select>
                <Show when={index() == 0}>
                  <button
                    type="button"
                    onClick={() => sc.addPanel()}
                    class="rounded border border-ink/20 bg-white px-2 text-sm font-bold text-ink hover:bg-ink/5 dark:border-white/20 dark:bg-[#233752] dark:text-white dark:hover:bg-[#2f496b]"
                    aria-label="Add panel"
                  >
                    ➕
                  </button>
                </Show>
                <Show when={index() > 0}>
                  <button
                    type="button"
                    onClick={() => sc.removePanel(panel.id)}
                    class="rounded border border-ink/20 bg-white px-2 text-sm font-bold text-ink hover:bg-ink/5 dark:border-white/20 dark:bg-[#233752] dark:text-white dark:hover:bg-[#2f496b]"
                    aria-label="Close panel"
                  >
                    🗑️
                  </button>
                </Show>
              </div>

              <Show when={panel.goalType === "customSc" || panel.goalType === "customDc"}>
                <div class="mt-2">
                  <NumberField
                    label={panel.goalType === "customSc" ? "Custom SC Goal" : "Custom DC Goal"}
                    value={panel.customGoal}
                    onInput={(next) => sc.setPanelCustomGoal(panel.id, next)}
                    inline
                  />
                </div>
              </Show>

              <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                <MetricRow label="DC Cost" value={props.formatLargeNumber(panel.dcCost, 2)} />
                <MetricRow label="Total Time" value={formatTimeDuration(panel.totalMinutes)} />
                <MetricRow label="Progress" value={props.formatPercent(panel.progressPct, 2)} withBorder={false} />
              </div>

              <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                <MetricRow label="Remaining" value={formatTimeDuration(panel.remainingMinutes)} />
                <MetricRow label="End date" value={formatLocalTimestampFromMinutes(panel.remainingMinutes)} />
              </div>

              <Show when={props.totalSkipMinutes > 0}>
                <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                  <MetricRow label="After Skips" value={formatTimeDuration(panel.afterSkipsMinutes)} />
                  <MetricRow label="End date" value={formatLocalTimestampFromMinutes(panel.afterSkipsMinutes)} />
                </div>
              </Show>

              <div class="mt-2 grid grid-cols-[1fr_24px] gap-2">
                <div class="rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                  <h4 class="border-b border-ink/15 px-2 py-1.5 text-center font-mono text-lg font-black text-ink dark:border-white/15 dark:text-white">
                    Projected Values
                  </h4>
                  <MetricRow label="Progress" value={props.formatPercent(panel.projectedProgressPct, 0)} />
                  <MetricRow label="DC Cost" value={props.formatLargeNumber(panel.projectedDcCost, 1)} />
                  <MetricRow label="SC Gained" value={props.formatLargeNumber(panel.projectedScGained, 2)} />
                  <MetricRow label="Daily Boost" value={props.formatMultiplier(panel.projectedDailyBoost)} />
                  <MetricRow label="SC Replic." value={props.formatMultiplier(panel.projectedScReplicator)} />
                  <MetricRow
                    label="DC Replic."
                    value={props.formatMultiplier(panel.projectedDcReplicator)}
                    withBorder={false}
                  />
                </div>

                <div class="relative rounded border border-ink/20 bg-ink/10 dark:border-white/15 dark:bg-white/10">
                  <div
                    class="absolute bottom-0 left-0 right-0 rounded-sm bg-gradient-to-t from-accent to-brand"
                    style={{ height: `${panel.projectedProgressPct}%` }}
                  />
                </div>
              </div>
            </article>
          )}
        </For>
      </div>
    </section>
  )
}
