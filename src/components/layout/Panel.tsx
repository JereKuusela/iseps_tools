import { A, useLocation } from "@solidjs/router"
import { For, Show, createEffect, createSignal, onCleanup, onMount, type JSX, type ParentProps } from "solid-js"
import { useDarkModeSignal } from "../../lib/darkMode"
import { ROUTES, tabs } from "../../lib/routes"
import type { TooltipKey } from "../../lib/tooltips"
import { Tooltip } from "../ui/Tooltip"
import { ActionButton } from "../ui/ActionButton"
import { UpdateButton } from "../ui/UpdateButton"
import { NAV_ITEM_CLASS, navItemActive } from "../ui/navStyles"
import { updateAvailable } from "../../lib/versionCheck"

type PanelWidth = "content" | "full"

const normalizePath = (path: string) => {
  if (!path || path === "/") {
    return "/"
  }

  return path.endsWith("/") ? path.slice(0, -1) : path
}

export const Panel = (
  props: ParentProps<{ title: string; tooltip?: TooltipKey; width?: PanelWidth; titleAction?: JSX.Element }>,
) => {
  const location = useLocation()
  const [darkMode, setDarkMode] = useDarkModeSignal()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = createSignal(false)
  let mobileMenuRef: HTMLDivElement | undefined
  const isActivePath = (href: string) => normalizePath(location.pathname) === href

  onMount(() => {
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (!mobileMenuRef.contains(target)) {
        setIsMobileMenuOpen(false)
      }
    }

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener("pointerdown", onDocumentPointerDown)
    document.addEventListener("keydown", onDocumentKeyDown)

    onCleanup(() => {
      document.removeEventListener("pointerdown", onDocumentPointerDown)
      document.removeEventListener("keydown", onDocumentKeyDown)
    })
  })

  createEffect(() => {
    location.pathname
    setIsMobileMenuOpen(false)
  })

  return (
    <section
      class="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-glow backdrop-blur dark:border-white/15 dark:bg-[#111a28]/80 sm:p-5 lg:p-6"
      classList={{
        "mx-auto max-w-6xl": (props.width ?? "content") === "content",
        "mx-auto w-max": props.width === "full",
      }}
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-bold text-ink dark:text-white">{props.title}</h2>
          {props.tooltip ? <Tooltip content={props.tooltip}>i</Tooltip> : null}
        </div>
        <div class="relative z-30 flex shrink-0 items-center gap-2" ref={mobileMenuRef}>
          <Show when={!updateAvailable()} fallback={<UpdateButton />}>
            {props.titleAction ? <div class="relative z-30 shrink-0">{props.titleAction}</div> : null}
            <ActionButton
              size="menu"
              class="sm:hidden"
              aria-haspopup="menu"
              aria-expanded={isMobileMenuOpen()}
              aria-label={isMobileMenuOpen() ? "Close menu" : "Open menu"}
              aria-controls="panel-mobile-menu"
              title={isMobileMenuOpen() ? "Close menu" : "Open menu"}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
            >
              {isMobileMenuOpen() ? "Close" : "Menu"}
            </ActionButton>

            <Show when={isMobileMenuOpen()}>
              <div
                id="panel-mobile-menu"
                class="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-ink/15 bg-white shadow-lg dark:border-white/20 dark:bg-[#22344d] sm:hidden"
              >
                <div class="grid gap-1 p-1.5">
                  <For each={tabs}>
                    {(tab) => (
                      <A
                        href={tab.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        class={`${NAV_ITEM_CLASS} px-4 py-2.5 text-sm font-semibold`}
                        classList={navItemActive(isActivePath(tab.href))}
                      >
                        {tab.label}
                      </A>
                    )}
                  </For>
                  <A
                    href={ROUTES.settings}
                    onClick={() => setIsMobileMenuOpen(false)}
                    class={`${NAV_ITEM_CLASS} px-4 py-2.5 text-sm font-semibold`}
                    classList={navItemActive(isActivePath(ROUTES.settings))}
                  >
                    <span class="inline-flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        class="h-4 w-4"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="3.2" />
                        <path d="M12 2.8v2.1M12 19.1v2.1M21.2 12h-2.1M4.9 12H2.8M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5M18.6 18.6l-1.5-1.5M6.9 6.9 5.4 5.4" />
                      </svg>
                      Settings
                    </span>
                  </A>
                  <button
                    type="button"
                    onClick={() => {
                      setDarkMode((value) => !value)
                      setIsMobileMenuOpen(false)
                    }}
                    class={`${NAV_ITEM_CLASS} px-4 py-2.5 text-sm font-semibold`}
                  >
                    {darkMode() ? "Switch to light mode" : "Switch to dark mode"}
                  </button>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </div>
      <div class="mt-3 sm:mt-4">{props.children}</div>
    </section>
  )
}
