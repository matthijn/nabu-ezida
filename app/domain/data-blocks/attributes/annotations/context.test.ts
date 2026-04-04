import { describe, expect, it } from "vitest"
import { buildCodeReviewContext, buildExplainCodingContext } from "./context"

interface FlaggedAnnotation {
  text: string
  reason: string
  review?: string
}

const flagged = (overrides: Partial<FlaggedAnnotation> = {}): FlaggedAnnotation => ({
  text: "the participant said",
  reason: "interesting phrasing",
  review: "check against codebook definition",
  ...overrides,
})

describe("buildCodeReviewContext", () => {
  const cases: {
    name: string
    title: string
    detail: string
    annotations: FlaggedAnnotation[]
    expected: string[]
  }[] = [
    {
      name: "single flagged annotation",
      title: "Emotional Response",
      detail: "When a participant expresses feelings",
      annotations: [flagged()],
      expected: [
        "Code: Emotional Response",
        "Definition: When a participant expresses feelings",
        "",
        "Flagged annotations (1):",
        '1. "the participant said"',
        "   Reason: interesting phrasing",
        "   Review: check against codebook definition",
      ],
    },
    {
      name: "multiple flagged annotations",
      title: "Theme A",
      detail: "Detail A",
      annotations: [
        flagged({ text: "first quote", reason: "reason one", review: "review one" }),
        flagged({ text: "second quote", reason: "reason two", review: "review two" }),
      ],
      expected: [
        "Code: Theme A",
        "Definition: Detail A",
        "",
        "Flagged annotations (2):",
        '1. "first quote"',
        "   Reason: reason one",
        "   Review: review one",
        '2. "second quote"',
        "   Reason: reason two",
        "   Review: review two",
      ],
    },
    {
      name: "empty flagged list",
      title: "Theme B",
      detail: "Detail B",
      annotations: [],
      expected: ["Code: Theme B", "Definition: Detail B", "", "Flagged annotations (0):"],
    },
  ]

  it.each(cases)("$name", ({ title, detail, annotations, expected }) => {
    const result = buildCodeReviewContext(title, detail, annotations)
    expect(result).toBe(expected.join("\n"))
  })
})

describe("buildExplainCodingContext", () => {
  const cases: {
    name: string
    title: string
    detail: string
    text: string
    reason: string
    expected: string[]
  }[] = [
    {
      name: "builds context for coded annotation",
      title: "Emotional Response",
      detail: "When a participant expresses feelings",
      text: "I felt really overwhelmed",
      reason: "strong emotional language",
      expected: [
        "Code: Emotional Response",
        "Definition: When a participant expresses feelings",
        "",
        'Annotated text: "I felt really overwhelmed"',
        "Reason: strong emotional language",
      ],
    },
    {
      name: "handles minimal content",
      title: "Theme A",
      detail: "",
      text: "short",
      reason: "brief",
      expected: ["Code: Theme A", "Definition: ", "", 'Annotated text: "short"', "Reason: brief"],
    },
  ]

  it.each(cases)("$name", ({ title, detail, text, reason, expected }) => {
    const result = buildExplainCodingContext(title, detail, text, reason)
    expect(result).toBe(expected.join("\n"))
  })
})
