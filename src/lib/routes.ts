export type TabItem = { href: string; label: string }
export type ToolCardItem = { href: string; label: string; description: string }

export const ROUTES = {
  home: "/",
  ogTech: "/tech",
  tokens: "/tokens",
  perks: "/perks",
  cruise: "/cruise",
  factory: "/factory",
  factoryProduction: "/factory-production",
  zatGuide: "/zat",
  sc: "/sc",
  premiumCrystal: "/premium",
  premiumHauler: "/hauler",
  credits: "/credits",
  settings: "/settings",
} as const

export const primaryTabs: TabItem[] = [
  { href: ROUTES.ogTech, label: "OG Tech" },
  { href: ROUTES.tokens, label: "Tokens" },
  { href: ROUTES.perks, label: "Perks" },
  { href: ROUTES.zatGuide, label: "ZAT" },
  { href: ROUTES.sc, label: "SC" },
  { href: ROUTES.credits, label: "Credits" },
]

export const eventTabs: TabItem[] = [
  { href: ROUTES.cruise, label: "Cruise" },
  { href: ROUTES.factory, label: "Factory" },
  { href: ROUTES.factoryProduction, label: "Factory Production" },
]

export const tabs: TabItem[] = [...primaryTabs.slice(0, 4), ...eventTabs, ...primaryTabs.slice(4)]

export const toolCards: ToolCardItem[] = [
  {
    href: ROUTES.ogTech,
    label: "OG Tech",
    description: "Plan OG tech upgrades by comparing gains, costs, and ETA based on your current output.",
  },
  {
    href: ROUTES.tokens,
    label: "Tokens",
    description: "Rank token upgrades by projected value per token cost and track shared progression inputs.",
  },
  {
    href: ROUTES.perks,
    label: "Perks",
    description: "Follow SE-based perk recommendations, check change notes, and view mobile-friendly perk layouts.",
  },
  {
    href: ROUTES.zatGuide,
    label: "ZAT",
    description: "Follow cycle-based node path recommendations with run-type presets and live boost previews.",
  },
  {
    href: ROUTES.sc,
    label: "SC",
    description: "Calculate Super Cluster scenarios and compare setup tradeoffs before committing resources.",
  },
  {
    href: ROUTES.cruise,
    label: "Cruise",
    description: "Compare cruise prestige upgrades, spend points optimally, and export notation for sharing.",
  },
  {
    href: ROUTES.factory,
    label: "Factory",
    description: "Plan factory prestige upgrades, compare weighted node value, and apply optimal builds.",
  },
  {
    href: ROUTES.factoryProduction,
    label: "Factory Production",
    description: "Manually configure product mix, compare resource balance, and track production profit per second.",
  },
  /* {
    href: ROUTES.premiumCrystal,
    label: "Premium Crystal",
    description: "Model Premium Crystal token-related multipliers and their practical impact.",
  },
  {
    href: ROUTES.premiumHauler,
    label: "Premium Hauler",
    description: "Evaluate Hauler mine premium choices and expected return from each option.",
  },*/
  {
    href: ROUTES.credits,
    label: "Credits",
    description: "View contributors, data origins, and acknowledgements behind these tools.",
  },
  {
    href: ROUTES.settings,
    label: "Settings",
    description: "Manage app preferences and sync options.",
  },
]
