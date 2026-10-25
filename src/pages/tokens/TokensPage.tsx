import { Panel } from "../../components/layout/Panel"
import { TokensGeneralInputs } from "./TokensGeneralInputs"
import { TokensLevelInputs } from "./TokensLevelInputs"
import { TokensResult } from "./TokensResult"
import { TokensProvider } from "./tokensContext"

const TokensContent = () => {
  return (
    <Panel title="Token Calculator" tooltip="token.panel">
      <div class="grid gap-3 xl:grid-cols-[1.00fr_2fr] xl:items-start">
        <TokensGeneralInputs />
        <TokensResult />
      </div>
      <div class="mt-3">
        <TokensLevelInputs />
      </div>
    </Panel>
  )
}

export const TokensPage = () => {
  return (
    <TokensProvider>
      <TokensContent />
    </TokensProvider>
  )
}
