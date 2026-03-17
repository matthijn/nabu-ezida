import { describe, test, expect } from "vitest"
import { normalizeBacktickQuotes } from "./normalize-backticks"

describe("normalizeBacktickQuotes", () => {
  const cases: [string, string, string][] = [
    ["heading", "`## Introduction`", '"Introduction"'],
    ["nested heading", "`### Methods`", '"Methods"'],
    ["h1", "`# Title`", '"Title"'],
    ["list marker dash", "`- some item`", '"some item"'],
    ["list marker star", "`* some item`", '"some item"'],
    ["ordered list", "`1. first`", '"first"'],
    ["blockquote", "`> quoted text`", '"quoted text"'],
    ["combined prefix", "`> ## quoted heading`", '"quoted heading"'],
    ["bold", "`**bold text**`", '"bold text"'],
    ["italic", "`*italic text*`", '"italic text"'],
    ["underscore bold", "`__bold text__`", '"bold text"'],
    ["underscore italic", "`_italic text_`", '"italic text"'],
    ["plain text", "`plain text`", '"plain text"'],
    ["no backticks", "regular text", "regular text"],
    ["empty string", "", ""],
    ["preserves markdown links", "[text](url) and `## heading`", '[text](url) and "heading"'],
    ["preserves code blocks", "```\ncode\n``` then `## heading`", '```\ncode\n``` then "heading"'],
    ["multiple backtick pairs", "`## First` and `### Second`", '"First" and "Second"'],
    ["mixed with plain text", "see `## Methods` for details", 'see "Methods" for details'],
    ["heading with prefix strip", "`#### Deep heading`", '"Deep heading"'],
  ]

  test.each(cases)("%s", (_, input, expected) => {
    expect(normalizeBacktickQuotes(input)).toBe(expected)
  })
})
