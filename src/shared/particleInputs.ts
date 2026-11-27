import { createMemo } from "solid-js"
import { LargeNumber, parseLargeNumberSafe } from "../lib/largeNumber"
import type { UnlockedParticle } from "../lib/particles"
import { createSyncedSignal } from "../lib/persistedSignal"

export const PARTICLE_GAIN_UNITS = ["hour", "min", "sec", "day"] as const
export type ParticleGainUnit = (typeof PARTICLE_GAIN_UNITS)[number]

export const PARTICLE_GAIN_UNIT_KEY = "shared.particle.gainUnit"
export const getParticleCurrentKey = (particle: UnlockedParticle) => `shared.particle.${particle}.current`
export const getParticleGainKey = (particle: UnlockedParticle) => `shared.particle.${particle}.gain`

const SECONDS_PER_UNIT: Record<ParticleGainUnit, number> = { sec: 1, min: 60, hour: 3600, day: 86400 }

export const toRatePerSecond = (value: LargeNumber, unit: ParticleGainUnit) => value.divide(SECONDS_PER_UNIT[unit])

// All particles share one gain unit; amounts are raw (no chest multiplier).
const createResourceInputs = (currentKey: string, gainKey: string, unitKey: string) => {
  const [current, setCurrent] = createSyncedSignal(currentKey, "")
  const [gain, setGain] = createSyncedSignal(gainKey, "0")
  const [unit, setUnit] = createSyncedSignal<ParticleGainUnit>(unitKey, "hour")

  const currentAmount = createMemo(() => parseLargeNumberSafe(current()))
  const gainPerSecond = createMemo(() => {
    const parsed = parseLargeNumberSafe(gain())
    return parsed.compare(0) <= 0 ? LargeNumber.zero() : toRatePerSecond(parsed, unit())
  })

  return { current, setCurrent, gain, setGain, unit, setUnit, currentAmount, gainPerSecond }
}

export const useParticleInputs = (particle: UnlockedParticle) =>
  createResourceInputs(getParticleCurrentKey(particle), getParticleGainKey(particle), PARTICLE_GAIN_UNIT_KEY)

// Cash has its own gain unit because its income is read from a different game screen.
export const useCashInputs = () =>
  createResourceInputs("shared.cash.current", "shared.cash.gain", "shared.cash.gainUnit")
