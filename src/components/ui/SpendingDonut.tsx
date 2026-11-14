import { createMemo, For } from "solid-js"

const COLORS = ["#0d9488", "#3b82f6", "#d97706", "#e11d48"]

type SpendingDonutProps = {
  sections: { id: string; name: string; spent: number }[]
  currency: string
  formatAmount: (value: number) => string
}

export const SpendingDonut = (props: SpendingDonutProps) => {
  const total = () => props.sections.reduce((sum, section) => sum + section.spent, 0)
  const background = createMemo(() => {
    const sum = total()
    if (sum <= 0) return "#94a3b8"
    let position = 0
    const stops = props.sections.map((section, index) => {
      const start = position
      position += (section.spent / sum) * 100
      return `${COLORS[index % COLORS.length]} ${start}% ${position}%`
    })
    return `conic-gradient(${stops.join(", ")})`
  })
  const share = (spent: number) =>
    `${(total() > 0 ? (spent / total()) * 100 : 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`

  return (
    <figure
      aria-label={`Spending by section in ${props.currency}`}
      class="grid items-center gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]"
    >
      <div class="relative mx-auto h-56 w-56 max-w-full rounded-full" style={{ background: background() }}>
        <div class="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white px-2 text-center dark:bg-[#182538]">
          <span class="text-xs text-ink/65 dark:text-white/65">Total spent</span>
          <span
            class={`my-1 w-full break-words font-mono font-semibold text-accent dark:text-[#8ce3ff] ${props.formatAmount(total()).length > 12 ? "text-xs" : "text-base"}`}
          >
            {props.formatAmount(total())}
          </span>
          <span class="text-xs text-ink/65 dark:text-white/65">{props.currency}</span>
        </div>
      </div>
      <figcaption class="min-w-0">
        <ul class="grid gap-3">
          <For each={props.sections}>
            {(section, index) => (
              <li class="grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-0.5 text-sm">
                <span
                  aria-hidden="true"
                  class="h-3 w-3 self-center rounded-sm"
                  style={{ "background-color": COLORS[index() % COLORS.length] }}
                />
                <span class="break-words font-semibold">{section.name}</span>
                <span class="text-right font-mono text-xs text-ink/65 dark:text-white/65">{share(section.spent)}</span>
                <span class="col-start-2 col-end-4 break-all font-mono text-xs tabular-nums">
                  {props.formatAmount(section.spent)}
                </span>
              </li>
            )}
          </For>
        </ul>
      </figcaption>
    </figure>
  )
}
