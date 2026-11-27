import { SelectField } from "./formControls"
import { parseNumberish } from "../../lib/parseNumber"
import { resolvePreviousLevel, selectLevel } from "../../shared/levelBreakpoints"

type LevelOption = { value: string; label: string }

type LevelSelectFieldProps = {
  label: string
  options: LevelOption[]
  // Raw shared level; may sit between this page's breakpoints.
  value: string
  onChange: (next: string) => void
}

export const LevelSelectField = (props: LevelSelectFieldProps) => {
  const breakpoints = () => props.options.map((option) => parseNumberish(option.value))
  const current = () => Math.max(0, Math.floor(parseNumberish(props.value)))

  return (
    <SelectField
      label={props.label}
      value={String(resolvePreviousLevel(breakpoints(), current()))}
      onChange={(next) => props.onChange(String(selectLevel(breakpoints(), current(), parseNumberish(next))))}
      options={props.options}
    />
  )
}
