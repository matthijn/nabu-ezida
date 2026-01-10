import { describe, expect, it, vi, beforeEach } from "vitest"
import { turn } from "./turn"
import type { Block, ToolCall } from "./types"
import { derive, lastPlan, hasActivePlan } from "./selectors"
import { createPlanCall, completeStepCall, toolResult } from "./test-helpers"
import * as parser from "./parser"

const historyWithPlan = (stepCount: number, doneCount = 0): Block[] => [
  createPlanCall("Test task", Array.from({ length: stepCount }, (_, i) => `Step ${i + 1}`)),
  toolResult(),
  ...Array.from({ length: doneCount }, () => [completeStepCall(), toolResult()]).flat(),
]

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

  describe("empty response", () => {
    it("returns null nudge when parse returns empty", async () => {
      mockParse([])

      const result = await turn([], [], deps)

      expect(result.nudge).toBeNull()
      expect(result.blocks).toEqual([])
    })
  })

  describe("text blocks", () => {
    const cases = [
      {
        name: "returns null nudge for text in chat mode",
        history: [] as Block[],
        blocks: [{ type: "text" as const, content: "Hello" }],
        expectNudge: false,
      },
      {
        name: "returns nudge for text in exec mode with pending step",
        history: historyWithPlan(2, 0),
        blocks: [{ type: "text" as const, content: "Working on it" }],
        expectNudge: true,
      },
      {
        name: "returns null nudge when plan is complete",
        history: historyWithPlan(2, 2),
        blocks: [{ type: "text" as const, content: "All done" }],
        expectNudge: false,
      },
    ]

    cases.forEach(({ name, history, blocks, expectNudge }) => {
      it(name, async () => {
        mockParse(blocks)

        const result = await turn(history, [], deps)

        if (expectNudge) {
          expect(result.nudge).not.toBeNull()
        } else {
          expect(result.nudge).toBeNull()
        }
        expect(result.blocks).toEqual(blocks)
      })
    })
  })

  describe("tool execution", () => {
    it("executes tools and adds results to blocks when in plan mode", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "execute_sql", args: { sql: "SELECT 1" } }],
      }
      mockParse([toolCallBlock])

      const result = await turn(historyWithPlan(2), [], deps)

      expect(mockExecutor).toHaveBeenCalledWith({
        id: "1",
        name: "execute_sql",
        args: { sql: "SELECT 1" },
      })
      expect(result.blocks).toHaveLength(2)
      expect(result.blocks[1].type).toBe("tool_result")
    })

    it("executes multiple tools in parallel when in plan mode", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [
          { id: "1", name: "foo", args: {} },
          { id: "2", name: "bar", args: {} },
        ],
      }
      mockParse([toolCallBlock])

      const result = await turn(historyWithPlan(2), [], deps)

      expect(mockExecutor).toHaveBeenCalledTimes(2)
      expect(result.blocks).toHaveLength(3)
      expect(result.blocks[1].type).toBe("tool_result")
      expect(result.blocks[2].type).toBe("tool_result")
    })

    it("blocks non-exempt tools in chat mode and returns nudge", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "execute_sql", args: { sql: "SELECT 1" } }],
      }
      mockParse([toolCallBlock])

      const result = await turn([], [], deps)

      expect(mockExecutor).not.toHaveBeenCalled()
      expect(result.blocks).toHaveLength(0)
      expect(result.nudge).not.toBeNull()
      expect(result.nudge).toContain("execute_sql")
      expect(result.nudge).toContain("create_plan")
    })

    it("allows mode-exempt tools in chat mode", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "create_plan", args: { task: "Test", steps: ["Step 1"] } }],
      }
      mockParse([toolCallBlock])

      const result = await turn([], [], deps)

      expect(mockExecutor).toHaveBeenCalled()
      expect(result.blocks).toHaveLength(2)
    })
  })

  describe("abort", () => {
    it("converts abort to text block, marks plan aborted, returns null nudge with abortedPlan", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "abort", args: { message: "Need clarification" } }],
      }
      mockParse([toolCallBlock])
      const initialHistory = historyWithPlan(2)
      const expectedPlan = lastPlan(derive(initialHistory))

      const result = await turn(initialHistory, [], deps)

      expect(mockExecutor).not.toHaveBeenCalled()
      expect(result.nudge).toBeNull()
      expect(hasActivePlan(derive(result.history))).toBe(false)
      expect(lastPlan(derive(result.history))?.aborted).toBe(true)
      expect(result.abortedPlan).toEqual(expectedPlan)
      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0]).toEqual({ type: "text", content: "Need clarification" })
    })

    it("handles missing message gracefully", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "abort", args: {} }],
      }
      mockParse([toolCallBlock])

      const result = await turn(historyWithPlan(2), [], deps)

      expect(result.nudge).toBeNull()
      expect(hasActivePlan(derive(result.history))).toBe(false)
      expect(result.blocks[0]).toEqual({ type: "text", content: "" })
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

      const result = await turn(historyWithPlan(2), [], { ...deps, execute: failingExecutor })

      expect(result.blocks).toHaveLength(2)
      expect(result.blocks[1]).toEqual({
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

      const result = await turn(historyWithPlan(2), [], { ...deps, execute: bigIntExecutor })

      expect(result.blocks[1]).toEqual({
        type: "tool_result",
        callId: "1",
        result: { count: 42, nested: { value: 100 }, array: [1, 2] },
      })
    })
  })

  describe("mixed content", () => {
    it("handles text followed by tool call when in plan mode", async () => {
      const blocks: Block[] = [
        { type: "text", content: "Let me help" },
        { type: "tool_call", calls: [{ id: "1", name: "execute_sql", args: { sql: "SELECT 1" } }] },
      ]
      mockParse(blocks)

      const result = await turn(historyWithPlan(2), [], deps)

      expect(result.blocks).toHaveLength(3)
      expect(result.blocks[0].type).toBe("text")
      expect(result.blocks[1].type).toBe("tool_call")
      expect(result.blocks[2].type).toBe("tool_result")
    })
  })
})
