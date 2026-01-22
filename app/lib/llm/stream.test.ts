import { describe, expect, it } from "vitest"
import { parseSSELine, initialParseState } from "./stream"

describe("parseSSELine", () => {
  const cases = [
    {
      name: "captures event type",
      lines: ["event: response.output_text.delta"],
      expected: { event: null, currentEvent: "response.output_text.delta" },
    },
    {
      name: "parses text delta",
      lines: ["event: response.output_text.delta", 'data: {"delta":"Hello"}'],
      expected: { event: { type: "text_delta", content: "Hello" }, currentEvent: "response.output_text.delta" },
    },
    {
      name: "parses tool call done",
      lines: [
        "event: response.function_call_arguments.done",
        'data: {"call_id":"call_1","name":"search","arguments":"{\\"q\\":\\"test\\"}"}',
      ],
      expected: {
        event: { type: "tool_call", id: "call_1", name: "search", arguments: '{"q":"test"}' },
        currentEvent: "response.function_call_arguments.done",
      },
    },
    {
      name: "handles response completed",
      lines: ["event: response.completed", "data: {}"],
      expected: { event: { type: "done" }, currentEvent: "" },
    },
    {
      name: "returns error on invalid JSON",
      lines: ["event: response.output_text.delta", "data: {invalid json}"],
      expected: { event: { type: "error", message: "Failed to parse SSE chunk" }, currentEvent: "response.output_text.delta" },
    },
    {
      name: "ignores unknown event types",
      lines: ["event: response.unknown", "data: {}"],
      expected: { event: null, currentEvent: "response.unknown" },
    },
  ]

  cases.forEach(({ name, lines, expected }) => {
    it(name, () => {
      let state = initialParseState()
      let lastResult: ReturnType<typeof parseSSELine> = { event: null, state }

      for (const line of lines) {
        lastResult = parseSSELine(line, lastResult.state)
      }

      expect(lastResult.event).toEqual(expected.event)
      expect(lastResult.state.currentEvent).toBe(expected.currentEvent)
    })
  })
})
