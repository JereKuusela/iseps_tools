# SC

This tool is a port from a Google sheet.

Goal of the tool is calculate how long it takes to reach certain amount of SC resource.

## UI

Left side has inputs:

- Numeric input for current SE.
- Dropdown for time zone. Might not be needed if can just use local time?
- Numeric input for DC cost of the next SC goal.
- Numeric input for current DC amount.
- Numeric input for DC gains per minute/hour/day (unit can be changed).
- Section for replicators.
  - Numeric inputs for "Time in SE" (days, hours, minutes).
  - Numeric input for retained DC replicator (from 1.00).
  - Numeric input for retained SE replicator (from 1.00).
  - Display for total replicator boost.
- Section for time skips.
  - Numeric input for Small, Medium and Large time.
  - Display for total time skip (small is 3 minutes, medium is 5 minutes and large is 12 minutes).
- Numeric input for Online Hours/Day.
  - Tooltip: For every hour of online time:
    - Small chests skip 20 minutes
    - Large chests skip 18 minutes
    - After 10 hours, chests will be MAXED
    - That means for the first 10 hours of online play, every 1 hour counts for 1 hour 38 minutes
- Numeric input for Alpha Supplies Level.
- Section for future boosts.
  - Numeric input for DC boost (percentage from 0%).
  - Numeric input for SC boost (percentage from 0%).

Right side shows the results. Initially there are two panels. Second panel can be closed but first one cannot. More panels can be added by clicking a button.

Each panel has:

- Type of goal: Battery 1, Battery 2, Battery 3, Custom SC, Custom DC.
  - When selecting goal that is already open, panels are swapped.
  - Custom SC and DC also show input for the custom goal.
- First section:
  - DC cost of the goal.
  - Total time to reach the goal (unit changes automatically).
  - Progress towards the goal in percentage (current DC / goal DC).
- Second section:
  - Remaining time to reach the goal (unit changes automatically).
  - Timestamp for when the goal will be reached (date and time).
- Third section (only if any time skips):
  - Remaining time to reach the goal (unit changes automatically).
  - Timestamp for when the goal will be reached (date and time).
- Fourth section (Projected Values):
  - Projected progress percentange (current DC / projected DC cost).
  - Projected DC cost of the goal.
  - Projected SC Gained from reaching the goal (or from current DC amount, whichever is higher).
  - Projected Daily Boost at end of goal.
  - Projected SC replicator boost at end of goal.
  - Projected DC replicator boost at end of goal.
- Right side of the panel shows vertical progress bar tracking the projected progress.

## Data

DC Replicator boost is calculated as:

- Before 12 hours in SE: Always 1.00 (no boost).
- Before SE 110: 1.11 + 0.0000229*X + 0.0000000118*X^2 where X is minutes.
- Otherwise: 1.11 + 0.0000248*X +  0.0000000156*X^2.
- Retained is added additively.

SE Replicator boost is calculated as:

- Before SE 120: 0.0003 * floor(I5/15).
- Otherwise: 0.0004 * floor(I5/15).
- Retained is added additively.
- Boosts caps at x2 before SE 120 and x4 otherwise.

Daily boost is calculated as:

- Before SE 118: Multiplicative boost of 1.01 per day.
- Otherwise: Multiplicative boost of 1.02 per day.
- Only used for projected, so based on the time to reach the goal.

Battery cost is calculated as:

- SC needed is 10^SE.
- SC formula before SE 100: SC = "sc multipliers" *("DC" / 1e14) ^ (0.1754 - ("SE"^2.13* 3 / 1e6)).
- Otherwise: SC = "sc multipliers" *("DC" / 1e14) ^ (1 / (0.1754 + "SE"^1.25* 0.026)).
- For DC cost, have to reverse the formula.
- Battery 2 is calculated by just simply increasing SE by 1.
- Battery 3 is calculated by just simply increasing SE by 2.
- After certain SE, extra multiplier is applied to the final DC Cost:
  - The multiplier is applied to the current SE and all future SE.
  - From SE 120: e5 multiplier.
  - From SE 153: e2 multiplier.
  - From SE 156: e2 multiplier.
  - From SE 160: e3 multiplier.
  - From SE 163: e3 multiplier.

Time to reach the goal is calculated as:

- There is no direct formula, so have to use logarithmic binary search.
- If time skips are considered, do this before the search:
  - Calculate total minutes.
  - Increase current DC based on skipped and DC gains.
  - This works because DC boosts apply to both current and gain.
- First calculate minutes needed based on DC goal, current DC and DC gain.
  - Set minimum guess to 0 and maximum guess to calculated minutes.
  - Next guess is (max-min)/(LN(max)-LN(min)).
    - For LN, values must be capped to be at least 1.
- Calculate replicators and daily boost based on the next guess.
  - Decrease goal DC based on how much SC replicator increased.
    - Note: For custom DC goal, this step is skipped.
  - Increase current DC and DC gain based on how much DC replicator and daily boost increased.
- Calculate minutes needed based on the new values.
- If calculated is same minute or within 0.1% of the previous guess, then use that as the final time.
  - Otherwise, update the minimum or maximum guess based on whether the calculated minutes is higher or lower than the next guess and repeat the process.

SC gained is calculated as:

- First calculate raw SC gained based on projected DC and the SC formula.
  - Note: Use current SE for all goals, even for battery 2 and 3.
- Calculate revised SE: (LOG10("SC gained")+"SE")/2
  - Note: Can't be lower than current SE.
- Calculate final SC gained based on the revised SE and the SC formula.
  - Note: Used SC formula depends on the initial SE.

DC of custom SC goal requires binary search:

- Set goal as minimum guess.
- Calculate revised SE based on the custom SC goal and current SE.
- Calculated actual gained SC.
- If within 0.1% of the target, then use that as the final DC goal.
- If less than target, set previous guess as minimum guess, otherwise set previous guess as maximum guess and repeat the process.
  - While maximum is unknown, multiply current guess by 10 until upper bound is found.
  - Otherwise use average: (min + max) / 2
