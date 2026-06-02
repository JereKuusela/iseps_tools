# Cruise

This tool is a port from a Google sheet.

At minimum these inputs are needed:

- Numeric input for amount of prestiges done.
  - Tooltip: Info found from Prestige Menu / Statistics.
  - Used to calculate amount of points.
  - First prestige gives 1 point.
  - Each prestige gives 1 point more than the previous prestige. So 2nd prestige gives 2 points, 3rd gives 3 points, etc.
- Prestige nodes with the current level.
  - Used to calculate amount of used points.
  - Used to calculate the next best node.
  - Maybe as a table with Name, level, next level cost, next level bonus, bonus per point and total points spent.
  - Best option could be highlighted somehow.
- Display of total points, points used and points available.
- Action buttons to buy next best upgrade, spend all points, reset all nodes or optimize.
  - Optimize would reset nodes and their effect, then spend points optimally.
- Prestige notation: Each node amount spearted by /.
  Tooltip: Prestige upgrades are often referred to as the number of levels you have in each upgrade seperated by "/". For this notation, the upgrades are ordered left to right in the Prestige Upgrades menu, ignoring whether they are in the top or bottom row.  This is often shortened to four (or more) upgrades which would indicate all other upgrades are at level 0.

Then additional inputs are needed for evaluation:

- Numeric input for Cruise level.
  - Tooltip: Info found from Cruise Ship Tab.
  - Some levels give echo count and echo multiplier which affect the value of those nodes.
- Numeric input for ticket price.
  - Tooltip: Info found from Overview Page.
- Numeric inputs for minimum and maximum guest spending.
  - Tooltip: Info found from Overview Page.
  - Average value should be used for evaluation.
- Numeric inputs for minimum and maximum room capacity.
  - Tooltip: Info found from Overview Page.
  - Average value should be used for evaluation.
- Numeric input for Groups Discount level.
  - Tooltip: Info found from Sun Upgrades Menu (top left corner).
  - Increases room capacity by 1.08x per level.
  - This is needed to calculate the base room capacity which is needed to evaluate the More Space node.
- Numeric input for Bunk Beds level.
  - Tooltip: Info found from Sun Upgrades Menu (top right corner).
  - Increases room capacity by 1.05x per level.
  - This is needed to calculate the base room capacity which is needed to evaluate the More Space node.

Maybe should how base value for each? That is excluding the nodes. This should make it easier to understand why "optimize" changes input values.

## Rules for evaluation

- For most nodes, can just calculate the next value.
  - Further value are expected to have less value.
- Some nodes are not available initially.
- Echo count and multiplier boost each other and their value can go up.
  - Could make three different ways to evaluate these nodes:
    - Just calculate the next value.
    - Iterate through possible combinations to see which is best.
    - Do same iteration for all nodes to see if results are different than just calculating the next value.

## Nodes

- Prestige Multiplier
  - Max 99 levels.
  - Each level gives additive +100% boost to both ticket price and guest spending.
  - Costs:
    - Level 1 cots 1 points.
    - Levels 2-10 cost 2 points each.
    - Levels 11-20 cost 3 points each.
    - Levels 21-30 cost 4 points each.
    - Levels 31-40 cost 5 points each.
    - Levels 41-50 cost 6 points each.
    - Levels 51-60 cost 7 points each.
    - Levels 61-70 cost 8 points each.
    - Levels 71-80 cost 9 points each.
    - Levels 81-90 cost 10 points each.
    - Levels 91-99 cost 11 points each.
- Ticket Price
  - Max 25 levels.
  - Each level gives multiplicative 1.4x boost to ticket price.
  - Costs:
    - Level 1 costs 2 points.
    - Levels 2-21 costs 2 points more than previous level. So level 21 costs 42 points.
    - Level 22 costs 64 points.
    - Level 23 costs 86 points.
    - Level 24 costs 108 points.
    - Level 25 costs 130 points.
