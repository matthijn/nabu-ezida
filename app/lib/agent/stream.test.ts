import { describe, expect, it } from "vitest"
import { processLine, initialParseState, blocksToMessages, toStrictSchema } from "./stream"
import type { Block } from "./types"

type ParseCallbacks = {
  onChunk?: (text: string) => void
  onToolArgsChunk?: (text: string) => void
  onReasoningChunk?: (text: string) => void
  onToolName?: (name: string) => void
  onToolCall?: (call: { id: string; name: string; args: Record<string, unknown> }) => void
}

type TestContext = {
  chunks: string[]
  toolArgsChunks: string[]
  reasoningChunks: string[]
  toolNames: string[]
}

const makeCallbacks = (ctx: TestContext): ParseCallbacks => ({
  onChunk: (text) => ctx.chunks.push(text),
  onToolArgsChunk: (text) => ctx.toolArgsChunks.push(text),
  onReasoningChunk: (text) => ctx.reasoningChunks.push(text),
  onToolName: (name) => ctx.toolNames.push(name),
})

const emptyCtx = (): TestContext => ({ chunks: [], toolArgsChunks: [], reasoningChunks: [], toolNames: [] })

const processLines = (lines: string[], callbacks: ParseCallbacks = {}) => {
  let state = initialParseState()
  for (const line of lines) {
    state = processLine(line, state, callbacks)
  }
  return state
}

const flushBlocks = (lines: string[], callbacks: ParseCallbacks = {}): Block[] => {
  const state = processLines(lines, callbacks)
  const blocks = [...state.blocks]
  if (state.reasoningContent) blocks.push({ type: "reasoning", content: state.reasoningContent, id: state.reasoningId, encryptedContent: state.reasoningEncryptedContent })
  if (state.textContent) blocks.push({ type: "text", content: state.textContent })
  if (state.pendingToolCalls.length > 0) blocks.push({ type: "tool_call", calls: state.pendingToolCalls })
  return blocks
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
        ],
        expectedText: "Hi",
        expectedChunks: ["Hi"],
      },
    ]

    cases.forEach(({ name, lines, expectedText, expectedChunks }) => {
      it(name, () => {
        const ctx = emptyCtx()
        const blocks = flushBlocks(lines, makeCallbacks(ctx))
        const textBlock = blocks.find((b) => b.type === "text")
        expect(textBlock?.type === "text" ? textBlock.content : "").toBe(expectedText)
        expect(ctx.chunks).toEqual(expectedChunks)
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
        name: "ignores apply_patch diff delta",
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
        const ctx = emptyCtx()
        const blocks = flushBlocks(lines, makeCallbacks(ctx))
        const toolBlock = blocks.find((b) => b.type === "tool_call")
        const calls = toolBlock?.type === "tool_call" ? toolBlock.calls : []
        expect(calls).toEqual(expectedCalls)
        if (expectedChunks) expect(ctx.chunks).toEqual(expectedChunks)
        if (expectedToolArgsChunks) expect(ctx.toolArgsChunks).toEqual(expectedToolArgsChunks)
        if (expectedReasoningChunks) expect(ctx.reasoningChunks).toEqual(expectedReasoningChunks)
        if (expectedToolNames) expect(ctx.toolNames).toEqual(expectedToolNames)
      })
    })
  })

  describe("mixed content", () => {
    it("captures both text and tool calls", () => {
      const blocks = flushBlocks([
        "event: response.output_text.delta",
        'data: {"delta":"Let me help"}',
        "event: response.output_item.done",
        'data: {"item":{"type":"function_call","call_id":"call_1","name":"submit_plan","arguments":"{}"}}',
      ])

      const textBlock = blocks.find((b) => b.type === "text")
      const toolBlock = blocks.find((b) => b.type === "tool_call")
      expect(textBlock?.type === "text" ? textBlock.content : "").toBe("Let me help")
      expect(toolBlock?.type === "tool_call" ? toolBlock.calls : []).toEqual([{ id: "call_1", name: "submit_plan", args: {} }])
    })

    it("captures encrypted reasoning content from output_item.done", () => {
      const blocks = flushBlocks([
        "event: response.reasoning_summary_text.delta",
        'data: {"delta":"Deep thought"}',
        "event: response.output_item.done",
        'data: {"item":{"type":"reasoning","id":"rs_abc","encrypted_content":"gAAAA_encrypted_blob"}}',
        "event: response.output_text.delta",
        'data: {"delta":"Result"}',
      ])

      expect(blocks).toEqual([
        { type: "reasoning", content: "Deep thought", id: "rs_abc", encryptedContent: "gAAAA_encrypted_blob" },
        { type: "text", content: "Result" },
      ])
    })

    it("interleaves reasoning and tool calls into separate blocks", () => {
      const blocks = flushBlocks([
        "event: response.reasoning_summary_text.delta",
        'data: {"delta":"First thought"}',
        "event: response.output_item.added",
        'data: {"item":{"type":"function_call","call_id":"call_1","name":"read_file"}}',
        "event: response.output_item.done",
        'data: {"item":{"type":"function_call","call_id":"call_1","name":"read_file","arguments":"{}"}}',
        "event: response.reasoning_summary_text.delta",
        'data: {"delta":"Second thought"}',
        "event: response.output_item.added",
        'data: {"item":{"type":"function_call","call_id":"call_2","name":"write_file"}}',
        "event: response.output_item.done",
        'data: {"item":{"type":"function_call","call_id":"call_2","name":"write_file","arguments":"{}"}}',
      ])

      expect(blocks).toEqual([
        { type: "reasoning", content: "First thought" },
        { type: "tool_call", calls: [{ id: "call_1", name: "read_file", args: {} }] },
        { type: "reasoning", content: "Second thought" },
        { type: "tool_call", calls: [{ id: "call_2", name: "write_file", args: {} }] },
      ])
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
        const state = processLines(lines)
        expect(state.textContent).toBe(expectedText)
      })
    })
  })
})

