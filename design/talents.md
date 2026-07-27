# Talents

Talent guide shows which talents to take for each level point.

## UI

- Input for SE (might make sense to have a dropdown at specific levels).
  - Have to check based on data what SE exactly does.
- Input for amount of level points.
- Input for run type (currently only SE Push is supported)
- Checkbox if "G-Corp multiplier maxed"
  - Probably deprioritizes upgrades giving gamma.
- Label for excess level points (if any).
- Label for "Useful notes" (probably depends on SE).
- Guide table has two sides: "Pioneering Particulator" and "Interplanetary Contractor".
  - Both have label showing total amount spent on each side.
- Each table is 3x6 grid (similar to ZAT guide but actual grid).

## Left side

- PP1-1, PP1-2, EMPTY
- PP2-1, PP2-2, PP2-3
- PP3-1, PP3-2, PP3-3
- EMPTY, PP4-1, EMPTY
- PP5-1, PP5-2, PP5-3
- PP6-1, PP6-2, PP6-3

Connections (two-sided but just one side listed):

- PP1-1 connects to PP2-1
- PP1-2 connects to PP2-2
- PP2-2 connects to PP2-3 and PP3-2
- PP3-2 connects to PP3-3
- PP3-3 connects to PP3-2
- PP3-2 connects to PP4-1
- PP4-1 connects to PP5-1, PP5-2 and PP5-3
- PP5-1 connects to PP6-1
- PP5-2 connects to PP6-2
- PP5-3 connects to PP6-3

## Right side

- IC1-1, EMPTY, IC2-2
- IC2-1, IC2-2, IC2-3
- IC3-1, IC3-2, IC3-3
- EMPTY, IC4-1, EMPTY
- IC5-1, IC5-2, IC5-3
- IC6-1, IC6-2, IC6-3

Connections (two-sided but just one side listed):

- IC1-1 connects to IC2-1
- IC1-2 connects to IC2-3
- IC2-1 connects to IC3-1
- IC2-2 connects to IC3-2
- IC2-3 connects to IC3-3
- IC3-1 connects to IC3-2
- IC3-2 connects to IC3-3 and IC4-1
- IC4-1 connects to IC5-1, IC5-2 and IC5-3
- IC5-1 connects to IC6-1
- IC5-2 connects to IC6-2
- IC5-3 connects to IC6-3

## Calculator

If g-corp maxed, should deprioritize PP1-1, PP2-1 and PP5-2 (but take if other filled).
