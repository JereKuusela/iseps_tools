import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { ZatGuideLeftColumn } from "./ZatGuideLeftColumn"
import { ZatGuideRightColumn } from "./ZatGuideRightColumn"
import { ZatGuideProvider } from "./zatGuideContext"

const ZatGuideContent = () => {
  return (
    <Panel title="ZAT Guide" tooltip="zatGuide.panel">
      <SplitColumns layoutClass="xl:grid-cols-[0.92fr_1fr]" right={<ZatGuideRightColumn />}>
        <ZatGuideLeftColumn />
      </SplitColumns>
    </Panel>
  )
}

export const ZatGuidePage = () => {
  return (
    <ZatGuideProvider>
      <ZatGuideContent />
    </ZatGuideProvider>
  )
}
