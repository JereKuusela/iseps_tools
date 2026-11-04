import { createEffect, createMemo, createSignal } from "solid-js"
import { parseNumberish } from "../../lib/parseNumber"
import type { TooltipKey } from "../../lib/tooltips"
import { TextInputField } from "./formControls"

type NotationNode<Id extends string> = { id: Id; maxLevel: number }

type NotationFieldProps<Id extends string> = {
  nodes: readonly NotationNode<Id>[]
  levels: () => Record<Id, number>
  onChange: (levels: Record<Id, number>) => void
  emptyLevels: () => Record<Id, number>
  tooltip: TooltipKey
}

// Drops trailing zero levels: "1/2/0/0" -> "1/2".
const toShortNotation = <Id extends string>(nodes: readonly NotationNode<Id>[], levels: Record<Id, number>) => {
  const values = nodes.map((node) => levels[node.id])

  while (values.length > 1 && values[values.length - 1] === 0) {
    values.pop()
  }

  return values.join("/")
}

const parseNotation = <Id extends string>(
  nodes: readonly NotationNode<Id>[],
  emptyLevels: () => Record<Id, number>,
  raw: string,
) => {
  const next = emptyLevels()
  const chunks = raw
    .split("/")
    .map((entry) => entry.trim())
    .filter((entry, index, all) => entry.length > 0 || index < all.length - 1)

  nodes.forEach((node, index) => {
    const parsed = Math.max(0, Math.floor(parseNumberish(chunks[index] ?? "0")))
    next[node.id] = Math.min(node.maxLevel, parsed)
  })

  return next
}

export const NotationField = <Id extends string>(props: NotationFieldProps<Id>) => {
  const [notationInput, setNotationInput] = createSignal("")
  const [isEditing, setIsEditing] = createSignal(false)

  const shortNotation = createMemo(() => toShortNotation(props.nodes, props.levels()))

  const applyNotation = (raw: string) => {
    const parsedLevels = parseNotation(props.nodes, props.emptyLevels, raw)
    props.onChange(parsedLevels)
    setNotationInput(toShortNotation(props.nodes, parsedLevels))
  }

  createEffect(() => {
    const next = shortNotation()
    if (!isEditing()) {
      setNotationInput(next)
    }
  })

  return (
    <TextInputField
      tooltip={props.tooltip}
      label="Build"
      wide
      value={notationInput()}
      onInput={setNotationInput}
      onFocus={() => setIsEditing(true)}
      onBlur={(next) => {
        applyNotation(next)
        setIsEditing(false)
      }}
    />
  )
}
