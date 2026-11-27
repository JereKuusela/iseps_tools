import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { KaiperInputs } from "./KaiperInputs"
import { KaiperResults } from "./KaiperResults"
import { KaiperProvider } from "./kaiperContext"

export const KaiperPage = () => (
  <KaiperProvider>
    <Panel title="Kaiper" tooltip="kaiper.panel">
      <SplitColumns layoutClass="xl:grid-cols-[1.00fr_2fr]" right={<KaiperResults />}>
        <KaiperInputs />
      </SplitColumns>
    </Panel>
  </KaiperProvider>
)
