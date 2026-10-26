export const PARTICLE_ORDER = [
  "alpha",
  "beta",
  "ceti",
  "delta",
  "epsilon",
  "fenix",
  "gamma",
  "helion",
  "ixion",
  "juno",
  "kappa",
] as const

export type UnlockedParticle = (typeof PARTICLE_ORDER)[number]
