import { describe, expect, it } from "vitest"
import { contextToMessage, type EditorContext } from "./context"

describe("contextToMessage", () => {
  const cases = [
    {
      name: "formats context with above and below",
      ctx: {
        documentId: "doc-123",
        documentTitle: "My Document",
        above: ["First paragraph", "Second paragraph"],
        below: ["Fourth paragraph", "Fifth paragraph"],
      } as EditorContext,
      expected: `User is looking at:
Document: My Document (doc-123)

Above cursor:
First paragraph
Second paragraph

Below cursor:
Fourth paragraph
Fifth paragraph`,
    },
    {
      name: "formats context with selection",
      ctx: {
        documentId: "doc-123",
        documentTitle: "My Document",
        above: ["Some text"],
        below: [],
        selection: "selected words",
      } as EditorContext,
      expected: `User is looking at:
Document: My Document (doc-123)

Above cursor:
Some text

Selected:
selected words`,
    },
    {
      name: "formats context with no cursor (preview only)",
      ctx: {
        documentId: "doc-123",
        documentTitle: "My Document",
        above: ["First block", "Second block"],
        below: [],
      } as EditorContext,
      expected: `User is looking at:
Document: My Document (doc-123)

Above cursor:
First block
Second block`,
    },
    {
      name: "formats empty document",
      ctx: {
        documentId: "doc-123",
        documentTitle: "Empty Doc",
        above: [],
        below: [],
      } as EditorContext,
      expected: `User is looking at:
Document: Empty Doc (doc-123)`,
    },
  ]

  cases.forEach(({ name, ctx, expected }) => {
    it(name, () => {
      expect(contextToMessage(ctx)).toBe(expected)
    })
  })
})
