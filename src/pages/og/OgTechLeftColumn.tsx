import { A } from "@solidjs/router"
import { For, Show } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { NumberField, SelectField, ToggleField, blurOnEnterOrEscape } from "../../components/ui/formControls"
import type { ZatMode } from "../../lib/zatCalculator"
import type { ExponentGainEntry, GainUnit } from "./ogTypes"

type Option<T extends string> = {
  value: T
  label: string
}

type OgTechLeftColumnProps = {
  cycles: string
  setCycles: (next: string) => void
  gainValue: string
  setGainValue: (next: string) => void
  gainUnit: GainUnit
  setGainUnit: (next: GainUnit) => void
  gainUnits: Option<GainUnit>[]
  junoAmount: string
  setJunoAmount: (next: string) => void
  mode: ZatMode
  setMode: (next: ZatMode) => void
  modeOptions: Option<ZatMode>[]
  junoOutput: string
  setJunoOutput: (next: string) => void
  junoBundle: boolean
  setJunoBundle: (checked: boolean) => void
  ixionJunoBundle: boolean
  setIxionJunoBundle: (checked: boolean) => void
  junoKappaBundle: boolean
  setJunoKappaBundle: (checked: boolean) => void
  tokens: string
  setTokens: (next: string) => void
  premiumMultiplier: number
  sharesPercent: string
  setSharesPercent: (next: string) => void
  shareAmount: number
  extraExponent: string
  setExtraExponent: (next: string) => void
  showExpandedExponent: boolean
  onToggleExpandedExponent: () => void
  seLevel: string
  setSeLevel: (next: string) => void
  playerLevel: string
  setPlayerLevel: (next: string) => void
  dcmLevel: string
  setDcmLevel: (next: string) => void
  researchLevel: string
  setResearchLevel: (next: string) => void
  meltdownBundle: boolean
  setMeltdownBundle: (checked: boolean) => void
  quantumAddon0: boolean
  setQuantumAddon0: (checked: boolean) => void
  totalExponent: number
  exponentGainEntries: ExponentGainEntry[]
}

