import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { ZatDataProvider } from "../../shared/zatContext"
import { OgTechInputs } from "./OgTechInputs"
import { OgTechResults } from "./OgTechResults"
import { OgTechProvider } from "./ogTechContext"

export const OgTechPage = () => (
  <ZatDataProvider>
    <OgTechProvider>
      <Panel title="OG Tech" tooltip="og.panel">
        <SplitColumns layoutClass="xl:grid-cols-[1.00fr_2fr]" right={<OgTechResults />}>
          <OgTechInputs />
        </SplitColumns>
      </Panel>
    </OgTechProvider>
  </ZatDataProvider>
)