- Guest Spending
  - Max 25 levels.
  - Each level gives multiplicative 1.35x boost to guest spending.
  - Costs:
    - Level 1 costs 2 points.
    - Levels 2-21 costs 2 points more than previous level. So level 21 costs 42 points.
    - Level 22 costs 64 points.
    - Level 23 costs 86 points.
    - Level 24 costs 108 points.
    - Level 25 costs 130 points.
- Particle Output
  - Max 20 levels.
  - Each level gives multiplicative 1.1x boost to particle output.
  - Valued as " 1 + Cruise level * 0.01" multiplier to ticket price and guest spending.
  - Costs:
    - Level 1 costs 2 points.
    - Levels 2-20 costs 1 points more than previous level. So level 20 costs 21 points.
- Max Offline Time Cap
  - Max 16 levels.
  - Each level gives 1 hour to the offline time cap.
  - Zero value.
  - Costs:
    - All levels cost 1 point each.
- Better Reviews
  - Max 10 levels.
  - Each level improves review rating.
  - Valued as multiplicative 1.03x boost to ticket price and guest spending.
  - Costs:
    - All levels cost 3 point each.
- More Space
  - Max 10 levels.
  - Each level increases room capacity by 1 (have to verify later).
  - Increase in room size is a multiplier to ticket price and guest spending. So the value depends on the current room capacity.
  - Costs:
    - Level 1 costs 15 points.
    - Levels 2-10 costs 3 points more than previous level. So level 10 costs 42 points.
- Echo Trigger Count
  - Requires cruise level 24 or 25 prestiges done.
  - Max 5 levels.
  - Each level gives 1 more echo trigger.
  - Cruise level 24 gives 1 trigger.
  - First upgrade always gives 2 triggers regardless of source.
  - Value depends on the echo multiplier.
  - Costs:
    - Level 1 costs 40 points.
    - Levels 2-5 costs 10 points more than previous level. So level 5 costs 80 points.
- Echo Multiplier
  - Requires cruise level 24 or 25 prestiges done.
  - Max 50 levels.
  - Default multiplier is 1.1x (maybe, have to correct at some point).
  - Each level gives increases echo multiplier by 0.1
  - Cruise level 25 gives 0.5 multiplier.
  - Value depends on the echo trigger count.
  - Costs:
    - Each level costs 30 points.

## Tooltips for nodes

"Particle Output
This is setup to increase in value as your Cruise Level increases (starting at 1.01x for Cruise Level 1 and increasing by +0.01 per level). This seems to roughly align with what I have calculated to be the actual bonus of the Sun Particle ingame.

Max Offline Time Cap
This is setup to provide a simple 1x bonus which means that it will only be recommended when you cannot afford any other upgrades. If you spend a lot of time offline and are exceeding your maximum offline time cap, this may be a good upgrade to spend in.

Better Reviews
During testing, I found that this upgrade seems to give either approximately 1.025x or 1.05x bonus per level depending on your circumstances. It was more common that this upgrade would provide the lower of these two bonuses, and I have therefore chosen to enter a fixed bonus of 1.03x per level.

More Space
This upgrade is typically only good for a single prestige when you have just unlocked Groups, or in the very late game when the Room Capacity benefits from a couple of multipliers in the Upgrades Menu. You may wish to skip this upgrade completely if it is recommended early on as it loses value quickly upon reaching Sun Upgrades which increase room capacity.

Echo Trigger Count & Echo Mult
Echos initially unlock in the mid-game after reaching Cruise Level 24 (or once you have achieved 25 fills via the Prestige Upgrade). Echos provide a new plinkies multiplier which repeats itself based on your Echo Trigger Count. The Echo bonuses start off relatively small and are increased as you progress your Cruise Level. As a result, these Echo upgrades will not be recommended until the multiplier has grown to a reasonable bonus in the late-game (Cruise Level 35+).
