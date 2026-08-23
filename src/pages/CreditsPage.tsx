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
    <Panel title="Credits">
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
    </Panel>
  )
}
