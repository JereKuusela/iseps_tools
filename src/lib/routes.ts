import { getTooltip } from "./tooltips"

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
    description: getTooltip("og.panel"),
  },
  {
    href: ROUTES.tokens,
    label: "Tokens",
    description: getTooltip("token.panel"),
  },
  {
    href: ROUTES.perks,
    label: "Perks",
    description: getTooltip("perkGuide.panel"),
  },
  {
    href: ROUTES.zatGuide,
    label: "ZAT",
    description: getTooltip("zatGuide.panel"),
  },
  {
    href: ROUTES.sc,
    label: "SC",
    description: getTooltip("sc.panel"),
  },
  {
    href: ROUTES.cruise,
    label: "Cruise",
    description: getTooltip("cruise.panel"),
  },
  {
    href: ROUTES.factory,
    label: "Factory",
    description: getTooltip("factory.panel"),
  },
  {
    href: ROUTES.factoryProduction,
    label: "Factory Production",
    description: getTooltip("factoryProduction.panel"),
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
    href: ROUTES.settings,
    label: "Settings",
    description: "Manage app preferences and sync options.",
  },
]
