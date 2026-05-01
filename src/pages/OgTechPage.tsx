import { A } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";
import {
  NumberField,
  SelectField,
  ToggleField,
} from "../components/ui/form-controls";
import { Panel } from "../components/layout/panel";
import { LargeNumber } from "../lib/large-number.js";
import { createPersistedSignal } from "../lib/persisted-signal.js";
import { useZatData, type JunoExponentType } from "../lib/zat-data-context.js";
import {
  calculateExponentIncreaseMultipliers,
  calculateNextThreeTechCosts,
  calculateSeEffect,
  calculateTechBoost,
  calculateTotalPremiumMultiplier,
  calculateZatBoostPerTech,
  type ZatMode,
} from "../lib/zat-calculator.js";

type GainUnit = "sec" | "min" | "hour";

type RankedTech = {
  id: number;
  level: number;
  score: number;
  rawValue: number;
  cost: LargeNumber;
  etaSeconds: number;
};

const gainUnits: { value: GainUnit; label: string }[] = [
  { value: "sec", label: "Per second" },
  { value: "min", label: "Per minute" },
  { value: "hour", label: "Per hour" },
];

const modeOptions = [
  { value: "juno", label: "Juno" },
  { value: "dc", label: "DC" },
];

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function parseNumberish(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function toRatePerSecond(value: number, unit: GainUnit): number {
  if (unit === "min") return value / 60;
  if (unit === "hour") return value / 3600;
  return value;
}

function parseLargeNumberSafe(value: string): LargeNumber {
  try {
    return LargeNumber.parse(value.trim() === "" ? "0" : value);
  } catch {
    return LargeNumber.zero();
  }
}

function secondsToLabel(seconds: number): string {
  if (!Number.isFinite(seconds)) return "> 10 years";
  if (seconds <= 0) return "Ready";
  if (seconds < 120) return `${Math.ceil(seconds)} sec`;

  const minutes = seconds / 60;
  if (minutes < 120) return `${minutes.toFixed(1)} min`;

  const hours = minutes / 60;
  if (hours < 72) return `${hours.toFixed(1)} hr`;

  const days = hours / 24;
  if (days < 3650) return `${days.toFixed(1)} days`;

  return "> 10 years";
}

function estimateSeconds(
  cost: LargeNumber,
  current: LargeNumber,
  gainPerSecond: number,
): number {
  if (gainPerSecond <= 0) return Number.POSITIVE_INFINITY;
  if (cost.compare(current) <= 0) return 0;

  const remaining = cost.subtract(current).divide(gainPerSecond);
  if (remaining.exponent > 12) return Number.POSITIVE_INFINITY;
  return remaining.mantissa * 10 ** remaining.exponent;
}

function logScore(value: number, cost: LargeNumber): number {
  const safeValue = Math.max(value, Number.EPSILON);
  return (
    Math.log(safeValue) -
    (Math.log(Math.max(cost.mantissa, Number.EPSILON)) +
      cost.exponent * Math.log(10))
  );
}

export function OgTechPage(props: {
  cycles: string;
  setCycles: (next: string) => void;
}) {
  const data = useZatData();

  const [gainValue, setGainValue] = createPersistedSignal(
    "zat.og.gain",
    "1e12",
  );
  const [gainUnit, setGainUnit] = createPersistedSignal<GainUnit>(
    "zat.og.gainUnit",
    "sec",
  );
  const [junoAmount, setJunoAmount] = createPersistedSignal(
    "zat.og.junoAmount",
    "1e13",
  );
  const [mode, setMode] = createPersistedSignal<ZatMode>("zat.og.mode", "juno");

  const [junoOutput, setJunoOutput] = createPersistedSignal(
    "zat.og.junoOutput",
    "0",
  );
  const [junoBundle, setJunoBundle] = createPersistedSignal(
    "zat.og.bundle.juno",
    false,
  );
  const [ixionJunoBundle, setIxionJunoBundle] = createPersistedSignal(
    "zat.og.bundle.ixion",
    false,
  );
  const [junoKappaBundle, setJunoKappaBundle] = createPersistedSignal(
    "zat.og.bundle.kappa",
    false,
  );
  const [tokens, setTokens] = createPersistedSignal("zat.og.tokens", "0");

  const [sharesPercent, setSharesPercent] = createPersistedSignal(
    "zat.og.shares",
    "0",
  );

  const [extraExponent, setExtraExponent] = createPersistedSignal(
    "zat.og.extraExponent",
    "0.001",
  );
  const [showExpandedExponent, setShowExpandedExponent] = createSignal(false);
  const [seLevel, setSeLevel] = createPersistedSignal("zat.og.seLevel", "0");
  const [playerLevel, setPlayerLevel] = createPersistedSignal(
    "zat.og.playerLevel",
    "0",
  );
  const [dcmLevel, setDcmLevel] = createPersistedSignal("zat.og.dcmLevel", "0");
  const [researchLevel, setResearchLevel] = createPersistedSignal(
    "zat.og.researchLevel",
    "0",
  );
  const [meltdownBundle, setMeltdownBundle] = createPersistedSignal(
    "zat.og.meltdown",
    false,
  );
  const [quantumAddon0, setQuantumAddon0] = createPersistedSignal(
    "zat.og.qa0",
    false,
  );

  const [techLevels, setTechLevels] = createSignal<number[]>(
    Array.from({ length: data().techs.length }, () => 0),
  );

  const gainPerSecond = createMemo(() => {
    return Math.max(
      0,
      toRatePerSecond(parseNumberish(gainValue()), gainUnit()),
    );
  });

  const currentJuno = createMemo(() => parseLargeNumberSafe(junoAmount()));
  const seEffect = createMemo(() =>
    calculateSeEffect(parseNumberish(seLevel())),
  );
  const zatBoost = createMemo(() =>
    calculateZatBoostPerTech(parseNumberish(props.cycles), mode()),
  );

  const premiumSummary = createMemo(() => {
    return calculateTotalPremiumMultiplier({
      "Juno Output": parseNumberish(junoOutput()),
      "Juno Bundle": junoBundle(),
      "Ixion Juno Bundle": ixionJunoBundle(),
      "Juno Kappa Bundle": junoKappaBundle(),
      tokens: parseNumberish(tokens()),
    });
  });

  const autoExtraExponent = createMemo(() => {
    const levelsByType: Record<JunoExponentType, number> = {
      se: parseNumberish(seLevel()),
      player: parseNumberish(playerLevel()),
      research: parseNumberish(researchLevel()),
      dcm: parseNumberish(dcmLevel()),
      qa: quantumAddon0() ? 1 : 0,
      crystal: 1,
    };

    return data().junoExponent.reduce((total, rule) => {
      const current = levelsByType[rule.type] ?? 0;
      return current >= rule.level ? total + rule.exp : total;
    }, 0);
  });

  const selectedExtraExponent = createMemo(() => {
    if (showExpandedExponent()) return autoExtraExponent();
    return Math.max(0, parseNumberish(extraExponent()));
  });

  const og0Level = createMemo(() => techLevels()[0] ?? 0);
  const totalExponent = createMemo(() => {
    const meltdown = meltdownBundle() ? 0.005 : 0;
    return 0.01 + selectedExtraExponent() + og0Level() * 0.01 + meltdown;
  });

  const exponentGainEntries = createMemo(() => {
    return calculateExponentIncreaseMultipliers(
      gainPerSecond(),
      Math.max(totalExponent(), 0.001),
      premiumSummary().multiplier,
      [0.001, 0.005, 0.01],
    );
  });

  const rankedTechs = createMemo<RankedTech[]>(() => {
    const current = currentJuno();
    const gain = gainPerSecond();
    const levels = techLevels();

    const ranked: RankedTech[] = [];

    for (const tech of data().techs) {
      const currentLevel = levels[tech.id] ?? 0;
      const nextThree = calculateNextThreeTechCosts(tech.id, currentLevel);
      const techBoost = calculateTechBoost(
        zatBoost(),
        seEffect(),
        tech.id,
        mode(),
      );

      for (const option of nextThree) {
        const score = logScore(techBoost.finalBoost, option.cost);
        ranked.push({
          id: tech.id,
          level: option.level,
          score,
          rawValue: techBoost.finalBoost,
          cost: option.cost,
          etaSeconds: estimateSeconds(option.cost, current, gain),
        });
      }
    }

    return ranked.sort((a, b) => b.score - a.score);
  });

  const bestTech = createMemo(() => rankedTechs()[0] ?? null);

  const topFive = createMemo(() => {
    const all = rankedTechs();
    if (all.length === 0) return [];
    const best = all[0].score;

    return all.slice(0, 5).map((entry) => ({
      ...entry,
      relative: Math.max(0, Math.min(100, Math.exp(entry.score - best) * 100)),
    }));
  });

  const techCardRows = createMemo(() => {
    const levels = techLevels();
    const ranked = rankedTechs();
    const bestScore = ranked[0]?.score ?? 0;

    return data().techs.map((tech) => {
      const currentLevel = levels[tech.id] ?? 0;
      const next = calculateNextThreeTechCosts(tech.id, currentLevel)[0];
      const boost = calculateTechBoost(zatBoost(), seEffect(), tech.id, mode());
      const score = next
        ? logScore(boost.finalBoost, next.cost)
        : Number.NEGATIVE_INFINITY;

      return {
        id: tech.id,
        label: `OG${tech.id}`,
        level: currentLevel,
        relative:
          ranked.length > 0
            ? Math.max(0, Math.min(100, Math.exp(score - bestScore) * 100))
            : 0,
        etaSeconds: next
          ? estimateSeconds(next.cost, currentJuno(), gainPerSecond())
          : Number.POSITIVE_INFINITY,
        nextCost: next ? next.cost.toString(2) : "-",
      };
    });
  });

  const totalTechLevels = createMemo(() =>
    techLevels().reduce((sum, value) => sum + value, 0),
  );

  const setTechLevel = (id: number, next: number) => {
    setTechLevels((current) => {
      const updated = current.slice();
      updated[id] = Math.max(0, Math.floor(next));
      return updated;
    });
  };

  const buyTechLevel = (id: number) => {
    setTechLevel(id, (techLevels()[id] ?? 0) + 1);
  };

  const buyNextBest = () => {
    const best = bestTech();
    if (!best) return;
    setTechLevel(best.id, best.level);
  };

  const autoBuyUnderHour = () => {
    const nextByTech = new Map<number, RankedTech>();
    for (const entry of rankedTechs()) {
      if (!nextByTech.has(entry.id)) {
        nextByTech.set(entry.id, entry);
      }
    }

    for (const [id, entry] of nextByTech.entries()) {
      if (entry.etaSeconds <= 3600) {
        setTechLevel(id, entry.level);
      }
    }
  };

  const shareAmount = createMemo(() => {
    return parseNumberish(sharesPercent()) / 0.05;
  });

  return (
    <Panel
      title="OG Tech"
      subtitle="Input your run state and compare the highest-value OG upgrades."
    >
      <div class="grid gap-6 xl:grid-cols-[1.05fr_1.25fr]">
        <section class="space-y-4">
          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">
              Run Inputs
            </h3>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Juno gains"
                value={gainValue()}
                onInput={setGainValue}
                placeholder="1e12"
                tooltip="Juno gain in the selected unit."
              />
              <SelectField
                label="Gain unit"
                value={gainUnit()}
                onChange={(next) => setGainUnit(next as GainUnit)}
                options={gainUnits}
              />
              <NumberField
                label="Current Juno"
                value={junoAmount()}
                onInput={setJunoAmount}
                placeholder="1e13"
                tooltip="Current Juno available for purchases."
              />
              <SelectField
                label="Calculation mode"
                value={mode()}
                onChange={(next) => setMode(next as ZatMode)}
                options={modeOptions}
                tooltip="During your Juno run keep Juno mode, then switch to DC near the end."
              />
            </div>
          </div>

          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">
              Premium Resources
            </h3>
            <div class="mt-3 space-y-3">
              <NumberField
                label="Juno output level"
                value={junoOutput()}
                onInput={setJunoOutput}
                min={0}
                max={750}
                step={1}
                hint={`Boost: ${(parseNumberish(junoOutput()) * 2).toFixed(1)}%`}
              />
              <ToggleField
                label="Juno bundle"
                checked={junoBundle()}
                onChange={setJunoBundle}
                hint="+50% additive"
              />
              <ToggleField
                label="Ixion-Juno bundle"
                checked={ixionJunoBundle()}
                onChange={setIxionJunoBundle}
                hint="+75% additive"
              />
              <ToggleField
                label="Juno-Kappa bundle"
                checked={junoKappaBundle()}
                onChange={setJunoKappaBundle}
                hint="+100% additive"
              />
              <NumberField
                label="Juno tokens"
                value={tokens()}
                onInput={setTokens}
                min={0}
                max={1800}
                step={1}
                hint={`Total premium multiplier: x${premiumSummary().multiplier.toFixed(3)}`}
              />
            </div>
          </div>

          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">
              Zagreus
            </h3>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Zagreys cycles"
                value={props.cycles}
                onInput={props.setCycles}
                min={0}
                max={100}
                step={1}
              />
              <NumberField
                label="Shares %"
                value={sharesPercent()}
                onInput={setSharesPercent}
                min={0}
                max={100}
                step={0.01}
                hint={`Shares amount: ${shareAmount().toFixed(2)}`}
              />
            </div>
            <p class="mt-3 text-xs text-ink/70">
              The Z.A.T Guide page has Tree recommendations, and displays the
              expected boost from each node. Open it in the{" "}
              <A href="/zat-guide" class="font-semibold text-accent underline">
                ZAT Guide tab
              </A>
              .
            </p>
          </div>

          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">
                Juno Exponent
              </h3>
              <button
                type="button"
                class="rounded-lg border border-ink/25 px-2.5 py-1 text-xs font-semibold text-ink/80 transition hover:bg-ink hover:text-white"
                onClick={() => setShowExpandedExponent((current) => !current)}
              >
                {showExpandedExponent() ? "Simple input" : "Expand inputs"}
              </button>
            </div>

            <Show
              when={showExpandedExponent()}
              fallback={
                <div class="mt-3">
                  <NumberField
                    label="Extra exponent"
                    value={extraExponent()}
                    onInput={setExtraExponent}
                    min={0.001}
                    max={1}
                    step={0.001}
                    hint="Range: 0.001 to 1.000"
                  />
                </div>
              }
            >
              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="SE level"
                  value={seLevel()}
                  onInput={setSeLevel}
                  step={1}
                />
                <NumberField
                  label="Player level"
                  value={playerLevel()}
                  onInput={setPlayerLevel}
                  step={1}
                />
                <NumberField
                  label="DCM level"
                  value={dcmLevel()}
                  onInput={setDcmLevel}
                  step={1}
                />
                <NumberField
                  label="Research level"
                  value={researchLevel()}
                  onInput={setResearchLevel}
                  step={1}
                />
                <ToggleField
                  label="Meltdown bundle"
                  checked={meltdownBundle()}
                  onChange={setMeltdownBundle}
                  hint="+0.005 exponent"
                />
                <ToggleField
                  label="Quantum Addon 0"
                  checked={quantumAddon0()}
                  onChange={setQuantumAddon0}
                  hint="Unlocks QA-based exponent rules"
                />
              </div>
            </Show>

            <div class="mt-3 grid gap-2 rounded-xl border border-ink/10 bg-mist/70 p-3">
              <p class="text-sm text-ink/80">
                Total exponent: <strong>{totalExponent().toFixed(3)}</strong>
              </p>
              <p class="text-xs text-ink/70">
                Base 0.01 + extra + OG0 contribution + meltdown bonus.
              </p>
              <div class="flex flex-wrap gap-2">
                <For each={exponentGainEntries()}>
                  {(entry) => (
                    <span class="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-ink/85">
                      +{entry.delta.toFixed(3)}: x{entry.multiplier.toFixed(2)}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-4">
          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">
                Recommendations
              </h3>
              <button
                type="button"
                class="rounded-lg border border-ink/25 px-2.5 py-1 text-xs font-semibold text-ink/80 transition hover:bg-ink hover:text-white"
                onClick={autoBuyUnderHour}
              >
                Auto buy &lt; 1hr
              </button>
            </div>

            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-ink/10 bg-mist/70 p-3">
                <p class="text-xs uppercase tracking-[0.12em] text-ink/65">
                  Total techs
                </p>
                <p class="mt-1 text-lg font-bold text-ink">
                  {totalTechLevels()}
                </p>
              </div>
              <div class="rounded-xl border border-ink/10 bg-mist/70 p-3">
                <p class="text-xs uppercase tracking-[0.12em] text-ink/65">
                  Best next
                </p>
                <p class="mt-1 text-sm font-semibold text-ink">
                  {bestTech()
                    ? `OG${bestTech()!.id} -> ${bestTech()!.level}`
                    : "-"}
                </p>
                <p class="text-xs text-ink/70">
                  {bestTech() ? secondsToLabel(bestTech()!.etaSeconds) : "-"}
                </p>
              </div>
              <div class="rounded-xl border border-ink/10 bg-mist/70 p-3">
                <p class="text-xs uppercase tracking-[0.12em] text-ink/65">
                  SE effect
                </p>
                <p class="mt-1 text-lg font-bold text-ink">
                  {seEffect().toFixed(4)}
                </p>
                <button
                  type="button"
                  class="mt-2 rounded-lg border border-ink/25 px-2.5 py-1 text-xs font-semibold text-ink/80 transition hover:bg-ink hover:text-white"
                  onClick={buyNextBest}
                >
                  Buy best
                </button>
              </div>
            </div>

            <div class="mt-4 overflow-x-auto rounded-xl border border-ink/10 bg-white">
              <table class="w-full min-w-[420px] border-collapse text-left text-sm">
                <thead class="bg-mist/80 text-xs uppercase tracking-[0.1em] text-ink/70">
                  <tr>
                    <th class="px-3 py-2">Up next</th>
                    <th class="px-3 py-2">Remaining</th>
                    <th class="px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={topFive()}>
                    {(entry) => (
                      <tr class="border-t border-ink/10">
                        <td class="px-3 py-2 font-semibold text-ink">{`OG${entry.id} -> ${entry.level}`}</td>
                        <td class="px-3 py-2 text-ink/80">
                          {secondsToLabel(entry.etaSeconds)}
                        </td>
                        <td class="px-3 py-2 text-ink/80">
                          {formatPercent(entry.relative / 100)}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>

          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">
              OG Tech Grid
            </h3>
            <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <For each={techCardRows()}>
                {(tech) => (
                  <article class="rounded-xl border border-ink/15 bg-white p-3">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <p class="text-xs uppercase tracking-[0.1em] text-ink/60">
                          Tech
                        </p>
                        <p class="text-base font-bold text-ink">{tech.label}</p>
                      </div>
                      <span class="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-ink/85">
                        {formatPercent(tech.relative / 100)}
                      </span>
                    </div>
                    <div class="mt-3 grid grid-cols-[1fr_auto] items-end gap-2">
                      <NumberField
                        label="Level"
                        value={String(tech.level)}
                        onInput={(next) =>
                          setTechLevel(tech.id, parseNumberish(next))
                        }
                        step={1}
                      />
                      <button
                        type="button"
                        class="h-10 rounded-lg border border-ink/25 px-3 text-sm font-semibold text-ink/80 transition hover:bg-ink hover:text-white"
                        onClick={() => buyTechLevel(tech.id)}
                      >
                        +1
                      </button>
                    </div>
                    <div class="mt-3 space-y-1 text-xs text-ink/75">
                      <p>ETA: {secondsToLabel(tech.etaSeconds)}</p>
                      <p class="font-mono">Cost: {tech.nextCost}</p>
                    </div>
                  </article>
                )}
              </For>
            </div>
          </div>
        </section>
      </div>
    </Panel>
  );
}
