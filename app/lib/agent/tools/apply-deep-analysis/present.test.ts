import { describe, it, expect } from "vitest"
import { formatCodedSection, type CodedItem } from "./present"

describe("formatCodedSection", () => {
  const sentences = [
    "The prime minister opened the press conference.",
    "He stated that measures would be extended.",
    "This was met with mixed reactions.",
    "De Jonge presented the figures.",
    "The system was under pressure.",
    "The prime minister concluded by urging patience.",
  ]

  const cases: {
    name: string
    items: CodedItem[]
    expectedLines: string[]
    expectedMappingCount: number
  }[] = [
    {
      name: "single code per item",
      items: [
        { start: 2, end: 2, codings: ["rhetorical-authority"] },
        { start: 4, end: 5, codings: ["crisis-framing"] },
      ],
      expectedLines: [
        "The prime minister opened the press conference.",
        "1: [rhetorical-authority] He stated that measures would be extended.",
        "This was met with mixed reactions.",
        "2: [crisis-framing] De Jonge presented the figures. The system was under pressure.",
        "The prime minister concluded by urging patience.",
      ],
      expectedMappingCount: 2,
    },
    {
      name: "multiple codes per item",
      items: [{ start: 2, end: 3, codings: ["crisis-framing", "rhetorical-authority"] }],
      expectedLines: [
        "The prime minister opened the press conference.",
        "1: [crisis-framing, rhetorical-authority] He stated that measures would be extended. This was met with mixed reactions.",
        "De Jonge presented the figures.",
        "The system was under pressure.",
        "The prime minister concluded by urging patience.",
      ],
      expectedMappingCount: 1,
    },
    {
      name: "code + reason",
      items: [
        {
          start: 2,
          end: 2,
          codings: ["crisis-framing"],
          reason: "Satisfies the 'worsening metrics' criterion.",
        },
      ],
      expectedLines: [
        "The prime minister opened the press conference.",
        "1: [crisis-framing] He stated that measures would be extended.",
        "   Reason: Satisfies the 'worsening metrics' criterion.",
        "This was met with mixed reactions.",
        "De Jonge presented the figures.",
        "The system was under pressure.",
        "The prime minister concluded by urging patience.",
      ],
      expectedMappingCount: 1,
    },
    {
      name: "no items: all sentences as plain context",
      items: [],
      expectedLines: sentences,
      expectedMappingCount: 0,
    },
    {
      name: "all sentences coded",
      items: [{ start: 1, end: 6, codings: ["full-span"] }],
      expectedLines: [
        "1: [full-span] The prime minister opened the press conference. He stated that measures would be extended. This was met with mixed reactions. De Jonge presented the figures. The system was under pressure. The prime minister concluded by urging patience.",
      ],
      expectedMappingCount: 1,
    },
    {
      name: "mapping preserves original span info",
      items: [
        { start: 3, end: 5, codings: ["X"] },
        { start: 1, end: 1, codings: ["Y"] },
      ],
      expectedLines: [
        "2: [Y] The prime minister opened the press conference.",
        "He stated that measures would be extended.",
        "1: [X] This was met with mixed reactions. De Jonge presented the figures. The system was under pressure.",
        "The prime minister concluded by urging patience.",
      ],
      expectedMappingCount: 2,
    },
  ]

  cases.forEach(({ name, items, expectedLines, expectedMappingCount }) => {
    it(name, () => {
      const result = formatCodedSection(sentences, items)
      expect(result.text).toBe(expectedLines.join("\n"))
      expect(result.mapping).toHaveLength(expectedMappingCount)
    })
  })

  it("mapping links index to original span", () => {
    const items: CodedItem[] = [
      { start: 2, end: 3, codings: ["A"] },
      { start: 5, end: 5, codings: ["B"] },
    ]
    const { mapping } = formatCodedSection(sentences, items)
    expect(mapping[0]).toEqual({ index: 1, start: 2, end: 3, codings: ["A"] })
    expect(mapping[1]).toEqual({ index: 2, start: 5, end: 5, codings: ["B"] })
  })
})
