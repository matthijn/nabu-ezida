import { describe, it, expect } from "vitest"
import { findText, findTextRange } from "./find"

describe("findText", () => {
  const cases = [
    {
      name: "exact match",
      needle: "hello world",
      haystack: "say hello world today",
      expected: { text: "hello world", start: 4, end: 15 },
    },
    {
      name: "case insensitive",
      needle: "hello world",
      haystack: "say Hello World today",
      expected: { text: "Hello World", start: 4, end: 15 },
    },
    {
      name: "ignores punctuation in needle",
      needle: "hello, world!",
      haystack: "say hello world today",
      expected: { text: "hello world", start: 4, end: 15 },
    },
    {
      name: "ignores punctuation in haystack",
      needle: "hello world",
      haystack: "say hello, world! today",
      expected: { text: "hello, world", start: 4, end: 16 },
    },
    {
      name: "not found",
      needle: "goodbye",
      haystack: "hello world",
      expected: null,
    },
    {
      name: "empty needle",
      needle: "",
      haystack: "hello world",
      expected: null,
    },
    {
      name: "needle longer than haystack",
      needle: "hello world foo bar",
      haystack: "hello world",
      expected: null,
    },
    {
      name: "finds first occurrence",
      needle: "the",
      haystack: "the cat and the dog",
      expected: { text: "the", start: 0, end: 3 },
    },
    {
      name: "handles markdown formatting",
      needle: "bold text",
      haystack: "some **bold text** here",
      expected: { text: "bold text", start: 7, end: 16 },
    },
  ]

  it.each(cases)("$name", ({ needle, haystack, expected }) => {
    expect(findText(needle, haystack)).toEqual(expected)
  })
})

describe("findTextRange", () => {
  const cases = [
    {
      name: "finds range",
      from: "start here",
      to: "end here",
      haystack: "before start here middle end here after",
      expected: { start: 7, end: 33 },
    },
    {
      name: "from not found",
      from: "missing",
      to: "end here",
      haystack: "start here middle end here",
      expected: null,
    },
    {
      name: "to not found",
      from: "start here",
      to: "missing",
      haystack: "start here middle end here",
      expected: null,
    },
    {
      name: "same from and to",
      from: "hello",
      to: "hello",
      haystack: "say hello world",
      expected: { start: 4, end: 9 },
    },
  ]

  it.each(cases)("$name", ({ from, to, haystack, expected }) => {
    expect(findTextRange(from, to, haystack)).toEqual(expected)
  })
})
