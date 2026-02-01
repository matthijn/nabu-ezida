import { describe, it, expect } from "vitest"
import {
  stripPending,
  findPending,
  hasPending,
  markPending,
  resolvePending,
  resolveAllPending,
  getAllDefinitions,
  findDefinitionIds,
} from "./pending"

describe("pending", () => {
  describe("stripPending", () => {
    it("removes markers, keeps ids", () => {
      expect(stripPending('"code": "#[callout_abc12345]"')).toBe('"code": "callout_abc12345"')
    })

    it("handles multiple markers", () => {
      const input = '"a": "#[code_aaaaaaaa]", "b": "#[code_bbbbbbbb]"'
      const expected = '"a": "code_aaaaaaaa", "b": "code_bbbbbbbb"'
      expect(stripPending(input)).toBe(expected)
    })

    it("leaves clean content unchanged", () => {
      const clean = '"code": "callout_abc12345"'
      expect(stripPending(clean)).toBe(clean)
    })
  })

  describe("findPending", () => {
    it("finds all pending markers", () => {
      const content = '"a": "#[code_aaaaaaaa]", "b": "#[code_bbbbbbbb]"'
      expect(findPending(content)).toEqual(["code_aaaaaaaa", "code_bbbbbbbb"])
    })

    it("returns empty for clean content", () => {
      expect(findPending('"code": "callout_abc12345"')).toEqual([])
    })
  })

  describe("hasPending", () => {
    it("returns true for content with markers", () => {
      expect(hasPending('"code": "#[callout_abc12345]"')).toBe(true)
    })

    it("returns false for clean content", () => {
      expect(hasPending('"code": "callout_abc12345"')).toBe(false)
    })
  })

  describe("findDefinitionIds", () => {
    it("finds id field values", () => {
      const content = '{"id": "callout_abc12345", "title": "Test"}'
      expect(findDefinitionIds(content)).toEqual(new Set(["callout_abc12345"]))
    })

    it("finds multiple definitions", () => {
      const content = '{"id": "code_aaaaaaaa"}\n{"id": "code_bbbbbbbb"}'
      expect(findDefinitionIds(content)).toEqual(new Set(["code_aaaaaaaa", "code_bbbbbbbb"]))
    })

    it("ignores non-id fields with same pattern", () => {
      const content = '{"code": "callout_abc12345"}'
      expect(findDefinitionIds(content)).toEqual(new Set())
    })
  })

  describe("markPending", () => {
    it("marks unresolved foreign keys", () => {
      const content = '{"code": "callout_notfound"}'
      const definitions = new Set<string>()
      expect(markPending(content, definitions)).toBe('{"code": "#[callout_notfound]"}')
    })

    it("leaves resolved foreign keys unchanged", () => {
      const content = '{"code": "callout_exists12"}'
      const definitions = new Set(["callout_exists12"])
      expect(markPending(content, definitions)).toBe('{"code": "callout_exists12"}')
    })

    it("does not mark definition ids", () => {
      const content = '{"id": "callout_abc12345"}'
      const definitions = new Set<string>()
      expect(markPending(content, definitions)).toBe('{"id": "callout_abc12345"}')
    })
  })

  describe("resolvePending", () => {
    it("resolves specific marker", () => {
      const content = '"code": "#[callout_abc12345]"'
      expect(resolvePending(content, "callout_abc12345")).toBe('"code": "callout_abc12345"')
    })

    it("resolves all occurrences", () => {
      const content = '"a": "#[code_xxx12345]", "b": "#[code_xxx12345]"'
      expect(resolvePending(content, "code_xxx12345")).toBe('"a": "code_xxx12345", "b": "code_xxx12345"')
    })

    it("leaves other markers untouched", () => {
      const content = '"a": "#[code_aaaaaaaa]", "b": "#[code_bbbbbbbb]"'
      expect(resolvePending(content, "code_aaaaaaaa")).toBe('"a": "code_aaaaaaaa", "b": "#[code_bbbbbbbb]"')
    })
  })

  describe("resolveAllPending", () => {
    it("resolves all markers that exist in definitions", () => {
      const content = '"a": "#[code_aaaaaaaa]", "b": "#[code_bbbbbbbb]"'
      const definitions = new Set(["code_aaaaaaaa", "code_bbbbbbbb"])
      expect(resolveAllPending(content, definitions)).toBe('"a": "code_aaaaaaaa", "b": "code_bbbbbbbb"')
    })

    it("leaves unresolved markers", () => {
      const content = '"a": "#[code_aaaaaaaa]", "b": "#[code_bbbbbbbb]"'
      const definitions = new Set(["code_aaaaaaaa"])
      expect(resolveAllPending(content, definitions)).toBe('"a": "code_aaaaaaaa", "b": "#[code_bbbbbbbb]"')
    })
  })

  describe("getAllDefinitions", () => {
    it("collects definitions from all files", () => {
      const files = {
        "a.md": '{"id": "code_aaaaaaaa"}',
        "b.md": '{"id": "code_bbbbbbbb"}',
      }
      expect(getAllDefinitions(files)).toEqual(new Set(["code_aaaaaaaa", "code_bbbbbbbb"]))
    })

    it("strips pending markers before finding definitions", () => {
      const files = {
        "a.md": '{"id": "code_aaaaaaaa", "ref": "#[code_bbbbbbbb]"}',
      }
      expect(getAllDefinitions(files)).toEqual(new Set(["code_aaaaaaaa"]))
    })
  })
})
