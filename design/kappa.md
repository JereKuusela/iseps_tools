# Kappa Efficiency Calculator

## Page Structure

```
Page example
┌───────────────────────────────────────────────┐
│  Global Inputs                                │
│  [Kappa Income] [Current Kappa] [Current SE]  │
├───────────────────────────────────────────────┤
│  Cash                                         │
│  [ Base card ]        [ Counter card ]        │
├───────────────────────────────────────────────┤
│  AP                                           │
│  [ Base card ]        [ Counter card ]        │
├───────────────────────────────────────────────┤
│  GP / DC / Researches / DC Milestones         │
│  (same Base | Counter pattern)                │
├───────────────────────────────────────────────┤
├───────────────────────────────────────────────┤
│  DC Boost Comparison                          │
│  [AP Base] [AP Counter] [DC Base] [DC Counter]│
│  [Data Center Kappa]  [DC Sequencing]         │
└───────────────────────────────────────────────┘
```

1. Global inputs to feed calculations across all cards
    1. Kappa input (per h, per m, per s)
    2. Current Kappa
    3. Current SE
2. All singularity amp groups: Cash, AP, GP, DC, Researches, DC Milestones to compare base vs. counter upgrades
    1. Each group = Base/Counter pair
3. DC Boost Comparison section at the bottom

## Singularity Amp Groups

```
Card example
┌───────────────────────────┐
│  Cash Base                │
│                           │
│  Level         [ 73  ▲▼ ] │
│  ─────────────────────────│
│  Cost               1e100 │
│  Efficiency          100% │
│  Increase            1,23 │
│  Time left        10 Days │
└───────────────────────────┘
```

- Groups need: level, cost, efficiency, and time left at minimum. Absolute increase is also something that we could add (as multiplier "1,23" instead of percentage increase "23 %")
- Efficiency = absoluteEfficiency / max(allAbsoluteEfficiencies) * 100 %, where
  - absoluteEfficiency = ln(increase) / cost
- Cost should be level-driven by default but if we can't get the accurate cost calculated from level + perks, then cost is manual input, too
- Before the card is unlocked via SEs, grey it out and keep values at 0

## DC Boost Comparison

Comparing the potential DC boosts from Kappa

- AP/DC base/counter: mirrored live from the cards above, no separate input
- Inputs for
  - Data Center Kappa: manual Cost
  - DC Sequencing: manual Cost + "Sequence at 2/3?" checkbox
- Efficiency value for each item here between the DC boosts only

## Other notes

### Efficiency color coding

- Color-code efficiency on every card and DC comparison. Color could be just green for the best upgrade. Other ways to highlight are also fine.

## Effects

- Amplifiers:
  - Cash: Initial 1.3, +0.1 per level, multiplied by SE after 145 + counter + 1..
  - AP: Initial 1.12, +0.03 per level, multiplied by SE after 149 + counter + 1..
  - GP: Initial 1.2, +0.04 per level, multiplied by SE after 153 + counter + 1..
  - DC: Initial 1.18, +0.04 per level, multiplied by SE after 157 + counter + 1..
  - Researches: Initial ??, +0.?? per level, multiplied by SE after 161 + counter + 1.
  - DC Milestones: Initial ??, +0.?? per level, multiplied by SE after 165 + counter + 1.
- Genesis Pod: +0.001 to Kappa exponent.
  - Page should show somewhere actual multiplier to Kappa (like how Juno works),
- Data Center: x1.15 DC per Kappa upgrade, x1.1 DC per other upgrade.
- Sequencing: Various effects. Each upgrade improves next effect.
  - DC: x1.03, every 3th upgrade gives extra x1.15
  - GP: x1.03, every 4th upgrade gives extra x1.14
  - AP: x1.02, every 6th upgrade gives extra x1.12
  - Cash: x1.02, every 7th upgrade gives extra x1.10
  - SC: x1.02, every 9th upgrade gives extra x1.08
  - After fill (same as getting SC): x1.01 to all effects.

## Costs

