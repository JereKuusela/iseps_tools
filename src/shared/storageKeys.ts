import { TokenId } from "../pages/tokens/tokensTypes"

export const SHARED_SE_KEY = "shared.se"
export const SHARED_PLAYER_LEVEL_KEY = "shared.playerLevel"
export const SHARED_DCM_LEVEL_KEY = "shared.dcmLevel"
export const SHARED_RESEARCH_LEVEL_KEY = "shared.researchLevel"
// Legacy "token." prefix kept so existing stored values still load.
export const SHARED_ONLINE_HOURS_KEY = "token.onlineHoursPerDay"

export const getTokenKey = <T extends TokenId>(upgradeId: T): `token.${T}` => `token.${upgradeId}`
export const getCrystalKey = (upgradeId: string) => `crystal.${upgradeId}`
