import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { PerkDataProvider } from "../../shared/perkContext"
import { PerkGuideInputs } from "./PerkGuideInputs"
import { PerkGuideResults } from "./PerkGuideResults"
import { PerkGuideProvider } from "./perkGuideContext"

export const PerkGuidePage = () => (
  <PerkDataProvider>
    <PerkGuideProvider>
      <Panel title="Perk Guide" tooltip="perkGuide.panel">
        <SplitColumns layoutClass="xl:grid-cols-[1.02fr_1.75fr]" right={<PerkGuideResults />}>
          <PerkGuideInputs />
        </SplitColumns>
      </Panel>
    </PerkGuideProvider>
  </PerkDataProvider>
)
