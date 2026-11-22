import { ResourceLabel } from "./ResourceLabel"

const runTypeResources: Partial<Record<string, string>> = {
  se: "sc",
  grun: "gp",
  jrun: "juno",
  crun: "cash",
  cash: "cash",
}

export const RunTypeOption = (props: { value: string; label: string }) => (
  <ResourceLabel resource={runTypeResources[props.value]} showText>
    {props.label}
  </ResourceLabel>
)