export const OgTechLeftColumn = (props: OgTechLeftColumnProps) => {
  return (
    <>
      <InfoCard title="Run Inputs">
        <div class="grid gap-2">
          <NumberField
            label="Juno gains"
            value={props.gainValue}
            onInput={props.setGainValue}
            placeholder="1e12"
            tooltip="og.junoGains"
            inline
            inlineAccessory={
              <div class="flex items-center gap-1">
                <span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink/70 dark:text-white/70">/</span>
                <select
                  value={props.gainUnit}
                  onChange={(event) => props.setGainUnit(event.currentTarget.value as GainUnit)}
                  onKeyDown={blurOnEnterOrEscape}
                  class="w-[7rem] rounded-xl border border-ink/20 bg-white px-2 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
                >
                  <For each={props.gainUnits}>{(option) => <option value={option.value}>{option.label}</option>}</For>
                </select>
              </div>
            }
          />
          <NumberField
            label="Current Juno"
            value={props.junoAmount}
            onInput={props.setJunoAmount}
            placeholder="1e13"
            tooltip="og.currentJuno"
            inline
          />
          <SelectField
            label="Calculation mode"
            value={props.mode}
            onChange={(next) => props.setMode(next as ZatMode)}
            options={props.modeOptions}
            tooltip="og.calculationMode"
            inline
          />
        </div>
      </InfoCard>

      <InfoCard title="Premium Resources">
        <div class="space-y-2">
          <NumberField
            label="Juno output level"
            value={props.junoOutput}
            onInput={props.setJunoOutput}
            min={0}
            max={750}
            step={1}
            tooltip="og.junoOutputLevel"
            inline
          />
          <ToggleField
            label="Juno bundle"
            checked={props.junoBundle}
            onChange={props.setJunoBundle}
            tooltip="og.junoBundle"
          />
          <ToggleField
            label="Ixion-Juno bundle"
            checked={props.ixionJunoBundle}
            onChange={props.setIxionJunoBundle}
            tooltip="og.ixionJunoBundle"
          />
          <ToggleField
            label="Juno-Kappa bundle"
            checked={props.junoKappaBundle}
            onChange={props.setJunoKappaBundle}
            tooltip="og.junoKappaBundle"
          />
          <NumberField
            label="Juno tokens"
            value={props.tokens}
            onInput={props.setTokens}
            min={0}
            max={1800}
            step={1}
            tooltip="og.junoTokens"
            inline
          />
          <p class="text-xs text-ink/70 dark:text-white/70">
            Total premium multiplier: x{props.premiumMultiplier.toFixed(3)}
          </p>
        </div>
      </InfoCard>

      <InfoCard title="Zagreus">
        <div class="grid gap-2">
          <NumberField
            label="Zagreis cycles"
            value={props.cycles}
            onInput={props.setCycles}
            min={0}
            max={100}
            step={1}
            tooltip="og.zagreusCycles"
            inline
          />
          <NumberField
            label="Shares %"
            value={props.sharesPercent}
            onInput={props.setSharesPercent}
            min={0}
            max={100}
            step={0.01}
            tooltip="og.sharesPercent"
            inline
          />
        </div>
        <p class="mt-3 text-xs text-ink/70 dark:text-white/70">Shares amount: {props.shareAmount.toFixed(2)}</p>
        <p class="mt-2 text-xs text-ink/70 dark:text-white/70">
          The Z.A.T Guide page has Tree recommendations and expected boost by node. Open it in the{" "}
          <A href="/zat-guide" class="font-semibold text-accent underline">
            ZAT Guide tab
          </A>
          .
        </p>
      </InfoCard>

      <InfoCard title="Juno Exponent" contentClass="">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-ink/70 dark:text-white/70">Use simple input or expand rule-based fields.</p>
          <button
            type="button"
            class="rounded-lg border border-ink/25 px-2.5 py-1 text-xs font-semibold text-ink/80 transition hover:bg-ink hover:text-white dark:border-white/30 dark:text-white/80 dark:hover:bg-white/20"
            onClick={props.onToggleExpandedExponent}
          >
            {props.showExpandedExponent ? "Simple input" : "Expand inputs"}
          </button>
        </div>

        <Show
          when={props.showExpandedExponent}
          fallback={
            <div class="mt-3">
              <NumberField
                label="Extra exponent"
                value={props.extraExponent}
                onInput={props.setExtraExponent}
                min={0.001}
                max={1}
                step={0.001}
                tooltip="og.extraExponent"
                inline
              />
            </div>
          }
        >
          <div class="mt-3 grid gap-2">
            <NumberField
              label="SE level"
              value={props.seLevel}
              onInput={props.setSeLevel}
              step={1}
              tooltip="og.seLevel"
              inline
            />
            <NumberField
              label="Player level"
              value={props.playerLevel}
              onInput={props.setPlayerLevel}
              step={1}
              tooltip="og.playerLevel"
              inline
            />
            <NumberField
              label="DCM level"
              value={props.dcmLevel}
              onInput={props.setDcmLevel}
              step={1}
              tooltip="og.dcmLevel"
              inline
            />
            <NumberField
              label="Research level"
              value={props.researchLevel}
              onInput={props.setResearchLevel}
              step={1}
              tooltip="og.researchLevel"
              inline
            />
            <ToggleField
              label="Meltdown bundle"
              checked={props.meltdownBundle}
              onChange={props.setMeltdownBundle}
              tooltip="og.meltdownBundle"
            />
            <ToggleField
              label="Quantum Addon 0"
              checked={props.quantumAddon0}
              onChange={props.setQuantumAddon0}
              tooltip="og.quantumAddon0"
            />
          </div>
        </Show>

        <div class="mt-3 grid gap-2 rounded-xl border border-ink/10 bg-mist/70 p-3 dark:border-white/15 dark:bg-[#23344d]">
          <p class="text-sm text-ink/80 dark:text-white/80">
            Total exponent: <strong>{props.totalExponent.toFixed(3)}</strong>
          </p>
          <p class="text-xs text-ink/70 dark:text-white/70">Base 0.01 + extra + OG0 contribution + meltdown bonus.</p>
          <div class="flex flex-wrap gap-2">
            <For each={props.exponentGainEntries}>
              {(entry) => (
                <span class="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-ink/85 dark:text-white/85">
                  +{entry.delta.toFixed(3)}: x{entry.multiplier.toFixed(2)}
                </span>
              )}
            </For>
          </div>
        </div>
      </InfoCard>
    </>
  )
}
