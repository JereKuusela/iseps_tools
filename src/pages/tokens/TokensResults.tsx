import { BestNextSummary } from "../../components/layout/BestNextSummary"
import { ResourceLabel } from "../../components/ui/ResourceLabel"
import { UpgradeItemLabel } from "../../components/ui/UpgradeItemLabel"
import { formatPercentFromRatio } from "../../lib/numberFormat"
import { useTokensContext } from "./tokensContext"
import type { TokenId } from "./tokensTypes"

export const TokensResults = () => {
  const tokens = useTokensContext()
  const best = () => tokens.bestRecommendation()
  const upgradeLabel = (id: TokenId) => tokens.upgrades().find((candidate) => candidate.id === id)?.label ?? id
  const relativeValueRatio = (score: number) => {
    const bestScore = best()?.score ?? 0
    if (bestScore <= 0) return 0
    const ratio = score / bestScore
    return Math.max(0, Math.min(1, ratio))
  }
  const formatCost = (value: number) => {
    const rounded = Math.round(value * 100) / 100
    if (Number.isInteger(rounded)) return String(rounded)
    return rounded.toFixed(2).replace(/\.?0+$/, "")
  }
  const specialRecommendation = () => {
    const row = tokens.bestSpecialRecommendation()
    if (!row) return undefined

    return {
      heading: "Best special",
      item: `${upgradeLabel(row.id)}: ${row.nextLevel}`,
      data: `${formatCost(row.cost)} tokens`,
      note: row.id === "bbbot.duration" ? "Required to unlock BB-Bot Tokens" : undefined,
      buyAction: tokens.applyBestSpecial,
      buyLabel: "Buy best special",
    }
  }

  return (
    <div class="grid gap-3">
      <BestNextSummary
        buyAction={tokens.applyBest}
        buyStepAction={tokens.applyBestAll}
        buyDisabled={!best()}
        buyLabel="Buy best next"
        secondaryRecommendation={specialRecommendation()}
        bulkActions={[
          { label: "Complete step", onClick: tokens.applyBestAll },
          { label: "Buy 5", onClick: () => tokens.applyBestCount(5) },
          { label: "Buy 10", onClick: () => tokens.applyBestCount(10) },
          { label: "Buy 25", onClick: () => tokens.applyBestCount(25) },
          { label: "Buy 50", onClick: () => tokens.applyBestCount(50) },
          { label: "Buy 100", onClick: () => tokens.applyBestCount(100) },
          {
            label: "Buy everything",
            onClick: tokens.completeAll,
            confirm: "Set every token upgrade to its maximum level, including locked upgrades?",
          },
          { label: "Reset all purchases", onClick: tokens.resetAll, confirm: "Reset all token purchases?" },
        ]}
        rows={tokens
          .recommendationRows()
          .slice(0, 8)
          .map((row, index) => {
            const upgrade = tokens.upgrades().find((candidate) => candidate.id === row.id)
            const label = upgrade?.label ?? row.id
            const cost = formatCost(row.cost)
            const level =
              row.nextLevel === null
                ? ""
                : row.nextLevel > row.currentLevel + 1
                  ? `${row.currentLevel} → ${row.nextLevel}`
                  : `${row.nextLevel}`
            const tableLevelSuffix = level ? ` ${level}` : ""

            const tableItem = () =>
              upgrade?.group === "output" && upgrade.resource ? (
                <>
                  <ResourceLabel resource={upgrade.resource}>{label}</ResourceLabel>
                  {tableLevelSuffix}
                </>
              ) : (
                <UpgradeItemLabel name={label} levelSuffix={tableLevelSuffix} />
              )

            return {
              item: level ? `${label}: ${level}` : label,
              tableItem: index > 0 ? tableItem() : undefined,
              targetLevel: null,
              value: formatPercentFromRatio(relativeValueRatio(row.score), 0),
              data: index === 0 ? `${cost} tokens` : cost,
            }
          })}
        dataHeader="Cost"
        minRows={7}
        columnRatios={[50, 25, 25]}
      />
    </div>
  )
}
