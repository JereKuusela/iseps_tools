import { batch } from "solid-js"
import { ImportImageButton } from "../../components/ui/ImportImageButton"
import { interpretScan } from "../../lib/screenshotImport/parse"
import { scanScreenshot } from "../../lib/screenshotImport/scan"
import { useOgTechContext } from "./ogTechContext"
import { OG_TECH_REFERENCE_SIZE, OG_TECH_SCAN_TARGETS } from "./ogTechImportLayout"

export const OgTechImport = () => {
  const ogTech = useOgTechContext()

  const importScreenshot = async (file: Blob) => {
    const specs = ogTech.techCardRows().map(({ id, label, maxLevel }) => ({ id: String(id), name: label, maxLevel }))
    const entries = interpretScan(
      await scanScreenshot(file, OG_TECH_SCAN_TARGETS, OG_TECH_REFERENCE_SIZE),
      specs,
    ).filter((entry) => entry.level !== undefined)
    if (!entries.length) return "No techs found. Use a full OG Tech screenshot."

    batch(() => {
      for (const { id, level } of entries) ogTech.setTechLevel(Number(id), level as number)
    })
    return `Imported ${entries.length} values`
  }

  return <ImportImageButton label="Import OG Tech screenshot" onImport={importScreenshot} />
}
