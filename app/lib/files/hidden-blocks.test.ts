import { describe, it, expect, beforeEach } from "vitest"
import { resolveHiddenFile } from "./hidden-blocks"
import { setFiles } from "./store"

const callout = (id: string, title: string): string =>
  `\`\`\`json-callout\n${JSON.stringify({ id, title, content: `text for ${id}` })}\n\`\`\``

const chart = (id: string, caption: string): string =>
  `\`\`\`json-chart\n${JSON.stringify({ id, caption: { label: caption } })}\n\`\`\``

const wrap = (data: unknown): string => "```json\n" + JSON.stringify(data, null, 2) + "\n```"

describe("resolveHiddenFile", () => {
  beforeEach(() => {
    setFiles({
      "a.md": `intro\n\n${callout("callout-1abc2def", "Week 1")}\n\n${callout("callout-2bcd3efg", "Week 2")}`,
      "b.md": `${chart("chart-3cde4fgh", "Distribution")}`,
    })
  })

  const cases: {
    name: string
    setup?: Record<string, string>
    path: string
    expected: string | undefined
  }[] = [
    {
      name: "resolves callout by id",
      path: "callout-1abc2def.hidden.md",
      expected: wrap({
        id: "callout-1abc2def",
        title: "Week 1",
        content: "text for callout-1abc2def",
      }),
    },
    {
      name: "resolves second callout",
      path: "callout-2bcd3efg.hidden.md",
      expected: wrap({
        id: "callout-2bcd3efg",
        title: "Week 2",
        content: "text for callout-2bcd3efg",
      }),
    },
    {
      name: "resolves chart by id",
      path: "chart-3cde4fgh.hidden.md",
      expected: wrap({ id: "chart-3cde4fgh", caption: { label: "Distribution" } }),
    },
    {
      name: "unknown id returns undefined",
      path: "callout-9xxx9xxx.hidden.md",
      expected: undefined,
    },
    {
      name: "non-hidden path returns undefined",
      path: "a.md",
      expected: undefined,
    },
    {
      name: "empty store returns undefined",
      setup: {},
      path: "callout-1abc2def.hidden.md",
      expected: undefined,
    },
  ]

  it.each(cases)("$name", ({ setup, path, expected }) => {
    if (setup !== undefined) setFiles(setup)
    expect(resolveHiddenFile(path)).toEqual(expected)
  })
})
