import { For, Show, createEffect, createMemo, createSignal } from "solid-js"
import { IntegerField, NumberField } from "../../components/ui/formControls"
import { CRUISE_NODE_DEFINITIONS, emptyCruiseNodeLevels, type CruiseNodeId, type CruiseNodeLevels } from "./cruiseTypes"
import { useCruiseContext } from "./cruiseContext"
import {
  calculateBaseValuesFromInput,
  calculateEffectiveValuesDetailed,
  type BaseValues,
} from "../../lib/cruiseCalculator"

type CruiseSetupModalProps = {
  open: boolean
  onClose: () => void
}

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const parseFiniteInput = (value: string): number | null => {
  if (value.trim() === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

const toInputString = (value: number) => {
  if (!Number.isFinite(value)) return "0"
  if (Math.abs(value) >= 1_000_000) return value.toExponential(6).replace("+", "")
  const rounded = Math.round(value * 1_000_000) / 1_000_000
  return rounded.toString()
}

export const CruiseSetupModal = (props: CruiseSetupModalProps) => {
  const cruise = useCruiseContext()

  const [setupTicketPrice, setSetupTicketPrice] = createSignal("1")
  const [setupGuestMin, setSetupGuestMin] = createSignal("1")
  const [setupGuestMax, setSetupGuestMax] = createSignal("1")
  const [setupRoomMin, setSetupRoomMin] = createSignal("1")
  const [setupRoomMax, setSetupRoomMax] = createSignal("1")
  const [setupGroupsDiscountLevel, setSetupGroupsDiscountLevel] = createSignal("0")
  const [setupBunkBedsLevel, setSetupBunkBedsLevel] = createSignal("0")
  const [setupNodeLevels, setSetupNodeLevels] = createSignal<CruiseNodeLevels>(emptyCruiseNodeLevels())

  const initializeSetup = () => {
    const currentLevels = { ...cruise.nodeLevels() }
    setSetupNodeLevels(currentLevels)
    setSetupGroupsDiscountLevel(cruise.groupsDiscountLevel())
    setSetupBunkBedsLevel(cruise.bunkBedsLevel())

    // Get base values from context
    const baseValues: BaseValues = {
      ticket: Math.max(1, parseNumberish(cruise.baseTicketPrice())),
      guestMin: Math.max(0, parseNumberish(cruise.baseGuestMin())),
      guestMax: Math.max(0, parseNumberish(cruise.baseGuestMax())),
      roomMin: Math.max(1, parseNumberish(cruise.baseRoomMin())),
      roomMax: Math.max(1, parseNumberish(cruise.baseRoomMax())),
    }

    // Game shows base values for ticket price and guest spending
    // Only room capacity needs conversion for display
    const mockInput = {
      prestigesDone: 0,
      cruiseLevel: 1,
      ticketPrice: 1,
      guestSpendingMin: 1,
      guestSpendingMax: 1,
      roomCapacityMin: 1,
      roomCapacityMax: 1,
      groupsDiscountLevel: parseNumberish(cruise.groupsDiscountLevel()),
      bunkBedsLevel: parseNumberish(cruise.bunkBedsLevel()),
    }
    const effectiveValues = calculateEffectiveValuesDetailed(mockInput, baseValues, currentLevels)

    setSetupTicketPrice(toInputString(baseValues.ticket))
    setSetupGuestMin(toInputString(baseValues.guestMin))
    setSetupGuestMax(toInputString(baseValues.guestMax))
    setSetupRoomMin(toInputString(effectiveValues.roomMin))
    setSetupRoomMax(toInputString(effectiveValues.roomMax))
  }

  const closeSetup = () => {
    // Game shows base values for ticket and guest spending (no conversion needed)
    // Only room capacity values need conversion from effective to base
    const baseTicketPrice = parseNumberish(setupTicketPrice())
    const baseGuestMin = parseNumberish(setupGuestMin())
    const baseGuestMax = parseNumberish(setupGuestMax())
    const effectiveRoomMin = parseNumberish(setupRoomMin())
    const effectiveRoomMax = parseNumberish(setupRoomMax())

    // Calculate base room values using centralized function
    const mockInput = {
      prestigesDone: 0,
      cruiseLevel: 1,
      ticketPrice: 1,
      guestSpendingMin: 1,
      guestSpendingMax: 1,
      roomCapacityMin: effectiveRoomMin,
      roomCapacityMax: effectiveRoomMax,
      groupsDiscountLevel: parseNumberish(setupGroupsDiscountLevel()),
      bunkBedsLevel: parseNumberish(setupBunkBedsLevel()),
    }
    const baseValues = calculateBaseValuesFromInput(mockInput, setupNodeLevels())

    // Update context with new values and node levels
    cruise.setBaseTicketPrice(Math.max(1, baseTicketPrice).toString())
    cruise.setBaseGuestMin(Math.max(0, baseGuestMin).toString())
    cruise.setBaseGuestMax(Math.max(0, baseGuestMax).toString())
    cruise.setBaseRoomMin(Math.max(1, baseValues.roomMin).toString())
    cruise.setBaseRoomMax(Math.max(1, baseValues.roomMax).toString())
    cruise.setGroupsDiscountLevel(Math.max(0, Math.floor(parseNumberish(setupGroupsDiscountLevel()))).toString())
    cruise.setBunkBedsLevel(Math.max(0, Math.floor(parseNumberish(setupBunkBedsLevel()))).toString())
    cruise.setNodeLevels(setupNodeLevels())

    props.onClose()
  }

  createEffect(() => {
    if (!props.open) return
    initializeSetup()
  })

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-x-0 top-20 z-50 flex items-center justify-center bg-ink/45 p-3 pb-20 backdrop-blur-[1px]"
        role="presentation"
        tabIndex={-1}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeSetup()
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            closeSetup()
          }
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Cruise setup"
          class="w-full max-w-3xl rounded-2xl border border-ink/15 bg-[#f6f9ff] p-3 shadow-2xl dark:border-white/20 dark:bg-[#142236]"
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Setup</h3>
            <button
              type="button"
              class="rounded border border-ink/20 bg-white px-2 py-1 text-xs font-bold text-ink transition hover:bg-ink/5 dark:border-white/20 dark:bg-[#233752] dark:text-white dark:hover:bg-[#2f496b]"
              onClick={closeSetup}
            >
              Done
            </button>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
              <h4 class="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
                Current values
              </h4>
              <div class="grid gap-1.5">
                <NumberField label="Ticket price" value={setupTicketPrice()} onInput={setSetupTicketPrice} min={0} />
                <NumberField label="Min guest" value={setupGuestMin()} onInput={setSetupGuestMin} min={0} />
                <NumberField label="Max guest" value={setupGuestMax()} onInput={setSetupGuestMax} min={0} />
                <NumberField label="Min capacity" value={setupRoomMin()} onInput={setSetupRoomMin} min={0} />
                <NumberField label="Max capacity" value={setupRoomMax()} onInput={setSetupRoomMax} min={0} />
                <IntegerField
                  label="Groups discount"
                  value={setupGroupsDiscountLevel()}
                  onInput={setSetupGroupsDiscountLevel}
                  min={0}
                  step={1}
                  tooltip="cruise.groupsDiscount"
                />
                <IntegerField
                  label="Bunk beds"
                  value={setupBunkBedsLevel()}
                  onInput={setSetupBunkBedsLevel}
                  min={0}
                  step={1}
                  tooltip="cruise.bunkBeds"
                />
              </div>
            </div>

            <div class="rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
              <h4 class="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
                Current nodes
              </h4>
              <div class="grid gap-1.5">
                <For each={CRUISE_NODE_DEFINITIONS}>
                  {(node) => (
                    <IntegerField
                      label={node.label}
                      value={String(setupNodeLevels()[node.id])}
                      onInput={(next) => {
                        const parsed = parseNumberish(next)
                        const clamped = Math.min(node.maxLevel, Math.max(0, Math.floor(parsed)))
                        setSetupNodeLevels((previous) => ({ ...previous, [node.id]: clamped }))
                      }}
                      min={0}
                      max={node.maxLevel}
                      step={1}
                    />
                  )}
                </For>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Show>
  )
}
