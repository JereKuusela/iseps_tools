import { batch } from "solid-js"
import { ImportImageButton } from "../../components/ui/ImportImageButton"
import { interpretScan } from "../../lib/screenshotImport/parse"
import { scanScreenshot } from "../../lib/screenshotImport/scan"
import { useTokensContext } from "./tokensContext"
import { TOKEN_REFERENCE_SIZE, TOKEN_SCAN_TARGETS } from "./tokensImportLayout"
import type { TokenId } from "./tokensTypes"

export const TokensImport = () => {
  const tokens = useTokensContext()

  const importScreenshot = async (file: Blob) => {
    const specs = tokens.upgrades().map(({ id, label, maxLevel }) => ({ id, name: label, maxLevel }))
    const entries = interpretScan(await scanScreenshot(file, TOKEN_SCAN_TARGETS, TOKEN_REFERENCE_SIZE), specs).filter(
      (entry) => entry.level !== undefined,
    )
    const upgradeEntries = entries.filter((entry) => entry.id !== "se")
    if (!upgradeEntries.length) return "No upgrades found. Use a full Token Shop Summary screenshot."

    batch(() => {
      for (const { id, level } of entries) {
        if (id === "se") tokens.setCurrentSe(String(level))
        else tokens.setUpgradeLevel(id as TokenId, String(level))
      }
    })
    return `Imported ${entries.length} values`
  }

  return <ImportImageButton label="Import Token Shop screenshot" onImport={importScreenshot} />
}
