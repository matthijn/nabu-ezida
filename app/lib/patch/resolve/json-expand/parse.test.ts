import { describe, expect, it } from "vitest"
import { repairJsonNewlines } from "./parse"

describe("repairJsonNewlines", () => {
  const cases = [
    {
      name: "no change for valid JSON",
      input: '{"key": "value"}',
      expected: '{"key": "value"}',
    },
    {
      name: "escapes newline in string",
      input: '{"content": "line1\nline2"}',
      expected: '{"content": "line1\\nline2"}',
    },
    {
      name: "escapes multiple newlines",
      input: '{"content": "a\nb\nc"}',
      expected: '{"content": "a\\nb\\nc"}',
    },
    {
      name: "escapes carriage return",
      input: '{"content": "line1\r\nline2"}',
      expected: '{"content": "line1\\r\\nline2"}',
    },
    {
      name: "preserves newlines outside strings",
      input: '{\n  "key": "value"\n}',
      expected: '{\n  "key": "value"\n}',
    },
    {
      name: "handles escaped quotes in strings",
      input: '{"say": "he said \\"hello\nworld\\""}',
      expected: '{"say": "he said \\"hello\\nworld\\""}',
    },
    {
      name: "handles multiple strings",
      input: '{"a": "foo\nbar", "b": "baz\nqux"}',
      expected: '{"a": "foo\\nbar", "b": "baz\\nqux"}',
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(repairJsonNewlines(input)).toBe(expected)
  })
})
