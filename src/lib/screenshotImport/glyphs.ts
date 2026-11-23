// Reads the game's fixed condensed font by shape matching; general-purpose OCR mistakes its slashed zeros and bold digits.
import { GLYPH_TEMPLATES } from "./glyphTemplates"

export type GrayImage = { data: Uint8ClampedArray; width: number; height: number }
export type Bitmap = { cells: Float32Array; aspect: number }
export type GlyphTemplate = { aspect: number; cells: string }
export type ReadResult = { text: string; confidence: number }

export const GLYPH_WIDTH = 10
export const GLYPH_HEIGHT = 16
const LEVELS = 9
// Shorter glyphs (commas, a lowercase "x") are not part of the value.
const MIN_GLYPH_HEIGHT_RATIO = 0.75
const ASPECT_WEIGHT = 0.6
// A single text line is much shorter than this share of the cell.
const MAX_LINE_HEIGHT_RATIO = 0.7
// Wider than this (width / height) means two digits fused together.
const MAX_GLYPH_ASPECT = 0.62
const SPLIT_VALLEY_RATIO = 0.6

const otsuThreshold = (values: Uint8ClampedArray, above = -1) => {
  const histogram = new Array<number>(256).fill(0)
  let total = 0
  for (const value of values) {
    if (value <= above) continue
    histogram[value]++
    total++
  }
  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * histogram[i]
  let sumBackground = 0
  let weightBackground = 0
  let best = above
  let bestVariance = -1
  for (let t = above + 1; t < 256; t++) {
    weightBackground += histogram[t]
    if (!weightBackground) continue
    const weightForeground = total - weightBackground
    if (!weightForeground) break
    sumBackground += t * histogram[t]
    const variance =
      weightBackground *
      weightForeground *
      (sumBackground / weightBackground - (sumAll - sumBackground) / weightForeground) ** 2
    if (variance > bestVariance) {
      bestVariance = variance
      best = t
    }
  }
  return best
}

// Bright text pixels become 1.
export const toMask = ({ data, width, height }: GrayImage) => {
  let low = 255
  let high = 0
  for (const value of data) {
    if (value < low) low = value
    if (value > high) high = value
  }
  const range = Math.max(1, high - low)
  const stretched = new Uint8ClampedArray(width * height)
  for (let i = 0; i < stretched.length; i++) stretched[i] = ((data[i] - low) * 255) / range
  // Dark outlines pull a single threshold below the cell background, so split the lighter pixels again.
  const threshold = otsuThreshold(stretched, otsuThreshold(stretched))
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < mask.length; i++) mask[i] = stretched[i] > threshold ? 1 : 0
  return mask
}

const runsOf = (counts: number[], minCount: number, maxGap: number) => {
  const runs: { start: number; end: number }[] = []
  counts.forEach((count, index) => {
    if (count < minCount) return
    const last = runs[runs.length - 1]
    if (last && index - last.end <= maxGap) last.end = index
    else runs.push({ start: index, end: index })
  })
  return runs
}

const countRows = (mask: Uint8Array, width: number, top: number, bottom: number) => {
  const counts: number[] = []
  for (let y = top; y <= bottom; y++) {
    let count = 0
    for (let x = 0; x < width; x++) count += mask[y * width + x]
    counts.push(count)
  }
  return counts
}

export const findLines = (mask: Uint8Array, width: number, height: number) => {
  const counts = countRows(mask, width, 0, height - 1)
  const peak = Math.max(...counts, 1)
  const minLineHeight = Math.max(3, Math.round(height * 0.12))
  return runsOf(counts, Math.max(1, peak * 0.03), 1)
    .filter((run) => run.end - run.start + 1 >= minLineHeight)
    .flatMap((run) => {
      // Two lines that touch form one tall band; split it at the emptiest row near the middle.
      if (run.end - run.start + 1 <= height * MAX_LINE_HEIGHT_RATIO) return [{ top: run.start, bottom: run.end }]
      const middle = Math.round((run.start + run.end) / 2)
      const reach = Math.round((run.end - run.start) * 0.15)
      let split = middle
      for (let y = middle - reach; y <= middle + reach; y++) if (counts[y] < counts[split]) split = y
      return [
        { top: run.start, bottom: split - 1 },
        { top: split + 1, bottom: run.end },
      ]
    })
}

const bitmapOf = (
  mask: Uint8Array,
  width: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
): Bitmap => {
  const boxWidth = right - left + 1
  const boxHeight = bottom - top + 1
  const cells = new Float32Array(GLYPH_WIDTH * GLYPH_HEIGHT)
  for (let cy = 0; cy < GLYPH_HEIGHT; cy++) {
    const y0 = top + (cy * boxHeight) / GLYPH_HEIGHT
    const y1 = top + ((cy + 1) * boxHeight) / GLYPH_HEIGHT
    for (let cx = 0; cx < GLYPH_WIDTH; cx++) {
      const x0 = left + (cx * boxWidth) / GLYPH_WIDTH
      const x1 = left + ((cx + 1) * boxWidth) / GLYPH_WIDTH
      let sum = 0
      let area = 0
      for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0)
        for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
          const w = wy * (Math.min(x + 1, x1) - Math.max(x, x0))
          sum += w * mask[y * width + x]
          area += w
        }
      }
      cells[cy * GLYPH_WIDTH + cx] = area ? sum / area : 0
    }
  }
  return { cells, aspect: boxWidth / boxHeight }
}

