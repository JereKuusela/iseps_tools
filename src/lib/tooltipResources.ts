// Icons are marked in text as [[icon]] (shown as written) or [[icon|shown text]].
const iconMarker = /\[\[([^\]|\r\n]+)(?:\|([^\]\r\n]+))?\]\]/g

export const splitTooltipResources = (line: string, compactLists = false) => {
  const parts: { text: string; resource?: string }[] = []
  let end = 0
  for (const match of line.matchAll(iconMarker)) {
    if (match.index > end) parts.push({ text: line.slice(end, match.index) })
    parts.push({ text: match[2] ?? match[1], resource: match[1].toLowerCase() })
    end = match.index + match[0].length
  }
  if (end < line.length) parts.push({ text: line.slice(end) })
  if (!compactLists) return parts

  return parts.map((part, index) =>
    !part.resource &&
    parts[index - 1]?.resource &&
    parts[index + 1]?.resource &&
    /^(?:,\s*(?:and\s+)?|\s+and\s+)$/.test(part.text)
      ? { text: " " }
      : part,
  )
}
