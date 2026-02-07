import { describe, test, expect } from "vitest"
import { parseEntityLink } from "./parse"
import type { EntityRef } from "./types"

describe("parseEntityLink", () => {
  const cases: { name: string; href: string; expected: EntityRef | null }[] = [
    {
      name: "returns null for non-file protocol",
      href: "https://example.com",
      expected: null,
    },
    {
      name: "returns null for empty href",
      href: "",
      expected: null,
    },
    {
      name: "returns null for file:// with no path",
      href: "file://",
      expected: null,
    },
    {
      name: "parses annotation ref",
      href: "file://annotation_abc123",
      expected: { kind: "annotation", id: "annotation_abc123" },
    },
    {
      name: "parses callout ref",
      href: "file://callout_xyz789",
      expected: { kind: "callout", id: "callout_xyz789" },
    },
    {
      name: "parses text ref without spotlight",
      href: "file://my-document",
      expected: { kind: "text", documentId: "my-document", spotlight: null },
    },
    {
      name: "parses text ref with single spotlight",
      href: "file://my-document/hello%20world",
      expected: { kind: "text", documentId: "my-document", spotlight: { type: "single", text: "hello world" } },
    },
    {
      name: "parses text ref with range spotlight",
      href: "file://my-document/start%20here...end%20here",
      expected: { kind: "text", documentId: "my-document", spotlight: { type: "range", from: "start here", to: "end here" } },
    },
    {
      name: "returns null spotlight for empty text part",
      href: "file://my-document/",
      expected: { kind: "text", documentId: "my-document", spotlight: null },
    },
    {
      name: "returns null spotlight for range with missing from",
      href: "file://my-document/...end",
      expected: { kind: "text", documentId: "my-document", spotlight: null },
    },
    {
      name: "returns null spotlight for range with missing to",
      href: "file://my-document/start...",
      expected: { kind: "text", documentId: "my-document", spotlight: null },
    },
    {
      name: "returns null for plain text without file protocol",
      href: "annotation_abc123",
      expected: null,
    },
  ]

  test.each(cases)("$name", ({ href, expected }) => {
    expect(parseEntityLink(href)).toEqual(expected)
  })
})
