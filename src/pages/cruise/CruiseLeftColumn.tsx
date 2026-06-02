import { createEffect, createMemo, createSignal } from "solid-js"
import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import { IntegerField, blurOnEnterOrEscape } from "../../components/ui/formControls"
import { getTotalPointsFromPrestiges } from "../../lib/cruiseCalculator"
import { CRUISE_NODE_DEFINITIONS, emptyCruiseNodeLevels, type CruiseNodeId, type CruiseNodeLevels } from "./cruiseTypes"
import { useCruiseContext } from "./cruiseContext"
import { CruiseSetupModal } from "./CruiseSetupModal"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const formatValue = (value: number, digits = 2) => {
  if (!Number.isFinite(value)) return "0"
  if (Math.abs(value) >= 1_000_000) return value.toExponential(2).replace("+", "")
  if (Math.abs(value) >= 1_000) return value.toLocaleString(undefined, { maximumFractionDigits: digits })
  return value.toFixed(digits)
}

const notationOrder = CRUISE_NODE_DEFINITIONS.map((node) => node.id)
const nodeById = CRUISE_NODE_DEFINITIONS.reduce(
  (lookup, node) => {
    lookup[node.id] = node
    return lookup
  },
  {} as Record<CruiseNodeId, (typeof CRUISE_NODE_DEFINITIONS)[number]>,
)

const toShortNotation = (levels: CruiseNodeLevels) => {
  const values = notationOrder.map((id) => levels[id])

  while (values.length > 1 && values[values.length - 1] === 0) {
    values.pop()
  }

  return values.join("/")
}

const parseNotation = (raw: string): CruiseNodeLevels => {
  const next = emptyCruiseNodeLevels()
  const chunks = raw
    .split("/")
    .map((entry) => entry.trim())
    .filter((entry, index, all) => entry.length > 0 || index < all.length - 1)

  for (let index = 0; index < notationOrder.length; index += 1) {
    const id = notationOrder[index]
    const rawLevel = chunks[index] ?? "0"
    const parsed = Math.max(0, Math.floor(parseNumberish(rawLevel)))
    next[id] = Math.min(nodeById[id].maxLevel, parsed)
  }

  return next
}

export const CruiseLeftColumn = () => {
  const cruise = useCruiseContext()
  const [notationInput, setNotationInput] = createSignal("")
  const [isNotationEditing, setIsNotationEditing] = createSignal(false)
  const [isSetupOpen, setIsSetupOpen] = createSignal(false)

  const fullNotation = createMemo(() => notationOrder.map((id) => cruise.nodeLevels()[id]).join("/"))
  const shortNotation = createMemo(() => toShortNotation(cruise.nodeLevels()))

  const baseGuestMin = createMemo(() => cruise.baseSnapshot().baseGuestMin)
  const baseGuestMax = createMemo(() => cruise.baseSnapshot().baseGuestMax)
  const baseRoomMin = createMemo(() => cruise.baseSnapshot().baseRoomMin)
  const baseRoomMax = createMemo(() => cruise.baseSnapshot().baseRoomMax)

  const applyNotation = (raw: string) => {
    const parsedLevels = parseNotation(raw)
    cruise.setNodeLevels(parsedLevels)
    setNotationInput(toShortNotation(parsedLevels))
  }

  const getMinimumPrestigesForPoints = (requiredPoints: number) => {
    const safeRequired = Math.max(0, Math.floor(requiredPoints))
    if (safeRequired <= 0) return 0

    const estimate = Math.ceil((Math.sqrt(1 + 8 * safeRequired) - 1) / 2)
    let candidate = Math.max(0, estimate)

    while (getTotalPointsFromPrestiges(candidate) < safeRequired) {
      candidate += 1
    }

    return candidate
  }

  const closeSetupModal = () => {
    setIsSetupOpen(false)

    const requiredPoints = cruise.spentPoints()
    const currentPrestiges = Math.max(0, Math.floor(parseNumberish(cruise.prestigesDone())))
    const minimumPrestiges = getMinimumPrestigesForPoints(requiredPoints)

    if (minimumPrestiges > currentPrestiges) {
      cruise.setPrestigesDone(minimumPrestiges.toString())
    }
  }

  createEffect(() => {
    const nextShortNotation = shortNotation()
    if (!isNotationEditing()) {
      setNotationInput(nextShortNotation)
    }
  })

  return (
    <>
      <InfoCard>
        <div class="grid gap-1">
          <IntegerField
            label="Cruise level"
            value={cruise.cruiseLevel()}
            onInput={cruise.setCruiseLevel}
            min={0}
            step={1}
            tooltip="cruise.level"
          />
          <IntegerField
            label="Prestige fills"
            value={cruise.prestigesDone()}
            onInput={cruise.setPrestigesDone}
            min={0}
            step={1}
            tooltip="cruise.prestiges"
          />
          <div class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">Points</span>
            <p class="rounded-xl bg-white px-2.5 py-1.5 text-sm font-medium text-ink dark:bg-[#1a2638] dark:text-white">
              {cruise.availablePoints()} / {cruise.totalPoints()}
            </p>
          </div>
        </div>
      </InfoCard>

      <InfoCard>
        <div class="grid gap-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Base values</h3>
            <button
              type="button"
              class="rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none ring-brand/40 transition hover:bg-ink/5 focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white dark:hover:bg-white/10"
              onClick={() => setIsSetupOpen(true)}
            >
              Open setup
            </button>
          </div>

          <div class="rounded border border-ink/15 bg-white dark:border-white/15 dark:bg-[#22344d]">
            <MetricRow label="Ticket Price" value={formatValue(cruise.baseSnapshot().baseTicketPrice, 2)} />
            <MetricRow
              label="Guest Spending"
              value={`${formatValue(baseGuestMin(), 2)} - ${formatValue(baseGuestMax(), 2)}`}
            />
            <MetricRow
              label="Room Capacity"
              value={`${formatValue(baseRoomMin(), 2)} - ${formatValue(baseRoomMax(), 2)}`}
              withBorder={false}
            />
          </div>
        </div>
      </InfoCard>

      <CruiseSetupModal open={isSetupOpen()} onClose={closeSetupModal} />

      <InfoCard title="Prestige notation" tooltip="cruise.notation">
        <div class="grid gap-1.5">
          <div class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              Notation
            </label>
            <input
              type="text"
              value={notationInput()}
              onInput={(event) => setNotationInput(event.currentTarget.value)}
              onKeyDown={blurOnEnterOrEscape}
              onFocus={() => setIsNotationEditing(true)}
              onBlur={(event) => {
                applyNotation(event.currentTarget.value)
                setIsNotationEditing(false)
              }}
              class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
            />
          </div>
          <div class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">Full</span>
            <p class="rounded-xl bg-white px-2.5 py-1.5 text-sm font-medium text-ink dark:bg-[#1a2638] dark:text-white">
              {fullNotation()}
            </p>
          </div>
        </div>
      </InfoCard>
    </>
  )
}
