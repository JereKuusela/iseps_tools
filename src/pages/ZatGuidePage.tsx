import { createMemo, For, Show } from "solid-js";
import { NumberField, SelectField } from "../components/ui/form-controls";
import { Panel } from "../components/layout/panel";
import { createPersistedSignal } from "../lib/persisted-signal.js";
import { useZatData } from "../lib/zat-data-context.js";

type GuideRunType = "se_push" | "g_points" | "juno" | "cash";

type GuideEntry = {
  cycle: number;
  run: string;
  nodes: number[];
  note?: string;
};

type GuideNodeView = {
  id: number;
  name: string;
  x: number;
  y: number;
  req?: number;
  maxLv: number;
  activeLevel: number;
  boost: number;
  isSingleLevel: boolean;
};

const guideRunOptions: { value: GuideRunType; label: string }[] = [
  { value: "se_push", label: "SE Push" },
  { value: "g_points", label: "G-Points" },
  { value: "juno", label: "Juno" },
  { value: "cash", label: "Cash" },
];

function parseNumberish(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMultiplier(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "x0";
  if (value < 1000) return `x${value.toFixed(2)}`;

  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / 10 ** exponent;
  const signedExponent = exponent >= 0 ? `+${exponent}` : String(exponent);
  return `x${mantissa.toFixed(2)}E${signedExponent}`;
}

export function ZatGuidePage(props: {
  cycles: string;
  setCycles: (next: string) => void;
}) {
  const data = useZatData();

  const [runType, setRunType] = createPersistedSignal<GuideRunType>(
    "zat.guide.runType",
    "se_push",
  );
  const [sharesPercent, setSharesPercent] = createPersistedSignal(
    "zat.guide.shares",
    "0",
  );
  const [techCount, setTechCount] = createPersistedSignal(
    "zat.guide.techCount",
    "0",
  );

  const normalizedCycles = createMemo(() =>
    Math.max(1, Math.floor(parseNumberish(props.cycles))),
  );
  const shareAmount = createMemo(() =>
    Math.max(0, parseNumberish(sharesPercent()) / 0.05),
  );
  const normalizedTechCount = createMemo(() =>
    Math.max(0, Math.floor(parseNumberish(techCount()))),
  );

  const runGuides = createMemo(() => {
    return (data().zatGuides as GuideEntry[])
      .filter((entry) => entry.run === runType())
      .sort((a, b) => a.cycle - b.cycle);
  });

  const selectedGuide = createMemo<GuideEntry | null>(() => {
    const guides = runGuides();
    if (guides.length === 0) return null;

    const targetCycle = normalizedCycles();
    let selected = guides[0];

    for (const entry of guides) {
      if (entry.cycle > targetCycle) break;
      selected = entry;
    }

    return selected;
  });

  const nodeViews = createMemo<GuideNodeView[]>(() => {
    const counts = new Map<number, number>();
    for (const nodeId of selectedGuide()?.nodes ?? []) {
      counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
    }

    const techLevels = normalizedTechCount();
    const shares = shareAmount();

    return data()
      .zatNodes.slice()
      .sort((a, b) => a.id - b.id)
      .map((node) => {
        const maxLv = node.maxLv ?? 1;
        const rawCount = counts.get(node.id) ?? 0;
        const activeLevel = Math.min(rawCount, maxLv);
        const isSingleLevel = maxLv === 1;

        const baseBoost =
          (1 + techLevels * (node.techMul ?? 0)) *
          (1 + shares * (node.shareMul ?? 0));
        const exponentScale = Math.max(1, Math.floor(techLevels * 0.5));

        let boost = baseBoost ** exponentScale;
        if (node.sqrt) {
          boost = Math.sqrt(Math.max(boost, 0));
        }

        return {
          id: node.id,
          name: node.name,
          x: toFiniteNumber(node.x),
          y: toFiniteNumber(node.y),
          req: node.req,
          maxLv,
          activeLevel,
          boost,
          isSingleLevel,
        };
      });
  });

  const bounds = createMemo(() => {
    const nodes = nodeViews();
    if (nodes.length === 0) {
      return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    }

    const xs = nodes.map((node) => toFiniteNumber(node.x));
    const ys = nodes.map((node) => toFiniteNumber(node.y));

    const minX = Math.min(...xs) - 1;
    const maxX = Math.max(...xs) + 1;
    const minY = Math.min(...ys) - 1;
    const maxY = Math.max(...ys) + 1;

    return { minX, maxX, minY, maxY };
  });

  const nodePosition = (node: GuideNodeView) => {
    const spanX = Math.max(1, bounds().maxX - bounds().minX);
    const spanY = Math.max(1, bounds().maxY - bounds().minY);

    const x = ((node.x - bounds().minX) / spanX) * 100;
    const y = ((bounds().maxY - node.y) / spanY) * 100;

    return { x, y };
  };

  const recommendationLines = createMemo(() => {
    const nodesById = new Map(nodeViews().map((node) => [node.id, node]));
    const lines: string[] = [];

    for (const nodeId of selectedGuide()?.nodes ?? []) {
      const node = nodesById.get(nodeId);
      if (!node) continue;
      if (lines.includes(node.name)) continue;

      if (node.maxLv === 1) {
        lines.push(node.name);
      } else {
        lines.push(`${node.name} Lv ${node.activeLevel}`);
      }
    }

    return lines;
  });

  return (
    <Panel
      title="ZAT Guide"
      subtitle="Cycle- and run-based node recommendations with an interactive tree view."
    >
      <div class="grid gap-6 xl:grid-cols-[0.92fr_1.4fr]">
        <section class="space-y-4">
          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">
              Guide Inputs
            </h3>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Cycles"
                value={props.cycles}
                onInput={props.setCycles}
                min={1}
                max={100}
                step={1}
              />
              <SelectField
                label="Run type"
                value={runType()}
                onChange={(next) => setRunType(next as GuideRunType)}
                options={guideRunOptions}
              />
              <NumberField
                label="OG tech levels"
                value={techCount()}
                onInput={setTechCount}
                min={0}
                step={1}
                hint="Used for per-node boost preview."
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
          </div>

          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">
              Recommendation
            </h3>
            <Show
              when={selectedGuide()}
              fallback={
                <p class="mt-3 text-sm text-ink/70">
                  No guide data found for this run type.
                </p>
              }
            >
              <p class="mt-3 text-xs text-ink/65">
                Using cycle {selectedGuide()!.cycle} recommendation
                {selectedGuide()!.cycle !== normalizedCycles()
                  ? ` (closest at or below ${normalizedCycles()})`
                  : ""}
                .
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <For each={recommendationLines()}>
                  {(line) => (
                    <span class="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-ink/85">
                      {line}
                    </span>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">
              Notes
            </h3>
            <p class="mt-3 text-sm leading-6 text-ink/80">
              {selectedGuide()?.note ??
                "No special note for this cycle and run type."}
            </p>
          </div>
        </section>

        <section class="rounded-2xl border border-ink/15 bg-ink p-4 text-white sm:p-5">
          <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-white/85">
            Tree View
          </h3>
          <p class="mt-1 text-xs text-white/65">
            Node badges show selected levels from the current recommendation.
          </p>

          <div class="relative mt-4 h-[540px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(255,255,255,0.04),transparent_42%)] sm:h-[620px]">
            <svg
              class="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <For each={nodeViews().filter((node) => node.req !== undefined)}>
                {(node) => {
                  const fromNode = nodeViews().find(
                    (candidate) => candidate.id === node.req,
                  );
                  if (!fromNode) return null;

                  const from = nodePosition(fromNode);
                  const to = nodePosition(node);

                  return (
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="rgba(255,255,255,0.18)"
                      stroke-width="0.5"
                    />
                  );
                }}
              </For>
            </svg>

            <For each={nodeViews()}>
              {(node) => {
                const position = nodePosition(node);
                const isActive = node.activeLevel > 0;
                const nodeWidth = node.isSingleLevel ? "112px" : "86px";
                const nodeHeight = node.isSingleLevel ? "112px" : "68px";

                return (
                  <article
                    class="absolute -translate-x-1/2 -translate-y-1/2 border text-center shadow-lg transition"
                    classList={{
                      "border-white/15 bg-white/10 text-white/90": !isActive,
                      "border-brand/60 bg-brand/25 text-white": isActive,
                      "rounded-full": node.isSingleLevel,
                      "rounded-2xl": !node.isSingleLevel,
                    }}
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                      width: nodeWidth,
                      height: nodeHeight,
                    }}
                  >
                    <div class="flex h-full w-full flex-col items-center justify-center px-2 py-1.5">
                      <div
                        class="inline-flex h-5 min-w-5 items-center justify-center rounded-md border px-1 text-[11px] font-bold"
                        classList={{
                          "mb-1": !node.isSingleLevel,
                          "mb-2": node.isSingleLevel,
                          "border-white/25 bg-white/8": !isActive,
                          "border-white/70 bg-white/20": isActive,
                        }}
                      >
                        {node.activeLevel > 0
                          ? node.maxLv === 1
                            ? "X"
                            : String(node.activeLevel)
                          : "0"}
                      </div>
                      <p
                        class="font-semibold"
                        classList={{
                          "text-[11px] leading-3.5": !node.isSingleLevel,
                          "text-sm leading-4": node.isSingleLevel,
                        }}
                      >
                        {node.name}
                      </p>
                      <p
                        class="text-white/80"
                        classList={{
                          "mt-0.5 text-[10px]": !node.isSingleLevel,
                          "mt-1 text-[11px]": node.isSingleLevel,
                        }}
                      >
                        {formatMultiplier(node.boost)}
                      </p>
                    </div>
                  </article>
                );
              }}
            </For>
          </div>

          <p class="mt-3 text-xs text-white/65">
            Multipliers preview uses OG tech levels and shares inputs from this
            page.
          </p>
        </section>
      </div>
    </Panel>
  );
}
