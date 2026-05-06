import { For, Show } from "solid-js"
import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import {
  DecimalField,
  LabelField,
  NumberField,
  SelectField,
  ToggleField,
  blurOnEnterOrEscape,
} from "../../components/ui/formControls"
import { SummaryInputModal } from "../../components/ui/SummaryInputModal"
import { formatCompactMultiplier, formatFixed, formatMultiplier } from "../../lib/numberFormat"
import type { ZatMode } from "../../lib/zatCalculator"
import type { GainUnit } from "./ogTypes"
import { useOgTechContext } from "./ogTechContext"

const gainUnits: Array<{ value: GainUnit; label: string }> = [
  { value: "hour", label: "hour" },
  { value: "sec", label: "sec" },
  { value: "min", label: "min" },
]

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
  const shareAmount = () => Math.max(0, Number(og.sharesPercent()) / 0.05)
  const parseNumberish = (value: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 0
    return parsed
  }

  const handleTotalExtraInput = (next: string) => {
    const totalExtra = Math.max(0, parseNumberish(next))
    const manualExtra = Math.max(0, totalExtra - og.autoExtraExponent())
    og.setExtraExponent(formatFixed(manualExtra, 3, "0.000"))
  }

  return (
    <>
      <InfoCard>
        <div class="grid gap-2">
          <NumberField
            label="Juno"
            value={og.gainValue()}
            onInput={og.setGainValue}
            inlineAccessory={
              <div class="flex items-center gap-1">
                <span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink/70 dark:text-white/70">/</span>
                <select
                  value={og.gainUnit()}
                  onChange={(event) => og.setGainUnit(event.currentTarget.value as GainUnit)}
                  onKeyDown={blurOnEnterOrEscape}
                  class="w-[5.5rem] rounded-xl border border-ink/20 bg-white px-2 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
                >
                  <For each={gainUnits}>{(option) => <option value={option.value}>{option.label}</option>}</For>
                </select>
              </div>
            }
          />
          <NumberField label="Current" value={og.junoAmount()} onInput={og.setJunoAmount} />
          <SelectField
            label="Mode"
            value={og.mode()}
            onChange={(next) => og.setMode(next as ZatMode)}
            options={modeOptions as Option<ZatMode>[]}
            tooltip="og.calculationMode"
          />
        </div>
      </InfoCard>

      <InfoCard title="Zagreus">
        <div class="grid gap-2">
          <NumberField
            label="Cycles"
            value={og.cycles()}
            onInput={og.setCycles}
            min={0}
            max={100}
            step={1}
            tooltip="og.zagreusCycles"
          />
          <NumberField
            label="Shares %"
            value={og.sharesPercent()}
            onInput={og.setSharesPercent}
            min={0}
            max={100}
            step={0.01}
            tooltip="og.sharesPercent"
          />
        </div>
      </InfoCard>

      <InfoCard title="Juno Value" contentClass="">
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
          label="Extra"
          value={formatFixed(og.totalExtraExponent(), 3, "0.000")}
          onInput={handleTotalExtraInput}
          tooltip="og.extraExponent"
        >
          <div class="space-y-2">
            <DecimalField
              label="Manual extra"
              value={og.extraExponent()}
              onInput={og.setExtraExponent}
              digits={3}
              min={0.001}
              max={1}
              step={0.001}
              tooltip="og.extraExponent"
            />
            <NumberField label="SE level" value={og.seLevel()} onInput={og.setSeLevel} step={1} tooltip="og.seLevel" />
            <NumberField
              label="Player level"
              value={og.playerLevel()}
              onInput={og.setPlayerLevel}
              step={1}
              tooltip="og.playerLevel"
            />
            <NumberField
              label="DCM level"
              value={og.dcmLevel()}
              onInput={og.setDcmLevel}
              step={1}
              tooltip="og.dcmLevel"
            />
            <NumberField
              label="Research level"
              value={og.researchLevel()}
              onInput={og.setResearchLevel}
              step={1}
              tooltip="og.researchLevel"
            />
            <ToggleField
              label="Meltdown bundle"
              checked={og.meltdownBundle()}
              onChange={og.setMeltdownBundle}
              tooltip="og.meltdownBundle"
            />
            <ToggleField
              label="Quantum Addon 0"
              checked={og.quantumAddon0()}
              onChange={og.setQuantumAddon0}
              tooltip="og.quantumAddon0"
            />
          </div>
        </SummaryInputModal>

        <div class="rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
          <MetricRow label="Total techs" value={og.totalTechLevels()} />
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
      </InfoCard>
    </>
  )
}
