// Used for dynamically changing titles to avoid pointless recalculations.
export const setHoverTitle = (element: HTMLElement, getTitle?: () => string | undefined) => {
  const title = getTitle?.()
  if (title === undefined) element.removeAttribute("title")
  else element.title = title
}
