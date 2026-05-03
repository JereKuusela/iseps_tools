import { createMemo } from "solid-js"
import { Panel } from "../../components/layout/Panel"
import { LargeNumber } from "../../lib/largeNumber"
import { createPersistedSignal } from "../../lib/persistedSignal"
import { calculateNextZatCost } from "../../lib/zatCalculator"
import { PenroseLeftColumn } from "./PenroseLeftColumn"
import type { GainUnit } from "../og/ogTypes"

const parseLargeNumberSafe = (value: string): LargeNumber => {
  try {
    return LargeNumber.parse(value.trim() === "" ? "0" : value)
  } catch {
    return LargeNumber.zero()
  }
}

const toRatePerSecond = (value: LargeNumber, unit: GainUnit) => {
  if (unit === "min") return value.divide(60)
  if (unit === "hour") return value.divide(3600)
  return value
}

const formatDuration = (hours: number) => {
  if (Number.isNaN(hours) || hours < 0) return "Unknown"
  if (!Number.isFinite(hours)) return "> 10 years"
  if (hours < 1 / 60) return "< 1 min"

  const minutes = hours * 60
  if (minutes < 120) return `${minutes.toFixed(1)} min`

  if (hours < 72) return `${hours.toFixed(1)} hr`

  const days = hours / 24
  if (days < 3650) return `${days.toFixed(1)} days`

  return "> 10 years"
}

export const PenrosePage = (_props: { cycles: string; setCycles: (next: string) => void }) => {
  const [statusAmount, setStatusAmount] = createPersistedSignal("penrose.statusAmount", "0")

  const [junoGainValue, setJunoGainValue] = createPersistedSignal("zat.og.gain", "1e12")
  const [junoGainUnit, setJunoGainUnit] = createPersistedSignal<GainUnit>("zat.og.gainUnit", "sec")

  const normalizedStatusAmount = createMemo(() => parseLargeNumberSafe(statusAmount()))
  const normalizedJunoGain = createMemo(() => parseLargeNumberSafe(junoGainValue()))
  const junoGainPerSecond = createMemo(() => {
    const gain = normalizedJunoGain()
    if (gain.compare(0) <= 0) return LargeNumber.zero()
    return toRatePerSecond(gain, junoGainUnit())
  })

  const nextCycleInputAmount = createMemo(() => {
    const status = normalizedStatusAmount()
    const gain = junoGainPerSecond()
    return status.compare(gain) >= 0 ? status : gain
  })

  const nextCycleInfo = createMemo(() => calculateNextZatCost(nextCycleInputAmount()))
  const nextCycle = createMemo(() => Math.max(1, Math.floor(nextCycleInfo().cycle)))

  const junoRemainingToGoal = createMemo(() => {
    const targetCost = nextCycleInfo().cost
    const current = normalizedStatusAmount()
    if (targetCost.compare(current) <= 0) return LargeNumber.zero()
    return targetCost.subtract(current)
  })

  const goalCostLabel = createMemo(() => nextCycleInfo().cost.toString(2))

  const etaHours = createMemo(() => {
    const rate = junoGainPerSecond()
    if (rate.compare(0) <= 0) return Number.POSITIVE_INFINITY

    const remaining = junoRemainingToGoal().divide(rate)
    if (remaining.exponent > 12) return Number.POSITIVE_INFINITY
    const seconds = remaining.mantissa * 10 ** remaining.exponent
    return seconds / 3600
  })
  const goalProgress = createMemo(() => {
    const current = normalizedStatusAmount()
    const target = nextCycleInfo().cost
    if (target.compare(0) <= 0) return "100%"
    if (current.compare(target) >= 0) return "100%"
    const ratio = current.divide(target)
    const asNumber = ratio.mantissa * 10 ** ratio.exponent
    return `${(asNumber * 100).toFixed(0)}%`
  })
  const etaMinutes = createMemo(() => etaHours() * 60)

  return (
    <Panel title="Penrose" tooltip="penrose.panel">
      <div class="max-w-md">
        <PenroseLeftColumn
          statusAmount={statusAmount()}
          setStatusAmount={setStatusAmount}
          junoGainValue={junoGainValue()}
          setJunoGainValue={setJunoGainValue}
          junoGainUnit={junoGainUnit()}
          setJunoGainUnit={setJunoGainUnit}
          goalCycle={nextCycle()}
          goalCost={goalCostLabel()}
          goalProgress={goalProgress()}
          etaLabel={formatDuration(etaHours())}
          etaMinutes={etaMinutes()}
        />
      </div>
    </Panel>
  )
}
