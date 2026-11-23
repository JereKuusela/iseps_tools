import type { ScanKind } from "./scan"

// Anything with a name and a max level can be imported.
export type ImportSpec = { id: string; name: string; maxLevel: number }

export type ReadingStatus = "ok" | "low" | "unknown"

export type RawReading = {
  kind: ScanKind
  id: string
  text?: string
  ocrConfidence?: number
  rgb?: [number, number, number]
}

export type ImportEntry = {
  id: string
  name: string
  status: ReadingStatus
  level?: number
  raw: string
  note?: string
}

type Parsed = { level?: number; status: ReadingStatus; note?: string }

const MIN_OCR_CONFIDENCE = 10
const GREEN_MARGIN = 30
const GRAY_SPREAD = 25

const tokensOf = (text: string) => text.replace(/,/g, "").match(/\d+/g) ?? []

// Reads "current /max" text, using the known max to catch misreads such as a slash read as a digit.
export const parseLevelText = (text: string, max: number): Parsed => {
  const tokens = tokensOf(text)
  if (!tokens.length) return { status: "unknown", note: "No digits read" }

  const maxText = String(max)
  if (tokens.length === 1) {
    const [token] = tokens
    if (token.length > maxText.length && token.endsWith(maxText)) {
      const prefix = token.slice(0, -maxText.length)
      const candidates = [prefix, prefix.slice(0, -1)].filter(Boolean).map(Number)
      const level = candidates.find((value) => value <= max)
      return level === undefined
        ? { status: "unknown", note: "Could not separate value from max" }
        : { level, status: "low", note: "Slash was not read" }
    }
    const level = Number(token)
    return level <= max
      ? { level, status: "low", note: "Max value not read" }
      : { status: "unknown", note: `Read ${token}, above max ${max}` }
  }

  const level = Number(tokens[0])
  const readMax = Number(tokens[tokens.length - 1])
  if (level > max) return { level: max, status: "low", note: `Read ${level}, above max ${max}` }
  // The slash often fuses with the max's first digit, leaving only its tail ("/150" read as "50").
  const maxRead = tokens.length === 2 && (readMax === max || maxText.endsWith(String(readMax)))
  if (!maxRead) {
    return { level, status: "low", note: `Max read as ${readMax}, expected ${max}` }
  }
  return { level, status: "ok" }
}

const parseHeaderNumber = (text: string, limit: number): Parsed => {
  const tokens = tokensOf(text)
  if (tokens.length !== 1)
    return { status: "unknown", note: tokens.length ? "Multiple numbers read" : "No digits read" }
  const level = Number(tokens[0])
  return level >= 1 && level <= limit
    ? { level, status: "ok" }
    : { status: "unknown", note: `Read ${level}, outside the expected range` }
}

export const classifyCheck = ([r, g, b]: [number, number, number]): Parsed => {
  const greenness = g - Math.max(r, b)
  const spread = Math.max(r, g, b) - Math.min(r, g, b)
  if (greenness >= GREEN_MARGIN) return { level: 1, status: "ok" }
  if (spread <= GRAY_SPREAD) return { level: 0, status: "ok" }
  return { level: greenness >= GREEN_MARGIN / 2 ? 1 : 0, status: "low", note: "Unclear checkbox color" }
}

// A multiplier of 2^level, e.g. "x1,024 /1024".
const parseMultiplier = (text: string, max: number): Parsed => {
  const tokens = tokensOf(text)
  if (!tokens.length) return { status: "unknown", note: "No digits read" }
  const level = Math.log2(Number(tokens[0]))
  if (!Number.isInteger(level) || level > max)
    return { status: "unknown", note: `Read ${tokens[0]}, not a valid multiplier` }
  // The slash of the second line often fuses with its first digit, so only the first number is trusted.
  return { level, status: "ok" }
}

const describeReading = (reading: RawReading, spec: ImportSpec | undefined): Parsed => {
  if (reading.kind === "check") return reading.rgb ? classifyCheck(reading.rgb) : { status: "unknown" }

  const text = reading.text ?? ""
  const parsed =
    reading.kind === "se"
      ? parseHeaderNumber(text, 10_000)
      : reading.kind === "playerLevel"
        ? parseHeaderNumber(text, 100_000)
        : spec
          ? reading.kind === "multiplier"
            ? parseMultiplier(text, spec.maxLevel)
            : parseLevelText(text, spec.maxLevel)
          : ({ status: "unknown" } as Parsed)

  if (parsed.status === "ok" && (reading.ocrConfidence ?? 100) < MIN_OCR_CONFIDENCE) {
    return { ...parsed, status: "low", note: "Low OCR confidence" }
  }
  return parsed
}

const HEADER_NAMES: Record<string, string> = { se: "SE", playerLevel: "Player level" }

export const interpretScan = (readings: RawReading[], specs: ImportSpec[]): ImportEntry[] => {
  const specById = new Map(specs.map((spec) => [spec.id, spec] as const))
  return readings.flatMap((reading): ImportEntry[] => {
    const spec = specById.get(reading.id)
    const name = spec?.name ?? HEADER_NAMES[reading.id]
    if (!name) return []
    const { level, status, note } = describeReading(reading, spec)
    const raw = reading.kind === "check" ? (reading.rgb ? `rgb(${reading.rgb.join(", ")})` : "") : (reading.text ?? "")
    return [{ id: reading.id, name, status, level, raw: raw.replace(/\s+/g, " ").trim(), note }]
  })
}
