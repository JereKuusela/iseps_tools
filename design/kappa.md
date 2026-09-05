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
