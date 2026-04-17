import { describe, expect, it } from "vitest"
import { block } from "~/lib/data-blocks/test-helpers"
import type { ScoutMap, ScoutSection } from "../scout-map"
import {
  buildProseWithLineMap,
  formatScoutMap,
  translateSections,
  type CodeblockMarker,
} from "./prose"

const section = (overrides: Partial<ScoutSection>): ScoutSection => ({
  label: "s",
  start_line: 1,
  end_line: 1,
  keywords: ["k"],
  ...overrides,
})

describe("buildProseWithLineMap", () => {
  interface Case {
    name: string
    input: string
    prose: string
    proseToOrig: number[]
    codeblocks: { language: string; line: number }[]
  }

  const cases: Case[] = [
    {
      name: "no codeblocks",
      input: "one\ntwo\nthree",
      prose: "one\ntwo\nthree",
      proseToOrig: [1, 2, 3],
      codeblocks: [],
    },
    {
      name: "codeblock in the middle",
      input: `intro\n${block("bash", 'echo "hi"')}\noutro`,
      prose: "intro\n#SPLIT\noutro",
      proseToOrig: [1, 2, 5],
      codeblocks: [{ language: "bash", line: 2 }],
    },
    {
      name: "codeblock at the start",
      input: `${block("bash", "x=1")}\nafter`,
      prose: "#SPLIT\nafter",
      proseToOrig: [1, 4],
      codeblocks: [{ language: "bash", line: 1 }],
    },
    {
      name: "codeblock at the end",
      input: `head\n${block("bash", "x=1")}`,
      prose: "head\n#SPLIT",
      proseToOrig: [1, 2],
      codeblocks: [{ language: "bash", line: 2 }],
    },
    {
      name: "two codeblocks with prose between",
      input: `a\n${block("bash", "one")}\nmiddle\n${block("bash", "two")}\nz`,
      prose: "a\n#SPLIT\nmiddle\n#SPLIT\nz",
      proseToOrig: [1, 2, 5, 6, 9],
      codeblocks: [
        { language: "bash", line: 2 },
        { language: "bash", line: 6 },
      ],
    },
  ]

  it.each(cases)("$name", (c) => {
    const result = buildProseWithLineMap(c.input)
    expect(result.prose).toBe(c.prose)
    expect(result.proseToOrig).toEqual(c.proseToOrig)
    expect(result.codeblocks.map((b) => ({ language: b.language, line: b.line }))).toEqual(
      c.codeblocks
    )
  })

  interface IdentityCase {
    name: string
    language: string
    content: string
    id: string | null
    label: string | null
  }

  const identityCases: IdentityCase[] = [
    {
      name: "callout: root id + title label",
      language: "json-callout",
      content: '{"id":"callout_1","title":"Week 1"}',
      id: "callout_1",
      label: "Week 1",
    },
    {
      name: "chart: root id + nested caption.label",
      language: "json-chart",
      content: '{"id":"chart_x","caption":{"label":"Growth"}}',
      id: "chart_x",
      label: "Growth",
    },
    {
      name: "chart: root id, no caption",
      language: "json-chart",
      content: '{"id":"chart_y"}',
      id: "chart_y",
      label: null,
    },
    {
      name: "bash: no registry entry",
      language: "bash",
      content: "echo hi",
      id: null,
      label: null,
    },
  ]

  it.each(identityCases)("$name", (c) => {
    const input = `intro\n${block(c.language, c.content)}\nouter`
    const { codeblocks } = buildProseWithLineMap(input)
    expect(codeblocks[0].id).toBe(c.id)
    expect(codeblocks[0].label).toBe(c.label)
  })
})

describe("translateSections", () => {
  interface Case {
    name: string
    sections: ScoutSection[]
    proseToOrig: number[]
    totalOrigLines: number
    expected: { start_line: number; end_line: number }[]
  }

  const cases: Case[] = [
    {
      name: "no codeblocks — identity translation",
      sections: [section({ start_line: 1, end_line: 2 }), section({ start_line: 3, end_line: 5 })],
      proseToOrig: [1, 2, 3, 4, 5],
      totalOrigLines: 5,
      expected: [
        { start_line: 1, end_line: 2 },
        { start_line: 3, end_line: 5 },
      ],
    },
    {
      name: "gap between sections expands end_line to cover codeblock",
      sections: [section({ start_line: 1, end_line: 1 }), section({ start_line: 2, end_line: 2 })],
      proseToOrig: [1, 5],
      totalOrigLines: 5,
      expected: [
        { start_line: 1, end_line: 4 },
        { start_line: 5, end_line: 5 },
      ],
    },
    {
      name: "trailing codeblock extends last section to total",
      sections: [section({ start_line: 1, end_line: 1 })],
      proseToOrig: [1],
      totalOrigLines: 4,
      expected: [{ start_line: 1, end_line: 4 }],
    },
  ]

  it.each(cases)("$name", (c) => {
    const out = translateSections(c.sections, c.proseToOrig, c.totalOrigLines)
    expect(out.map((s) => ({ start_line: s.start_line, end_line: s.end_line }))).toEqual(c.expected)
  })
})

describe("formatScoutMap", () => {
  const baseMap = (overrides: Partial<ScoutMap> = {}): ScoutMap => ({
    file_context: "ctx",
    sections: [],
    ...overrides,
  })

  it("renders sections with keywords and desc", () => {
    const map = baseMap({
      sections: [
        section({
          label: "Opening",
          start_line: 1,
          end_line: 10,
          keywords: ["a", "b"],
          desc: "intro",
        }),
      ],
    })
    expect(formatScoutMap("f.md", map, [])).toBe(
      `File: f.md\nctx\n\n[1-10] Opening\n  keywords: a, b\n  desc: intro`
    )
  })

  it("omits desc when undefined", () => {
    const map = baseMap({
      sections: [section({ label: "A", start_line: 1, end_line: 2, keywords: ["k"] })],
    })
    expect(formatScoutMap("f.md", map, [])).toBe(`File: f.md\nctx\n\n[1-2] A\n  keywords: k`)
  })

  it("appends all codeblock markers at the bottom with id and label when present", () => {
    const map = baseMap({
      sections: [
        section({ label: "A", start_line: 1, end_line: 5, keywords: ["x"] }),
        section({ label: "B", start_line: 6, end_line: 15, keywords: ["y"] }),
      ],
    })
    const markers: CodeblockMarker[] = [
      { language: "json-callout", id: "callout_1", label: "Week 1", line: 3 },
      { language: "json-chart", id: "chart_x", label: null, line: 7 },
      { language: "bash", id: null, label: null, line: 12 },
    ]
    expect(formatScoutMap("f.md", map, markers)).toBe(
      [
        `File: f.md`,
        `ctx`,
        ``,
        `[1-5] A`,
        `  keywords: x`,
        ``,
        `[6-15] B`,
        `  keywords: y`,
        ``,
        `----`,
        `codeblock json-callout callout_1: "Week 1" on line 3`,
        `codeblock json-chart chart_x on line 7`,
        `codeblock bash on line 12`,
      ].join("\n")
    )
  })
})
