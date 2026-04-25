import { describe, it, expect } from "vitest"
import {
  extractSection,
  extractLeadingContext,
  numberSection,
  mapResults,
  toAnnotationOps,
  formatReturnOutput,
  formatAnnotateOutput,
  isAnnotateAction,
  ABSENCE_HINT,
  type MappedResult,
} from "./format"

describe("extractSection", () => {
  const content = "line1\nline2\nline3\nline4\nline5"

  const cases = [
    { name: "full range", start: 1, end: 5, expected: "line1\nline2\nline3\nline4\nline5" },
    { name: "middle range", start: 2, end: 4, expected: "line2\nline3\nline4" },
    { name: "single line", start: 3, end: 3, expected: "line3" },
    { name: "clamped to content", start: 4, end: 10, expected: "line4\nline5" },
  ]

  cases.forEach(({ name, start, end, expected }) => {
    it(name, () => expect(extractSection(content, start, end)).toBe(expected))
  })
})

describe("extractLeadingContext", () => {
  const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1} has some content here.`)
  const content = lines.join("\n")

  const cases = [
    { name: "returns empty for first line", startLine: 1, ratio: 0.2, expected: "" },
    {
      name: "returns tail 20% of preceding lines",
      startLine: 11,
      ratio: 0.2,
      expected: lines.slice(8, 10).join("\n"),
    },
    {
      name: "returns all preceding when ratio is 1.0",
      startLine: 6,
      ratio: 1.0,
      expected: lines.slice(0, 5).join("\n"),
    },
    {
      name: "returns empty when ratio is 0",
      startLine: 11,
      ratio: 0,
      expected: "",
    },
    {
      name: "returns preceding line when single line exists",
      startLine: 2,
      ratio: 0.2,
      expected: lines[0],
    },
  ]

  cases.forEach(({ name, startLine, ratio, expected }) => {
    it(name, () => expect(extractLeadingContext(content, startLine, ratio)).toBe(expected))
  })
})

describe("numberSection", () => {
  const cases = [
    {
      name: "splits on sentence boundaries",
      text: "First sentence. Second sentence. Third.",
      expectedCount: 3,
      numberedContains: "1: First sentence.",
    },
    {
      name: "splits on newlines",
      text: "Line one\nLine two",
      expectedCount: 2,
      numberedContains: "2: Line two",
    },
    {
      name: "empty text",
      text: "",
      expectedCount: 0,
      numberedContains: null,
    },
  ]

  cases.forEach(({ name, text, expectedCount, numberedContains }) => {
    it(name, () => {
      const result = numberSection(text)
      expect(result.sentences).toHaveLength(expectedCount)
      if (numberedContains) expect(result.numbered).toContain(numberedContains)
    })
  })
})

describe("mapResults", () => {
  const sentences = ["First sentence.", "Second sentence.", "Third sentence."]

  const cases = [
    {
      name: "maps single result",
      results: [{ start: 1, end: 2, analysis_source_id: "code_1", reason: "relevant" }],
      expected: [
        {
          text: "First sentence. Second sentence.",
          analysis_source_id: "code_1",
          reason: "relevant",
        },
      ],
    },
    {
      name: "maps multiple results",
      results: [
        { start: 1, end: 1, analysis_source_id: "code_1", reason: "r1" },
        { start: 3, end: 3, analysis_source_id: "code_2", reason: "r2" },
      ],
      expected: [
        { text: "First sentence.", analysis_source_id: "code_1", reason: "r1" },
        { text: "Third sentence.", analysis_source_id: "code_2", reason: "r2" },
      ],
    },
    {
      name: "skips out-of-range",
      results: [{ start: 10, end: 12, analysis_source_id: "code_x", reason: "nope" }],
      expected: [],
    },
    {
      name: "empty results",
      results: [],
      expected: [],
    },
    {
      name: "passes review through when present",
      results: [
        {
          start: 1,
          end: 1,
          analysis_source_id: "code_1",
          reason: "r1",
          review: "check definition",
        },
      ],
      expected: [
        {
          text: "First sentence.",
          analysis_source_id: "code_1",
          reason: "r1",
          review: "check definition",
        },
      ],
    },
    {
      name: "omits review when absent",
      results: [{ start: 1, end: 1, analysis_source_id: "code_1", reason: "r1" }],
      expected: [{ text: "First sentence.", analysis_source_id: "code_1", reason: "r1" }],
    },
  ]

  cases.forEach(({ name, results, expected }) => {
    it(name, () => expect(mapResults(sentences, results)).toEqual(expected))
  })
})

describe("toAnnotationOps", () => {
  const cases = [
    {
      name: "annotate_as_code sets code field",
      mapped: [{ text: "Some text", analysis_source_id: "code_abc", reason: "fits criteria" }],
      action: "annotate_as_code" as const,
      expected: [
        {
          op: "add_annotation",
          item: { text: "Some text", reason: "fits criteria", code: "code_abc" },
        },
      ],
    },
    {
      name: "annotate_as_comment sets color and embeds id in reason",
      mapped: [{ text: "Some text", analysis_source_id: "code_abc", reason: "fits criteria" }],
      action: "annotate_as_comment" as const,
      expected: [
        {
          op: "add_annotation",
          item: { text: "Some text", reason: "[code_abc] fits criteria", color: "blue" },
        },
      ],
    },
    {
      name: "annotate_as_code includes review when present",
      mapped: [
        {
          text: "Some text",
          analysis_source_id: "code_abc",
          reason: "fits",
          review: "stretched definition",
        },
      ],
      action: "annotate_as_code" as const,
      expected: [
        {
          op: "add_annotation",
          item: {
            text: "Some text",
            reason: "fits",
            code: "code_abc",
            review: "stretched definition",
          },
        },
      ],
    },
    {
      name: "annotate_as_code omits review when absent",
      mapped: [{ text: "Some text", analysis_source_id: "code_abc", reason: "fits" }],
      action: "annotate_as_code" as const,
      expected: [
        {
          op: "add_annotation",
          item: { text: "Some text", reason: "fits", code: "code_abc" },
        },
      ],
    },
  ]

  cases.forEach(({ name, mapped, action, expected }) => {
    it(name, () => expect(toAnnotationOps(mapped, action)).toEqual(expected))
  })
})

describe("formatReturnOutput", () => {
  const cases = [
    {
      name: "no results includes line range and absence hint",
      results: [],
      startLine: 10,
      endLine: 50,
      expected: `Lines 10-50 analyzed. No matches found.${ABSENCE_HINT}`,
    },
    {
      name: "formats results as list",
      results: [
        { text: "Some text", analysis_source_id: "code_1", reason: "because" },
        { text: "Other text", analysis_source_id: "code_2", reason: "also" },
      ],
      startLine: 1,
      endLine: 10,
      expected: '- [code_1] "Some text": because\n- [code_2] "Other text": also',
    },
    {
      name: "includes review tag when present",
      results: [
        {
          text: "Some text",
          analysis_source_id: "code_1",
          reason: "because",
          review: "check this",
        },
      ],
      startLine: 1,
      endLine: 5,
      expected: '- [code_1] "Some text": because [REVIEW: check this]',
    },
    {
      name: "omits review tag when absent",
      results: [{ text: "Some text", analysis_source_id: "code_1", reason: "because" }],
      startLine: 1,
      endLine: 5,
      expected: '- [code_1] "Some text": because',
    },
  ]

  cases.forEach(({ name, results, startLine, endLine, expected }) => {
    it(name, () => expect(formatReturnOutput(results, startLine, endLine)).toBe(expected))
  })
})

describe("formatAnnotateOutput", () => {
  const results: MappedResult[] = [
    { text: "Some text", analysis_source_id: "code_1", reason: "because" },
    { text: "Other text", analysis_source_id: "code_2", reason: "also" },
  ]

  const cases = [
    {
      name: "empty results for code includes absence hint",
      action: "annotate_as_code" as const,
      input: [],
      startLine: 5,
      endLine: 20,
      contains: "Lines 5-20 analyzed. No matches found. No annotations written.",
    },
    {
      name: "empty results for comment includes absence hint",
      action: "annotate_as_comment" as const,
      input: [],
      startLine: 5,
      endLine: 20,
      contains: "Lines 5-20 analyzed. No matches found. No annotations written.",
    },
    {
      name: "empty results include absence hint text",
      action: "annotate_as_code" as const,
      input: [],
      startLine: 5,
      endLine: 20,
      contains: "Absence is data.",
    },
    {
      name: "code annotations include count and results",
      action: "annotate_as_code" as const,
      input: results,
      startLine: 1,
      endLine: 10,
      contains: "2 code annotation(s) written. Do not re-apply these.",
    },
    {
      name: "comment annotations include count and results",
      action: "annotate_as_comment" as const,
      input: results,
      startLine: 1,
      endLine: 10,
      contains: "2 comment annotation(s) written. Do not re-apply these.",
    },
    {
      name: "includes result details",
      action: "annotate_as_code" as const,
      input: results,
      startLine: 1,
      endLine: 10,
      contains: '- [code_1] "Some text": because',
    },
  ]

  cases.forEach(({ name, action, input, startLine, endLine, contains }) => {
    it(name, () =>
      expect(formatAnnotateOutput(input, action, startLine, endLine)).toContain(contains)
    )
  })
})

describe("isAnnotateAction", () => {
  const cases = [
    { name: "return is false", action: "return" as const, expected: false },
    { name: "annotate_as_code is true", action: "annotate_as_code" as const, expected: true },
    { name: "annotate_as_comment is true", action: "annotate_as_comment" as const, expected: true },
  ]

  cases.forEach(({ name, action, expected }) => {
    it(name, () => expect(isAnnotateAction(action)).toBe(expected))
  })
})
