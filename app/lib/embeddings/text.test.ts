import { describe, it, expect } from "vitest"
import { toEmbeddableText } from "./text"

describe("toEmbeddableText", () => {
  const cases: {
    name: string
    markdown: string
    toProseFns: Record<string, (block: unknown) => string | null>
    expected: string
  }[] = [
    {
      name: "plain markdown passes through stripped",
      markdown: "## Title\n\nSome **bold** content here.",
      toProseFns: {},
      expected: "Title\n\nSome bold content here.",
    },
    {
      name: "code block with toProse is substituted",
      markdown: 'Before\n\n```json-callout\n{"title":"Note","content":"details"}\n```\n\nAfter',
      toProseFns: {
        "json-callout": (b: unknown) => {
          const block = b as { title: string; content: string }
          return `${block.title}\n${block.content}`
        },
      },
      expected: "Before\n\nNote\ndetails\n\nAfter",
    },
    {
      name: "code block without toProse is dropped",
      markdown: 'Before\n\n```json-attributes\n{"tags":[]}\n```\n\nAfter',
      toProseFns: {},
      expected: "Before\n\nAfter",
    },
    {
      name: "toProse returning null drops block",
      markdown: "Text\n\n```json-callout\n{}\n```\n\nMore",
      toProseFns: { "json-callout": () => null },
      expected: "Text\n\nMore",
    },
    {
      name: "multiple code blocks mixed",
      markdown:
        'Start\n\n```json-callout\n{"title":"A","content":"B"}\n```\n\nMiddle\n\n```json-hidden\n{}\n```\n\nEnd',
      toProseFns: {
        "json-callout": (b: unknown) => {
          const block = b as { title: string; content: string }
          return `${block.title}: ${block.content}`
        },
      },
      expected: "Start\n\nA: B\n\nMiddle\n\nEnd",
    },
    {
      name: "empty markdown",
      markdown: "",
      toProseFns: {},
      expected: "",
    },
  ]

  it.each(cases)("$name", ({ markdown, toProseFns, expected }) => {
    expect(toEmbeddableText(markdown, toProseFns)).toBe(expected)
  })
})
