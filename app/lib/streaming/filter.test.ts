import { describe, expect, it } from "vitest"
import { filterCodeBlocks } from "./filter"

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
