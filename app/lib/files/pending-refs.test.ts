import { describe, it, expect } from "vitest"
import {
  stripPendingRefs,
  findPendingRefs,
  hasPendingRefs,
  markPendingRefs,
  resolvePendingRef,
  resolveAllPendingRefs,
  getAllDefinitions,
  findDefinitionIds,
} from "./pending-refs"

describe("pending-refs", () => {
  describe("stripPendingRefs", () => {
    const cases = [
      {
        name: "removes markers, keeps ids",
        input: '"code": "#[callout-1bc12345]"',
        expected: '"code": "callout-1bc12345"',
      },
      {
        name: "handles multiple markers",
        input: '"a": "#[code-1aaaaaaa]", "b": "#[code-2bbbbbbb]"',
        expected: '"a": "code-1aaaaaaa", "b": "code-2bbbbbbb"',
      },
      {
        name: "leaves clean content unchanged",
        input: '"code": "callout-1bc12345"',
        expected: '"code": "callout-1bc12345"',
      },
    ]

    cases.forEach(({ name, input, expected }) => {
      it(name, () => expect(stripPendingRefs(input)).toBe(expected))
    })
  })

  describe("findPendingRefs", () => {
    const cases = [
      {
        name: "finds all pending ref markers",
        input: '"a": "#[code-1aaaaaaa]", "b": "#[code-2bbbbbbb]"',
        expected: ["code-1aaaaaaa", "code-2bbbbbbb"],
      },
      {
        name: "returns empty for clean content",
        input: '"code": "callout-1bc12345"',
        expected: [],
      },
    ]

    cases.forEach(({ name, input, expected }) => {
      it(name, () => expect(findPendingRefs(input)).toEqual(expected))
    })
  })

  describe("hasPendingRefs", () => {
    const cases = [
      {
        name: "true for content with markers",
        input: '"code": "#[callout-1bc12345]"',
        expected: true,
      },
      { name: "false for clean content", input: '"code": "callout-1bc12345"', expected: false },
    ]

    cases.forEach(({ name, input, expected }) => {
      it(name, () => expect(hasPendingRefs(input)).toBe(expected))
    })
  })

  describe("findDefinitionIds", () => {
    const cases = [
      {
        name: "finds id field values",
        input: '{"id": "callout-1bc12345", "title": "Test"}',
        expected: new Set(["callout-1bc12345"]),
      },
      {
        name: "finds multiple definitions",
        input: '{"id": "code-1aaaaaaa"}\n{"id": "code-2bbbbbbb"}',
        expected: new Set(["code-1aaaaaaa", "code-2bbbbbbb"]),
      },
      {
        name: "ignores non-id fields with same pattern",
        input: '{"code": "callout-1bc12345"}',
        expected: new Set(),
      },
      {
        name: "ignores ids without leading digit in suffix",
        input: '{"id": "pending_deletion"}',
        expected: new Set(),
      },
    ]

    cases.forEach(({ name, input, expected }) => {
      it(name, () => expect(findDefinitionIds(input)).toEqual(expected))
    })
  })

  describe("markPendingRefs", () => {
    const cases = [
      {
        name: "marks unresolved foreign keys",
        input: '{"code": "callout-1otfound"}',
        definitions: new Set<string>(),
        expected: '{"code": "#[callout-1otfound]"}',
      },
      {
        name: "leaves resolved foreign keys unchanged",
        input: '{"code": "callout-3xists12"}',
        definitions: new Set(["callout-3xists12"]),
        expected: '{"code": "callout-3xists12"}',
      },
      {
        name: "does not mark definition ids",
        input: '{"id": "callout-1bc12345"}',
        definitions: new Set<string>(),
        expected: '{"id": "callout-1bc12345"}',
      },
      {
        name: "does not mark strings without leading digit in suffix",
        input: '{"pending": "pending_deletion"}',
        definitions: new Set<string>(),
        expected: '{"pending": "pending_deletion"}',
      },
    ]

    cases.forEach(({ name, input, definitions, expected }) => {
      it(name, () => expect(markPendingRefs(input, definitions)).toBe(expected))
    })
  })

  describe("resolvePendingRef", () => {
    const cases = [
      {
        name: "resolves specific marker",
        input: '"code": "#[callout-1bc12345]"',
        id: "callout-1bc12345",
        expected: '"code": "callout-1bc12345"',
      },
      {
        name: "resolves all occurrences",
        input: '"a": "#[code-1xx12345]", "b": "#[code-1xx12345]"',
        id: "code-1xx12345",
        expected: '"a": "code-1xx12345", "b": "code-1xx12345"',
      },
      {
        name: "leaves other markers untouched",
        input: '"a": "#[code-1aaaaaaa]", "b": "#[code-2bbbbbbb]"',
        id: "code-1aaaaaaa",
        expected: '"a": "code-1aaaaaaa", "b": "#[code-2bbbbbbb]"',
      },
    ]

    cases.forEach(({ name, input, id, expected }) => {
      it(name, () => expect(resolvePendingRef(input, id)).toBe(expected))
    })
  })

  describe("resolveAllPendingRefs", () => {
    const cases = [
      {
        name: "resolves all markers that exist in definitions",
        input: '"a": "#[code-1aaaaaaa]", "b": "#[code-2bbbbbbb]"',
        definitions: new Set(["code-1aaaaaaa", "code-2bbbbbbb"]),
        expected: '"a": "code-1aaaaaaa", "b": "code-2bbbbbbb"',
      },
      {
        name: "leaves unresolved markers",
        input: '"a": "#[code-1aaaaaaa]", "b": "#[code-2bbbbbbb]"',
        definitions: new Set(["code-1aaaaaaa"]),
        expected: '"a": "code-1aaaaaaa", "b": "#[code-2bbbbbbb]"',
      },
    ]

    cases.forEach(({ name, input, definitions, expected }) => {
      it(name, () => expect(resolveAllPendingRefs(input, definitions)).toBe(expected))
    })
  })

  describe("getAllDefinitions", () => {
    const cases: { name: string; files: Record<string, string>; expected: Set<string> }[] = [
      {
        name: "collects definitions from all files",
        files: {
          "a.md": '{"id": "code-1aaaaaaa"}',
          "b.md": '{"id": "code-2bbbbbbb"}',
        },
        expected: new Set(["code-1aaaaaaa", "code-2bbbbbbb"]),
      },
      {
        name: "strips pending ref markers before finding definitions",
        files: {
          "a.md": '{"id": "code-1aaaaaaa", "ref": "#[code-2bbbbbbb]"}',
        },
        expected: new Set(["code-1aaaaaaa"]),
      },
    ]

    cases.forEach(({ name, files, expected }) => {
      it(name, () => expect(getAllDefinitions(files)).toEqual(expected))
    })
  })
})
