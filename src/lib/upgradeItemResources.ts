import { PARTICLE_ORDER } from "./particles"

const resourceAliases: Record<string, string> = {
  "all particles": "ap",
  "arch-bots": "arch-bots",
  archive: "arch-bots",
  artifacts: "artifacts",
  corvus: "corvus",
  cot: "solutions",
  crystal: "crystals",
  crystals: "crystals",
  "data cube": "dc",
  dc: "dc",
  "dc milestones": "dcm",
  egetarium: "artifacts",
  "emblem milestones": "emblems",
  emblems: "emblems",
  extractions: "extractions",
  "fenix institute": "institutes",
  "g-corp": "gp",
  "g-point": "gp",
  "g-points": "gp",
  infinity: "infinity",
  "infinity amp": "infinity-amp",
  "infinity multi": "infinity",
  laboratory: "scientist",
  leveling: "lp",
  lp: "lp",
  rebirthologists: "rebirthologist",
  researches: "research",
  sc: "sc",
  scientists: "scientist",
  simulation: "sc",
  singularity: "sc",
  solutions: "solutions",
  taskmaster: "task",
  tiberius: "emblems",
  token: "tokens",
  tokens: "tokens",
}

const resourceNames = new RegExp(
  `\\b(${[...Object.keys(resourceAliases).sort((left, right) => right.length - left.length), ...PARTICLE_ORDER, "cash", "(?<=BB-Bot )duration"].join("|")})\\b`,
  "gi",
)

export const splitUpgradeItemResources = (name: string) => {
  const bundle = /^(A-B-C|D-E-F|G-H-I)( bundle)$/i.exec(name)
  if (bundle) {
    return [...bundle[1]]
      .map((text) => ({
        text,
        resource: PARTICLE_ORDER.find((particle) => particle.startsWith(text.toLowerCase())),
      }))
      .concat({ text: bundle[2], resource: undefined })
  }

  return name.split(resourceNames).map((text, index) => {
    const key = text.toLowerCase()
    return { text, resource: index % 2 === 0 ? undefined : (resourceAliases[key] ?? key) }
  })
}
