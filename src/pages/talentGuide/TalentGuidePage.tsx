import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { TalentGuideLeftColumn } from "./TalentGuideLeftColumn"
import { TalentGuideRightColumn } from "./TalentGuideRightColumn"
import { TalentGuideProvider } from "./talentGuideContext"

export const TalentGuidePage = () => (
  <TalentGuideProvider>
    <Panel title="Talent Guide" tooltip="talentGuide.panel">
      <SplitColumns layoutClass="xl:grid-cols-[1fr_2fr]" right={<TalentGuideRightColumn />}>
        <TalentGuideLeftColumn />
      </SplitColumns>
    </Panel>
  </TalentGuideProvider>
)
