import { describe, it, expect } from "vitest"
import type { ScoutEntry } from "../scout/api"
import type { ScoutSection } from "../scout-map"
import {
  indexSections,
  formatIndexedSections,
  mergeSourceContent,
  formatFilteredTarget,
  collectMatches,
  buildPlanInstruction,
} from "./format"

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
  map: { file_context: "A document", sections },
  codeblocks: [],
})

const inlineEntry = (path: string): ScoutEntry => ({
  kind: "inline",
  path,
  content: "inline content",
})

describe("indexSections", () => {
  const cases = [
    {
      name: "empty entries",
      entries: [],
      expected: [],
    },
    {
      name: "single mapped entry with two sections",
      entries: [
        {
          path: "a.md",
          entry: mappedEntry([section({ label: "S1" }), section({ label: "S2" })]),
        },
      ],
      expected: [
        { globalIndex: 0, path: "a.md", section: expect.objectContaining({ label: "S1" }) },
        { globalIndex: 1, path: "a.md", section: expect.objectContaining({ label: "S2" }) },
      ],
    },
    {
      name: "multiple entries with contiguous indices",
      entries: [
        { path: "a.md", entry: mappedEntry([section({ label: "A1" })]) },
        { path: "b.md", entry: mappedEntry([section({ label: "B1" }), section({ label: "B2" })]) },
      ],
      expected: [
        { globalIndex: 0, path: "a.md", section: expect.objectContaining({ label: "A1" }) },
        { globalIndex: 1, path: "b.md", section: expect.objectContaining({ label: "B1" }) },
        { globalIndex: 2, path: "b.md", section: expect.objectContaining({ label: "B2" }) },
      ],
    },
    {
      name: "inline entries are skipped",
      entries: [
        { path: "a.md", entry: inlineEntry("a.md") },
        { path: "b.md", entry: mappedEntry([section({ label: "B1" })]) },
      ],
      expected: [
        { globalIndex: 0, path: "b.md", section: expect.objectContaining({ label: "B1" }) },
      ],
    },
  ]

  cases.forEach(({ name, entries, expected }) => {
    it(name, () => expect(indexSections(entries)).toEqual(expected))
  })
})

describe("formatIndexedSections", () => {
  const cases = [
    {
      name: "empty list",
      indexed: [],
      expected: "",
    },
    {
      name: "formats index, path, label, and keywords",
      indexed: [
        {
          globalIndex: 0,
          path: "a.md",
          section: section({ label: "Intro", keywords: ["welcome", "overview"] }),
        },
        {
          globalIndex: 1,
          path: "b.md",
          section: section({ label: "Methods", keywords: ["survey"] }),
        },
      ],
      expected: ["[0] a.md: Intro (welcome, overview)", "[1] b.md: Methods (survey)"].join("\n"),
    },
  ]

  cases.forEach(({ name, indexed, expected }) => {
    it(name, () => expect(formatIndexedSections(indexed)).toBe(expected))
  })
})

describe("mergeSourceContent", () => {
  const cases = [
    {
      name: "sorts by path and joins",
      contents: [
        { path: "b.md", content: "content B" },
        { path: "a.md", content: "content A" },
      ],
      preferences: null,
      expected: "content A\n\ncontent B",
    },
    {
      name: "appends preferences when present",
      contents: [{ path: "a.md", content: "content A" }],
      preferences: "user prefs",
      expected: "content A\n\nuser prefs",
    },
    {
      name: "no preferences",
      contents: [{ path: "a.md", content: "content A" }],
      preferences: null,
      expected: "content A",
    },
  ]

  cases.forEach(({ name, contents, preferences, expected }) => {
    it(name, () => expect(mergeSourceContent(contents, preferences)).toBe(expected))
  })
})

describe("formatFilteredTarget", () => {
  const cases = [
    {
      name: "inline entry returns full content",
      path: "a.md",
      entry: inlineEntry("a.md"),
      matching: new Set([0]),
      offset: 0,
      expected: "File: a.md\ninline content",
    },
    {
      name: "mapped with no matches returns skip",
      path: "a.md",
      entry: mappedEntry([section({ label: "S1" }), section({ label: "S2" })]),
      matching: new Set<number>(),
      offset: 0,
      expected: "File: a.md\n(skip)",
    },
    {
      name: "mapped with matching sections includes only those",
      path: "a.md",
      entry: mappedEntry([
        section({ label: "S1", start_line: 1, end_line: 10, keywords: ["k1"] }),
        section({ label: "S2", start_line: 11, end_line: 20, keywords: ["k2"] }),
      ]),
      matching: new Set([1]),
      offset: 0,
      expected: ["File: a.md", "A document", "", "[11-20] S2", "  keywords: k2"].join("\n"),
    },
    {
      name: "respects global offset",
      path: "b.md",
      entry: mappedEntry([section({ label: "B1", keywords: ["x"] })]),
      matching: new Set([3]),
      offset: 3,
      expected: ["File: b.md", "A document", "", "[1-10] B1", "  keywords: x"].join("\n"),
    },
  ]

  cases.forEach(({ name, path, entry, matching, offset, expected }) => {
    it(name, () => expect(formatFilteredTarget(path, entry, matching, offset)).toBe(expected))
  })
})

describe("collectMatches", () => {
  const cases = [
    {
      name: "collects matching sections across entries",
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
      matching: new Set([1, 2]),
      expected: [
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
      matching: new Set([0]),
      expected: [{ path: "b.md", label: "B1", startLine: 1, endLine: 5 }],
    },
    {
      name: "no matches returns empty",
      entries: [{ path: "a.md", entry: mappedEntry([section()]) }],
      matching: new Set<number>(),
      expected: [],
    },
  ]

  cases.forEach(({ name, entries, matching, expected }) => {
    it(name, () => expect(collectMatches(entries, matching)).toEqual(expected))
  })
})

describe("buildPlanInstruction", () => {
  const matches = [
    { path: "a.md", label: "Intro", startLine: 1, endLine: 10 },
    { path: "b.md", label: "Methods", startLine: 5, endLine: 15 },
  ]
  const sourcePaths = ["source1.md", "source2.md"]

  const cases = [
    {
      name: "includes post_action in match lines",
      postAction: "annotate_as_code",
      containsLines: [
        '- apply_deep_analysis: "Intro" in a.md [1-10] post_action=annotate_as_code',
        '- apply_deep_analysis: "Methods" in b.md [5-15] post_action=annotate_as_code',
      ],
    },
    {
      name: "return post_action",
      postAction: "return",
      containsLines: ['- apply_deep_analysis: "Intro" in a.md [1-10] post_action=return'],
    },
    {
      name: "annotate_as_comment post_action",
      postAction: "annotate_as_comment",
      containsLines: [
        '- apply_deep_analysis: "Intro" in a.md [1-10] post_action=annotate_as_comment',
      ],
    },
  ]

  cases.forEach(({ name, postAction, containsLines }) => {
    it(name, () => {
      const result = buildPlanInstruction(matches, sourcePaths, postAction)
      containsLines.forEach((line) => expect(result).toContain(line))
      expect(result).toContain("- source1.md")
      expect(result).toContain("- source2.md")
    })
  })
})
