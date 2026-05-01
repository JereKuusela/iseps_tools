# Data schema

Explains what eacch field is.

## cycles.json

Rules for calculating ZAT cycle cost.

- `cycle`: The cycle number where this rule become active.
- `mult`: Additional multiplier applies to exponent.

Base cost is 1, so level 1 costs 1e5, level 2 costs 1e10, level 3 costs 1e20 and so on.

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