export const extractGlyphs = (mask: Uint8Array, width: number, top: number, bottom: number): Bitmap[] => {
  const columns: number[] = []
  for (let x = 0; x < width; x++) {
    let count = 0
    for (let y = top; y <= bottom; y++) count += mask[y * width + x]
    columns.push(count)
  }
  const boxOf = (start: number, end: number) => {
    let first = bottom
    let last = top
    for (let y = top; y <= bottom; y++) {
      for (let x = start; x <= end; x++) {
        if (!mask[y * width + x]) continue
        if (y < first) first = y
        if (y > last) last = y
      }
    }
    return { left: start, right: end, top: first, bottom: last }
  }
  // Blur can fuse two touching digits; cut such a wide box at its thinnest column.
  const split = ({ start, end }: { start: number; end: number }) => {
    const box = boxOf(start, end)
    const boxHeight = box.bottom - box.top + 1
    if ((end - start + 1) / boxHeight <= MAX_GLYPH_ASPECT) return [box]
    const span = end - start
    let cut = start + Math.round(span * 0.5)
    for (let x = start + Math.round(span * 0.25); x <= start + Math.round(span * 0.8); x++) {
      if (columns[x] < columns[cut]) cut = x
    }
    if (columns[cut] > Math.max(...columns.slice(start, end + 1)) * SPLIT_VALLEY_RATIO) return [box]
    return [boxOf(start, cut - 1), boxOf(cut + 1, end)]
  }
  const boxes = runsOf(columns, 1, 1).flatMap(split)
  const tallest = Math.max(...boxes.map((box) => box.bottom - box.top + 1), 0)
  return boxes
    .filter((box) => box.bottom - box.top + 1 >= tallest * MIN_GLYPH_HEIGHT_RATIO)
    .map((box) => bitmapOf(mask, width, box.left, box.right, box.top, box.bottom))
}

export const decodeTemplate = (template: GlyphTemplate): Bitmap => ({
  aspect: template.aspect,
  cells: Float32Array.from(template.cells, (char) => Number(char) / LEVELS),
})

export const encodeTemplate = (bitmaps: Bitmap[]): GlyphTemplate => {
  const cells = new Float32Array(GLYPH_WIDTH * GLYPH_HEIGHT)
  for (const bitmap of bitmaps) bitmap.cells.forEach((value, index) => (cells[index] += value / bitmaps.length))
  const aspect = bitmaps.reduce((sum, bitmap) => sum + bitmap.aspect, 0) / bitmaps.length
  return {
    aspect: Math.round(aspect * 1000) / 1000,
    cells: Array.from(cells, (value) => String(Math.round(value * LEVELS))).join(""),
  }
}

const distance = (glyph: Bitmap, template: Bitmap) => {
  let sum = 0
  for (let i = 0; i < glyph.cells.length; i++) sum += (glyph.cells[i] - template.cells[i]) ** 2
  return sum / glyph.cells.length + ASPECT_WEIGHT * (glyph.aspect - template.aspect) ** 2
}

let decodedTemplates: [string, Bitmap][] | undefined
const templates = () =>
  (decodedTemplates ??= Object.entries(GLYPH_TEMPLATES).map(([label, template]) => [label, decodeTemplate(template)]))

export const classifyGlyph = (glyph: Bitmap) => {
  const ranked = templates()
    .map(([label, template]) => ({ label, distance: distance(glyph, template) }))
    .sort((a, b) => a.distance - b.distance)
  const best = ranked[0]
  // Confidence is how clearly the best template beats the runner-up.
  const confidence = best && ranked[1] ? Math.max(0, Math.round(100 * (1 - best.distance / ranked[1].distance))) : 0
  return { label: best?.label ?? "", distance: best?.distance ?? 1, confidence, runnerUp: ranked[1] }
}

export const readGlyphLines = (image: GrayImage): ReadResult => {
  const mask = toMask(image)
  const lines = findLines(mask, image.width, image.height)
  let confidence = 100
  const text = lines
    .map(({ top, bottom }) =>
      extractGlyphs(mask, image.width, top, bottom)
        .map((glyph) => {
          const result = classifyGlyph(glyph)
          confidence = Math.min(confidence, result.confidence)
          return result.label
        })
        .join(""),
    )
    .join("\n")
  return { text, confidence: lines.length ? confidence : 0 }
}
