import { createEffect, createMemo, createSignal } from "solid-js"
import { TextInputField } from "../../components/ui/formControls"
import { useFactoryContext } from "./factoryContext"
import {
  FACTORY_NODE_DEFINITIONS,
  emptyFactoryNodeLevels,
  type FactoryNodeId,
  type FactoryNodeLevels,
} from "./factoryTypes"
import { parseNumberish } from "../../lib/parseNumber"

const notationOrder = FACTORY_NODE_DEFINITIONS.map((node) => node.id)
const nodeById = FACTORY_NODE_DEFINITIONS.reduce(
  (lookup, node) => {
    lookup[node.id] = node
    return lookup
  },
  {} as Record<FactoryNodeId, (typeof FACTORY_NODE_DEFINITIONS)[number]>,
)

const toShortNotation = (levels: FactoryNodeLevels) => {
  const values = notationOrder.map((id) => levels[id])

  while (values.length > 1 && values[values.length - 1] === 0) {
    values.pop()
  }

  return values.join("/")
}

const parseNotation = (raw: string): FactoryNodeLevels => {
  const next = emptyFactoryNodeLevels()
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

export const FactoryNotationField = () => {
  const factory = useFactoryContext()
  const [notationInput, setNotationInput] = createSignal("")
  const [isNotationEditing, setIsNotationEditing] = createSignal(false)

  const shortNotation = createMemo(() => toShortNotation(factory.nodeLevels()))

  const applyNotation = (raw: string) => {
    const parsedLevels = parseNotation(raw)
    factory.setNodeLevels(parsedLevels)
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
      tooltip="factory.notation"
      label="Build"
      wide
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
