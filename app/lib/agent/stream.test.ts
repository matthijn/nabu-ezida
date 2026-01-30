import { describe, expect, it } from "vitest"
import { processLine, initialParseState, blocksToMessages } from "./stream"
import type { Block } from "./types"

type ParseCallbacks = {
  onChunk?: (text: string) => void
  onToolArgsChunk?: (text: string) => void
  onReasoningChunk?: (text: string) => void
  onToolName?: (name: string) => void
}

type TestContext = {
  chunks: string[]
  toolArgsChunks: string[]
  reasoningChunks: string[]
  toolNames: string[]
}

const processWithCallbacks = (line: string, state: ReturnType<typeof initialParseState>, ctx: TestContext) => {
  const callbacks: ParseCallbacks = {
    onChunk: (text) => ctx.chunks.push(text),
    onToolArgsChunk: (text) => ctx.toolArgsChunks.push(text),
    onReasoningChunk: (text) => ctx.reasoningChunks.push(text),
    onToolName: (name) => ctx.toolNames.push(name),
  }
  return processLine(line, state, callbacks)
}

const processWithChunks = (line: string, state: ReturnType<typeof initialParseState>, chunks: string[]) => {
  const callbacks: ParseCallbacks = { onChunk: (text) => chunks.push(text) }
  return processLine(line, state, callbacks)
}

describe("parser", () => {
  describe("text content", () => {
    const cases = [
      {
        name: "accumulates text deltas",
        lines: [
          "event: response.output_text.delta",
          'data: {"delta":"Hello"}',
          "event: response.output_text.delta",
          'data: {"delta":" world"}',
          "event: response.completed",
          "data: {}",
        ],
        expectedText: "Hello world",
        expectedChunks: ["Hello", " world"],
      },
      {
        name: "ignores unknown event types",
        lines: [
          "event: response.unknown",
          "data: {}",
          "event: response.output_text.delta",
          'data: {"delta":"Hi"}',
          "event: response.completed",
          "data: {}",
        ],
        expectedText: "Hi",
        expectedChunks: ["Hi"],
      },
    ]

    cases.forEach(({ name, lines, expectedText, expectedChunks }) => {
      it(name, () => {
        let state = initialParseState()
        const chunks: string[] = []

        for (const line of lines) {
          state = processWithChunks(line, state, chunks)
        }

        expect(state.textContent).toBe(expectedText)
        expect(chunks).toEqual(expectedChunks)
      })
    })
  })

  describe("tool calls", () => {
    const cases = [
      {
        name: "parses single tool call",
        lines: [
          "event: response.output_item.done",
          'data: {"item":{"type":"function_call","call_id":"call_1","name":"execute_sql","arguments":"{\\"sql\\":\\"SELECT 1\\"}"}}',
        ],
        expectedCalls: [{ id: "call_1", name: "execute_sql", args: { sql: "SELECT 1" } }],
      },
      {
        name: "fires onToolName on output_item.added",
        lines: [
          "event: response.output_item.added",
          'data: {"item":{"type":"function_call","call_id":"call_1","name":"execute_sql"}}',
        ],
        expectedCalls: [],
        expectedToolNames: ["execute_sql"],
      },
      {
        name: "streams function call arguments delta",
        lines: [
          "event: response.function_call_arguments.delta",
          'data: {"delta":"{\\"sql"}',
        ],
        expectedCalls: [],
        expectedToolArgsChunks: ['{"sql'],
      },
      {
        name: "ignores apply_patch diff delta (no streaming)",
        lines: [
          "event: response.apply_patch_call_operation_diff.delta",
          'data: {"delta":"+hello"}',
        ],
        expectedCalls: [],
        expectedChunks: [],
      },
      {
        name: "streams reasoning summary delta",
        lines: [
          "event: response.reasoning_summary_text.delta",
          'data: {"delta":"Let me think"}',
        ],
        expectedCalls: [],
        expectedReasoningChunks: ["Let me think"],
      },
      {
        name: "parses multiple tool calls",
        lines: [
          "event: response.output_item.done",
          'data: {"item":{"type":"function_call","call_id":"call_1","name":"a","arguments":"{}"}}',
          "event: response.output_item.done",
          'data: {"item":{"type":"function_call","call_id":"call_2","name":"b","arguments":"{}"}}',
        ],
        expectedCalls: [
          { id: "call_1", name: "a", args: {} },
          { id: "call_2", name: "b", args: {} },
        ],
      },
    ]

    cases.forEach(({ name, lines, expectedCalls, expectedChunks, expectedToolArgsChunks, expectedReasoningChunks, expectedToolNames }) => {
      it(name, () => {
        let state = initialParseState()
        const ctx: TestContext = { chunks: [], toolArgsChunks: [], reasoningChunks: [], toolNames: [] }

        for (const line of lines) {
          state = processWithCallbacks(line, state, ctx)
        }

        expect(state.toolCalls).toEqual(expectedCalls)
        if (expectedChunks) {
          expect(ctx.chunks).toEqual(expectedChunks)
        }
        if (expectedToolArgsChunks) {
          expect(ctx.toolArgsChunks).toEqual(expectedToolArgsChunks)
        }
        if (expectedReasoningChunks) {
          expect(ctx.reasoningChunks).toEqual(expectedReasoningChunks)
        }
        if (expectedToolNames) {
          expect(ctx.toolNames).toEqual(expectedToolNames)
        }
      })
    })
  })

  describe("mixed content", () => {
    it("captures both text and tool calls", () => {
      let state = initialParseState()
      const chunks: string[] = []
      const lines = [
        "event: response.output_text.delta",
        'data: {"delta":"Let me help"}',
        "event: response.output_item.done",
        'data: {"item":{"type":"function_call","call_id":"call_1","name":"create_plan","arguments":"{}"}}',
        "event: response.completed",
        "data: {}",
      ]

      for (const line of lines) {
        state = processWithChunks(line, state, chunks)
      }

      expect(state.textContent).toBe("Let me help")
      expect(state.toolCalls).toEqual([{ id: "call_1", name: "create_plan", args: {} }])
    })
  })

  describe("edge cases", () => {
    const cases = [
      {
        name: "handles empty lines",
        lines: ["", "event: response.completed", "data: {}"],
        expectedText: "",
      },
      {
        name: "handles malformed JSON",
        lines: ["event: response.output_text.delta", "data: not json"],
        expectedText: "",
      },
    ]

    cases.forEach(({ name, lines, expectedText }) => {
      it(name, () => {
        let state = initialParseState()
        const chunks: string[] = []

        for (const line of lines) {
          state = processWithChunks(line, state, chunks)
        }

        expect(state.textContent).toBe(expectedText)
      })
    })
  })
})

