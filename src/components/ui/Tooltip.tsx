import * as KTooltip from "@kobalte/core/tooltip"
import { For, type JSX, type ParentProps } from "solid-js"

type TooltipProps = ParentProps<{ content: string }>

export const Tooltip = (props: TooltipProps) => {
  const split = () => props.content.split("<br>")
  return (
    <KTooltip.Root openDelay={120} closeDelay={80}>
      <KTooltip.Trigger class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-ink/25 bg-white text-xs font-semibold text-ink/80 transition hover:border-ink/45 hover:text-ink dark:border-white/25 dark:bg-[#172438] dark:text-white/85 dark:hover:border-white/50 dark:hover:text-white">
        {props.children ?? "?"}
      </KTooltip.Trigger>
      <KTooltip.Portal>
        <KTooltip.Content class="z-50 max-w-sm rounded-xl border border-ink/15 bg-ink px-3 py-2 text-xs leading-5 text-white shadow-xl dark:border-white/20 dark:bg-[#0d1625]">
          <For each={split()}>{(line) => <p>{line}</p>}</For>
          <KTooltip.Arrow class="fill-ink dark:fill-[#0d1625]" />
        </KTooltip.Content>
      </KTooltip.Portal>
    </KTooltip.Root>
  )
}
