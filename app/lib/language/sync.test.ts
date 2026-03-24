import { describe, it, expect } from "vitest"
import { processFile } from "./sync"

const toProseFns: Record<string, (block: unknown) => string | null> = {}

const dutchProse =
  "Dit is een tekst in het Nederlands die lang genoeg is om de taal te herkennen door het algoritme"

const englishProse =
  "This is a text in English that is long enough for the language detection algorithm to work properly"

const wrapWithAttributes = (prose: string, attrs: Record<string, unknown>): string =>
  `${prose}\n\n\`\`\`json-attributes\n${JSON.stringify(attrs, null, 2)}\n\`\`\``

type Expectation = { type: "undefined" } | { type: "contains"; fragments: string[] }

const cases: { name: string; raw: string; expected: Expectation }[] = [
  {
    name: "adds language to file without attributes block",
    raw: dutchProse,
    expected: { type: "contains", fragments: ['"language": "nld"', "json-attributes"] },
  },
  {
    name: "preserves existing attributes when adding language",
    raw: wrapWithAttributes(dutchProse, { tags: ["research"] }),
    expected: { type: "contains", fragments: ['"language": "nld"', '"tags"'] },
  },
  {
    name: "skips when language already matches",
    raw: wrapWithAttributes(dutchProse, { tags: ["research"], language: "nld" }),
    expected: { type: "undefined" },
  },
  {
    name: "updates when language differs",
    raw: wrapWithAttributes(englishProse, { language: "nld" }),
    expected: { type: "contains", fragments: ['"language": "eng"'] },
  },
  {
    name: "returns undefined for empty prose",
    raw: '```json-attributes\n{"tags": ["draft"]}\n```',
    expected: { type: "undefined" },
  },
]

describe("processFile", () => {
  cases.forEach(({ name, raw, expected }) => {
    it(name, () => {
      const result = processFile(raw, toProseFns)
      if (expected.type === "undefined") {
        expect(result).toBeUndefined()
      } else {
        expect(result).toBeDefined()
        for (const fragment of expected.fragments) {
          expect(result).toContain(fragment)
        }
      }
    })
  })
})
