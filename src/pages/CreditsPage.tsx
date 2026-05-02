import { For, Show } from "solid-js"
import creditsJson from "../../data/credits.json"
import { Panel } from "../components/layout/Panel"

type CreditEntry = {
  name: string
  credits: string[]
}

export const CreditsPage = () => {
  const credits = (creditsJson as CreditEntry[]).slice()

  return (
    <Panel title="Credits" subtitle="Contributors, references, and acknowledgements from data/credits.json.">
      <Show
        when={credits.length > 0}
        fallback={
          <div class="rounded-2xl border border-dashed border-ink/25 bg-white/70 p-6 dark:border-white/30 dark:bg-[#182538]/75">
            <p class="text-sm text-ink/75 dark:text-white/70">
              No credits listed yet. Add entries to data/credits.json using the shape:
            </p>
            <pre class="mt-3 overflow-x-auto rounded-xl border border-ink/15 bg-white/85 p-3 text-xs text-ink dark:border-white/15 dark:bg-[#1a2638] dark:text-white">
              {`[
  {
    "name": "Display Name",
    "credits": ["Credit line 1", "Credit line 2"]
  }
]`}
            </pre>
          </div>
        }
      >
        <div class="space-y-4">
          <For each={credits}>
            {(entry) => (
              <article class="rounded-2xl border border-ink/15 bg-white/70 p-4 dark:border-white/15 dark:bg-[#182538]/75">
                <h3 class="text-base font-bold text-ink dark:text-white">{entry.name}</h3>
                <ul class="mt-3 space-y-1.5 pl-5 text-sm leading-6 text-ink/85 marker:text-accent dark:text-white/85">
                  <For each={entry.credits}>{(line) => <li>{line}</li>}</For>
                </ul>
              </article>
            )}
          </For>
        </div>
      </Show>
    </Panel>
  )
}
