import { describe, expect, it } from "vitest"
import { filterCodeBlocks, stripIncompleteLink, preprocessStreaming } from "./filter"

describe("filterCodeBlocks", () => {
  const cases = [
    {
      name: "empty string returns empty string",
      input: "",
      expected: "",
    },
    {
      name: "plain text returns as-is",
      input: "Hello world",
      expected: "Hello world",
    },
    {
      name: "just ``` returns null",
      input: "```",
      expected: null,
    },
    {
      name: "``` with lang tag returns null",
      input: "```json",
      expected: null,
    },
    {
      name: "unclosed block with partial JSON returns null",
      input: "```json\n{\"type\":",
      expected: null,
    },
    {
      name: "text before unclosed block returns text",
      input: "Let me think...\n```json",
      expected: "Let me think...",
    },
    {
      name: "text before unclosed block with content returns text",
      input: "Planning now\n```json\n{\"plan\":",
      expected: "Planning now",
    },
    {
      name: "complete code block returns full content",
      input: "```json\n{\"done\": true}\n```",
      expected: "```json\n{\"done\": true}\n```",
    },
    {
      name: "text with complete code block returns full content",
      input: "Here is the result:\n```json\n{}\n```",
      expected: "Here is the result:\n```json\n{}\n```",
    },
    {
      name: "complete block then more text returns full content",
      input: "```json\n{}\n```\nDone!",
      expected: "```json\n{}\n```\nDone!",
    },
    {
      name: "multiple complete blocks returns full content",
      input: "```js\ncode1\n```\n```ts\ncode2\n```",
      expected: "```js\ncode1\n```\n```ts\ncode2\n```",
    },
    {
      name: "complete block then unclosed block returns text before unclosed",
      input: "```json\n{}\n```\nNow:\n```json\n{\"partial\":",
      expected: "```json\n{}\n```\nNow:",
    },
    {
      name: "whitespace-only before unclosed block returns null",
      input: "   \n\n```json",
      expected: null,
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(filterCodeBlocks(input)).toBe(expected)
    })
  })
})

describe("stripIncompleteLink", () => {
  const cases = [
    {
      name: "plain text returns as-is",
      input: "Hello world",
      expected: "Hello world",
    },
    {
      name: "complete link returns as-is",
      input: "Check [this](https://example.com) out",
      expected: "Check [this](https://example.com) out",
    },
    {
      name: "incomplete bracket only",
      input: "See [link text",
      expected: "See",
    },
    {
      name: "bracket closed but no url yet",
      input: "See [link text]",
      expected: "See",
    },
    {
      name: "bracket closed with partial url",
      input: "See [link text](https://exam",
      expected: "See",
    },
    {
      name: "text before complete link then incomplete",
      input: "Done [a](https://a.com). Now [b](https://b",
      expected: "Done [a](https://a.com). Now",
    },
    {
      name: "just an open bracket",
      input: "[",
      expected: "",
    },
    {
      name: "empty string",
      input: "",
      expected: "",
    },
    {
      name: "incomplete link after newline does not scan past it",
      input: "Line one\n[partial",
      expected: "Line one",
    },
    {
      name: "complete link on same line is fine",
      input: "Check [this](https://example.com)",
      expected: "Check [this](https://example.com)",
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(stripIncompleteLink(input)).toBe(expected)
    })
  })
})

describe("preprocessStreaming", () => {
  const cases = [
    {
      name: "plain text passes through",
      input: "Hello",
      expected: "Hello",
    },
    {
      name: "strips incomplete code block then incomplete link",
      input: "Text [link](http",
      expected: "Text",
    },
    {
      name: "code block hides everything",
      input: "```json\n{}",
      expected: null,
    },
    {
      name: "complete content passes through",
      input: "See [this](https://a.com) for details",
      expected: "See [this](https://a.com) for details",
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(preprocessStreaming(input)).toBe(expected)
    })
  })
})
