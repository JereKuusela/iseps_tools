import { readGlyphLines, type GrayImage } from "./glyphs"
import type { RawReading } from "./parse"

export type Rect = { x: number; y: number; w: number; h: number }
export type ScanKind = "level" | "multiplier" | "check" | "se" | "playerLevel"
export type ScanTarget = { kind: ScanKind; id: string; rect: Rect }
export type ReferenceSize = { width: number; height: number }

// Glyph shapes are matched on crops at about this source width; smaller screenshots are enlarged first.
const TARGET_SOURCE_WIDTH = 1440

const create2d = (width: number, height: number) => {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("Canvas is not available")
  return { canvas, context }
}

const cropGray = (source: HTMLCanvasElement, rect: Rect, scaleX: number, scaleY: number): GrayImage => {
  const sourceWidth = Math.max(1, Math.round(rect.w * scaleX))
  const sourceHeight = Math.max(1, Math.round(rect.h * scaleY))
  const enlarge = Math.max(1, Math.ceil(TARGET_SOURCE_WIDTH / source.width))
  const width = sourceWidth * enlarge
  const height = sourceHeight * enlarge
  const { context } = create2d(width, height)
  context.imageSmoothingQuality = "high"
  context.drawImage(
    source,
    Math.round(rect.x * scaleX),
    Math.round(rect.y * scaleY),
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  )
  const { data } = context.getImageData(0, 0, width, height)
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  return { data: gray, width, height }
}

const averageColor = (
  source: HTMLCanvasElement,
  rect: Rect,
  scaleX: number,
  scaleY: number,
): [number, number, number] => {
  const context = source.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("Canvas is not available")
  const width = Math.max(1, Math.round(rect.w * scaleX))
  const height = Math.max(1, Math.round(rect.h * scaleY))
  const { data } = context.getImageData(Math.round(rect.x * scaleX), Math.round(rect.y * scaleY), width, height)
  const sums = [0, 0, 0]
  const pixels = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    sums[0] += data[i]
    sums[1] += data[i + 1]
    sums[2] += data[i + 2]
  }
  return [Math.round(sums[0] / pixels), Math.round(sums[1] / pixels), Math.round(sums[2] / pixels)]
}

// Target rects are in pixels of a reference screenshot of the given size and scale with the actual image.
export const scanScreenshot = async (
  file: Blob,
  targets: ScanTarget[],
  reference: ReferenceSize,
): Promise<RawReading[]> => {
  const bitmap = await createImageBitmap(file)
  const { canvas: source, context } = create2d(bitmap.width, bitmap.height)
  context.drawImage(bitmap, 0, 0)
  bitmap.close()

  const scaleX = source.width / reference.width
  const scaleY = source.height / reference.height
  return targets.map((target): RawReading => {
    if (target.kind === "check") {
      return { kind: "check", id: target.id, rgb: averageColor(source, target.rect, scaleX, scaleY) }
    }
    const { text, confidence } = readGlyphLines(cropGray(source, target.rect, scaleX, scaleY))
    return { kind: target.kind, id: target.id, text, ocrConfidence: confidence }
  })
}
