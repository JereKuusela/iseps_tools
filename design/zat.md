# ZAT

This tool is a port from a Google sheet.

It has 3 parts, each becoming own tab.

## OG tech

Left side has resource related inputs. Juno resource is used to purchase OG techs.

- Numeric input for Juno gains per second/minute/hour (unit can be changed).
- Numeric input for current Juno amount
- Dropdown for calculation mode. Options are DC and Juno, Juno is default.
  - Tooltip: "During your Juno run, leave this on Juno to maximise your Juno gains, towards the end of your run, swap to DC Note: Some Juno gains take effect after a SR (Artifacts etc.)"
- Section for premium resources.
  - Numeric input for Juno output level (0-750). Each level gives 2% boost so show visually 0%-1500% boost.
  - Checkbox for "Juno bundle". Shows 50% boost when checked.
  - Checkbox for "Ixion-Juno bundle". Shows 75% boost when checked.
  - Checkbox for "Juno-Kappa bundle". Shows 100% boost when checked.
  - Numeric input for "Juno tokens" (0-1800). Each token up to 1000 gives 1% additive boost, after that 1% multiplicative boost. Visually show the total.
- Section for "Zagreus"
  - Numeric input for "Zagreys cycles" (0-100).
  - Numeric input for "Shares" (0.00% - 100.00%).
    - Each share equals percentange of 0.05%. So percentage must be converted to amount of shares.
  - Display "The Z.A.T Guide page has Tree recommendations, and displays the expected boost from each node." with link to the guide tab.
- Section for "Juno exponent"
  - Numeric input for "Extra exponent". From 0.001 to 1.000.
  - Also way to expand the extra exponent to use different inputs instead:
    - When expanded, "Extra exponent" is just total exponent from of the following inputs:
    - Numeric input for SE level
    - Numeric input for Player level
    - Numeric input for DCM level
    - Numeric input for Research level
    - Checkbox for "Meltdown bundle". Shows +0.005 exponent when checked.
    - Checkbox for Quantum Addon 0 (0.01 boost)
    - Data from JSON file that has exponent boost and then optionally SE, player, research or DCM requirement.
  - Display for total exponent (0.01 + extra exponent + OG0 levels *0.01 + Meltdown bundle* 0.005).
  - Display for extra Juno gain from +0.01 exponent. Show the multiplier from the exponent, e.g. x451.12.
    - Calculation is complex because boosts from premium resources apply outside the exponent.
    - Take Juno gains per second, remove premium boosts and finally use ^0.01 to calculate the gain from the exponent.
    - Could maybe display +0.001 and +0.005 boost as well as game uses those too.

Right side shows the techs and recommendations.

- Top section:
  - Shows total amount of techs.
  - Small button to auto buy techs that cost less than hour.
  - Name of next best tech. For example "OG3 -> 172" (to indicate OG3 reaching level 172).
  - Remaining time based on gains and current Juno amount. Unit automatically changes (Min, Hr, Days, Years). Up to > 10 years.
  - Small button to buy the tech (automatically increases the tech level).
  - Small table showing next 5 best techs. Columns are "Up next", "Remaining" and "Value". Up next shows tech name, remaining the time needed and value is relative percentage value compared to the best.
    - Note: It's technically possible for the same tech to appear there multiple times for different levels.
    - Sheet has handled this by calculating next 3 levels for each tech. This can be done efficiently in a single pass.
- Lower section:
  - Shows techs on 4 columns, 5 rows grid (total amount of 20 techs).
  - Each tech is a box with:
    - icon (can be placeholder for now)
    - Name (OG0, OG1, etc.)
    - numeric input for level.
    - button to increase level by one (text maybe just +1).
    - Relative value compared to the best tech.
    - ETA (remaining time).
    - Cost for next level in Juno.

Data comes from JSON file.

For each tech it has:

