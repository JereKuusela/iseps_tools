import { Index, Show } from "solid-js"
import { BestNextSummary } from "../../components/layout/BestNextSummary"
import { MetricRow } from "../../components/layout/contentBlocks"
import { UpgradeCard } from "../../components/ui/UpgradeCard"
import { Tooltip } from "../../components/ui/Tooltip"
import { formatPercentFromRatio } from "../../lib/numberFormat"
import { formatTimeDurationFromSeconds } from "../../lib/timeFormat"
import { useOgTechContext } from "./ogTechContext"
import { parseNumberish } from "../../lib/parseNumber"

export const OgTechResults = () => {
  const og = useOgTechContext()
  const bestTech = () => og.bestTech()

  const secondsToLabel = (seconds: number) => formatTimeDurationFromSeconds(seconds)

  return (
    <>
      <BestNextSummary
        buyAction={og.buyNextBest}
        buyStepAction={og.autoBuyUnderHour}
        buyDisabled={!bestTech()}
        buyLabel="Buy best next"
        bulkActions={[
          { label: "Auto buy < 1h", onClick: og.autoBuyUnderHour },
          { label: "Auto buy < 1d", onClick: og.autoBuyUnderDay },
          { label: "Reset all purchases", onClick: og.clearTechLevels, confirm: "Reset all tech purchases?" },
        ]}
        footer={<MetricRow label="Total techs" value={og.totalTechLevels()} withBorder={false} />}
        rows={og.topSix().map((entry) => ({
          id: entry.id,
          item: `OG${entry.id}`,
          targetLevel: entry.level,
          value: formatPercentFromRatio(entry.relative / 100, 0),
          data: secondsToLabel(entry.etaSeconds),
        }))}
        rowAction={(id) => og.buyNextForTech(Number(id))}
        dataHeader="Remaining"
        minRows={5}
        columnRatios={[35, 30, 35]}
      />

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Index each={og.techCardRows()}>
          {(tech) => (
            <UpgradeCard
              title={
                <Tooltip content={tech().tooltip} raw asChild>
                  <span>{tech().label}</span>
                </Tooltip>
              }
              level={String(tech().level)}
              onLevelInput={(next) => og.setTechLevel(tech().id, parseNumberish(next))}
              max={tech().maxLevel}
              rows={[
                { label: "Cost", value: tech().nextCost },
                { label: "ETA", value: tech().nextLevel === null ? "" : secondsToLabel(tech().etaSeconds) },
              ]}
            />
          )}
        </Index>
      </div>
    </>
  )
}
