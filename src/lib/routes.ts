export type TabItem = { href: string; label: string }
export type ToolCardItem = { href: string; label: string; description: string }

export const ROUTES = {
  home: "/",
  ogTech: "/tech",
  zatGuide: "/zat",
  penrose: "/penrose",
  sc: "/sc",
  premiumCrystal: "/premium",
  premiumHauler: "/hauler",
  credits: "/credits",
} as const

export const tabs: TabItem[] = [
  { href: ROUTES.ogTech, label: "OG Tech" },
  { href: ROUTES.zatGuide, label: "ZAT Guide" },
  { href: ROUTES.penrose, label: "Penrose" },
  { href: ROUTES.sc, label: "SC" },
  { href: ROUTES.premiumCrystal, label: "Premium Crystal" },
  { href: ROUTES.premiumHauler, label: "Premium Hauler" },
  { href: ROUTES.credits, label: "Credits" },
]

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
    href: ROUTES.premiumCrystal,
    label: "Premium Crystal",
    description: "Model Premium Crystal token-related multipliers and their practical impact.",
  },
  {
    href: ROUTES.premiumHauler,
    label: "Premium Hauler",
    description: "Evaluate Hauler mine premium choices and expected return from each option.",
  },
  {
    href: ROUTES.credits,
    label: "Credits",
    description: "View contributors, data origins, and acknowledgements behind these tools.",
  },
]
