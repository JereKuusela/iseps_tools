import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { ZatDataProvider } from "../../lib/zatContext"
import { OgTechLeftColumn } from "./OgTechLeftColumn"
import { OgTechRightColumn } from "./OgTechRightColumn"
import { OgTechProvider } from "./ogTechContext"

const OgTechContent = () => {
  return (
    <Panel title="OG Tech" tooltip="og.panel">
      <SplitColumns layoutClass="xl:grid-cols-[1.00fr_2fr]" right={<OgTechRightColumn />}>
        <OgTechLeftColumn />
      </SplitColumns>
    </Panel>
  )
}

export const OgTechPage = () => {
  return (
    <ZatDataProvider>
      <OgTechProvider>
        <OgTechContent />
      </OgTechProvider>
    </ZatDataProvider>
  )
}
