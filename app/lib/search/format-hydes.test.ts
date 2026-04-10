import { describe, it, expect } from "vitest"
import { formatHydeDebug } from "./format-hydes"
import type { HydeQuery } from "./semantic"

const hyde = (language: string, group: string, text: string): HydeQuery => ({
  text,
  language,
  group,
  cosineVector: [],
})

describe("formatHydeDebug", () => {
  const cases: { name: string; hydes: HydeQuery[]; expected: string }[] = [
    {
      name: "empty input",
      hydes: [],
      expected: "",
    },
    {
      name: "single language single group single text",
      hydes: [hyde("eng", "interviews", "I feel anxious")],
      expected: "━━━ ENG ━━━\n  interviews\n    1. I feel anxious",
    },
    {
      name: "single language multiple groups",
      hydes: [
        hyde("eng", "interviews", "I feel anxious"),
        hyde("eng", "reports", "Workplace stress is rising"),
      ],
      expected:
        "━━━ ENG ━━━\n  interviews\n    1. I feel anxious\n\n  reports\n    1. Workplace stress is rising",
    },
    {
      name: "single language single group multiple texts",
      hydes: [
        hyde("eng", "interviews", "first hypothetical"),
        hyde("eng", "interviews", "second hypothetical"),
      ],
      expected: "━━━ ENG ━━━\n  interviews\n    1. first hypothetical\n    2. second hypothetical",
    },
    {
      name: "multiple languages, multiple groups",
      hydes: [
        hyde("eng", "interviews", "I feel anxious"),
        hyde("eng", "reports", "Workplace stress is rising"),
        hyde("nld", "interviews", "Ik voel me angstig"),
      ],
      expected:
        "━━━ ENG ━━━\n  interviews\n    1. I feel anxious\n\n  reports\n    1. Workplace stress is rising\n\n━━━ NLD ━━━\n  interviews\n    1. Ik voel me angstig",
    },
    {
      name: "preserves insertion order across languages and groups",
      hydes: [
        hyde("nld", "reports", "rapport tekst"),
        hyde("eng", "interviews", "interview text"),
        hyde("nld", "interviews", "interview tekst"),
      ],
      expected:
        "━━━ NLD ━━━\n  reports\n    1. rapport tekst\n\n  interviews\n    1. interview tekst\n\n━━━ ENG ━━━\n  interviews\n    1. interview text",
    },
  ]

  it.each(cases)("$name", ({ hydes, expected }) => {
    expect(formatHydeDebug(hydes)).toBe(expected)
  })
})
