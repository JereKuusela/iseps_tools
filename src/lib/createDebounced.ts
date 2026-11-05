import { type Accessor, createEffect, createSignal, on, onCleanup } from "solid-js"

export const createDebounced = <T>(source: Accessor<T>, delayMs: number): Accessor<T> => {
  const [value, setValue] = createSignal(source())
  createEffect(
    on(
      source,
      (next) => {
        const timer = setTimeout(() => setValue(() => next), delayMs)
        onCleanup(() => clearTimeout(timer))
      },
      { defer: true },
    ),
  )
  return value
}
