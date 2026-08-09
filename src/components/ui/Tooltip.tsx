import * as KTooltip from "@kobalte/core/tooltip"
import { For, batch, createEffect, createSignal, type ParentProps } from "solid-js"
import { getTooltip, TooltipKey } from "../../lib/tooltips"

type TooltipProps = ParentProps<{ content: TooltipKey | string; asChild?: boolean; raw?: boolean }>

// Pinning open can open multiple tooltips, so have track all of them to just keep one open.
let tooltipInstanceCounter = 0
const [activeTooltipId, setActiveTooltipId] = createSignal<number | null>(null)

export const Tooltip = (props: TooltipProps) => {
  const tooltipId = ++tooltipInstanceCounter
  const split = () => {
    const source = props.raw ? String(props.content ?? "") : String(getTooltip(props.content as TooltipKey) ?? "")
    return source.replace(/\r\n/g, "\n").split(/<br>|\n/g)
  }
  const [hoverOpen, setHoverOpen] = createSignal(false)
  const [pinnedOpen, setPinnedOpen] = createSignal(false)

  createEffect(() => {
    if (activeTooltipId() !== null && activeTooltipId() !== tooltipId && (hoverOpen() || pinnedOpen())) {
      setHoverOpen(false)
      setPinnedOpen(false)
    }
  })

  const handleTriggerClick = () => {
    const next = !pinnedOpen()
    batch(() => {
      if (next) {
        setActiveTooltipId(tooltipId)
      } else if (!hoverOpen() && activeTooltipId() === tooltipId) {
        setActiveTooltipId(null)
      }
      setPinnedOpen(next)
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    batch(() => {
      if (nextOpen) {
        setActiveTooltipId(tooltipId)
      } else if (!pinnedOpen() && activeTooltipId() === tooltipId) {
        setActiveTooltipId(null)
      }
      setHoverOpen(nextOpen)
    })
  }

  const closePinned = () => {
    setPinnedOpen(false)
    if (!hoverOpen() && activeTooltipId() === tooltipId) {
      setActiveTooltipId(null)
    }
  }

  return (
    <KTooltip.Root
      open={activeTooltipId() === tooltipId && (pinnedOpen() || hoverOpen())}
      onOpenChange={handleOpenChange}
      openDelay={300}
      closeDelay={80}
      ignoreSafeArea
    >
      <KTooltip.Trigger
        onClick={handleTriggerClick}
        class={
          props.asChild
            ? undefined
            : "inline-flex h-5 w-5 items-center justify-center rounded-full border border-ink/25 bg-white text-xs font-semibold text-ink/80 transition hover:border-ink/45 hover:text-ink dark:border-white/25 dark:bg-[#172438] dark:text-white/85 dark:hover:border-white/50 dark:hover:text-white"
        }
      >
        {props.children ?? "?"}
      </KTooltip.Trigger>
      <KTooltip.Portal>
        <KTooltip.Content
          onEscapeKeyDown={closePinned}
          onPointerDownOutside={closePinned}
          class="z-50 max-w-sm rounded-xl border border-ink/15 bg-ink px-3 py-2 text-xs leading-5 text-white shadow-xl dark:border-white/20 dark:bg-[#0d1625]"
        >
          <For each={split()}>{(line) => <p>{line}</p>}</For>
          <KTooltip.Arrow class="fill-ink dark:fill-[#0d1625]" />
        </KTooltip.Content>
      </KTooltip.Portal>
    </KTooltip.Root>
  )
}
