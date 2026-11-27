import { For } from "solid-js"
import { BestNextSummary } from "../../components/layout/BestNextSummary"
import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import { UpgradeCard, type UpgradeCardRow } from "../../components/ui/UpgradeCard"
import { fromLog10 } from "../../lib/eta"
import { formatTimeDurationFromSeconds } from "../../lib/timeFormat"
import { capitalize } from "../../lib/textFormat"
import { KAIPER_DATA } from "./kaiperData"
import type { KaiperRow } from "./kaiperRows"
import { useKaiperContext } from "./kaiperContext"

const formatCost = (cost: number | null) => (cost === null ? "-" : fromLog10(cost).toString(2))

const formatIncrease = (log10: number | undefined) => {
  if (!log10 || log10 <= 0) return "-"
  return log10 < 6 ? `x${(10 ** log10).toFixed(3)}` : `x${fromLog10(log10).toString(2)}`
}

const formatRelative = (relative: number | null | undefined) =>
  relative === null || relative === undefined ? "-" : `${(relative * 100).toFixed(relative >= 0.995 ? 0 : 1)}%`

const labelOf = (row: KaiperRow) => capitalize(row.label)

const KaiperRowCard = (props: { row: KaiperRow; showEfficiency?: boolean }) => {
  const kaiper = useKaiperContext()
  const row = () => props.row
  const eta = () => (row().locked ? "-" : formatTimeDurationFromSeconds(kaiper.etaSeconds(row())))

  const rows = (): UpgradeCardRow[] => {
    const entries: UpgradeCardRow[] = [{ label: "Cost", value: row().locked ? "0" : formatCost(row().costLog10) }]
    if (props.showEfficiency) {
      entries.push(
        {
          label: "Efficiency",
          value: formatRelative(row().relative),
          valueClass: (row().relative ?? 0) >= 0.995 ? "font-bold text-emerald-600 dark:text-emerald-400" : "",
        },
        { label: "Increase", value: row().locked ? "0" : formatIncrease(row().increaseLog10) },
      )
    }
    entries.push({ label: "Time left", value: eta() })
    return entries
  }

  return (
    <UpgradeCard
      title={labelOf(row())}
      level={String(row().level)}
      max={row().maxLevel}
      onLevelInput={(next) => kaiper.setLevel(row().id.replace(/^cmp\./, ""), next)}
      locked={row().locked}
      highlight={props.showEfficiency && (row().relative ?? 0) >= 0.995}
      rows={rows()}
    />
  )
}

const ComparisonCard = (props: { row: KaiperRow }) => {
  const kaiper = useKaiperContext()
  const isLevelBound = () => props.row.id !== "cmp.seq"
  const eta = () => (props.row.locked ? "-" : formatTimeDurationFromSeconds(kaiper.etaSeconds(props.row)))

  return (
    <UpgradeCard
      title={labelOf(props.row)}
      level={String(props.row.level)}
      onLevelInput={(next) => isLevelBound() && kaiper.setLevel(props.row.id.replace(/^cmp\./, ""), next)}
      locked={props.row.locked}
      highlight={(props.row.relative ?? 0) >= 0.995}
      rows={[
        { label: "Cost", value: props.row.locked ? "0" : formatCost(props.row.costLog10) },
        {
          label: "Efficiency",
          value: formatRelative(props.row.relative),
          valueClass: (props.row.relative ?? 0) >= 0.995 ? "font-bold text-emerald-600 dark:text-emerald-400" : "",
        },
        { label: "DC boost", value: props.row.locked ? "0" : formatIncrease(props.row.increaseLog10) },
        { label: "Time left", value: eta() },
      ]}
    />
  )
}

export const KaiperResults = () => {
  const kaiper = useKaiperContext()
  const rows = () => kaiper.rows()
  const upcomingBest = () => kaiper.upcoming()[0]
  const buyOne = (id: string | number) => {
    const key = String(id)
    kaiper.setLevel(key, String((kaiper.levels()[key] ?? 0) + 1))
  }

  const ampGroups = () =>
    KAIPER_DATA.amps.map((amp) => ({
      id: amp.id,
      label: amp.label,
      rows: rows().ampRows.filter((row) => row.group === `amp.${amp.id}`),
    }))

  return (
    <>
      <BestNextSummary
        buyAction={() => upcomingBest() && buyOne(upcomingBest()!.id)}
        buyDisabled={!upcomingBest()}
        buyLabel="Buy next"
        rows={kaiper
          .upcoming()
          .slice(0, 6)
          .map((row) => ({
            id: row.id,
            item: labelOf(row),
            targetLevel: row.level + 1,
            value: row.relative === undefined || row.relative === null ? "" : formatRelative(row.relative),
            data: formatTimeDurationFromSeconds(row.etaSeconds),
          }))}
        rowAction={buyOne}
        dataHeader="Remaining"
        minRows={5}
        columnRatios={[45, 20, 35]}
      />

      <InfoCard title="Kappa exponent">
        <MetricRow label="Auto sources" value={kaiper.autoExponent().toFixed(3)} />
        <MetricRow label="Total exponent" value={kaiper.totalExponent().toFixed(3)} />
        <MetricRow label="Premium multiplier" value={`x${kaiper.premiumMultiplier().toFixed(2)}`} />
        <For each={kaiper.exponentGains()}>
          {(entry) => (
            <MetricRow
              label={`+${entry.delta} exponent`}
              value={`x${entry.multiplier.toFixed(3)} Kappa`}
              withBorder={false}
            />
          )}
        </For>
      </InfoCard>

      <InfoCard title="DC boost comparison">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <For each={rows().dcComparison}>{(row) => <ComparisonCard row={row} />}</For>
        </div>
        <p class="mt-2 text-xs text-ink/60 dark:text-white/60">
          Sequencing is priced with Kappa upgrades only, up to the next DC effect.
        </p>
      </InfoCard>

      <For each={ampGroups()}>
        {(group) => (
          <InfoCard title={`${group.label} amplifier`}>
            <div class="grid gap-3 sm:grid-cols-2">
              <For each={group.rows}>{(row) => <KaiperRowCard row={row} showEfficiency />}</For>
            </div>
          </InfoCard>
        )}
      </For>

      <InfoCard title="Genesis Pod and Data Center">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <For each={rows().particleRows}>{(row) => <KaiperRowCard row={row} />}</For>
          <For each={rows().otherRows.filter((row) => row.group === "dc")}>{(row) => <KaiperRowCard row={row} />}</For>
        </div>
      </InfoCard>

      <InfoCard title="Sequencing">
        <div class="grid gap-3 sm:grid-cols-2">
          <For each={rows().otherRows.filter((row) => row.group === "seq")}>{(row) => <KaiperRowCard row={row} />}</For>
        </div>
        <MetricRow label="Position" value={rows().sequencing.position} withBorder={false} class="mt-2" />
      </InfoCard>
    </>
  )
}
