# Token spending guide

Combination of various guides.

- Most resources have output, supplies and BB-Bot upgrades.
  - Output and BB-bot can simply calculate which one is better.
  - Supplies depends on active hours per day.
- Some resources have supplies and BB-Bot initially disabled.
- Calculator needs value for each resource to calculate best upgrade (per token cost).
  - Should have input for granularity (like every 50 levels) so that recommendation doesn't change all the time.
- There are unique upgrades that can't be directly valued.
  - Needs some reasonable estimation to balance short and long term progression.
  - These have 0 short term value and high long term value.

## Calculations

- Output gives 1% additive boost until 1000 levels, then 1% multiplicative boost until maxed at 1800 levels.
  - Early levels after 1000 are more valuable than before 1001.
  - Should calculate initial value and long term value for each level.
    - This could be included in JSON data as fixed data.
    - UI can have slider to balance between short term and long term value.
- Supplies give X seconds of extra time per level, percentage calculated from cooldown and hours per day. Cash has 240 levels, others have 2 levels.
  - SC calculator has input for this. Should reuse the same value and logic to calculate extra time per day.
  - SC calculator also has input for Alpha supply level that should be reused.
- BB-Bot gives 1% additive boost per level. Cash has 200% baseline, others start from 100%. Cash has 400 levels, others have 150 levels.
- Supply extra tokens has 25 levels (1 base, then +0.1 per level).
- Supply extra crystals has 8 levels (2 base, then +1 per level).
- BB-Bot extra duration has 40 levels (20 min base, +1 min per level + 0.05 token per level).
- BB-Bot extra tokens has 20 levels (1 base, +0.5 per level).
  - Must max duration before this is available.

## Costs

- Alpha level 1 costs 1, +0.01 per level, level 1000 costs 10.99
- Alpha level 1001 costs 11, +3 per level.
- Other particles and Cash have same costs as Alpha.
- Juno level 1 costs 10, +0.05 per level, level 1000 costs 59.95
- Juno level 1001 costs 150, +5 per level.
- Kappa level 501 costs 100, +0.1 per level. Level 1 cost must be calculated.
- Kappa level 1001 costs 500, +10 per level.

- Supply token and crystal not known. Use 1.
- Cash level 32 costs 13.4, +0.4 per level.
- Alpha level 10 costs 80, +8 per level.
- Beta level 10 costs 11, +1 per level.
- Ceti level 12 costs 10.8, +0.8 per level.
- Delta level 7 costs 28, +4 per level.
- Epsilon level 17 costs 10, +0.5 per level.
- Fenix level 18 costs 10.5, +0.5 per level.
- Gamma level 6 costs 12, +2 per level.
- Helion level 5 costs 18, +4 per level.
- Ixion, Juno and Kappa not available.

- BB-Bot duration and token not known. Use 1.
- Cash level 110 costs 64.5, +0.5 per level.
- Alpha not known. Probably same as Delta.
- Beta level 21 costs 30, +1 per level.
- Ceti level 21 costs 20, +0.5 per level.
- Delta level 61 costs 70, +1 per level.
- Epsilon level 21 costs 20, +0.5 per level.
- Fenix level 21 costs 20, +0.5 per level.
- Gamma level 61 costs 70, +1 per level.
- Helion level 21 costs 30, +1 per level.
- Ixion, Juno and Kappa not available.

## Inputs

- Numeric inputs for output level for each resource (Cash, Alpha, Beta, Ceti, Epsilon, Fenix, Gamma, Helion, Juno, Kappa).
  - Each input should have checkbox to disable the input (and remove it from suggestions).
  - ZAT guide has input for Juno output. Same value should be used.
- Numeric inputs for supplies level for each resource (except Ixion, Juno and Kappa).
  - Each input should have checkbox to disable the input (and remove it from suggestions).
  - SC calculator has input for Alpha supply level. Same value should be used.
- Numeric inputs for BB-Bot level for each resource (except Ixion, Juno and Kappa).
  - Each input should have checkbox to disable the input (and remove it from suggestions).
- Numeric input for supplies crystal boost.
- Numeric input for supplies token boost.
- Numeric input for BB-bot duration boost.
- Numeric input for BB-bot token boost.
- Numeric input for granularity.
- Numeric input for hours per day.
  - SC calculator has input for this. Same value should be used.

## Resource valuess

The idea of data below is to return which particle tokens has the most value.

As there are breakpoints, need to extrapolate from the previous tier.

Alpha Juno Kappa Gamma Delta Ixion
350   350   250   250   250   200
1100  1200  325   675   600   475
1150  1325  425   850   750   600
1200  1450  550   975   875   700
1250  1550  625  1042   975   800
1300  1650  700  1051  1038   875
1350  1775  775  1060  1045   950
1400  1800  850  1070  1052  1035

Alpha Beta Fenix Helion Cash Ceti Epsilon
 350   200  200   250   350  200  200
 1100  400  400   275   275  200  200
 1150  525  500   375   350  225  200
 1200  600  600   425   425  275  250
 1250  675  675   500   475  325  275
 1300  750  750   550   525  350  325
 1350  825  800   600   575  400  350
 1400  875  875   650   625  425  375
