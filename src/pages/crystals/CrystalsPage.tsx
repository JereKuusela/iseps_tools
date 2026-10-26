import { Panel } from "../../components/layout/Panel"
import { CrystalsGeneralInputs } from "./CrystalsGeneralInputs"
import { CrystalsLevelInputs } from "./CrystalsLevelInputs"
import { CrystalsResult } from "./CrystalsResult"
import { CrystalsProvider } from "./crystalsContext"

const CrystalsContent = () => {
  return (
    <Panel title="Crystal Guide" tooltip="crystal.panel">
      <div class="grid gap-3 xl:grid-cols-[1.00fr_2fr] xl:items-start">
        <CrystalsGeneralInputs />
        <CrystalsResult />
      </div>
      <div class="mt-3">
        <CrystalsLevelInputs />
      </div>
    </Panel>
  )
}

export const CrystalsPage = () => {
  return (
    <CrystalsProvider>
      <CrystalsContent />
    </CrystalsProvider>
  )
}
