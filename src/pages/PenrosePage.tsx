import { createMemo, For } from "solid-js"
import { Panel } from "../components/layout/Panel"
import { InfoCard } from "../components/layout/contentBlocks"
import { NumberField } from "../components/ui/formControls"
import { createPersistedSignal } from "../lib/persistedSignal"
import { useZatData } from "../lib/zatContext"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const formatDuration = (hours: number) => {
  if (!Number.isFinite(hours) || hours < 0) return "Unknown"
  if (hours < 1 / 60) return "< 1 min"

  const minutes = hours * 60
  if (minutes < 120) return `${minutes.toFixed(1)} min`

  if (hours < 72) return `${hours.toFixed(1)} hr`

  const days = hours / 24
  if (days < 3650) return `${days.toFixed(1)} days`

  return "> 10 years"
}

export const PenrosePage = (props: { cycles: string; setCycles: (next: string) => void }) => {
  const data = useZatData()

  const [cycleRatePerHour, setCycleRatePerHour] = createPersistedSignal("penrose.cycleRatePerHour", "0.25")

  const normalizedStatus = createMemo(() => Math.max(0, Math.floor(parseNumberish(props.cycles))))
  const normalizedRate = createMemo(() => Math.max(0, parseNumberish(cycleRatePerHour())))

  const knownGoalCycles = createMemo(() => {
    const uniqueCycles = new Set<number>()
    for (const guide of data().zatGuides) {
      if (Number.isFinite(guide.cycle) && guide.cycle >= 0) {
        uniqueCycles.add(Math.floor(guide.cycle))
      }
    }

    const sorted = Array.from(uniqueCycles).sort((a, b) => a - b)
    if (sorted.length > 0) return sorted
    return [0, 5, 10, 15, 20, 25, 30]
  })

  const goalWindow = createMemo(() => {
    const status = normalizedStatus()
    const known = knownGoalCycles()

    const knownNext = known.find((cycle) => cycle > status)
    const lastKnown = known[known.length - 1] ?? 0

    if (knownNext !== undefined) {
      const previousKnown =
        known
          .slice()
          .reverse()
          .find((cycle) => cycle <= status) ?? 0

      return {
        previous: previousKnown,
        next: knownNext,
        source: "known" as const,
      }
    }

    const heuristicStep = 5
    const next = Math.ceil((status + 1) / heuristicStep) * heuristicStep

    return {
      previous: Math.max(0, next - heuristicStep),
      next,
      source: "heuristic" as const,
    }
  })

  const progress = createMemo(() => {
    const status = normalizedStatus()
    const { previous, next } = goalWindow()
    const span = Math.max(1, next - previous)
    const raw = ((status - previous) / span) * 100
    return clamp(raw, 0, 100)
  })

  const remainingCycles = createMemo(() => {
    const status = normalizedStatus()
    return Math.max(0, goalWindow().next - status)
  })

  const etaHours = createMemo(() => {
    const rate = normalizedRate()
    if (rate <= 0) return Number.POSITIVE_INFINITY
    return remainingCycles() / rate
  })

  const upcomingGoals = createMemo(() => {
    const status = normalizedStatus()
    const known = knownGoalCycles()
      .filter((cycle) => cycle > status)
      .slice(0, 5)

    if (known.length > 0) return known

    const step = 5
    return Array.from({ length: 5 }, (_, index) => Math.ceil((status + 1) / step) * step + index * step)
  })

  return (
    <Panel title="Penrose" tooltip="penrose.panel">
      <div class="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <section class="space-y-4">
          <InfoCard title="Inputs">
            <div class="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Status"
                value={props.cycles}
                onInput={props.setCycles}
                min={0}
                step={1}
                tooltip="penrose.status"
              />
              <NumberField
                label="Cycle gain / hour"
                value={cycleRatePerHour()}
                onInput={setCycleRatePerHour}
                min={0}
                step={0.01}
                tooltip="penrose.cycleRate"
              />
            </div>
            <p class="mt-3 text-xs text-ink/65 dark:text-white/65">
              Goals use known cycle milestones from guide data and automatically switch to a +5 cycle heuristic after
              the last known milestone.
            </p>
          </InfoCard>

          <InfoCard title="Upcoming Goals">
            <div class="flex flex-wrap gap-2">
              <For each={upcomingGoals()}>
                {(cycle) => (
                  <span class="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-ink/90 dark:text-white/90">
                    Cycle {cycle}
                  </span>
                )}
              </For>
            </div>
          </InfoCard>
        </section>

        <section class="rounded-2xl border border-ink/15 bg-white/75 p-5 dark:border-white/15 dark:bg-[#162235]/80">
          <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Goal Tracker</h3>

          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-ink/15 bg-white p-3 dark:border-white/15 dark:bg-[#253a56]">
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60 dark:text-white/60">Goal</p>
              <p class="mt-1 text-xl font-black text-ink dark:text-white">Cycle {goalWindow().next}</p>
            </div>
            <div class="rounded-xl border border-ink/15 bg-white p-3 dark:border-white/15 dark:bg-[#253a56]">
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60 dark:text-white/60">
                Remaining
              </p>
              <p class="mt-1 text-xl font-black text-ink dark:text-white">{remainingCycles().toFixed(0)}</p>
            </div>
            <div class="rounded-xl border border-ink/15 bg-white p-3 dark:border-white/15 dark:bg-[#253a56]">
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60 dark:text-white/60">ETA</p>
              <p class="mt-1 text-xl font-black text-ink dark:text-white">{formatDuration(etaHours())}</p>
            </div>
          </div>

          <div class="mt-5">
            <div class="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink/70 dark:text-white/70">
              <span>
                Progress: Cycle {goalWindow().previous} to {goalWindow().next}
              </span>
              <span>{progress().toFixed(1)}%</span>
            </div>
            <div class="h-3 rounded-full border border-ink/20 bg-ink/10 p-[2px]">
              <div
                class="h-full rounded-full bg-gradient-to-r from-accent to-brand transition-[width] duration-500"
                style={{ width: `${progress().toFixed(2)}%` }}
              />
            </div>
            <p class="mt-2 text-xs text-ink/65 dark:text-white/65">
              Goal source: {goalWindow().source === "known" ? "Known milestone" : "Heuristic (+5 cycles)"}
            </p>
          </div>
        </section>
      </div>
    </Panel>
  )
}
