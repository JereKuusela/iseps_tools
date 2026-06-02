import { createEffect, createMemo, createSignal } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { IntegerField, NumberField, blurOnEnterOrEscape } from "../../components/ui/formControls"
import { CRUISE_NODE_DEFINITIONS, emptyCruiseNodeLevels, type CruiseNodeId, type CruiseNodeLevels } from "./cruiseTypes"
import { useCruiseContext } from "./cruiseContext"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
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

  const fullNotation = createMemo(() => notationOrder.map((id) => cruise.nodeLevels()[id]).join("/"))
  const shortNotation = createMemo(() => toShortNotation(cruise.nodeLevels()))

  const applyNotation = (raw: string) => {
    const parsedLevels = parseNotation(raw)
    cruise.setNodeLevels(parsedLevels)
    setNotationInput(toShortNotation(parsedLevels))
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

      <InfoCard title="Base values">
        <div class="grid gap-1">
          <NumberField label="Ticket Price" value={cruise.baseTicketPrice()} onInput={cruise.setBaseTicketPrice} />

          <div class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              Guest Spending
            </label>
            <div class="flex items-center gap-2">
              <input
                type="text"
                value={cruise.baseGuestMin()}
                onInput={(event) => cruise.setBaseGuestMin(event.currentTarget.value)}
                onKeyDown={blurOnEnterOrEscape}
                autocapitalize="off"
                autocomplete="off"
                autocorrect="off"
                spellcheck={false}
                class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
              />
              <span class="text-ink/50 dark:text-white/50">-</span>
              <input
                type="text"
                value={cruise.baseGuestMax()}
                onInput={(event) => cruise.setBaseGuestMax(event.currentTarget.value)}
                onKeyDown={blurOnEnterOrEscape}
                autocapitalize="off"
                autocomplete="off"
                autocorrect="off"
                spellcheck={false}
                class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
              />
            </div>
          </div>

          <div class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
              Room Capacity
            </label>
            <div class="flex items-center gap-2">
              <input
                type="text"
                value={cruise.baseRoomMin()}
                onInput={(event) => cruise.setBaseRoomMin(event.currentTarget.value)}
                onKeyDown={blurOnEnterOrEscape}
                autocapitalize="off"
                autocomplete="off"
                autocorrect="off"
                spellcheck={false}
                class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
              />
              <span class="text-ink/50 dark:text-white/50">-</span>
              <input
                type="text"
                value={cruise.baseRoomMax()}
                onInput={(event) => cruise.setBaseRoomMax(event.currentTarget.value)}
                onKeyDown={blurOnEnterOrEscape}
                autocapitalize="off"
                autocomplete="off"
                autocorrect="off"
                spellcheck={false}
                class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
              />
            </div>
          </div>
        </div>
      </InfoCard>

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
