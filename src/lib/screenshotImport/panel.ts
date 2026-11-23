import type { Rect } from "./scan"

export type BorderMatcher = (r: number, g: number, b: number) => boolean

const LINE_COVERAGE = 0.6

// Crystal Shop summary: thin purple outline (red and blue clearly above green).
export const PURPLE_BORDER: BorderMatcher = (r, g, b) => r - g >= 20 && b - g >= 20 && Math.abs(r - b) <= 25

// Token Shop summary: thin white outline.
export const WHITE_BORDER: BorderMatcher = (r, g, b) => Math.min(r, g, b) >= 200 && Math.max(r, g, b) - Math.min(r, g, b) <= 20

const clusterCenters = (counts: number[], minCount: number) => {
  const clusters: { sum: number; weight: number; last: number }[] = []
  counts.forEach((count, index) => {
    if (count < minCount) return
    const last = clusters[clusters.length - 1]
    if (last && index - last.last <= 2) {
      last.sum += index * count
      last.weight += count
      last.last = index
    } else clusters.push({ sum: index * count, weight: count, last: index })
  })
  return clusters.map((cluster) => cluster.sum / cluster.weight)
}

// Locates the outer panel outline so a layout can be anchored to it regardless of screen aspect ratio.
export const findPanelBorder = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  isBorder: BorderMatcher,
): Rect | undefined => {
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < mask.length; i++) mask[i] = isBorder(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) ? 1 : 0

  const bandTop = Math.floor(height * 0.3)
  const bandBottom = Math.ceil(height * 0.7)
  const columns = new Array<number>(width).fill(0)
  for (let y = bandTop; y < bandBottom; y++) for (let x = 0; x < width; x++) columns[x] += mask[y * width + x]
  const verticals = clusterCenters(columns, (bandBottom - bandTop) * LINE_COVERAGE)
  if (verticals.length < 2) return undefined
  const left = verticals[0]
  const right = verticals[verticals.length - 1]
  if (right - left < width * 0.4) return undefined

  const rangeStart = Math.floor(left + (right - left) * 0.2)
  const rangeEnd = Math.ceil(right - (right - left) * 0.2)
  const rows = new Array<number>(height).fill(0)
  for (let y = 0; y < height; y++) for (let x = rangeStart; x < rangeEnd; x++) rows[y] += mask[y * width + x]
  const horizontals = clusterCenters(rows, (rangeEnd - rangeStart) * LINE_COVERAGE)
  if (horizontals.length < 2) return undefined
  const top = horizontals[0]
  const bottom = horizontals[horizontals.length - 1]
  if (bottom - top < height * 0.4) return undefined

  return { x: left, y: top, w: right - left, h: bottom - top }
}

const PILL_COLUMN = 0.0705
const MIN_PILL_HEIGHT = 0.012
const MAX_PILL_HEIGHT = 0.04
const ROW_COUNT = 5

const percentile = (values: number[], share: number) => [...values].sort((a, b) => a - b)[Math.floor(values.length * share)]

// Finds the five dark "level / max" pills down the first OG Tech card column; returns their vertical span.
export const findCardRows = (data: Uint8ClampedArray, width: number, height: number): Rect | undefined => {
  const x = Math.round(width * PILL_COLUMN)
  const start = Math.floor(height * 0.4)
  const lum: number[] = []
  for (let y = start; y < height; y++) {
    const i = (y * width + x) * 4
    lum.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }
  const threshold = (percentile(lum, 0.1) + percentile(lum, 0.5)) / 2

  const runs: { top: number; bottom: number }[] = []
  lum.forEach((value, index) => {
    if (value >= threshold) return
    const last = runs[runs.length - 1]
    if (last && index - last.bottom <= 1) last.bottom = index
    else runs.push({ top: index, bottom: index })
  })
  const pills = runs
    .filter((run) => {
      const size = run.bottom - run.top + 1
      return size >= height * MIN_PILL_HEIGHT && size <= height * MAX_PILL_HEIGHT
    })
    .slice(-ROW_COUNT)
  if (pills.length < ROW_COUNT) return undefined

  const centers = pills.map((run) => start + (run.top + run.bottom) / 2)
  const pitch = (centers[ROW_COUNT - 1] - centers[0]) / (ROW_COUNT - 1)
  if (centers.some((center, index) => Math.abs(center - (centers[0] + pitch * index)) > pitch * 0.05)) return undefined
  return { x: 0, y: centers[0], w: width, h: centers[ROW_COUNT - 1] - centers[0] }
}
