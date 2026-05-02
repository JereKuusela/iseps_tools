import { Panel } from "../components/layout/Panel2"

export function PlaceholderPage(props: { title: string; subtitle: string }) {
  return (
    <Panel title={props.title} subtitle={props.subtitle}>
      <div class="rounded-2xl border border-dashed border-ink/25 bg-white/70 p-6 dark:border-white/30 dark:bg-[#182538]/75">
        <p class="text-sm text-ink/75 dark:text-white/70">
          This tab is scaffolded and ready for the next implementation pass.
        </p>
      </div>
    </Panel>
  )
}
