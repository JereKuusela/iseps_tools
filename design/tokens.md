# Token spending guide

Combination of various guides.

- Most resources have output, supplies and BB-Bot upgrades.
  - Output and BB-bot can simply calculate which one is better.
  - Supplies depends on active hours per day.
- Gamma supplies and BB-Bot unlock at SE90; Helion supplies and BB-Bot unlock at SE80.
- Calculator needs value for each resource to calculate best upgrade (per token cost).
  - Should have input for tokens per step (cost-based buckets for all upgrades) so that recommendation doesn't change all the time.
- Compare token-income upgrades by extra tokens per day and purchase cost. Crystals and resource output need a separate progression valuation.

## Calculations

- Output gives 1% additive boost until 1000 levels, then 1% multiplicative boost until maxed at 1800 levels.
  - Early levels after 1000 are more valuable than before 1001.
  - Regular upgrade scores retain the guide target scale, averaging immediate and long-term estimates where applicable.
- Resource Supplies give 2 seconds of extra production time per level per claim. Cash has 240 levels; other available resources have 95.
- BB-Bot gives 1% additive boost per level. Cash has 200% baseline, others start from 100%. Cash has 400 levels, others have 150 levels.

## Cooldowns and Rewards

- Supplies use a 7-minute interval (420 seconds, as listed for Supply Bot in the [premium notes](premium.md)). Each Supplies Tokens level adds 0.1 tokens per claim (1 base, 25 levels); each Supplies Crystals level adds 1 crystal per claim (2 base, 8 levels). Use the actual claims per day when estimating the gain.
- BB-Bot runs last 20 minutes at base. Each Duration level adds 1 minute and 0.05 tokens per run, up to 60 minutes and 3 tokens per run at level 40. Longer runs mean fewer triggers, so Duration alone does not increase daily rewards.
- BB-Bot Tokens unlocks at Duration 40 and adds 0.5 tokens per run per level (20 levels). When comparing token income before it unlocks, include the cost of the remaining Duration levels in the investment.

## Special Recommendations

- Special scores compare the extra token-equivalent reward per active hour to the purchase cost, assuming rewards are collected as soon as ready. Duration is scored using the best bundle of remaining Duration levels and subsequent BB-Bot Tokens levels, not as standalone income.
- Supplies Crystals uses a fixed planning weight of 5 tokens per crystal in the generated scores. This is a tuning assumption, not the in-game exchange rate.
- Generated special scores are rounded to whole numbers. Regular upgrade scores keep their existing precision.
- Supplies Crystals level 1 is calibrated between the scores of Alpha Output levels 50 and 51, so upgrades as valuable as Alpha 50 still come first. This reference stays fixed as the player buys upgrades.
- Other special levels use that calibration to translate their reward per cost into equivalent Alpha output efficiency, then interpolate the existing guide score at that point. Special scoring does not change regular upgrade scores.
- Best Next can recommend a special. Best Special offers the next single special level when it differs from Best Next, even if it falls outside the main shortlist.

## Costs

All costs are in tokens. [Upgrade definitions](../data/token_upgrade_definitions.json) are the source of truth for cost formulas; the [generated level table](../data/token_upgrade_levels.csv) lists the cost and cumulative cost for every level.

| Upgrade | Level 1 | Increase per level | Final level | Total to max |
| --- | ---: | ---: | ---: | ---: |
| Supplies Tokens | 25 | 15 | 385 | 5,125 |
| Supplies Crystals | 200 | 300 | 2,300 | 10,000 |
| BB-Bot Duration | 1 | 1 | 40 | 820 |
| BB-Bot Tokens | 10 | 25 | 485 | 4,950 |

From scratch, maxing Duration and buying the first BB-Bot Tokens level costs 830 tokens. The BB-Bot Tokens total in the table excludes Duration.

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
- Numeric input for tokens per step.
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
