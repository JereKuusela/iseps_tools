import { Clock } from "lucide-solid"
import { For, Show } from "solid-js"
import { resourceTextOnly } from "../../lib/resourceDisplay"
import { splitUpgradeItemResources } from "../../lib/upgradeItemResources"
import { ResourceLabel } from "./ResourceLabel"

export const UpgradeItemLabel = (props: { name: string; levelSuffix?: string; leadingIcon?: boolean }) => {
  const parts = () => {
    if (props.leadingIcon && resourceTextOnly()) return [{ text: props.name, resource: undefined }]

    const tokens = splitUpgradeItemResources(props.name)
    const [prefix, resource, suffix] = tokens
    if (props.leadingIcon && tokens.length === 3 && prefix.text && resource.resource && !suffix.text) {
      return [resource, { text: ` ${prefix.text.trimEnd()}`, resource: undefined }]
    }

    return tokens
  }

  return (
    <>
      <For each={parts()}>
        {({ text, resource }) => {
          if (!resource) return text
          if (resource === "duration") {
            return (
              <Show when={!resourceTextOnly()} fallback={text}>
                <span class="inline-block align-middle" role="img" aria-label={text} title={text}>
                  <Clock size={16} aria-hidden="true" />
                </span>
              </Show>
            )
          }
          return <ResourceLabel resource={resource}>{text}</ResourceLabel>
        }}
      </For>
      {props.levelSuffix}
    </>
  )
}
