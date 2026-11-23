import { PARTICLE_ORDER } from "../../lib/particles"
import type { ReferenceSize, ScanTarget } from "../../lib/screenshotImport/scan"

// Rects are in pixels of a Token Shop Summary screenshot of this size and scale with the image.
export const TOKEN_REFERENCE_SIZE: ReferenceSize = { width: 1189, height: 2576 }

const COLUMNS = 7
const COLUMN_X0 = 107
const COLUMN_PITCH = 140.5
const CELL_TEXT = { dx: 8, w: 115 }

const PARTICLE_ROWS = [["cash", ...PARTICLE_ORDER.slice(0, 6)], PARTICLE_ORDER.slice(6, 11)]

// Each grid is two rows of seven cells; the value is the two text lines below the icon.
const grid = (prefix: string, firstRowTop: number, rowPitch: number, textTop: number, textHeight: number) =>
  PARTICLE_ROWS.flatMap((row, rowIndex) =>
    row.slice(0, COLUMNS).map(
      (resource, column): ScanTarget => ({
        kind: "level",
        id: `${prefix}.${resource}`,
        rect: {
          x: COLUMN_X0 + column * COLUMN_PITCH + CELL_TEXT.dx,
          y: firstRowTop + rowIndex * rowPitch + textTop,
          w: CELL_TEXT.w,
          h: textHeight,
        },
      }),
    ),
  )

// The supply and BB grids only go up to helion, so their second row has two cells.
const supplyRows = (prefix: string, firstRowTop: number) =>
  grid(prefix, firstRowTop, 159, 76, 74).filter(({ id }) => !/\.(ixion|juno|kappa)$/.test(id))

const banner = (id: string, centerX: number, centerY: number): ScanTarget => ({
  kind: "level",
  id,
  rect: { x: centerX - 65, y: centerY - 29, w: 130, h: 58 },
})

export const TOKEN_SCAN_TARGETS: ScanTarget[] = [
  { kind: "se", id: "se", rect: { x: 985, y: 300, w: 93, h: 65 } },
  ...grid("output", 598, 170, 76, 82),
  ...supplyRows("supplies", 1158),
  ...supplyRows("bbbot", 1694),
  banner("supplies.tokenBonus", 363, 1104),
  banner("supplies.crystalBonus", 855, 1104),
  banner("bbbot.tokenBonus", 363, 1641),
  banner("bbbot.duration", 855, 1641),
]
