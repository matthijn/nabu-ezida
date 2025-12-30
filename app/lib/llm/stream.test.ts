import { describe, expect, it } from "vitest"
import { parseSSELine } from "./stream"

describe("parseSSELine", () => {
  const cases = [
    {
      name: "ignores non-data lines",
      line: "event: message",
      acc: null,
      expected: { event: null, toolCallAcc: null },
    },
    {
      name: "handles [DONE] without tool call",
      line: "data: [DONE]",
      acc: null,
      expected: { event: { type: "done" }, toolCallAcc: null },
    },
    {
      name: "handles [DONE] with pending tool call",
      line: "data: [DONE]",
      acc: { id: "call_1", name: "search", arguments: '{"q":"test"}' },
      expected: {
        event: { type: "tool_call", id: "call_1", name: "search", arguments: '{"q":"test"}' },
        toolCallAcc: null,
      },
    },
    {
      name: "parses text delta",
      line: 'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      acc: null,
      expected: { event: { type: "text_delta", content: "Hello" }, toolCallAcc: null },
    },
    {
      name: "starts new tool call accumulator",
      line: 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"search","arguments":"{"}}]}}]}',
      acc: null,
      expected: { event: null, toolCallAcc: { id: "call_1", name: "search", arguments: "{" } },
    },
    {
      name: "accumulates tool call arguments",
      line: 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"q"}}]}}]}',
      acc: { id: "call_1", name: "search", arguments: "{" },
      expected: { event: null, toolCallAcc: { id: "call_1", name: "search", arguments: "{q" } },
    },
    {
      name: "emits tool call on finish_reason",
      line: 'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
      acc: { id: "call_1", name: "search", arguments: '{"q":"test"}' },
      expected: {
        event: { type: "tool_call", id: "call_1", name: "search", arguments: '{"q":"test"}' },
        toolCallAcc: null,
      },
    },
    {
      name: "returns error on invalid JSON",
      line: "data: {invalid json}",
      acc: null,
      expected: { event: { type: "error", message: "Failed to parse SSE chunk" }, toolCallAcc: null },
    },
  ]

  cases.forEach(({ name, line, acc, expected }) => {
    it(name, () => {
      expect(parseSSELine(line, acc)).toEqual(expected)
    })
  })
})
