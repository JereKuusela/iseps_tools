export type TabItem = { href: string; label: string }
export type ToolCardItem = { href: string; label: string; description: string }

export const ROUTES = {
  home: "/",
  ogTech: "/tech",
  cruise: "/cruise",
  factory: "/factory",
  zatGuide: "/zat",
  penrose: "/penrose",
  sc: "/sc",
  premiumCrystal: "/premium",
  premiumHauler: "/hauler",
  credits: "/credits",
  settings: "/settings",
} as const

export const primaryTabs: TabItem[] = [
  { href: ROUTES.ogTech, label: "OG Tech" },
  { href: ROUTES.zatGuide, label: "ZAT Guide" },
  { href: ROUTES.penrose, label: "Penrose" },
  { href: ROUTES.sc, label: "SC" },
  { href: ROUTES.credits, label: "Credits" },
]

export const eventTabs: TabItem[] = [
  { href: ROUTES.cruise, label: "Cruise" },
  { href: ROUTES.factory, label: "Factory" },
]

export const tabs: TabItem[] = [...primaryTabs.slice(0, 4), ...eventTabs, ...primaryTabs.slice(4)]

export const toolCards: ToolCardItem[] = [
  {
    href: ROUTES.ogTech,
    label: "OG Tech",
    description: "Plan OG tech upgrades by comparing gains, costs, and ETA based on your current output.",
  },
  {
    href: ROUTES.zatGuide,
    label: "ZAT Guide",
    description: "Follow cycle-based node path recommendations with run-type presets and live boost previews.",
  },
  {
    href: ROUTES.penrose,
    label: "Penrose",
    description: "Estimate Penrose progression inputs and outcomes for faster decision making.",
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
