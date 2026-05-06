import { Show, createSignal, onCleanup, onMount } from "solid-js"
import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { OgTechLeftColumn } from "./OgTechLeftColumn"
import { OgTechRightColumn } from "./OgTechRightColumn"
import { OgTechProvider, useOgTechContext } from "./ogTechContext"

const OgTechContent = () => {
  const og = useOgTechContext()
  const [isActionsOpen, setIsActionsOpen] = createSignal(false)
  let actionsMenuRef: HTMLDivElement | undefined

  onMount(() => {
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!actionsMenuRef) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (!actionsMenuRef.contains(target)) {
        setIsActionsOpen(false)
      }
    }

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActionsOpen(false)
      }
    }

    document.addEventListener("pointerdown", onDocumentPointerDown)
    document.addEventListener("keydown", onDocumentKeyDown)

    onCleanup(() => {
      document.removeEventListener("pointerdown", onDocumentPointerDown)
      document.removeEventListener("keydown", onDocumentKeyDown)
    })
  })

  const handleAction = (action: () => void) => {
    action()
    setIsActionsOpen(false)
  }

  return (
    <Panel
      title="OG Tech"
      tooltip="og.panel"
      titleAction={
        <div class="relative" ref={actionsMenuRef}>
          <button
            type="button"
            class="cursor-pointer rounded-lg border border-ink/25 px-2.5 py-1 text-xs font-semibold text-ink/80 transition hover:bg-ink hover:text-white dark:border-white/30 dark:text-white/80 dark:hover:bg-white/20"
            aria-haspopup="menu"
            aria-expanded={isActionsOpen()}
            onClick={() => setIsActionsOpen((current) => !current)}
          >
            Actions
          </button>
          <Show when={isActionsOpen()}>
            <div class="absolute right-0 top-full z-50 pt-1">
              <div class="w-40 overflow-hidden rounded-lg border border-ink/15 bg-white shadow-lg dark:border-white/20 dark:bg-[#22344d]">
                <button
                  type="button"
                  class="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-ink/85 transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white focus-visible:outline-none dark:text-white/85 dark:hover:bg-white dark:hover:text-ink dark:focus-visible:bg-white dark:focus-visible:text-ink"
                  onClick={() => handleAction(og.autoBuyUnderHour)}
                >
                  Auto buy &lt; 1h
                </button>
                <button
                  type="button"
                  class="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-ink/85 transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white focus-visible:outline-none dark:text-white/85 dark:hover:bg-white dark:hover:text-ink dark:focus-visible:bg-white dark:focus-visible:text-ink"
                  onClick={() => handleAction(og.autoBuyUnderDay)}
                >
                  Auto buy &lt; 1d
                </button>
                <button
                  type="button"
                  class="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-ink/85 transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white focus-visible:outline-none dark:text-white/85 dark:hover:bg-white dark:hover:text-ink dark:focus-visible:bg-white dark:focus-visible:text-ink"
                  onClick={() => handleAction(og.clearTechLevels)}
                >
                  Clear tech
                </button>
              </div>
            </div>
          </Show>
        </div>
      }
    >
      <SplitColumns layoutClass="xl:grid-cols-[1.00fr_2fr]" right={<OgTechRightColumn />}>
        <OgTechLeftColumn />
      </SplitColumns>
    </Panel>
  )
}

export const OgTechPage = () => {
  return (
    <OgTechProvider>
      <OgTechContent />
    </OgTechProvider>
  )
}
