import { describe, it, expect } from "vitest"
import { calloutToProse } from "./toProse"

describe("calloutToProse", () => {
  it("returns title and content", () => {
    expect(calloutToProse({ title: "My Note", content: "Some details here" })).toBe(
      "My Note\nSome details here"
    )
  })

  it("returns null when title missing", () => {
    expect(calloutToProse({ content: "no title" })).toBeNull()
  })

  it("returns null when content missing", () => {
    expect(calloutToProse({ title: "no content" })).toBeNull()
  })

  it("returns null for empty object", () => {
    expect(calloutToProse({})).toBeNull()
  })
})
