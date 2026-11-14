export type SpendingReportRow = {
  id: string
  name: string
  group: string
  level: number
  maxLevel: number
  spent: number
}

export type SpendingReportSection = {
  id: string
  name: string
  rows: SpendingReportRow[]
  spent: number
}

export type SpendingReport = {
  sections: SpendingReportSection[]
  total: number
}

export type SpendingReportSort = {
  column: "name" | "level" | "spent"
  direction: "ascending" | "descending"
}

export const sortSpendingRows = (rows: SpendingReportRow[], sort: SpendingReportSort | null) => {
  const purchased = rows.filter((row) => row.level > 0)
  if (!sort) return purchased
  const direction = sort.direction === "ascending" ? 1 : -1
  return purchased.sort(
    (left, right) =>
      direction *
      (sort.column === "name" ? left.name.localeCompare(right.name) : left[sort.column] - right[sort.column]),
  )
}

export const buildSpendingReport = (
  rows: SpendingReportRow[],
  groups: readonly { id: string; name: string }[],
): SpendingReport => {
  const sections = groups.map((group) => {
    const sectionRows = rows.filter((row) => row.group === group.id)
    return { ...group, rows: sectionRows, spent: sectionRows.reduce((total, row) => total + row.spent, 0) }
  })
  return { sections, total: sections.reduce((total, section) => total + section.spent, 0) }
}
