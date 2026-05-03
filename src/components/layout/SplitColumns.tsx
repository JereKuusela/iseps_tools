import type { JSX, ParentProps } from "solid-js"

type SplitColumnsProps = ParentProps<{
  right: JSX.Element
  layoutClass?: string
  leftClass?: string
  rightClass?: string
}>

export const SplitColumns = (props: SplitColumnsProps) => {
  const layoutClass = `grid gap-6 ${props.layoutClass ?? "xl:grid-cols-[1fr_1fr]"}`

  return (
    <div class={layoutClass.trim()}>
      <section class={props.leftClass ?? "space-y-4"}>{props.children}</section>
      <section class={props.rightClass ?? "space-y-4"}>{props.right}</section>
    </div>
  )
}
