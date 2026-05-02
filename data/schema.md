# Data schema

Explains what each field is.

## cycles.json

Rules for calculating ZAT cycle cost.

- `cycle`: The cycle number where this rule become active.
- `mult`: Additional multiplier applies to exponent.

Base cost is 1, so level 1 costs 1e5, level 2 costs 1e10, level 3 costs 1e20 and so on.

## credits.json

Entries for the Credits tab.

- `name`: Credit group or person name.
- `credits`: List of credit lines to display under the name.

## juno_exponent.json

Rules for calculating Juno exponent.

- `type`: The type of source.
  - `qa`: Quantum addon.
  - `se`: SE item.
  - `player`: Player level.
  - `research`: Research level.
  - `dcm`: DC milestone.
  - `crystal`: Crystal shop.
- `level`: The level where this exponent becomes active.
- `exp`: The exponent value.

## juno_premium.json

Available premium purchases that affect Juno output.

- `name`: Name of the purchase.
- `min`: Minimum input value.
- `max`: Maximum input value.
- `value`: Value of each level.
- `mode`: How the total value is calculated.
  - `add`: Total value is `level * value`.
  - `mul`: Total value is `value ^ level`.

Tokens are special case, with the mode changing after 1000 tokens.

## premium.json

Rules and base values for Premium tab calculations.

- `crystalToken`: Data for Crystal and Token calculations.
  - `dailyRewards`: Daily rewards included by optional checkbox.
    - `tokens`: Base daily token rewards before modifiers.
    - `crystals`: Base daily crystal rewards.
  - `seDailyTokenMultipliers`: Token multiplier by selected SE item.
    - `se`: SE item value.
    - `mult`: Multiplier applied to daily reward tokens.
  - `methods`: Premium methods shown in output table.
    - `id`: Stable method identifier.
    - `name`: Display name.
    - `seconds`: Base interval in seconds.
    - `tokens`: Base token output per interval.
    - `crystals`: Base crystal output per interval.
    - `tokenBooster`: Whether token booster affects this method.
    - `chestEnhancer`: Whether module #17 affects this method.
    - `luckyLeafClover`: Whether lucky leaf clover affects this method.
    - `tokenUpgradePerLevel`: Optional additive token bonus per level.
    - `crystalUpgradePerLevel`: Optional additive crystal bonus per level.
    - `durationTokenPerLevel`: Optional BB-Bot additive token bonus per duration level.
    - `tokenUpgradeUnlockLevel`: Optional BB-Bot duration level required before token upgrade applies.
- `haulerMine`: Data for Hauler Mine calculations.
  - `layerHours`: Duration of one completed layer.
  - `layers`: Per-layer base and optional rewards.
    - `layer`: Layer index.
    - `rareDirt`: Base rare dirt reward.
    - `tokens`: Optional token reward.
    - `crystals`: Optional crystal reward.
    - `exoticDirt`: Optional exotic dirt reward.
    - `rareDirtBonus`: Optional extra rare dirt reward.
    - `tokenToggle`: Optional toggle key required to apply token reward.
    - `crystalToggle`: Optional toggle key required to apply crystal reward.
    - `exoticToggle`: Optional toggle key required to apply exotic dirt reward.
    - `rareBonusToggle`: Optional toggle key required to apply rare dirt bonus.

## sc.json

Rules for calculating SC tool values.

- `replicators`: Replicator formulas and thresholds.
  - `dc`: Rules for DC replicator boost.
    - `unlockMinutes`: Minutes in SE required before polynomial boost is active.
    - `rules`: Per-SE polynomial coefficients.
      - `se`: SE level where this rule becomes active.
      - `base`: Base multiplier value.
      - `linear`: Linear coefficient applied to minutes in SE.
      - `quadratic`: Quadratic coefficient applied to minutes in SE squared.
  - `se`: Rules for SC replicator boost.
    - `stepMinutes`: Minute step used when counting boost increments.
    - `rules`: Per-SE step and cap values.
      - `se`: SE level where this rule becomes active.
      - `perStep`: Boost increment per `stepMinutes` block.
      - `cap`: Maximum SC replicator multiplier.
- `dailyBoost`: Daily multiplicative boost by SE.
  - `se`: SE level where this rule becomes active.
  - `dailyMultiplier`: Daily multiplicative factor for projected values.
- `batteryGoalMultipliers`: Extra DC multipliers applied to battery goals.
  - `se`: SE level where this multiplier becomes active.
  - `mult`: Multiplier applied cumulatively at and above this SE.

## techs.json

Rules for calculating tech cost and tech value.

- `id`: Tech number. Used as reference and name as well.
- `initCost`: Initial cost of the tech.
- `costCurve`: Array of cost multipliers.
  - `level`: Tech level where this multiplier become active.
  - `mult`: Multiplier applies to tech cost.
- `dcBoost`: Fixed tech value for DC mode.
- `junoBase`: Base tech value for Juno mode.
- `extraJunoBase`: Extra multiplier for Juno mode.
- `extraJunoExp`: Exponent for the extra multiplier.
- `seMultiplier`: Multiplier to the SE effect.
- `seAdditive`: Addition to the SE effect.

## techs_se_effect.json

Rules for calculating SE effect on tech value for Juno mode.

For mul, sheet had `LOG(1 + X*0.000776)` where X depends on SE level.
For div, sheet had `LOG(1.3^X)` where X depends on SE level.

- `se`: SE value where this rule is active.
- `kind`: Which part the rule affects.
  - `mul`: Sets the multiplier.
  - `div`: Sets the divider.

## zat_nodes.json

Rules for calculating ZAT node boost. Also used to draw the tree.

- `id`: Node number. Used as reference and name as well.
- `name`: Name of the node.
- `maxLv`: Maximum level of the node. Default is 1 if not specified.
- `cost`: Cost of the node. Default is 1 if not specified.
- `shareMul`: Multiplier for share value. Default is 0 if not specified.
- `junoMul`: Multiplier for Juno value. Default is 0 if not specified.
- `dcMul`: Multiplier for DC value. Default is 1 if not specified.
- `sqrt`: Whether the node uses square root for juno multiplier. Default is false if not specified.
- `x`: X position of the node.
- `y`: Y position of the node.
- `req`: Required node ID to unlock this node.

## zat_guides.json

Entries for the ZAT guide.

- `cycle`: Amount of cycles.
- `run`: The type of run.
- `nodes`: Array of nodes.
- `note`: Optional note.