describe("toStrictSchema", () => {
  const cases = [
    {
      name: "passes through primitives",
      input: { type: "string", description: "a name" },
      expected: { type: "string", description: "a name" },
    },
    {
      name: "strips $schema",
      input: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "string" },
      expected: { type: "string" },
    },
    {
      name: "makes optional properties required with null union",
      input: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
        additionalProperties: false,
      },
      expected: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { anyOf: [{ type: "number" }, { type: "null" }] },
        },
        required: ["name", "age"],
        additionalProperties: false,
      },
    },
    {
      name: "recurses into array items",
      input: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
          },
          required: ["label"],
          additionalProperties: false,
        },
      },
      expected: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { anyOf: [{ type: "string" }, { type: "null" }] },
            label: { type: "string" },
          },
          required: ["id", "label"],
          additionalProperties: false,
        },
      },
    },
    {
      name: "recurses into nested objects",
      input: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              tag: { type: "string" },
              opt: { type: "number" },
            },
            required: ["tag"],
            additionalProperties: false,
          },
        },
        required: ["meta"],
        additionalProperties: false,
      },
      expected: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              tag: { type: "string" },
              opt: { anyOf: [{ type: "number" }, { type: "null" }] },
            },
            required: ["tag", "opt"],
            additionalProperties: false,
          },
        },
        required: ["meta"],
        additionalProperties: false,
      },
    },
    {
      name: "adds additionalProperties false when missing",
      input: {
        type: "object",
        properties: { a: { type: "string" } },
        required: ["a"],
      },
      expected: {
        type: "object",
        properties: { a: { type: "string" } },
        required: ["a"],
        additionalProperties: false,
      },
    },
    {
      name: "handles object with no required array",
      input: {
        type: "object",
        properties: { x: { type: "boolean" } },
        additionalProperties: false,
      },
      expected: {
        type: "object",
        properties: { x: { anyOf: [{ type: "boolean" }, { type: "null" }] } },
        required: ["x"],
        additionalProperties: false,
      },
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(toStrictSchema(input)).toEqual(expected)
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
      name: "converts reasoning with encrypted content to reasoning input item",
      blocks: [{ type: "reasoning" as const, content: "thought", id: "rs_1", encryptedContent: "gAAAA_blob" }],
      expected: [{ type: "reasoning", id: "rs_1", summary: [{ type: "summary_text", text: "thought" }], encrypted_content: "gAAAA_blob" }],
    },
    {
      name: "skips reasoning without encrypted content",
      blocks: [{ type: "reasoning" as const, content: "thought" }],
      expected: [],
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
