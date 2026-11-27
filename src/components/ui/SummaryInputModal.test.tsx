// @vitest-environment jsdom

import { render } from "solid-js/web"
import { expect, test } from "vitest"
import { SummaryInputModal } from "./SummaryInputModal"

test("keeps the exponent popup open on internal clicks and closes it on outside clicks", () => {
  const host = document.createElement("div")
  document.body.append(host)
  const dispose = render(
    () => (
      <SummaryInputModal label="Exponent" value="0.001">
        <div data-popup>
          <label>
            SE level
            <select>
              <option>1</option>
              <option>2</option>
            </select>
          </label>
        </div>
      </SummaryInputModal>
    ),
    host,
  )

  try {
    const summary = host.querySelector("input")!
    const popup = () => host.querySelector("[data-popup]")
    const pointerDown = (target: EventTarget) => target.dispatchEvent(new Event("pointerdown", { bubbles: true }))

    summary.focus()
    expect(popup()).not.toBeNull()

    const select = host.querySelector("select")!
    pointerDown(select)
    select.focus()
    expect(document.activeElement).toBe(select)
    expect(popup()).not.toBeNull()

    pointerDown(popup()!)
    select.blur()
    expect(popup()).not.toBeNull()

    pointerDown(document.body)
    expect(popup()).toBeNull()

    summary.focus()
    expect(popup()).not.toBeNull()
    summary.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    expect(popup()).toBeNull()
  } finally {
    dispose()
    host.remove()
  }
})
