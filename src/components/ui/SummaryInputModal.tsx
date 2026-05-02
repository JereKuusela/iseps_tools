import { Show, createSignal, type JSX } from "solid-js"
import { Tooltip } from "./Tooltip"

type SummaryInputModalProps = {
  label: string
  value: string
  tooltipContent?: string
  children: JSX.Element
}

export const SummaryInputModal = (props: SummaryInputModalProps) => {
  const [isOpen, setIsOpen] = createSignal(false)

  return (
    <div
      class="relative"
      onFocusOut={(event) => {
        const related = event.relatedTarget
        if (related instanceof Node && event.currentTarget.contains(related)) return
        setIsOpen(false)
      }}
      onKeyDown={(event) => event.key === "Escape" && setIsOpen(false)}
    >
      <div class="grid grid-cols-[auto_1fr] items-start gap-2">
        <div class="flex items-center gap-1.5 pt-1.5">
          <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            {props.label}
          </label>
          <Show when={props.tooltipContent}>
            <Tooltip content={props.tooltipContent!} />
          </Show>
        </div>

        <input
          type="text"
          readOnly
          value={props.value}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          class="w-full cursor-pointer rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
        />
      </div>

      <Show when={isOpen()}>
        <div class="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 rounded-2xl border border-ink/20 bg-white p-3 shadow-xl dark:border-white/20 dark:bg-[#1a2638]">
          <div class="grid gap-2">{props.children}</div>
        </div>
      </Show>
    </div>
  )
}
