import { createEffect, For, Show } from "solid-js"
import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import {
  DecimalField,
  IntegerField,
  NumberField,
  NumberFieldWithUnit,
  SelectField,
  ToggleField,
} from "../../components/ui/formControls"
import { SummaryInputModal } from "../../components/ui/SummaryInputModal"
import { formatCompactMultiplier, formatFixed, formatMultiplier } from "../../lib/numberFormat"
import { formatLocalTimestampFromMinutes } from "../../lib/timeFormat"
import type { ZatMode } from "../../lib/zatCalculator"
import { useZatData, type JunoExponentType } from "../../lib/zatContext"
import type { GainUnit } from "./ogTypes"
import { useOgTechContext } from "./ogTechContext"

const units = ["hour", "min", "sec"] as const

const modeOptions: Array<{ value: ZatMode; label: string }> = [
  { value: "juno", label: "Juno" },
  { value: "dc", label: "DC" },
]

type Option<T extends string> = {
  value: T
  label: string
}

export const OgTechLeftColumn = () => {
  const og = useOgTechContext()
  const data = useZatData()
  const parseNumberish = (value: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 0
    return parsed
  }

  const buildLevelOptions = (type: Extract<JunoExponentType, "se" | "player" | "dcm" | "research">) => {
    const expByLevel = new Map<number, number>()

    for (const rule of data().junoExponent) {
      if (rule.type !== type) continue
      expByLevel.set(rule.level, (expByLevel.get(rule.level) ?? 0) + rule.exp)
    }

    const options = [
      { value: "0", label: "0" },
      ...Array.from(expByLevel.entries())
        .sort(([leftLevel], [rightLevel]) => leftLevel - rightLevel)
        .map(([level, exp]) => ({
          value: String(level),
          label: `${level} (+${formatFixed(exp, 3, "0.000")})`,
        })),
    ]

    return options
  }

  const seLevelOptions = () => buildLevelOptions("se")
  const playerLevelOptions = () => buildLevelOptions("player")
  const dcmLevelOptions = () => buildLevelOptions("dcm")
  const researchLevelOptions = () => buildLevelOptions("research")

  const resolvePreviousLevel = (options: Array<{ value: string; label: string }>, current: string) => {
    const currentLevel = Math.max(0, Math.floor(parseNumberish(current)))
    const levels = options.map((option) => Math.floor(parseNumberish(option.value))).sort((a, b) => a - b)

    let resolved = levels[0] ?? 0
    for (const level of levels) {
      if (level > currentLevel) break
      resolved = level
    }

    return String(resolved)
  }

  const resolvedSeLevel = () => resolvePreviousLevel(seLevelOptions(), og.seLevel())
  const resolvedPlayerLevel = () => resolvePreviousLevel(playerLevelOptions(), og.playerLevel())
  const resolvedDcmLevel = () => resolvePreviousLevel(dcmLevelOptions(), og.dcmLevel())
  const resolvedResearchLevel = () => resolvePreviousLevel(researchLevelOptions(), og.researchLevel())

  createEffect(() => {
    const resolved = resolvedSeLevel()
    if (og.seLevel() !== resolved) og.setSeLevel(resolved)
  })

  createEffect(() => {
    const resolved = resolvedPlayerLevel()
    if (og.playerLevel() !== resolved) og.setPlayerLevel(resolved)
  })

  createEffect(() => {
    const resolved = resolvedDcmLevel()
    if (og.dcmLevel() !== resolved) og.setDcmLevel(resolved)
  })

  createEffect(() => {
    const resolved = resolvedResearchLevel()
    if (og.researchLevel() !== resolved) og.setResearchLevel(resolved)
  })

  const handleTotalExtraInput = (next: string) => {
    const totalExtra = Math.max(0, parseNumberish(next))
    const manualExtra = Math.max(0, totalExtra - og.autoExtraExponent())
    og.setExtraExponent(formatFixed(manualExtra, 3, "0.000"))
  }

  const cycleTitle = () => `Next cycle: ${og.goalCycle()}`

  return (
    <>
      <InfoCard>
        <div class="grid gap-1">
          <NumberFieldWithUnit
            label="Juno"
            value={og.gainValue()}
            onInput={og.setGainValue}
            placeholder="0.00e0"
            unit={og.gainUnit()}
            onUnitChange={(next) => og.setGainUnit(next as GainUnit)}
            units={units}
          />
          <NumberField label="Current" placeholder="0.00e0" value={og.junoAmount()} onInput={og.setJunoAmount} />
          <SelectField
            label="Mode"
            value={og.mode()}
            onChange={(next) => og.setMode(next as ZatMode)}
            options={modeOptions as Option<ZatMode>[]}
            tooltip="og.calculationMode"
          />
        </div>
      </InfoCard>

      <InfoCard title="Tech valuation" closable>
        <div class="grid gap-1">
          <IntegerField
            label="Cycles"
            value={og.cycles()}
            onInput={og.setCycles}
            min={0}
            max={100}
            step={1}
            tooltip="og.zagreusCycles"
          />
          <SummaryInputModal label="Shop" value={formatCompactMultiplier(og.premiumMultiplier())} tooltip="og.premium">
            <div class="space-y-2">
              <NumberField
                label="Juno output level"
                value={og.junoOutput()}
                onInput={og.setJunoOutput}
                min={0}
                max={750}
                step={1}
              />
              <ToggleField label="Juno bundle" checked={og.junoBundle()} onChange={og.setJunoBundle} />
              <ToggleField label="Ixion-Juno bundle" checked={og.ixionJunoBundle()} onChange={og.setIxionJunoBundle} />
              <ToggleField label="Juno-Kappa bundle" checked={og.junoKappaBundle()} onChange={og.setJunoKappaBundle} />
              <NumberField label="Juno tokens" value={og.tokens()} onInput={og.setTokens} min={0} max={1800} step={1} />
            </div>
          </SummaryInputModal>

          <SummaryInputModal
            label="Exponent"
            value={formatFixed(og.totalExtraExponent(), 3, "0.000")}
            onInput={handleTotalExtraInput}
            tooltip="og.exponent"
          >
            <div class="space-y-2">
              <DecimalField
                label="Manual"
                value={og.extraExponent()}
                onInput={og.setExtraExponent}
                digits={3}
                min={0.001}
                max={1}
                step={0.001}
                tooltip="og.extraExponent"
              />
              <SelectField
                label="SE level"
                value={resolvedSeLevel()}
                onChange={og.setSeLevel}
                options={seLevelOptions()}
              />
              <SelectField
                label="Player level"
                value={resolvedPlayerLevel()}
                onChange={og.setPlayerLevel}
                options={playerLevelOptions()}
              />
              <SelectField
                label="DCM level"
                value={resolvedDcmLevel()}
                onChange={og.setDcmLevel}
                options={dcmLevelOptions()}
              />
              <SelectField
                label="Research level"
                value={resolvedResearchLevel()}
                onChange={og.setResearchLevel}
                options={researchLevelOptions()}
              />
              <ToggleField
                label="Meltdown bundle (+0.005)"
                checked={og.meltdownBundle()}
                onChange={og.setMeltdownBundle}
              />
              <ToggleField
                label="Quantum Addon 0 (+0.01)"
                checked={og.quantumAddon0()}
                onChange={og.setQuantumAddon0}
              />
            </div>
          </SummaryInputModal>

          <div class="rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56] mt-1">
            <MetricRow label="Total exponent" value={formatFixed(og.totalExponent(), 3, "0.000")} />
            <For each={og.exponentGainEntries()}>
              {(entry, index) => (
                <MetricRow
                  label={`Exponent +${entry.delta}`}
                  value={formatMultiplier(entry.multiplier, 2, "x0.00")}
                  withBorder={index() !== og.exponentGainEntries().length - 1}
                />
              )}
            </For>
          </div>
        </div>
      </InfoCard>

      <InfoCard title={cycleTitle()} closable>
        <div class="grid gap-1">
          <NumberField label="Progression" value={og.statusAmount()} onInput={og.setStatusAmount} min={0} step={0.01} />
          <ToggleField
            label="Automatically progress from buys"
            checked={og.statusAutoIncrement()}
            onChange={og.setStatusAutoIncrement}
          />
          <div class="rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56] mt-1">
            <MetricRow label="Status" value={og.goalProgress()} />
            <MetricRow label="Cost" value={og.goalCost()} />
            <MetricRow label="ETA" value={og.etaLabel()} />
            <MetricRow
              label="Finish date"
              value={formatLocalTimestampFromMinutes(og.etaMinutes())}
              withBorder={false}
            />
          </div>
        </div>
      </InfoCard>
    </>
  )
}
