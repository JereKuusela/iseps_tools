import type { JSX, ParentProps } from "solid-js"

type SplitColumnsProps = ParentProps<{
  right: JSX.Element
  layoutClass?: string
  leftClass?: string
  rightClass?: string
}>

export const SplitColumns = (props: SplitColumnsProps) => {
  const layoutClass = `grid gap-2 ${props.layoutClass ?? "xl:grid-cols-[1fr_1fr]"}`
  const leftClass = `min-w-0 ${props.leftClass ?? "space-y-2"}`
  const rightClass = `min-w-0 ${props.rightClass ?? "space-y-2"}`

  return (
    <div class={layoutClass.trim()}>
      <section class={leftClass.trim()}>{props.children}</section>
      <section class={rightClass.trim()}>{props.right}</section>
    </div>
  )
}
