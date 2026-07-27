import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { PerkDataProvider } from "../../lib/perkContext"
import { PerkGuideLeftColumn } from "./PerkGuideLeftColumn"
import { PerkGuideRightColumn } from "./PerkGuideRightColumn"
import { PerkGuideProvider } from "./perkGuideContext"

const PerkGuideContent = () => {
  return (
    <Panel title="Perk Guide" tooltip="perkGuide.panel">
      <SplitColumns layoutClass="xl:grid-cols-[1.02fr_1.75fr]" right={<PerkGuideRightColumn />}>
        <PerkGuideLeftColumn />
      </SplitColumns>
    </Panel>
  )
}

export const PerkGuidePage = () => {
  return (
    <PerkDataProvider>
      <PerkGuideProvider>
        <PerkGuideContent />
      </PerkGuideProvider>
    </PerkDataProvider>
  )
}
