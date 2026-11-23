import { batch } from "solid-js"
import { ImportImageButton } from "../../components/ui/ImportImageButton"
import { interpretScan } from "../../lib/screenshotImport/parse"
import { scanScreenshot } from "../../lib/screenshotImport/scan"
import { useCrystalsContext } from "./crystalsContext"
import { CRYSTAL_SCAN_TARGETS, REFERENCE_SIZE } from "./crystalsImportLayout"

export const CrystalsImport = () => {
  const crystals = useCrystalsContext()

  const importScreenshot = async (file: Blob) => {
    const upgrades = crystals.upgrades()
    const leveled = new Set(upgrades.filter((upgrade) => upgrade.maxLevel > 1).map((upgrade) => upgrade.id))
    const entries = interpretScan(await scanScreenshot(file, CRYSTAL_SCAN_TARGETS, REFERENCE_SIZE), upgrades).filter(
      (entry) => entry.level !== undefined,
    )
    // Checkboxes always yield a value, so only leveled upgrades show that this is the right screenshot.
    if (!entries.some((entry) => leveled.has(entry.id))) {
      return "No upgrades found. Use a full Crystal Shop Summary screenshot."
    }

    batch(() => {
      for (const { id, level } of entries) {
        if (id === "se") crystals.setSe(String(level))
        else if (id === "playerLevel") crystals.setPlayerLevel(String(level))
        else crystals.setLevel(id, String(level))
      }
    })
    return `Imported ${entries.length} values`
  }

  return <ImportImageButton label="Import Crystal Shop screenshot" onImport={importScreenshot} />
}
