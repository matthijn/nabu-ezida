import { describe, expect, it, vi, beforeEach } from "vitest"
import { turn } from "./turn"
import type { Block, ToolCall } from "./types"
import * as parser from "./parser"

const mockExecutor = vi.fn(async (call: ToolCall) => ({ executed: call.name }))

const mockParse = (blocks: Block[]) => {
  vi.spyOn(parser, "parse").mockResolvedValueOnce(blocks)
}

const deps = {
  endpoint: "/test",
  execute: mockExecutor,
}

describe("turn", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("basic flow", () => {
    const cases = [
      {
        name: "returns unchanged history for empty response",
        history: [] as Block[],
        parsed: [] as Block[],
        expectedLength: 0,
      },
      {
        name: "appends text block to history",
        history: [] as Block[],
        parsed: [{ type: "text" as const, content: "Hello" }],
        expectedLength: 1,
      },
      {
        name: "preserves existing history",
        history: [{ type: "user" as const, content: "Hi" }],
        parsed: [{ type: "text" as const, content: "Hello" }],
        expectedLength: 2,
      },
    ]

    cases.forEach(({ name, history, parsed, expectedLength }) => {
      it(name, async () => {
        mockParse(parsed)
        const result = await turn(history, [], deps)
        expect(result).toHaveLength(expectedLength)
      })
    })
  })

  describe("tool execution", () => {
    it("executes tool and appends result", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "execute_sql", args: { sql: "SELECT 1" } }],
      }
      mockParse([toolCallBlock])

      const result = await turn([], [], deps)

      expect(mockExecutor).toHaveBeenCalledWith({
        id: "1",
        name: "execute_sql",
        args: { sql: "SELECT 1" },
      })
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe("tool_call")
      expect(result[1].type).toBe("tool_result")
    })

    it("executes multiple tools in parallel", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [
          { id: "1", name: "foo", args: {} },
          { id: "2", name: "bar", args: {} },
        ],
      }
      mockParse([toolCallBlock])

      const result = await turn([], [], deps)

      expect(mockExecutor).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(3)
      expect(result[1].type).toBe("tool_result")
      expect(result[2].type).toBe("tool_result")
    })
  })

  describe("error handling", () => {
    it("catches tool errors and returns them as results", async () => {
      const failingExecutor = vi.fn(async () => {
        throw new Error("Database connection failed")
      })
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "execute_sql", args: {} }],
      }
      mockParse([toolCallBlock])

      const result = await turn([], [], { ...deps, execute: failingExecutor })

      expect(result).toHaveLength(2)
      expect(result[1]).toEqual({
        type: "tool_result",
        callId: "1",
        result: { error: "Database connection failed" },
      })
    })

    it("sanitizes BigInt values in tool results", async () => {
      const bigIntExecutor = vi.fn(async () => ({
        count: BigInt(42),
        nested: { value: BigInt(100) },
        array: [BigInt(1), BigInt(2)],
      }))
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "execute_sql", args: {} }],
      }
      mockParse([toolCallBlock])

      const result = await turn([], [], { ...deps, execute: bigIntExecutor })

      expect(result[1]).toEqual({
        type: "tool_result",
        callId: "1",
        result: { count: 42, nested: { value: 100 }, array: [1, 2] },
      })
    })
  })

  describe("mixed content", () => {
    it("handles text followed by tool call", async () => {
      const blocks: Block[] = [
        { type: "text", content: "Let me help" },
        { type: "tool_call", calls: [{ id: "1", name: "execute_sql", args: { sql: "SELECT 1" } }] },
      ]
      mockParse(blocks)

      const result = await turn([], [], deps)

      expect(result).toHaveLength(3)
      expect(result[0].type).toBe("text")
      expect(result[1].type).toBe("tool_call")
      expect(result[2].type).toBe("tool_result")
    })
  })
})
