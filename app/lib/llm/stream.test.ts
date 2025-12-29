import { describe, expect, it } from "vitest"
import { parseSSELine, handleStreamEvent, addToolResult } from "./stream"
import { createInitialState, appendStreaming } from "./reducers"
import type { BlockState, StreamEvent } from "./types"

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

describe("handleStreamEvent", () => {
  const baseState = createInitialState()

  const cases: Array<{
    name: string
    state: BlockState
    event: StreamEvent
    expectedStatus: BlockState["status"]
    expectedEffectsLength: number
  }> = [
    {
      name: "appends text delta to streaming",
      state: baseState,
      event: { type: "text_delta", content: "Hello" },
      expectedStatus: "idle",
      expectedEffectsLength: 0,
    },
    {
      name: "transitions to done on done event",
      state: baseState,
      event: { type: "done" },
      expectedStatus: "done",
      expectedEffectsLength: 0,
    },
    {
      name: "transitions to error on error event",
      state: baseState,
      event: { type: "error", message: "Failed" },
      expectedStatus: "error",
      expectedEffectsLength: 0,
    },
    {
      name: "transitions to awaiting_tool on tool_call",
      state: baseState,
      event: { type: "tool_call", id: "call_1", name: "search", arguments: "{}" },
      expectedStatus: "awaiting_tool",
      expectedEffectsLength: 1,
    },
  ]

  cases.forEach(({ name, state, event, expectedStatus, expectedEffectsLength }) => {
    it(name, () => {
      const result = handleStreamEvent(state, event)
      expect(result.state.status).toBe(expectedStatus)
      expect(result.effects.length).toBe(expectedEffectsLength)
    })
  })

  it("finalizes streaming content on done", () => {
    const stateWithContent = appendStreaming(baseState, "Hello world")
    const result = handleStreamEvent(stateWithContent, { type: "done" })
    expect(result.state.streaming).toBe("")
    expect(result.state.messages).toHaveLength(1)
    expect(result.state.messages[0]).toEqual({ role: "assistant", content: "Hello world" })
  })

  it("emits execute_tool effect for tool_call", () => {
    const result = handleStreamEvent(baseState, {
      type: "tool_call",
      id: "call_1",
      name: "search",
      arguments: '{"query":"test"}',
    })
    expect(result.effects[0]).toEqual({
      type: "execute_tool",
      id: "call_1",
      name: "search",
      args: { query: "test" },
    })
  })
})

describe("addToolResult", () => {
  const cases = [
    {
      name: "adds tool result message",
      toolCallId: "call_1",
      result: { data: "test" },
      expectedContent: '{"data":"test"}',
    },
    {
      name: "serializes error result",
      toolCallId: "call_2",
      result: { error: "Not found" },
      expectedContent: '{"error":"Not found"}',
    },
  ]

  cases.forEach(({ name, toolCallId, result, expectedContent }) => {
    it(name, () => {
      const state = createInitialState()
      const newState = addToolResult(state, toolCallId, result)
      expect(newState.messages).toHaveLength(1)
      expect(newState.messages[0]).toEqual({
        role: "tool",
        content: expectedContent,
        tool_call_id: toolCallId,
      })
    })
  })
})