describe("blocksToMessages", () => {
  const cases = [
    {
      name: "converts system block to system message",
      blocks: [{ type: "system" as const, content: "You are helpful" }],
      expected: [{ type: "message", role: "system", content: "You are helpful" }],
    },
    {
      name: "converts user block to user message",
      blocks: [{ type: "user" as const, content: "Hi" }],
      expected: [{ type: "message", role: "user", content: "Hi" }],
    },
    {
      name: "converts text block to assistant message",
      blocks: [{ type: "text" as const, content: "Hello" }],
      expected: [{ type: "message", role: "assistant", content: "Hello" }],
    },
    {
      name: "converts tool_call block to function_call items",
      blocks: [
        {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "foo", args: { x: 1 } }],
        },
      ],
      expected: [
        { type: "function_call", call_id: "1", status: "completed", name: "foo", arguments: '{"x":1}' },
      ],
    },
    {
      name: "converts tool_result block to function_call_output",
      blocks: [{ type: "tool_result" as const, callId: "1", toolName: "execute_sql", result: { ok: true } }],
      expected: [{ type: "function_call_output", call_id: "1", status: "completed", output: '{"ok":true}' }],
    },
    {
      name: "converts mixed blocks in order",
      blocks: [
        { type: "text" as const, content: "Thinking" },
        { type: "tool_call" as const, calls: [{ id: "1", name: "bar", args: {} }] },
        { type: "tool_result" as const, callId: "1", toolName: "bar", result: {} },
      ] as Block[],
      expected: [
        { type: "message", role: "assistant", content: "Thinking" },
        { type: "function_call", call_id: "1", status: "completed", name: "bar", arguments: "{}" },
        { type: "function_call_output", call_id: "1", status: "completed", output: "{}" },
      ],
    },
  ]

  cases.forEach(({ name, blocks, expected }) => {
    it(name, () => {
      expect(blocksToMessages(blocks)).toEqual(expected)
    })
  })
})
