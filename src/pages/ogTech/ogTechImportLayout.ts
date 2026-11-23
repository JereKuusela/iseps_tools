import { findCardRows } from "../../lib/screenshotImport/panel"
import type { ReferenceSize, ScanTarget } from "../../lib/screenshotImport/scan"

const COLUMN_CENTERS = [144, 410, 670, 932]
const FIRST_ROW_CENTER_Y = 1180
const ROW_PITCH = 222
const TEXT = { w: 150, h: 58 }
const ROW_COUNT = 5

// Rects are in pixels of an OG Tech screenshot of this size; vertically they follow the detected pill rows.
export const OG_TECH_REFERENCE_SIZE: ReferenceSize = {
  width: 1080,
  height: 2220,
  anchor: {
    rect: { x: 0, y: FIRST_ROW_CENTER_Y, w: 1080, h: ROW_PITCH * (ROW_COUNT - 1) },
    find: findCardRows,
  },
}

export const OG_TECH_COUNT = 20

// Each tech card shows a single "level / max" line in a pill under its icon.
export const OG_TECH_SCAN_TARGETS: ScanTarget[] = Array.from({ length: OG_TECH_COUNT }, (_, id) => ({
  kind: "level",
  id: String(id),
  rect: {
    x: COLUMN_CENTERS[id % COLUMN_CENTERS.length] - TEXT.w / 2,
    y: FIRST_ROW_CENTER_Y + Math.floor(id / COLUMN_CENTERS.length) * ROW_PITCH - TEXT.h / 2,
    ...TEXT,
  },
}))
