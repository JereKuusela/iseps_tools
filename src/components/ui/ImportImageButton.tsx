import { ImageUp } from "lucide-solid"
import { Show, createSignal, onCleanup, onMount } from "solid-js"
import { ActionButton } from "./ActionButton"

const MESSAGE_MS = 4000

type ImportImageButtonProps = {
  label: string
  // Resolves with a short result message, e.g. "Imported 43 values".
  onImport: (file: Blob) => Promise<string>
}

// Quiet icon button for importing settings from a screenshot; also accepts an image pasted anywhere on the page.
export const ImportImageButton = (props: ImportImageButtonProps) => {
  const [busy, setBusy] = createSignal(false)
  const [message, setMessage] = createSignal("")
  let input: HTMLInputElement | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  const run = async (file: Blob) => {
    if (busy()) return
    setBusy(true)
    clearTimeout(timer)
    try {
      setMessage(await props.onImport(file))
    } catch {
      setMessage("Could not read the image")
    } finally {
      setBusy(false)
      timer = setTimeout(() => setMessage(""), MESSAGE_MS)
    }
  }

  const handlePaste = (event: ClipboardEvent) => {
    const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"))
    if (file) void run(file)
  }

  onMount(() => document.addEventListener("paste", handlePaste))
  onCleanup(() => {
    document.removeEventListener("paste", handlePaste)
    clearTimeout(timer)
  })

  return (
    <div class="flex items-center gap-2">
      <Show when={message()}>
        <span class="text-[11px] text-ink/60 dark:text-white/60" role="status">
          {message()}
        </span>
      </Show>
      <ActionButton
        size="icon"
        class="grid place-items-center opacity-60 hover:opacity-100"
        title={`${props.label} (or paste an image)`}
        aria-label={props.label}
        disabled={busy()}
        onClick={() => input?.click()}
      >
        <ImageUp size={14} />
      </ActionButton>
      <input
        ref={input}
        type="file"
        accept="image/*"
        class="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ""
          if (file) void run(file)
        }}
      />
    </div>
  )
}
