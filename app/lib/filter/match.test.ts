import { describe, it, expect } from "vitest"
import { matchesFilter, matchesAny } from "./match"

describe("matchesFilter", () => {
  const cases = [
    { query: "", text: "anything", expected: true, name: "empty query matches all" },
    { query: "  ", text: "anything", expected: true, name: "whitespace query matches all" },
    { query: "foo", text: "foobar", expected: true, name: "prefix match" },
    { query: "bar", text: "foobar", expected: true, name: "suffix match" },
    { query: "oba", text: "foobar", expected: true, name: "middle match" },
    { query: "FOO", text: "foobar", expected: true, name: "case insensitive query" },
    { query: "foo", text: "FOOBAR", expected: true, name: "case insensitive text" },
    { query: "baz", text: "foobar", expected: false, name: "no match" },
    { query: "foo bar", text: "foobar", expected: false, name: "space in query no match" },
  ]

  cases.forEach(({ query, text, expected, name }) => {
    it(name, () => {
      expect(matchesFilter(query, text)).toBe(expected)
    })
  })
})

describe("matchesAny", () => {
  const cases = [
    { query: "foo", texts: ["foo", "bar"], expected: true, name: "matches first" },
    { query: "bar", texts: ["foo", "bar"], expected: true, name: "matches second" },
    { query: "baz", texts: ["foo", "bar"], expected: false, name: "matches none" },
    { query: "", texts: ["foo", "bar"], expected: true, name: "empty matches all" },
    { query: "foo", texts: [], expected: false, name: "empty texts array" },
  ]

  cases.forEach(({ query, texts, expected, name }) => {
    it(name, () => {
      expect(matchesAny(query, texts)).toBe(expected)
    })
  })
})
