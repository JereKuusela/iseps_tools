import { Show } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import {
  CheckboxField,
  DisplayField,
  IntegerField,
  NumberField,
  NumberRangeField,
} from "../../components/ui/formControls"
import { useCruiseContext } from "./cruiseContext"

export const CruiseLeftColumn = () => {
  const cruise = useCruiseContext()

  return (
    <>
      <InfoCard>
        <div class="grid gap-1">
          <IntegerField
            label="Prestige fills"
            value={cruise.prestigesDone()}
            onInput={cruise.setPrestigesDone}
            min={0}
            step={1}
            tooltip="cruise.prestiges"
          />
          <DisplayField
            label="Points"
            tooltip="cruise.points"
            value={`${cruise.availablePoints()} / ${cruise.totalPoints()}`}
          />
          <CheckboxField label="Advanced mode" checked={cruise.advancedMode()} onChange={cruise.setAdvancedMode} />
        </div>
      </InfoCard>

      <Show when={cruise.advancedMode()}>
        <InfoCard title="Base values">
          <div class="grid gap-1">
            <IntegerField
              label="Cruise level"
              value={cruise.cruiseLevel()}
              onInput={cruise.setCruiseLevel}
              min={0}
              step={1}
              tooltip="cruise.level"
            />
            <NumberField label="Ticket Price" value={cruise.baseTicketPrice()} onInput={cruise.setBaseTicketPrice} />
            <NumberRangeField
              label="Guest Spending"
              minValue={cruise.baseGuestMin()}
              maxValue={cruise.baseGuestMax()}
              onMinInput={cruise.setBaseGuestMin}
              onMaxInput={cruise.setBaseGuestMax}
            />
            <NumberRangeField
              label="Room Capacity"
              minValue={cruise.baseRoomMin()}
              maxValue={cruise.baseRoomMax()}
              onMinInput={cruise.setBaseRoomMin}
              onMaxInput={cruise.setBaseRoomMax}
            />
          </div>
        </InfoCard>
      </Show>
    </>
  )
}
