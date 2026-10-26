import crystalGuideJson from "../../../data/crystal_guide.json"
import crystalUpgradesJson from "../../../data/crystal_upgrades.json"
import { PARTICLE_ORDER } from "../../lib/particles"
import type { CrystalData, CrystalGroup, CrystalGuideStep, CrystalTargetLevel, CrystalUpgrade } from "./crystalTypes"

const GROUPS: readonly string[] = ["output", "cost", "special", "oneTimer"]

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object"

const toOptionalNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined)

const toParticle = (value: unknown) =>
  typeof value === "string" && (PARTICLE_ORDER as readonly string[]).includes(value)
    ? (value as (typeof PARTICLE_ORDER)[number])
    : undefined

export const parseCrystalUpgrades = (raw: unknown): CrystalUpgrade[] => {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((entry): CrystalUpgrade[] => {
    if (!isRecord(entry)) return []
    if (typeof entry.id !== "string" || typeof entry.name !== "string") return []
    if (typeof entry.group !== "string" || !GROUPS.includes(entry.group)) return []

    const requires = isRecord(entry.requires) ? entry.requires : {}
    const prerequisites = Array.isArray(requires.upgrades) ? requires.upgrades : []

    return [
      {
        id: entry.id,
        name: entry.name,
        group: entry.group as CrystalGroup,
        particle: toParticle(entry.particle),
        baseCost: toOptionalNumber(entry.baseCost) ?? null,
        costStep: toOptionalNumber(entry.costStep) ?? 0,
        maxLevel: Math.max(1, toOptionalNumber(entry.maxLevel) ?? 1),
        requires: {
          particle: toParticle(requires.particle),
          se: toOptionalNumber(requires.se),
          playerLevel: toOptionalNumber(requires.playerLevel),
          upgrades: prerequisites.flatMap((item) =>
            isRecord(item) && typeof item.id === "string" && typeof item.level === "number"
              ? [{ id: item.id, level: item.level }]
              : [],
          ),
        },
      },
    ]
  })
}

const parseTargetLevel = (value: unknown): CrystalTargetLevel | null => {
  if (value === "max") return "max"
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export const parseCrystalGuide = (raw: unknown): CrystalGuideStep[] => {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((entry): CrystalGuideStep[] => {
    if (!isRecord(entry) || typeof entry.id !== "string") return []

    const targets = (Array.isArray(entry.targets) ? entry.targets : []).flatMap((target) => {
      if (!Array.isArray(target) || typeof target[0] !== "string") return []
      const level = parseTargetLevel(target[1])
      return level === null ? [] : [{ id: target[0], level }]
    })

    return [
      {
        id: entry.id,
        minSe: toOptionalNumber(entry.minSe),
        maxSe: toOptionalNumber(entry.maxSe),
        doneNote: typeof entry.doneNote === "string" ? entry.doneNote : undefined,
        targets,
      },
    ]
  })
}

export const CRYSTAL_DATA: CrystalData = {
  upgrades: parseCrystalUpgrades(crystalUpgradesJson),
  steps: parseCrystalGuide(crystalGuideJson),
}

export const CRYSTAL_UPGRADE_IDS = CRYSTAL_DATA.upgrades.map((upgrade) => upgrade.id)
