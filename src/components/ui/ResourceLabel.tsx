import { Show } from "solid-js"
import { resourceTextOnly } from "../../lib/resourceDisplay"

const resourceIcons = import.meta.glob<string>("../../assets/resources/*.webp", { eager: true, import: "default" })

export const ResourceLabel = (props: { resource?: string; children: string; showText?: boolean }) => (
  <Show
    when={!resourceTextOnly() && props.resource && resourceIcons[`../../assets/resources/${props.resource}.webp`]}
    fallback={props.children}
  >
    {(src) => (
      <>
        <img
          src={src()}
          alt={props.showText ? "" : props.children}
          title={props.showText ? undefined : props.children}
          width={16}
          height={16}
          class="inline-block shrink-0 align-middle"
        />
        <Show when={props.showText}>{props.children}</Show>
      </>
    )}
  </Show>
)
