import { A, Route, useLocation } from "@solidjs/router";
import { createMemo, type ParentProps, For } from "solid-js";
import * as TextField from "@kobalte/core/text-field";
import { LargeNumber } from "./lib/large-number.js";
import { createPersistedSignal } from "./lib/persisted-signal.js";

type TabItem = { href: string; label: string };

const tabs: TabItem[] = [
  { href: "/", label: "Calculator" },
  { href: "/growth", label: "Growth Sim" },
  { href: "/dummy-alpha", label: "Dummy Alpha" },
  { href: "/dummy-beta", label: "Dummy Beta" },
];

const opOptions = ["+", "-", "*", "/"] as const;

function TopNav() {
  const location = useLocation();

  return (
    <header class="relative z-10 px-4 pt-8 sm:px-8">
      <div class="mx-auto flex w-full max-w-6xl flex-wrap gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-glow backdrop-blur">
        <For each={tabs}>
          {(tab) => (
            <A
              href={tab.href}
              class="rounded-xl px-4 py-2 text-sm font-semibold tracking-wide text-ink/80 transition hover:-translate-y-0.5 hover:bg-ink hover:text-white"
              classList={{
                "bg-ink text-white": location.pathname === tab.href,
              }}
            >
              {tab.label}
            </A>
          )}
        </For>
      </div>
    </header>
  );
}

function Panel(props: ParentProps<{ title: string; subtitle: string }>) {
  return (
    <section class="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-glow backdrop-blur sm:p-8">
      <h2 class="text-2xl font-bold text-ink">{props.title}</h2>
      <p class="mt-2 text-sm text-ink/70">{props.subtitle}</p>
      <div class="mt-6">{props.children}</div>
    </section>
  );
}

function InputField(props: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextField.Root
      value={props.value}
      onChange={props.onInput}
      class="grid gap-2"
    >
      <TextField.Label class="text-sm font-semibold uppercase tracking-[0.12em] text-ink/80">
        {props.label}
      </TextField.Label>
      <TextField.Input
        placeholder={props.placeholder}
        class="w-full rounded-xl border border-ink/20 bg-white px-4 py-3 font-mono text-ink outline-none ring-brand/40 transition focus:ring"
      />
    </TextField.Root>
  );
}

function CalculatorPage() {
  const [left, setLeft] = createPersistedSignal("calculator.left", "1.23e456");
  const [right, setRight] = createPersistedSignal(
    "calculator.right",
    "2.00e455",
  );
  const [operation, setOperation] = createPersistedSignal<
    (typeof opOptions)[number]
  >("calculator.operation", "+");

  const result = createMemo(() => {
    try {
      const a = LargeNumber.parse(left());
      const b = LargeNumber.parse(right());

      if (operation() === "+") return a.add(b).toString(2);
      if (operation() === "-") return a.subtract(b).toString(2);
      if (operation() === "*") return a.multiply(b).toString(2);
      return a.divide(b).toString(2);
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  });

  return (
    <Panel
      title="Large Number Calculator"
      subtitle="Inputs accept values like 1.23e456 and run fully client-side."
    >
      <div class="grid gap-4 md:grid-cols-2">
        <InputField
          label="Value A"
          value={left()}
          onInput={setLeft}
          placeholder="1.23e456"
        />
        <InputField
          label="Value B"
          value={right()}
          onInput={setRight}
          placeholder="2.34e400"
        />
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <For each={opOptions}>
          {(op) => (
            <button
              type="button"
              class="rounded-xl border border-ink/30 px-4 py-2 font-semibold transition hover:bg-ink hover:text-white"
              classList={{ "bg-brand text-white": operation() === op }}
              onClick={() => setOperation(op)}
            >
              {op}
            </button>
          )}
        </For>
      </div>

      <div class="mt-6 rounded-xl border border-accent/25 bg-accent/10 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-ink/70">
          Result
        </p>
        <p class="mt-2 break-all font-mono text-lg text-ink">{result()}</p>
      </div>
    </Panel>
  );
}

function GrowthPage() {
  const [start, setStart] = createPersistedSignal("growth.start", "1.00e6");
  const [multiplier, setMultiplier] = createPersistedSignal(
    "growth.multiplier",
    "1.05e0",
  );
  const [ticks, setTicks] = createPersistedSignal("growth.ticks", "100");

  const projected = createMemo(() => {
    try {
      const startValue = LargeNumber.parse(start());
      const factor = LargeNumber.parse(multiplier());
      const steps = Number(ticks());

      if (!Number.isInteger(steps) || steps < 0 || steps > 10000) {
        throw new Error("Ticks must be an integer between 0 and 10000");
      }

      return startValue.multiply(factor.powInt(steps)).toString(2);
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  });

  return (
    <Panel
      title="Growth Simulation"
      subtitle="Model compounding progression with large-value math."
    >
      <div class="grid gap-4 md:grid-cols-3">
        <InputField
          label="Start"
          value={start()}
          onInput={setStart}
          placeholder="1.00e6"
        />
        <InputField
          label="Per Tick Multiplier"
          value={multiplier()}
          onInput={setMultiplier}
          placeholder="1.05e0"
        />
        <InputField
          label="Ticks"
          value={ticks()}
          onInput={setTicks}
          placeholder="100"
        />
      </div>

      <div class="mt-6 rounded-xl border border-brand/20 bg-brand/10 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-ink/70">
          Projected Value
        </p>
        <p class="mt-2 break-all font-mono text-lg text-ink">{projected()}</p>
      </div>
    </Panel>
  );
}

function DummyPage(props: { title: string; notes: string[] }) {
  return (
    <Panel
      title={props.title}
      subtitle="Placeholder tab for future game-specific tools."
    >
      <div class="grid gap-3">
        <For each={props.notes}>
          {(note, index) => (
            <div class="rounded-xl border border-ink/15 bg-white p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">
                Module {index() + 1}
              </p>
              <p class="mt-1 text-sm text-ink/80">{note}</p>
            </div>
          )}
        </For>
      </div>
    </Panel>
  );
}

export default function App() {
  return (
    <div class="relative min-h-screen overflow-hidden bg-mist text-ink">
      <div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,rgba(255,107,53,0.2),transparent_50%),radial-gradient(circle_at_90%_10%,rgba(10,143,148,0.25),transparent_45%),radial-gradient(circle_at_40%_85%,rgba(12,28,48,0.18),transparent_40%)]" />
      <TopNav />
      <main class="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-8">
        <Route path="/" component={CalculatorPage} />
        <Route path="/growth" component={GrowthPage} />
        <Route
          path="/dummy-alpha"
          component={() =>
            DummyPage({
              title: "Dummy Alpha",
              notes: [
                "High-level formulas and one-off balancing checks.",
                "Import/export seed values for quick iteration.",
                "Candidate place for resource conversion table.",
              ],
            })
          }
        />
        <Route
          path="/dummy-beta"
          component={() =>
            DummyPage({
              title: "Dummy Beta",
              notes: [
                "Sandbox for prestige-reset scenarios.",
                "Graph or timeline widgets can be added here.",
                "Compare two build paths side by side.",
              ],
            })
          }
        />
      </main>
    </div>
  );
}
