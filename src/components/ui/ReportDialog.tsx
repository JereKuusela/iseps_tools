import * as Dialog from "@kobalte/core/dialog"
import { X } from "lucide-solid"
import type { JSX, ParentProps } from "solid-js"

type ReportDialogProps = ParentProps<{
  title: string
  description: string
  trigger: JSX.Element
  disabled?: boolean
}>

export const ReportDialog = (props: ReportDialogProps) => (
  <Dialog.Root>
    <Dialog.Trigger
      disabled={props.disabled}
      aria-label={`Open ${props.title.toLowerCase()} report`}
      title={`Open ${props.title.toLowerCase()} report`}
      class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-ink/20 text-ink/75 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/10"
    >
      {props.trigger}
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay class="fixed inset-0 z-[60] bg-black/50" />
      <Dialog.Content class="fixed inset-2 z-[60] flex min-h-0 flex-col overflow-hidden rounded-lg border border-ink/20 bg-white text-ink shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[min(56rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 dark:border-white/20 dark:bg-[#182538] dark:text-white">
        <div class="flex shrink-0 items-center justify-between gap-3 border-b border-ink/15 px-4 py-3 dark:border-white/15">
          <Dialog.Title class="min-w-0 text-lg font-bold">{props.title}</Dialog.Title>
          <Dialog.CloseButton
            aria-label="Close report"
            title="Close report"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-ink/20 hover:bg-ink/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            <X size={18} aria-hidden="true" />
          </Dialog.CloseButton>
        </div>
        <Dialog.Description class="sr-only">{props.description}</Dialog.Description>
        <div class="min-h-0 overflow-y-auto overscroll-contain p-4">{props.children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
)
