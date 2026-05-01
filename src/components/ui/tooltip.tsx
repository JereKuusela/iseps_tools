import * as Tooltip from "@kobalte/core/tooltip";
import type { ParentProps } from "solid-js";

type InfoTooltipProps = ParentProps<{
  content: string;
}>;

export function InfoTooltip(props: InfoTooltipProps) {
  return (
    <Tooltip.Root openDelay={120} closeDelay={80}>
      <Tooltip.Trigger class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-ink/25 bg-white text-xs font-semibold text-ink/80 transition hover:border-ink/45 hover:text-ink">
        {props.children ?? "?"}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="z-50 max-w-xs rounded-xl border border-ink/20 bg-ink px-3 py-2 text-xs leading-5 text-white shadow-xl">
          {props.content}
          <Tooltip.Arrow class="fill-ink" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