- Amplifiers
  - Base costs
    - Level 1-5: x2
    - Level 6-10: x4
    - Level 11-20: x6
    - Level 21-30: x9
    - Level 31-40: x13.5
    - Level 41-50: x27
    - Level 51-??: x81
    - Cash: 50
    - AP: 1e6
    - GP: 1e25
    - DC: 1e43
    - Researches: Level 50 maybe 2.86e98
    - DC Milestones: 1e100
  - Counter costs
    - Level 1-5: x20
    - Level 6-10: x100
    - Level 11-15: x500
    - Level 16-20: x2500
    - Level 21-25: x12500
    - Level 26-30: x62500
    - Level 31-35: x1250000
    - Level 36-??: ???
    - Cash: 1e3
    - AP: 1e7
    - GP: 1e27
    - DC: 1e45
    - Researches: Level 20 maybe 9.74e99
    - DC Milestones: 1e110
- Genesis Pod
  - Alpha: e745, e3 per level
  - Beta: e888, 2e4 per level
  - Ceti: e930, 3e5 per level
  - Delta: e598, 4e6 per level
  - Epsilon: e942, 5e7 per level
  - Fenix: e790, 1e9 per level
  - Gamma: e886, 1.5e10 per level
  - Helion: e701 (then 2e757), 2e11 per level
    - Note: Helion has weird starting cost!
  - Ixion: e352, 5e12 per level
  - Juno: e150, 2e12 per level
  - All increase multiplier by e3 at level 4 and level 11.
    - For example Alpha level 4 costs e6 more than level 3.
- Data center
  - Each has own initial cost 1.0eXXX.
  - Levels 1-5 increase cost by e1, levels 6-10 increase cost by e2, levels 11-25 increase cost by e3, levels 26-50 increase cost by e4, levels 51+ increase cost by e5
  - Alpha: e750
  - Beta: e893
  - Ceti: e933
  - Delta: e633
  - Epsilon: e945
  - Fenix: e800
  - Gamma: e890
  - Helion: e700
  - Ixion: e360
  - Juno: e155
  - Kappa has different scaling
    - Competes with DC Amplifier and Sequencing
    - Initial cost: 100
    - Levels 1-10 increase cost by x1.4
    - At level 11, increase is multiplied by x1.05
    - At level 21, increase is multiplied by x1.1
    - At level 31, increase is multiplied by x1.1
    - At level 41, increase is multiplied by x1.1
    - At level 51, increase is multiplied by x1.15
    - At level 61, increase is multiplied by x1.2
    - At level 71, increase is multiplied by x1.3
    - At level 81, increase is multiplied by x1.4
    - At level 91, increase is multiplied by x1.5 (total increase per level is x7.37)
    - At level 101, increase is multiplied by x2
- Sequencing
  - Kappa initial cost: 2e07
  - Kappa multiplier: x1.5 per level
  - Levels 11, 21, 31 and 41 multiply multiplier by x1.25 (totl at level 41 is x3.66)
  - Level 51 multiplies multiplier by x2
  - Cash initial cost: e1200
  - Cash multiplier: e5 per level
  - Levels 11, 21, 31 and 41 multiply multiplier by e1 (total at level 41 is e9)
  - Level 51 behavior is unknown.

## Kappa exponent sources

- Research 131: +0.001
- DCM 89: +0.005
- DCM 104: +0.005
- DCM 105: +0.005
- Player level 950: +0.01
- OG tech 19: +0.005
- Crystal Meltdown bundle: +0.005

Other things:

- DCM 106: Amplifier costs /1.5
- DCM 107: Genesis Pod + Data Center costs /1.5
- DCM 108: Sequencing costs /1.5
- OG tech 16: Amplifier costs /1.01
- OG tech 17: Genesis Pod + Data Center costs /1.02
- OG tech 18: Sequencing costs /1.01
- Quantum Addon 21 (75 max levels): Amplifier costs /1.1
- Quantum Addon 22 (75 max levels): Genesis Pod + Data Center costs /1.5
- Quantum Addon 23 (50 max levels): Sequencing costs /1.1
- Crystal Sequencing bundle: +5 sequencing (one full cycle)
