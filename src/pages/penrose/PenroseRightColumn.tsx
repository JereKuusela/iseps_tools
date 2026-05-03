import { StatTile } from "../../components/layout/StatTile"

type PenroseRightColumnProps = {
  goalCycle: number
  goalCost: string
  etaLabel: string
}

export const PenroseRightColumn = (props: PenroseRightColumnProps) => {
  return (
    <section class="grid gap-3 sm:grid-cols-3">
      <StatTile label="Goal" value={`Cycle ${props.goalCycle}`} class="dark:bg-[#253a56]" />
      <StatTile label="Cost" value={props.goalCost} class="dark:bg-[#253a56]" />
      <StatTile label="ETA" value={props.etaLabel} class="dark:bg-[#253a56]" />
    </section>
  )
}
