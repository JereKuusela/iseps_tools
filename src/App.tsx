import { A, useLocation } from "@solidjs/router"
import { For, Show, createEffect, createSignal, onCleanup, onMount, type ParentComponent } from "solid-js"
import { useDarkModeSignal } from "./lib/darkMode"
import { ROUTES, eventTabs, premiumTabs, primaryTabs, type TabItem } from "./lib/routes"
import { NAV_ITEM_CLASS, navItemActive } from "./components/ui/navStyles"

const normalizePath = (path: string) => {
  if (!path || path === "/") {
    return "/"
  }

  return path.endsWith("/") ? path.slice(0, -1) : path
}

const NavDropdown = (props: {
  id: string
  defaultLabel: string
  tabs: TabItem[]
  isActivePath: (href: string) => boolean
}) => {
  const location = useLocation()
  const [isOpen, setIsOpen] = createSignal(false)
  const canUseHover = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches
  let menuRef: HTMLDivElement | undefined
  const isRouteActive = () => props.tabs.some((tab) => props.isActivePath(tab.href))
  const activeLabel = () => props.tabs.find((tab) => props.isActivePath(tab.href))?.label ?? props.defaultLabel

  const closeMenu = () => setIsOpen(false)
  const openMenu = () => setIsOpen(true)

  onMount(() => {
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!menuRef) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (!menuRef.contains(target)) {
        closeMenu()
      }
    }

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu()
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
    closeMenu()
  })

  return (
    <div
      ref={menuRef}
      class="relative"
      onMouseEnter={() => {
        if (canUseHover()) openMenu()
      }}
      onMouseLeave={() => {
        if (canUseHover()) closeMenu()
      }}
    >
      <button
        type="button"
        class={`${NAV_ITEM_CLASS} flex w-full items-center justify-between gap-2 px-4 py-2.5`}
        classList={navItemActive(isRouteActive())}
        aria-haspopup="menu"
        aria-expanded={isOpen()}
        aria-controls={props.id}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span class="text-sm font-semibold tracking-wide">{activeLabel()}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          class="h-4 w-4 transition-transform"
          classList={{ "rotate-180": isOpen() }}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <Show when={isOpen()}>
        <div class="absolute left-0 top-full z-30 w-44 pt-1.5">
          <div
            id={props.id}
            class="overflow-hidden rounded-xl border border-ink/15 bg-white shadow-lg dark:border-white/20 dark:bg-[#22344d]"
          >
            <div class="grid gap-1 p-1.5">
              <For each={props.tabs}>
                {(tab) => (
                  <A
                    href={tab.href}
                    class={`${NAV_ITEM_CLASS} px-3.5 py-2 text-sm font-semibold`}
                    classList={navItemActive(props.isActivePath(tab.href))}
                  >
                    {tab.label}
                  </A>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

const TopNav = (props: { darkMode: boolean; onToggleDarkMode: () => void }) => {
  const location = useLocation()
  const isActivePath = (href: string) => normalizePath(location.pathname) === href

  return (
    <header class="relative z-10 hidden px-4 pt-5 sm:block sm:px-8 sm:pt-8 lg:px-10">
      <div class="mx-auto flex w-full max-w-6xl items-center gap-2.5 rounded-2xl border border-white/60 bg-white/70 p-2.5 shadow-glow backdrop-blur dark:border-white/10 dark:bg-[#111a28]/75 sm:gap-3 sm:p-3">
        <div class="min-w-[240px] flex-1 gap-2.5 sm:grid sm:grid-cols-2 lg:grid-cols-6">
          <For each={primaryTabs}>
            {(tab) => (
              <A
                href={tab.href}
                class={`${NAV_ITEM_CLASS} px-4 py-2.5`}
                classList={navItemActive(isActivePath(tab.href))}
              >
                <p class="text-sm font-semibold tracking-wide">{tab.label}</p>
              </A>
            )}
          </For>

          <NavDropdown id="top-premium-menu" defaultLabel="Premium" tabs={premiumTabs} isActivePath={isActivePath} />
          <NavDropdown id="top-events-menu" defaultLabel="Events" tabs={eventTabs} isActivePath={isActivePath} />
        </div>

        <A
          href={ROUTES.settings}
          class="grid h-10 w-10 place-items-center rounded-xl border border-ink/15 bg-white/85 text-ink transition hover:-translate-y-0.5 hover:border-ink/35 dark:border-white/20 dark:bg-[#1b2a3e] dark:text-white"
          classList={{
            "border-ink/35 bg-ink text-white dark:border-white/30 dark:bg-white/15": isActivePath(ROUTES.settings),
          }}
          aria-label="Open settings"
          title="Open settings"
        >
          🛠️
          <span class="sr-only">Open settings</span>
        </A>

        <button
          type="button"
          onClick={props.onToggleDarkMode}
          class="grid h-10 w-10 place-items-center rounded-xl border border-ink/15 bg-white/85 text-ink transition hover:-translate-y-0.5 hover:border-ink/35 dark:border-white/20 dark:bg-[#1b2a3e] dark:text-white"
          aria-label={props.darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={props.darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {props.darkMode ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M20.7 15.4A9 9 0 1 1 12.6 3.3a.8.8 0 0 1 .9 1.1 7 7 0 0 0 7.1 9.9.8.8 0 0 1 .1 1.1Z" />
            </svg>
          )}
          <span class="sr-only">{props.darkMode ? "Switch to light mode" : "Switch to dark mode"}</span>
        </button>
      </div>
    </header>
  )
}

const App: ParentComponent = (props) => {
  const [darkMode, setDarkMode] = useDarkModeSignal()

  return (
    <div class="relative min-h-screen overflow-x-auto overflow-y-visible bg-mist text-ink transition-colors dark:bg-[#070d16] dark:text-[#e8f0ff]">
      <div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,rgba(255,107,53,0.2),transparent_50%),radial-gradient(circle_at_90%_10%,rgba(10,143,148,0.25),transparent_45%),radial-gradient(circle_at_40%_85%,rgba(12,28,48,0.18),transparent_40%)] dark:bg-[radial-gradient(circle_at_12%_20%,rgba(255,107,53,0.22),transparent_46%),radial-gradient(circle_at_84%_16%,rgba(10,143,148,0.24),transparent_42%),radial-gradient(circle_at_50%_82%,rgba(143,182,255,0.2),transparent_40%)]" />
      <TopNav darkMode={darkMode()} onToggleDarkMode={() => setDarkMode((value) => !value)} />
      <main class="w-full px-4 pb-10 pt-4 sm:px-8 sm:pb-12 sm:pt-6 lg:px-10 lg:pb-14 lg:pt-8">{props.children}</main>
    </div>
  )
}

export default App
