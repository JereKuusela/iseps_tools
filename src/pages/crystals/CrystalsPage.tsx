import { Panel } from "../../components/layout/Panel"
import { CrystalsInputs } from "./CrystalsInputs"
import { CrystalsLevelInputs } from "./CrystalsLevelInputs"
import { CrystalsResults } from "./CrystalsResults"
import { CrystalsProvider } from "./crystalsContext"

export const CrystalsPage = () => (
  <CrystalsProvider>
    <Panel title="Crystal Guide" tooltip="crystal.panel">
      <div class="grid gap-3 xl:grid-cols-[1.00fr_2fr] xl:items-start">
        <CrystalsInputs />
        <CrystalsResults />
      </div>
      <div class="mt-3">
        <CrystalsLevelInputs />
      </div>
    </Panel>
  </CrystalsProvider>
)
