# Premium

This tool is a port from a Google sheet.

It has 2 parts, each becoming own tab.

## Crystal and token

Left side has inputs for ugprades that affect premium resource output.

Dropdowns should also support numeric input.

Tooltips should have custom component to look nicer and support formatting the text better.

- Dropdown for Supply Bot Token Upgrade (0-25).
  - Tooltip: In the Token Shop under Supplies Upgrades. Gives +0.1 Token Per Level
- Dropdown for Supply Bot Crystal Upgrade (0-8).
  - Tooltip: In the Token Shop under Supplies Upgrades. Gives 1 Crystal per level
- Dropdown for BB-Bot Total Duration Upgrade (0-40).
  - Tooltip: In the Token Shop under BB-Bot Upgrades. Adds 60 seconds to the BB-Bot timer and gives 0.05 Tokens
- Dropdown for BB-Bot Token Upgrade (0-20).
  - Tooltip: In the Token Shop under BB-Bot Upgrades. Need all 40 levels of the BB-Bot Duration bought to buy the Token Upgrade. Adds 0.5 Tokens to the BB-Bot per level.
  - This is active after Total Duration is maxed.
- Dropdown for Token Booster (0-100).
  - Tooltip: In the Crystal Shop under the Special Upgrades Tab. Unlocked with Player Level 300 and gives 1% to tokens gained from all sources, including bought with real money
- Dropdown for Module #17: Chest Enhancer (0-10)
  - Tooltip: In the Gamma Corporation in the G-Point Shop in the Module Collection. The second to last Module, it gives 10% Chest Tokens per level.
- Dropdown for average hours per day (0-24).
  - Tooltip: How often you spend in the game on a given day. Used to determine how many Tokens and Crystals are gained every day with optimal collection. Assumed each day is from midnight UTC to midnight UTC the following day.
- Checkbox for total includes daily rewards.
  - Tooltip: You gain 100 Crystals and 34.375 Tokens per day from collecting all of the daily rewards without missing days. This is further boosted by token booster and SE items.
- Dropdown for SE item (11, 81, 101, 133, 158).
  - Tooltip: Reaching certain SE levels multiplies daily tokens.
- Checkbox for perk Lucky Leaf Clover perk (L4).
  - Tooltip: Reduces chest cooldown by 10%. Not recommended.

Right side shows different premium methods as a table like format.

- Time of Item (seconds and per hour).
- Base Output (Tokens and Cyrstals).
- Hourly Output (Tokens and Cyrstals).
- Daily Output (Tokens and Cyrstals).

Values per item:

- Basic Chest: Every 360 seconds, 1 token, 8 crystals.
  - Boosted by Module #17: Chest Enhancer.
  - Boosted by Token Booster.
  - Boosted by Lucky Leaf Clover perk.
- Rare Chest: Every 1200 seocnds, 6 tokens, 20 crystals.
  - Boosted by Module #17: Chest Enhancer.
  - Boosted by Token Booster.
  - Boosted by Lucky Leaf Clover perk.
- Supply Bot: Every 420 seconds, 2 tokens, 6 crystals.
  - Boosted by Supply Bot Token Upgrade and Supply Bot Crystal Upgrade.
  - Boosted by Token Booster.
- BB-Bot: Every 1200 seconds, 1 token, 0 crystals.
  - Boosted by BB-Bot Total Duration Upgrade and BB-Bot Token Upgrade.
  - Boosted by Token Booster.
- Last row shows total for Hourly and Daily Output.

## Hauler mine

Left side:

- Dropdown for unlocked layers (0-11).
- Checkbox for Layer 1, #3 token income.
- Checkbox for Layer 1, #2 crystal income.
- Checkbox for Layer 3, #3 crystal income.
- Checkbox for Layer 4, #2 rare dirt income.
- Checkbox for Layer 7, #2 rare dirt income.
- Checkbox for Layer 2, #3 exotic dirt income.
- Checkbox for Layer 6, #2 exotic dirt income.
- Checkbox for Layer 9, #2 exotic dirt income.
- Token booster also affects hauler mine. So show it also here.

Right side:

- Table like format for hourly and daily income of tokens, crystals, rare dirt and exotic dirt.

Data:

- Each layer takes 6 hours.
- Layer 0 gives: 10 rare dirt.
- Layer 1 gives: 14 rare dirt, 10 tokens, 10 crystals (if unlocked).
- Layer 2 gives: 18 rare dirt, 1 exotic crystal (if unlocked).
- Layer 3 gives: 22 rare dirt, 12 crystals (if unlocked).
- Layer 4 gives: 25 rare dirt, 20 rare dirt (if unlocked).
- Layer 5 gives: 35 rare dirt.
- Layer 6 gives: 50 rare dirt, 1 exotic dirt (if unlocked).
- Layer 7 gives: 70 rare dirt, 15 rare dirt (if unlocked).
- Layer 9 gives: 100 rare dirt.
- Layer 9 gives: 140 rare dirt, 1 exotic dirt (if unlocked).
- Layer 10 gives: 3 exotic dirt.
- Layer 11 gives: 5 exotic dirt.
