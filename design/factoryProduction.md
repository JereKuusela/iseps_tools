# Factory production

Another calculator for factory event. This one is a manual production planner for profit and resource balance (no automatic optimizer yet).

## Basic idea

There are up to 5 fabricator resource outputs:

- SynthRubber (orange)
- Gravium (blue)
- Fluxstone (green)
- Nanofoam (purple)
- Netherstar (gray)

There are up to 4 manufacturers that can produce an item. But no need to limit them at just 4 for now.

Fabricators do not need to appear as entities in the UI.
Each resource is represented by a single output/sec input.
If Fabricator Output is greater than zero then that resource is enabled.
Manufacturers do not link to specific fabricators. Product selections define total demand, and demand is compared against total supply.

There are lots of different items with different costs and sell prices (order by base sell price).

- Rubber Duck: Household, 2.5 orange, 1 sell price.
- Battery: Electronics, 3 blue, 5 sell price.
- Bucket:  Household, 8 orange, 5 blue, 50 sell price.
- Gear: Industrial, 10 green, 100 sell price.
- USB_Z Cable: Electronics, 200 orange, 300 green, 1000 sell price.
- Bolt: Industrial, 200 green, 300 blue, 5000 sell price.
- Shocklate Bar: Consumables, 200 green, 800 orange, 400 blue, 50000 sell price.
- Instant Noodles: Consumables, 20000 purple, 25000 sell price.
- Energy Drink: Consumables, 2000 purple, 50000 orange, 250000 sell price.
- Hanger: Household, 3000 purple, 20000 blue, 1.25e6 sell price.
- Cooling Fan: Electronics, 2000 purple, 4000 green, 2.5e7 sell price.
- Yee Force S T X4190: Electronics, 3000 purple, 5000 green, 5000 orange, 2.5e8 sell price.
- Metal Pipe: Industrial, 2000 purple, 5000 blue, 5000 orange, 3000 green, 1.25e10 sell price.
- Quantum Server Core: Electronics, 10000 green, 1000 purple, 150000 blue, 1.25e9 sell price.
- Plunger: Household, 2000 purple, 5000 blue, 5000 orange, 1.25e7 sell price.
- Jelly Powder: Consumables, 10000 gray, 22500 sell price.
- Lava Lamp: Household, 10 gray, 1e6 orange, 225000 sell price.
- Alien Gum: Consumables, 10000 gray, 100000 blue, 1e6 orange, 1.13e7 sell price.
- Conveyor Belt: Industrial, 10000 gray, 1000 blue, 1e6 orange, 40000 green, 1.13e10 sell price.
- Smart Toilet: Household, 1e6 orange, 1e6 blue, 1e6 green, 1e6 purple, 1e6 gray, 2.81e15 sell price.
- Cat Tree: Household, 100000 orange, 1000 purple, 1e6 blue, 1e6 gray, 2.81e12 sell price.
- Cosmic Shake: Consumables, 10000 orange, 1000 gray, 15000 purple, 5.63e10 sell price.
- Shipping Container: Industrial, 100000 orange, 1000 purple, 1e6 green, 1e6 gray, 5.63e13 sell price.
- Drone: Electronics, 10000 orange, 1000 grey, 15000 green, 2.25e8 sell price.
- Hydraulic Piston: Industrial, 10 grey, 1e6 green, 2.25e7 sell price.
- Bean Bag Chair: Household, 10000 grey, 100000 green, 1e6 blue, 1.13e9 sell price.
- Glow Soup: Consumables, 100000 grey, 1000 green, 1e6 blue, 1e6 purple, 2.81e14 sell price.
- Camera Lens: Electronics, 10 grey, 1e6 blue, 1.13e6 sell price.
- Massage Recliner: Household, 10000 blue, 1000 grey, 15000 purple, 2.81e11 sell price.
- Burger: Consumables, 10 grey, 1e6 purple, 5.63e9 sell price.
- Flex Box360: Electronics, 10000 grey, 1000 purple, 1e6 green, 5.63e12 sell price.

Final sell price is affected 3 things:

- Additive base sell price. Not listed any where.
  - "24 hour shifts" upgrade increases by 1.
  - "Quality Control" upgrade increases by 10 per level (up to 20 levels).
- Global sell multiplier.
- Product category specific multiplier (Household, Electronics, Industrial, Consumables).

## UI

Challenge is how users inputs the values. Best idea for product prices probably is:

- Checkbox for "24 hour shifts" upgrade (tooltip explaining that found from Upgrades tab).
- Input for "Quality Control" upgrade level (tooltip explaining that found from Upgrades tab).
- Input for global sell multiplier (tooltip explaining that found from Stats).
- Inputs for each product category multiplier (tooltip explaining that found from Stats).

Then also need:

- Inputs for each resource output per second (tooltip explaining that found from Stats).

Then manufacturers with plus/minus button on right to add/remove.

When a manufacturer is selected, show products on overlay or dropdown that allows selecting them. A table format can show details and final sell price after multipliers.

Statistics showing how much each product is being produced, how much profit it is generating, and resource required/sec vs supplied/sec to highlight surplus.

## Optimizer

1. Filter out products that require resource that is not enabled.
2. Calculate base value for each resource from the item that only needs that resource.
3. Calculate sell value / resource value for each product.
4. Filter out products that are not profitable (sell value < resource value).
5. Select most profitable product.
6. Check which resource is the bottleneck. Find most profitable product that doesn't use bottlenecked resources.
7. Compare profits. Selecting another product can lower profits from the first product. Skip new product if needed.
8. Check second bottlenecked resource. Repeat step 6 and 7.

Notes: Each resource can only be used 3 times. After that must filter out those products.
