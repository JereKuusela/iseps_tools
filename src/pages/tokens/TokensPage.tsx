import { Panel } from "../../components/layout/Panel"
import { TokensGeneralInputs } from "./TokensGeneralInputs"
import { TokensLevelInputs } from "./TokensLevelInputs"
import { TokensResult } from "./TokensResult"
import { TokensProvider, useTokensContext } from "./tokensContext"

const TokensContent = () => {
  const tokens = useTokensContext()

  return (
    <Panel title="Token Calculator">
      {tokens.isLoading() ? (
        <p class="rounded-xl border border-ink/15 bg-white/70 px-3 py-2 text-sm text-ink/80 dark:border-white/15 dark:bg-[#1d2c42] dark:text-white/80">
          Loading token tables...
        </p>
      ) : null}
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
