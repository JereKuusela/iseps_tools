import { Panel } from "../../components/layout/Panel"
import { TokensInputs } from "./TokensInputs"
import { TokensLevelInputs } from "./TokensLevelInputs"
import { TokensResults } from "./TokensResults"
import { TokensProvider } from "./tokensContext"

export const TokensPage = () => (
  <TokensProvider>
    <Panel title="Token Calculator" tooltip="token.panel">
      <div class="grid gap-3 xl:grid-cols-[1.00fr_2fr] xl:items-start">
        <TokensInputs />
        <TokensResults />
      </div>
      <div class="mt-3">
        <TokensLevelInputs />
      </div>
    </Panel>
  </TokensProvider>
)
