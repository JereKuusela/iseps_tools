import { For } from "solid-js"
import { resourceTextOnly } from "../../lib/resourceDisplay"
import { splitTooltipResources } from "../../lib/tooltipResources"
import { ResourceLabel } from "./ResourceLabel"

export const ResourceText = (props: { text: string; compactLists?: boolean }) => (
  <span class="[&_img]:align-[-0.2em]">
    <For each={splitTooltipResources(props.text, props.compactLists && !resourceTextOnly())}>
      {({ text, resource }) => (resource ? <ResourceLabel resource={resource}>{text}</ResourceLabel> : text)}
    </For>
  </span>
)
