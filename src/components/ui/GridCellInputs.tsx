import { GRID_CELL_BORDER_CLASS } from "../layout/dataTable"

// Outline instead of border color so the highlight is not swallowed by collapsed borders.
export const GRID_VALUE_CELL_CLASS = `${GRID_CELL_BORDER_CLASS} p-0 text-center align-middle focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-brand/40`

export const GRID_LABEL_CELL_CLASS = `${GRID_CELL_BORDER_CLASS} px-2 py-1`

const INPUT_CLASS =
  "w-full bg-transparent px-1 py-1 text-center text-xs font-medium text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:cursor-not-allowed disabled:opacity-40 dark:text-white"

export const GridEmptyCell = () => <span class="block px-1 py-1 text-ink/40 dark:text-white/40">-</span>

type GridNumberInputProps = {
  value: string
  max: number
  onInput: (next: string) => void
  disabled?: boolean
  // Greyed out but still editable.
  dimmed?: boolean
  title?: string
}

export const GridNumberInput = (props: GridNumberInputProps) => (
  <input
    type="number"
    value={props.value}
    min={0}
    max={props.max}
    step={1}
    title={props.title}
    disabled={props.disabled}
    onInput={(event) => props.onInput(event.currentTarget.value)}
    class={`${INPUT_CLASS}${props.dimmed ? " opacity-40" : ""}`}
  />
)
