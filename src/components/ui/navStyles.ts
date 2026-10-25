export const NAV_ITEM_CLASS =
  "rounded-xl text-left transition hover:-translate-y-0.5 hover:bg-ink hover:text-white dark:hover:bg-white/15"

export const navItemActive = (active: boolean) => ({
  "bg-ink text-white": active,
  "dark:bg-white/15": active,
})
