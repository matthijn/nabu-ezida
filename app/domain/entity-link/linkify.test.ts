import { describe, test, expect } from "vitest"
import { linkifyEntityIds } from "./linkify"

const resolve = (id: string): string | null => {
  const names: Record<string, string> = {
    annotation_1a2b3c4d: "user frustration",
    callout_7xk2m9p1: "User Frustration",
    callout_4a1b2c3d: "Theme A",
    "interview-notes.md": "interview-notes",
    "P01.md": "P01",
  }
  return names[id] ?? null
}

describe("linkifyEntityIds", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    {
      name: "links bare annotation ID",
      input: "See annotation_1a2b3c4d for details",
      expected: "See [user frustration](file://annotation_1a2b3c4d) for details",
    },
    {
      name: "links bare callout ID",
      input: "Applied callout_7xk2m9p1 three times",
      expected: "Applied [User Frustration](file://callout_7xk2m9p1) three times",
    },
    {
      name: "skips ID inside existing markdown link",
      input: "[User Frustration](file://callout_7xk2m9p1)",
      expected: "[User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "strips backtick wrapping around ID",
      input: "See `callout_7xk2m9p1` here",
      expected: "See [User Frustration](file://callout_7xk2m9p1) here",
    },
    {
      name: "strips paren wrapping around ID",
      input: "See (callout_7xk2m9p1) here",
      expected: "See [User Frustration](file://callout_7xk2m9p1) here",
    },
    {
      name: "links multiple IDs in one string",
      input: "Compare annotation_1a2b3c4d and callout_7xk2m9p1",
      expected: "Compare [user frustration](file://annotation_1a2b3c4d) and [User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "leaves unresolvable ID bare",
      input: "Unknown callout_9z9z9z9z here",
      expected: "Unknown callout_9z9z9z9z here",
    },
    {
      name: "links ID adjacent to punctuation",
      input: "Found callout_7xk2m9p1.",
      expected: "Found [User Frustration](file://callout_7xk2m9p1).",
    },
    {
      name: "links ID at end of sentence with comma",
      input: "Codes: callout_7xk2m9p1, callout_4a1b2c3d",
      expected: "Codes: [User Frustration](file://callout_7xk2m9p1), [Theme A](file://callout_4a1b2c3d)",
    },
    {
      name: "strips name after ID with em dash",
      input: "- callout_7xk2m9p1 — User Frustration",
      expected: "- [User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "strips name after ID with hyphen",
      input: "callout_7xk2m9p1 - User Frustration",
      expected: "[User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "strips name after ID with colon",
      input: "callout_7xk2m9p1: User Frustration",
      expected: "[User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "strips name before ID with em dash",
      input: "User Frustration — callout_7xk2m9p1",
      expected: "[User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "strips name before ID in parens",
      input: "User Frustration (callout_7xk2m9p1)",
      expected: "[User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "strips name after ID in parens",
      input: "callout_7xk2m9p1 (User Frustration)",
      expected: "[User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "strips bold-decorated name before ID",
      input: "the move as **User Frustration** (callout_7xk2m9p1)",
      expected: "the move as [User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "strips bold-decorated name after ID",
      input: "callout_7xk2m9p1 — **User Frustration**",
      expected: "[User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "strips italic-decorated name before ID",
      input: "coded as *User Frustration* (callout_7xk2m9p1)",
      expected: "coded as [User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "does not strip partial name match",
      input: "callout_7xk2m9p1 — User Frustrations",
      expected: "[User Frustration](file://callout_7xk2m9p1) — User Frustrations",
    },
    {
      name: "strips names in bullet list",
      input: "- callout_7xk2m9p1 — User Frustration\n- callout_4a1b2c3d — Theme A",
      expected: "- [User Frustration](file://callout_7xk2m9p1)\n- [Theme A](file://callout_4a1b2c3d)",
    },
    {
      name: "links bare document filename",
      input: "See interview-notes.md for context",
      expected: "See [interview-notes](file://interview-notes.md) for context",
    },
    {
      name: "skips document filename inside existing link",
      input: "[Interview Notes](file://interview-notes.md)",
      expected: "[Interview Notes](file://interview-notes.md)",
    },
    {
      name: "leaves unknown document filename bare",
      input: "Check unknown-file.md here",
      expected: "Check unknown-file.md here",
    },
    {
      name: "links mixed entity types and documents",
      input: "Found callout_7xk2m9p1 in P01.md",
      expected: "Found [User Frustration](file://callout_7xk2m9p1) in [P01](file://P01.md)",
    },
    {
      name: "strips name connected by word glue like 'is'",
      input: "User Frustration is callout_7xk2m9p1",
      expected: "[User Frustration](file://callout_7xk2m9p1)",
    },
    {
      name: "returns unchanged text with no IDs",
      input: "No entities here at all",
      expected: "No entities here at all",
    },
    {
      name: "returns empty string unchanged",
      input: "",
      expected: "",
    },
    {
      name: "skips double-quoted ID",
      input: 'key is "callout_7xk2m9p1" here',
      expected: 'key is "callout_7xk2m9p1" here',
    },
    {
      name: "skips single-quoted ID",
      input: "key is 'callout_7xk2m9p1' here",
      expected: "key is 'callout_7xk2m9p1' here",
    },
    {
      name: "links ID inside longer quoted prose",
      input: '"See callout_7xk2m9p1 for details"',
      expected: '"See [User Frustration](file://callout_7xk2m9p1) for details"',
    },
    {
      name: "skips ID inside file:// URL",
      input: "href is file://callout_7xk2m9p1 here",
      expected: "href is file://callout_7xk2m9p1 here",
    },
    {
      name: "skips double-quoted ID with wrapper parens inside",
      input: '"(callout_7xk2m9p1)" used as key',
      expected: '"(callout_7xk2m9p1)" used as key',
    },
  ]

  test.each(cases)("$name", ({ input, expected }) => {
    expect(linkifyEntityIds(input, resolve)).toBe(expected)
  })
})
