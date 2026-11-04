import type { TalentSide } from "./talentGuideData"

export type TalentTheme = {
  title: string
  header: string
  background: string
  cell: string
  label: string
}

// Colors taken from the community guide spreadsheet.
export const TALENT_THEMES: Record<TalentSide, TalentTheme> = {
  PP: { title: "PIONEERING PARTICULATOR", header: "#8E302E", background: "#502E2D", cell: "#EE5755", label: "#652120" },
  IC: {
    title: "INTERPLANETARY CONTRACTOR",
    header: "#1A665A",
    background: "#324A32",
    cell: "#67B68A",
    label: "#32634D",
  },
}
