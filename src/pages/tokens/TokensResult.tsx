import { For, Show } from "solid-js"
import { BestNextSummary } from "../../components/layout/BestNextSummary"
import { formatPercentFromRatio } from "../../lib/numberFormat"
import { useTokensContext } from "./tokensContext"

export const TokensResult = () => {
  const tokens = useTokensContext()
  const best = () => tokens.bestRecommendation()
  const sliderLabels = ["Short term", "", "Balanced", "", "Long term"] as const
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

  return (
    <div class="grid gap-3">
      <BestNextSummary
        buyAction={tokens.applyBest}
        buyDisabled={!best()}
        buyLabel="Buy best next"
        bulkActions={[
          { label: "Buy all", onClick: tokens.applyBestAll },
          { label: "Buy 5", onClick: () => tokens.applyBestCount(5) },
          { label: "Buy 10", onClick: () => tokens.applyBestCount(10) },
          { label: "Buy 25", onClick: () => tokens.applyBestCount(25) },
        ]}
        footer={
          <div class="p-3">
            <p class="text-xs uppercase tracking-[0.12em] text-ink/65 dark:text-white/65">Valuation</p>
            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={tokens.blendStep()}
              onInput={(event) => tokens.setBlendStep(event.currentTarget.value)}
              class="mt-2 w-full accent-accent"
            />
            <div class="mt-1 grid grid-cols-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/60 dark:text-white/60">
              <For each={sliderLabels}>{(label) => <span class="text-center">{label}</span>}</For>
            </div>
          </div>
        }
        rows={tokens
          .recommendationRows()
          .slice(0, 8)
          .map((row, index) => {
            const upgrade = tokens.upgrades().find((candidate) => candidate.id === row.id)
            const label = upgrade?.label ?? row.id

            return {
              item:
                row.nextLevel === null
                  ? label
                  : index === 0 && row.nextLevel > row.currentLevel + 1
                    ? `${label}: ${row.currentLevel} → ${row.nextLevel}`
                    : `${label}: ${row.nextLevel}`,
              targetLevel: null,
              value: formatPercentFromRatio(relativeValueRatio(row.score), 1).replace(/\.0+%$/, "%"),
              data: `${formatCost(row.cost)}${index === 0 ? " tokens" : ""}`,
            }
          })}
        dataHeader="Cost"
        columnRatios={[50, 25, 25]}
      />
    </div>
  )
}
