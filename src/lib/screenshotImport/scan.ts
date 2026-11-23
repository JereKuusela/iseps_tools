import { readGlyphLines, type GrayImage } from "./glyphs"
import type { RawReading } from "./parse"

export type Rect = { x: number; y: number; w: number; h: number }
export type ScanKind = "level" | "multiplier" | "check" | "se" | "playerLevel"
export type ScanTarget = { kind: ScanKind; id: string; rect: Rect }

// Finds the anchor frame in an image (RGBA data); undefined when it is not there.
export type AnchorFinder = (data: Uint8ClampedArray, width: number, height: number) => Rect | undefined
export type ReferenceSize = {
  width: number
  height: number
  // The frame as it is in the reference; targets are placed relative to the frame found in the image.
  anchor?: { rect: Rect; find: AnchorFinder }
}

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

type Source = { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }

const cropGray = ({ canvas }: Source, rect: Rect): GrayImage => {
  const sourceWidth = Math.max(1, Math.round(rect.w))
  const sourceHeight = Math.max(1, Math.round(rect.h))
  const enlarge = Math.max(1, Math.ceil(TARGET_SOURCE_WIDTH / canvas.width))
  const width = sourceWidth * enlarge
  const height = sourceHeight * enlarge
  const { context } = create2d(width, height)
  context.imageSmoothingQuality = "high"
  context.drawImage(canvas, Math.round(rect.x), Math.round(rect.y), sourceWidth, sourceHeight, 0, 0, width, height)
  const { data } = context.getImageData(0, 0, width, height)
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  return { data: gray, width, height }
}

const averageColor = ({ context }: Source, rect: Rect): [number, number, number] => {
  const width = Math.max(1, Math.round(rect.w))
  const height = Math.max(1, Math.round(rect.h))
  const { data } = context.getImageData(Math.round(rect.x), Math.round(rect.y), width, height)
  const sums = [0, 0, 0]
  const pixels = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    sums[0] += data[i]
    sums[1] += data[i + 1]
    sums[2] += data[i + 2]
  }
  return [Math.round(sums[0] / pixels), Math.round(sums[1] / pixels), Math.round(sums[2] / pixels)]
}

// Maps reference rects onto the image, anchored to the reference's frame when it is found in the image.
const createProjection = (source: Source, reference: ReferenceSize) => {
  const { width, height } = source.canvas
  const found = reference.anchor?.find(source.context.getImageData(0, 0, width, height).data, width, height)
  const from =
    found && reference.anchor ? reference.anchor.rect : { x: 0, y: 0, w: reference.width, h: reference.height }
  const to = found ?? { x: 0, y: 0, w: width, h: height }
  const scaleX = to.w / from.w
  const scaleY = to.h / from.h
  return (rect: Rect): Rect => ({
    x: to.x + (rect.x - from.x) * scaleX,
    y: to.y + (rect.y - from.y) * scaleY,
    w: rect.w * scaleX,
    h: rect.h * scaleY,
  })
}

// Target rects are in pixels of a reference screenshot and scale with the actual image.
export const scanScreenshot = async (
  file: Blob,
  targets: ScanTarget[],
  reference: ReferenceSize,
): Promise<RawReading[]> => {
  const bitmap = await createImageBitmap(file)
  const source = create2d(bitmap.width, bitmap.height)
  source.context.drawImage(bitmap, 0, 0)
  bitmap.close()

  const project = createProjection(source, reference)
  return targets.map((target): RawReading => {
    const rect = project(target.rect)
    if (target.kind === "check") return { kind: "check", id: target.id, rgb: averageColor(source, rect) }
    const { text, confidence } = readGlyphLines(cropGray(source, rect))
    return { kind: target.kind, id: target.id, text, ocrConfidence: confidence }
  })
}
