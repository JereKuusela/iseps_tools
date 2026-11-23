import { For, Show, createSignal } from "solid-js"
import perks from "../../../data/perks.json"
import zatGuides from "../../../data/zat_guides.json"
import { ResourceText } from "../../components/ui/ResourceText"

const sections = [
  {
    title: "ZAT Guide",
    notes: zatGuides.flatMap(({ cycle, run, note }) =>
      note?.trim() ? [{ label: `Cycle ${cycle} / ${run}`, text: note }] : [],
    ),
  },
  {
    title: "Perk Guide",
    notes: perks.flatMap(({ se, run, notes }) => (notes?.trim() ? [{ label: `SE ${se} / ${run}`, text: notes }] : [])),
  },
]

export default function GuideNotesPage() {
  const [showSource, setShowSource] = createSignal(false)

  return (
    <div class="mx-auto max-w-6xl space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-bold">Guide notes</h1>
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showSource()}
            onChange={(event) => setShowSource(event.currentTarget.checked)}
          />
          Show source markup
        </label>
      </div>

      <div class="grid items-start gap-8 lg:grid-cols-2">
        <For each={sections}>
          {(section) => (
            <section class="min-w-0">
              <h2 class="text-lg font-semibold">
                {section.title} ({section.notes.length})
              </h2>
              <ul class="mt-2 divide-y divide-ink/15 border-y border-ink/15 dark:divide-white/15 dark:border-white/15">
                <For each={section.notes}>
                  {(note) => (
                    <li class="space-y-2 py-3">
                      <h3 class="text-sm font-semibold">{note.label}</h3>
                      <p class="whitespace-pre-wrap text-sm leading-6 text-ink/80 dark:text-white/80">
                        <ResourceText text={note.text} />
                      </p>
                      <Show when={showSource()}>
                        <pre class="whitespace-pre-wrap break-words rounded bg-ink/5 p-2 text-xs dark:bg-white/10">
                          {note.text}
                        </pre>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            </section>
          )}
        </For>
      </div>
    </div>
  )
}
