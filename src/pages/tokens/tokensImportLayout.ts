import { PARTICLE_ORDER } from "../../lib/particles"
import { findPanelBorder, WHITE_BORDER } from "../../lib/screenshotImport/panel"
import type { ReferenceSize, ScanTarget } from "../../lib/screenshotImport/scan"

// Rects are in pixels of a Token Shop Summary screenshot of this size, anchored to the panel's white outline.
export const TOKEN_REFERENCE_SIZE: ReferenceSize = {
  width: 567,
  height: 1261,
  anchor: {
    rect: { x: 45, y: 91.3, w: 476.2, h: 1136.9 },
    find: (data, width, height) => findPanelBorder(data, width, height, WHITE_BORDER),
  },
}

const COLUMN_CENTERS = Array.from({ length: 7 }, (_, column) => 87 + column * 65.5)
const CELL_WIDTH = 58
const CELL_HEIGHT = 40

const PARTICLE_ROWS = [["cash", ...PARTICLE_ORDER.slice(0, 6)], PARTICLE_ORDER.slice(6, 11)]

// Each grid is two rows of seven cells whose value is one or two text lines under the icon.
const grid = (prefix: string, rowCenters: number[], resourceLimit: number): ScanTarget[] =>
  PARTICLE_ROWS.flatMap((row, rowIndex) =>
    row.slice(0, rowIndex === 0 ? row.length : resourceLimit).map(
      (resource, column): ScanTarget => ({
        kind: "level",
        id: `${prefix}.${resource}`,
        rect: {
          x: COLUMN_CENTERS[column] - CELL_WIDTH / 2,
          y: rowCenters[rowIndex] - CELL_HEIGHT / 2,
          w: CELL_WIDTH,
          h: CELL_HEIGHT,
        },
      }),
    ),
  )

const banner = (id: string, centerX: number, centerY: number): ScanTarget => ({
  kind: "level",
  id,
  rect: { x: centerX - 40, y: centerY - 17, w: 80, h: 34 },
})

export const TOKEN_SCAN_TARGETS: ScanTarget[] = [
  { kind: "se", id: "se", rect: { x: 428, y: 190, w: 82, h: 38 } },
  ...grid("output", [390, 470], 5),
  // The supply and BB grids only go up to helion, so their second row has two cells.
  ...grid("supplies", [650, 724], 2),
  ...grid("bbbot", [902, 977], 2),
  banner("supplies.tokenBonus", 169, 571),
  banner("supplies.crystalBonus", 399, 571),
  banner("bbbot.tokenBonus", 169, 821),
  banner("bbbot.duration", 399, 821),
]
