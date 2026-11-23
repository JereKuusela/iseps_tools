import { PARTICLE_ORDER } from "../../lib/particles"
import type { ReferenceSize, ScanTarget } from "../../lib/screenshotImport/scan"

// All rects are in pixels of a reference Crystal Shop Summary screenshot of this size and scale with the image.
export const REFERENCE_SIZE: ReferenceSize = { width: 768, height: 1664 }

const LEVEL_ROW_Y0 = 262
const LEVEL_ROW_PITCH = 60.5
const CHECK_ROW_Y0 = 305
const CHECK_ROW_PITCH = 53.1
const TEXT_CELL = { w: 58, h: 54 }
const CHECK_PATCH = 14

const OUTPUT_TEXT_X = 138
const COST_TEXT_X = 258
const SPECIAL_TEXT_X = 378
const EXPANSION_CHECK_X = 535
const PARTICLE_CHECK_X = 656

const OUTPUT_IDS = ["output.all", "output.energyPrice", ...PARTICLE_ORDER.map((particle) => `output.${particle}`)]
const COST_IDS = PARTICLE_ORDER.map((particle) => `cost.${particle}`)

const SPECIAL_IDS = [
  "special.dcGains",
  "special.bulkScientists",
  "special.bulkArtifacts",
  "special.bulkArchBots",
  "special.bulkSolutions",
  "special.bulkRebirthologists",
  "special.bulkGp",
  "special.bulkExtractions",
  "special.bulkResearches",
  "special.bulkDcMilestones",
  "special.scBooster",
  "special.bulkBuyers",
  "special.bulkEmblems",
  "special.infinityAmp",
  "special.infinityMaxLv",
  "special.extraLp",
  "special.bulkEmblemMilestones",
  "special.tokenBooster",
  "special.ampCounter",
]

const EXPANSION_IDS = [
  "bundle.energyPrice",
  "bundle.buyers",
  "bundle.allParticles",
  "bundle.simulation",
  "bundle.laboratory",
  "bundle.egetarium",
  "bundle.archive",
  "bundle.cot",
  "bundle.institute",
  "bundle.singularity",
  "bundle.gcorp",
  "bundle.corvus",
  "bundle.tiberius",
  "bundle.leveling",
  "bundle.taskmaster",
  "bundle.ultima",
  "bundle.infinityMulti",
  "bundle.tycoon",
  "oneTimer.costScalerDc",
  "oneTimer.costScalerSc",
  "bundle.allParticlesMk2",
  "bundle.meltdown",
  "bundle.sequencing",
]

const PARTICLE_BUNDLE_IDS = [
  ...PARTICLE_ORDER.map((particle) => `bundle.${particle}`),
  "bundle.alphaBeta",
  "bundle.betaCeti",
  "bundle.cetiDelta",
  "bundle.deltaEpsilon",
  "bundle.epsilonFenix",
  "bundle.fenixGamma",
  "bundle.gammaHelion",
  "bundle.helionIxion",
  "bundle.ixionJuno",
  "bundle.junoKappa",
  "bundle.abc",
  "bundle.def",
  "bundle.ghi",
]

const levelTargets = (ids: string[], x: number, firstRow: number): ScanTarget[] =>
  ids.map((id, index) => ({
    kind: "level",
    id,
    rect: {
      x,
      y: LEVEL_ROW_Y0 + (firstRow + index) * LEVEL_ROW_PITCH - TEXT_CELL.h / 2,
      ...TEXT_CELL,
    },
  }))

const checkTargets = (ids: string[], centerX: number): ScanTarget[] =>
  ids.map((id, index) => ({
    kind: "check",
    id,
    rect: {
      x: centerX - CHECK_PATCH / 2,
      y: CHECK_ROW_Y0 + index * CHECK_ROW_PITCH - CHECK_PATCH / 2,
      w: CHECK_PATCH,
      h: CHECK_PATCH,
    },
  }))

export const CRYSTAL_SCAN_TARGETS: ScanTarget[] = [
  { kind: "se", id: "se", rect: { x: 84, y: 134, w: 52, h: 34 } },
  { kind: "playerLevel", id: "playerLevel", rect: { x: 136, y: 134, w: 58, h: 34 } },
  ...levelTargets(OUTPUT_IDS, OUTPUT_TEXT_X, 0),
  // Cost column starts at the alpha row, two rows below the top.
  ...levelTargets(COST_IDS, COST_TEXT_X, 2),
  ...levelTargets(SPECIAL_IDS, SPECIAL_TEXT_X, 0),
  // Shown as an "x1,024 /1024" multiplier (2^level) in the bottom right corner.
  { kind: "multiplier", id: "special.gpBooster", rect: { x: 606, y: 1568, w: 72, h: 62 } },
  ...checkTargets(EXPANSION_IDS, EXPANSION_CHECK_X),
  ...checkTargets(PARTICLE_BUNDLE_IDS, PARTICLE_CHECK_X),
]
