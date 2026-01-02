import { describe, expect, it } from "vitest"
import { processLine, initialParseState, blocksToMessages } from "./parser"
import type { Block } from "./types"

type ParseCallbacks = {
  onChunk?: (text: string) => void
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
          'data: {"choices":[{"delta":{"content":"Hello"}}]}',
          'data: {"choices":[{"delta":{"content":" world"}}]}',
          "data: [DONE]",
        ],
        expectedText: "Hello world",
        expectedChunks: ["Hello", " world"],
      },
      {
        name: "ignores non-data lines",
        lines: [
          "event: message",
          'data: {"choices":[{"delta":{"content":"Hi"}}]}',
          "data: [DONE]",
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
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"execute_sql","arguments":""}}]}}]}',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"sql\\":"}}]}}]}',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"SELECT 1\\"}"}}]}}]}',
          'data: {"choices":[{"finish_reason":"tool_calls"}]}',
        ],
        expectedCalls: [{ id: "call_1", name: "execute_sql", args: { sql: "SELECT 1" } }],
      },
      {
        name: "parses multiple tool calls",
        lines: [
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"a","arguments":"{}"}}]}}]}',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":1,"id":"call_2","function":{"name":"b","arguments":"{}"}}]}}]}',
          "data: [DONE]",
        ],
        expectedCalls: [
          { id: "call_1", name: "a", args: {} },
          { id: "call_2", name: "b", args: {} },
        ],
      },
      {
        name: "parses parallel tool calls with interleaved args",
        lines: [
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"foo","arguments":""}}]}}]}',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":1,"id":"call_2","function":{"name":"bar","arguments":""}}]}}]}',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"x\\":"}}]}}]}',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"arguments":"{\\"y\\":"}}]}}]}',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"1}"}}]}}]}',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"arguments":"2}"}}]}}]}',
          'data: {"choices":[{"finish_reason":"tool_calls"}]}',
        ],
        expectedCalls: [
          { id: "call_1", name: "foo", args: { x: 1 } },
          { id: "call_2", name: "bar", args: { y: 2 } },
        ],
      },
    ]

    cases.forEach(({ name, lines, expectedCalls }) => {
      it(name, () => {
        let state = initialParseState()
        const chunks: string[] = []

        for (const line of lines) {
          state = processWithChunks(line, state, chunks)
        }

        expect(state.toolCalls).toEqual(expectedCalls)
      })
    })
  })

  describe("mixed content", () => {
    it("captures both text and tool calls", () => {
      let state = initialParseState()
      const chunks: string[] = []
      const lines = [
        'data: {"choices":[{"delta":{"content":"Let me help"}}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"create_plan","arguments":"{}"}}]}}]}',
        'data: {"choices":[{"finish_reason":"tool_calls"}]}',
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
        lines: ["", "data: [DONE]"],
        expectedText: "",
      },
      {
        name: "handles malformed JSON",
        lines: ["data: not json", "data: [DONE]"],
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
      name: "converts text block to assistant message",
      blocks: [{ type: "text" as const, content: "Hello" }],
      expected: [{ role: "assistant", content: "Hello" }],
    },
    {
      name: "converts tool_call block to assistant message with tool_calls",
      blocks: [
        {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "foo", args: { x: 1 } }],
        },
      ],
      expected: [
        {
          role: "assistant",
          tool_calls: [
            { id: "1", type: "function", function: { name: "foo", arguments: '{"x":1}' } },
          ],
        },
      ],
    },
    {
      name: "converts tool_result block to tool message",
      blocks: [{ type: "tool_result" as const, callId: "1", result: { ok: true } }],
      expected: [{ role: "tool", tool_call_id: "1", content: '{"ok":true}' }],
    },
    {
      name: "converts mixed blocks in order",
      blocks: [
        { type: "text" as const, content: "Thinking" },
        { type: "tool_call" as const, calls: [{ id: "1", name: "bar", args: {} }] },
        { type: "tool_result" as const, callId: "1", result: {} },
      ] as Block[],
      expected: [
        { role: "assistant", content: "Thinking" },
        { role: "assistant", tool_calls: [{ id: "1", type: "function", function: { name: "bar", arguments: "{}" } }] },
        { role: "tool", tool_call_id: "1", content: "{}" },
      ],
    },
  ]

  cases.forEach(({ name, blocks, expected }) => {
    it(name, () => {
      expect(blocksToMessages(blocks)).toEqual(expected)
    })
  })
})
