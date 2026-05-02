import type { ParentProps } from "solid-js"
import type { TooltipKey } from "../../lib/tooltips"
import { Tooltip } from "../ui/Tooltip"

type PanelWidth = "content" | "full"

export const Panel = (props: ParentProps<{ title: string; tooltip?: TooltipKey; width?: PanelWidth }>) => {
  return (
    <section
      class="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-glow backdrop-blur dark:border-white/15 dark:bg-[#111a28]/80 sm:p-5 lg:p-6"
      classList={{
        "mx-auto max-w-6xl": (props.width ?? "content") === "content",
        "mx-auto w-max": props.width === "full",
      }}
    >
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-bold text-ink dark:text-white">{props.title}</h2>
        {props.tooltip ? <Tooltip content={props.tooltip}>i</Tooltip> : null}
      </div>
      <div class="mt-3 sm:mt-4">{props.children}</div>
    </section>
  )
}
