import tooltipJson from "../../data/tooltips.json"

export const tooltips = tooltipJson

export type TooltipKey = keyof typeof tooltips

export const getTooltip = <K extends TooltipKey>(key: K): (typeof tooltips)[K] => {
  return tooltips[key]
}
