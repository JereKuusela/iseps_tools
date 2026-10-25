import { createEffect, createMemo, createSignal } from "solid-js"
import { TextInputField } from "../../components/ui/formControls"
import { useCruiseContext } from "./cruiseContext"
import { CRUISE_NODE_DEFINITIONS, emptyCruiseNodeLevels, type CruiseNodeId, type CruiseNodeLevels } from "./cruiseTypes"
import { parseNumberish } from "../../lib/parseNumber"

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

export const CruiseNotationField = () => {
  const cruise = useCruiseContext()
  const [notationInput, setNotationInput] = createSignal("")
  const [isNotationEditing, setIsNotationEditing] = createSignal(false)

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
    <TextInputField
      tooltip="cruise.notation"
      label="Build"
      value={notationInput()}
      onInput={setNotationInput}
      onFocus={() => setIsNotationEditing(true)}
      onBlur={(next) => {
        applyNotation(next)
        setIsNotationEditing(false)
      }}
    />
  )
}
