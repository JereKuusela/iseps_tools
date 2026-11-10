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

## Costs

- Amplifiers
- Genesis Pod
  - Note: Helion has weird starting cost!
- Data center
  - Each upgrade gives x1.15 DC
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
