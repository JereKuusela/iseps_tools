# Factory

Factory prestige calculator is similar to the cruise prestige calculator.

At minimum these inputs are needed:

- Numeric input for amount of prestiges done.
  - Tooltip: Info found from Prestige Menu / Statistics.
  - Used to calculate amount of points.
  - First prestige gives 1 point.
  - Each prestige gives 1 point more than the previous prestige. So 2nd prestige gives 2 points, 3rd gives 3 points, etc.
- Prestige nodes with the current level.
  - Used to calculate amount of used points.
  - Used to calculate the next best node.
  - Copy from cruise prestge calculator.
  - Best option could be highlighted somehow.
- Display of total points, points used and points available.
- Action buttons to buy next best upgrade, spend all points, reset all nodes or optimize.
  - Optimize would reset nodes and their effect, then spend points optimally.
- Prestige notation: Each node amount separated by /.

Then additional inputs are needed for evaluation:

- Numeric input for total particle level.
  - Tooltip: Info found from prestige Tab.
  - Affects one of the prestige nodes.

## Rules for evaluation

- For most nodes, can just calculate the next value.
  - Further value are expected to have less value.
- Some nodes are not available initially.
- Cooldown reduction becomes more effective, but have to check if costs are worth it.

## Nodes

- Fabricator Output
  - Must buy first level before any other nodes.
  - Max 100 levels.
  - Each level gives additive +100% boost to output.
    - Costs:
      - Possibly each 10 levels cost 1 point more than previous 10 levels (with first 19 just 1 point).
      - So level 1-20 cost 1 point, level 21-30 cost 2 points, level 31-40 cost 3 points, etc.
- Sell Value
  - Max 50 levels.
  - Each level gives multiplicative 1.5x boost to sell price.
  - Costs:
    - 2,2,2,2,2,
      2,2,2,2,2,
      3,3,3,4,4,
      5,5,6,6,7,
      8,9,10,11,12,
      13,14,16,17,19,
      21,23,26,28,31,
      34,38,42,46,51,
      56,61,68,74,82,
      90,99,109,120,132
- Particle Output
  - Max 5 levels.
  - First level gives x1.011 particle output for each particle level (multiplicative).
  - Next levels increase the multiplier by 0.002. So next level gives x1.013, then x1.015, etc.
  - Costs:
    - 5, 12, 24, 47, 86
- Fabricator Speed
  - Max 19 levels.
  - Each level reduces fabricator cooldown by additive 5%.
  - Further levels have more effect (last level from -90% to -95% halves the cooldown).
  - Probably have to calculate effect of every level to get the best value.
  - Costs:
    - 2,2,3,3,4,4,6,8,10,12,14,18,22,26,30,34,41,48,100
- Max Offline Time Cap
  - Max 16 levels.
  - Each level gives 1 hour to the offline time cap.
  - Zero value.
  - Costs:
    - All levels cost 1 point each.

## Evaluation

Nodes give 3 distinct upgrades:

- Particle output
- Sell price
- Production output

Production output is always more valuable than sell price (as more production means more sold items). Particle output is bit of a question.

Sell price should be base line. Then slider inputs to adjust the relative value of particle output and production output.

Production output could have 6 steps from 0% to 50% in 10% increments. Particle output could have 7 steps from -30% to +30% in 10% increments. The default value for production could be 10% and 0% for particle.
