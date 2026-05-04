import { describe, it, expect } from "vitest"
import type { ScoutEntry } from "../scout/api"
import type { ScoutSection } from "../scout-map"
import { formatTarget, collectSections, buildAutoSteps } from "./format"

const section = (overrides: Partial<ScoutSection> = {}): ScoutSection => ({
  label: "Section A",
  start_line: 1,
  end_line: 10,
  keywords: ["topic"],
  ...overrides,
})

const mappedEntry = (sections: ScoutSection[]): ScoutEntry => ({
  kind: "mapped",
  path: "file.md",
  map: { sections },
})

const inlineEntry = (path: string): ScoutEntry => ({
  kind: "inline",
  path,
  content: "inline content",
})

describe("formatTarget", () => {
  const cases = [
    {
      name: "inline entry returns full content",
      path: "a.md",
      entry: inlineEntry("a.md"),
      expected: "File: a.md\ninline content",
    },
    {
      name: "mapped entry includes all sections",
      path: "a.md",
      entry: mappedEntry([
        section({ label: "S1", start_line: 1, end_line: 10, keywords: ["k1"] }),
        section({ label: "S2", start_line: 11, end_line: 20, keywords: ["k2"] }),
      ]),
      expected: [
        "File: a.md",
        "",
        "[1-10] S1",
        "  keywords: k1",
        "",
        "[11-20] S2",
        "  keywords: k2",
      ].join("\n"),
    },
  ]

  cases.forEach(({ name, path, entry, expected }) => {
    it(name, () => expect(formatTarget(path, entry)).toBe(expected))
  })
})

describe("collectSections", () => {
  const cases = [
    {
      name: "collects all sections across entries",
      entries: [
        {
          path: "a.md",
          entry: mappedEntry([
            section({ label: "A1", start_line: 1, end_line: 10 }),
            section({ label: "A2", start_line: 11, end_line: 20 }),
          ]),
        },
        {
          path: "b.md",
          entry: mappedEntry([section({ label: "B1", start_line: 1, end_line: 5 })]),
        },
      ],
      expected: [
        { path: "a.md", label: "A1", startLine: 1, endLine: 10 },
        { path: "a.md", label: "A2", startLine: 11, endLine: 20 },
        { path: "b.md", label: "B1", startLine: 1, endLine: 5 },
      ],
    },
    {
      name: "skips inline entries",
      entries: [
        { path: "a.md", entry: inlineEntry("a.md") },
        {
          path: "b.md",
          entry: mappedEntry([section({ label: "B1", start_line: 1, end_line: 5 })]),
        },
      ],
      expected: [{ path: "b.md", label: "B1", startLine: 1, endLine: 5 }],
    },
    {
      name: "empty entries returns empty",
      entries: [],
      expected: [],
    },
  ]

  cases.forEach(({ name, entries, expected }) => {
    it(name, () => expect(collectSections(entries)).toEqual(expected))
  })
})

describe("buildAutoSteps", () => {
  const matches = [
    { path: "a.md", label: "Intro", startLine: 1, endLine: 10 },
    { path: "b.md", label: "Methods", startLine: 5, endLine: 15 },
  ]
  const sources = [
    { path: "source1.md", scope: "framework" },
    { path: "source2.md", scope: "dimension" },
  ]
  const sourceArg =
    '[{path: "source1.md", scope: "framework"}, {path: "source2.md", scope: "dimension"}]'

  const cases = [
    {
      name: "one step per section plus synthesis",
      postAction: "annotate_as_code",
      expectedLength: 3,
      expectedTitles: ["Intro", "Methods", "Relate to Research Questions"],
    },
    {
      name: "expected contains apply_deep_analysis call",
      postAction: "annotate_as_code",
      expectedExpected: [
        `apply_deep_analysis(path="a.md", start_line=1, end_line=10, source_files=${sourceArg}, post_action="annotate_as_code")`,
        `apply_deep_analysis(path="b.md", start_line=5, end_line=15, source_files=${sourceArg}, post_action="annotate_as_code")`,
      ],
    },
    {
      name: "return post_action propagates",
      postAction: "return",
      expectedExpected: [
        `apply_deep_analysis(path="a.md", start_line=1, end_line=10, source_files=${sourceArg}, post_action="return")`,
      ],
    },
  ]

  cases.forEach(({ name, postAction, expectedLength, expectedTitles, expectedExpected }) => {
    it(name, () => {
      const steps = buildAutoSteps(matches, sources, postAction)
      if (expectedLength !== undefined) expect(steps).toHaveLength(expectedLength)
      if (expectedTitles !== undefined) expect(steps.map((s) => s.title)).toEqual(expectedTitles)
      if (expectedExpected !== undefined)
        expectedExpected.forEach((exp, i) => expect(steps[i].expected).toBe(exp))
      steps.forEach((s) => expect(s.checkpoint).toBe(false))
    })
  })
})