- ID (number from 0 to 19, used to create name).
- Initial cost.
- Array of level and multiplier increase.
  - Total cost requires iterating over every level. Wit the multiplier multiplying itself based on the array. For example level 1-10 might have x2 multiplier, then level 11-20 might increast it to x3 (with array having 1.5 to indicate the increase from 2 to 3).
- Fixed boost value for DC mode (OG0 is still calculated dynamically).
- Base boost value for Juno mode (however custom calculation is required).

### Value calculation

Note: These calculations can be done with regular number type, as values won't be above 1e308.

DC mode:

- For most techs, the value from data is used directly.
- OG0 uses complex calculation:
  - Check which techs are active (level > 0) and calculate current cost multiplier. OG0 it self is excluded.
  - Calculate boost denom for each active tech: 1/log10("cost multiplier")
  - Sum all boost denoms for a total boost denom.
  - Calculate boost denom for OG0: 1/(1-log10("+0.01 exponent multiplier")/log10("cost multiplier))
  - Calculate ZAT boost based on which nodes are active for Juno run. Multiply 1+*node levels"*"Juno multiplier" of each tech.
  - Calculate total boost: "OG0 boost denom"/(1-"total boost denom"*"current exponent"*log10("ZAT BOOST"))
  - Calculate final value: "+0.01 exponent multiplier" ^ "total boost".

Juno mode:

- OG0 is same as DC mode.
- For techs with base boost 1, value is always 1.
- For other techs:
  - Calculate SE effect (depends on SE level): "SE mult"/"SE divider"
  - Calculate exponent per tech: "seAdditive" + "seMultiplier"*"SE Effect"
  - For final value, "base juno boost" ^ "exponent".
    - For OG2 extra step: "extraJunoBase"^"extraJunoExp"*"final value"

ZAT boost:

- ZAT nodes give a multiplier per tech which is different for Juno and DC mode.
- Calculate total Juno multiplier per node: 1+"node levels"*"juno multiplier"
  - If node has "squared boost"" set to true, then apply SQRT("total Juno multiplier").
- Calculate total Juno boost per done: ("total Juno multiplier"^"Juno exponent")^"total boost for OG0"
- Calculate total DC boost per node: 1+"node levels"*"DC multiplier"
- Calculate total impact per node: "dc boost"*"juno boost"^1.48
- For Juno mode, multiply each "Juno Boost".
- For DC mode, multiply each "total boost".

Final boost:

- For each tech: ln("ZAT Boost"*(1+"tech boost")).
  - Note: Both boosts depend on the mode (Juno or DC).
- Then for each tech level: "final boost"/"tech cost".
- Then find maximum and convert to relative percentages.

## ZAT Guide

Left side:

- Numeric input for Cycles.
- Dropdown for run type (SE Push, G-Points, Juno and Cash).
- Displays recommendations as text.
  - Small nodes have levels up to 3. Big nodes have just one level so number is not needed.
- Displays notes (depends on run type and cycles).

Right side:

- Shows the node tree.
- Each node has: level (color changes if active), name and current boost (depends on shares and tech count).

Data comes from JSON file.

For each node, it has:

- ID (number from 0 to 19).
- Name
- Max level (1 for big nodes, 3 for small nodes)
- Multiplier per tech level.
- Multiplier per share level (only big nodes have this).
- Position in the tree (x and y coordinates).
- Connected nodes (for the lines between nodes).
- Juno multiplier per tech level (for calculating value of next OG0).

For each cycle and run type, it has:

- Used nodes and levels.
- Notes.

## Penrose

- Numeric input for "Status".
- Displays "Goal". Next goal is automatically retrieved based on status and Juno gains.
- Progress bar showing progress towards the next goal with percentage.
- Remaining time to reach the next goal based on Juno gains.

Data comes from JSON file. Each ZAT cycle has number and Juno cost. From there the next goal can be determined. Cycles past the JSON file should use some heuristic that will be determined later.
