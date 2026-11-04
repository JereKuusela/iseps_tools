import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { ZatDataProvider } from "../../shared/zatContext"
import { ZatGuideInputs } from "./ZatGuideInputs"
import { ZatGuideResults } from "./ZatGuideResults"
import { ZatGuideProvider } from "./zatGuideContext"

export const ZatGuidePage = () => (
  <ZatDataProvider>
    <ZatGuideProvider>
      <Panel title="ZAT Guide" tooltip="zatGuide.panel">
        <SplitColumns layoutClass="xl:grid-cols-[1.00fr_2fr]" right={<ZatGuideResults />}>
          <ZatGuideInputs />
        </SplitColumns>
      </Panel>
    </ZatGuideProvider>
  </ZatDataProvider>
)
