import { describe, expect, it, vi, beforeEach } from "vitest"
import { turn } from "./turn"
import type { State, Block, ToolCall } from "./types"
import { initialState, hasActivePlan } from "./types"
import * as parser from "./parser"

const createPlan = (stepCount: number, doneCount = 0) => ({
  task: "Test task",
  steps: Array.from({ length: stepCount }, (_, i) => ({
    id: String(i + 1),
    description: `Step ${i + 1}`,
    done: i < doneCount,
  })),
})

const stateWithPlan = (stepCount: number, doneCount = 0): State => ({
  ...initialState,
  plan: createPlan(stepCount, doneCount),
})

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
    it("returns done when parse returns empty", async () => {
      mockParse([])

      const result = await turn(initialState, [], deps)

      expect(result.action.type).toBe("done")
      expect(result.blocks).toEqual([])
    })
  })

  describe("text blocks", () => {
    const cases = [
      {
        name: "returns done for text in chat mode",
        state: initialState,
        blocks: [{ type: "text" as const, content: "Hello" }],
        expectedAction: "done",
      },
      {
        name: "returns call_llm for text in exec mode with pending step",
        state: stateWithPlan(2, 0),
        blocks: [{ type: "text" as const, content: "Working on it" }],
        expectedAction: "call_llm",
      },
      {
        name: "returns done when plan is complete",
        state: stateWithPlan(2, 2),
        blocks: [{ type: "text" as const, content: "All done" }],
        expectedAction: "done",
      },
    ]

    cases.forEach(({ name, state, blocks, expectedAction }) => {
      it(name, async () => {
        mockParse(blocks)

        const result = await turn(state, [], deps)

        expect(result.action.type).toBe(expectedAction)
        expect(result.blocks).toEqual(blocks)
      })
    })
  })

  describe("tool execution", () => {
    it("executes tools and adds results to blocks", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "execute_sql", args: { sql: "SELECT 1" } }],
      }
      mockParse([toolCallBlock])

      const result = await turn(initialState, [], deps)

      expect(mockExecutor).toHaveBeenCalledWith({
        id: "1",
        name: "execute_sql",
        args: { sql: "SELECT 1" },
      })
      expect(result.blocks).toHaveLength(2)
      expect(result.blocks[1].type).toBe("tool_result")
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

      const result = await turn(initialState, [], deps)

      expect(mockExecutor).toHaveBeenCalledTimes(2)
      expect(result.blocks).toHaveLength(3)
      expect(result.blocks[1].type).toBe("tool_result")
      expect(result.blocks[2].type).toBe("tool_result")
    })
  })

  describe("abort", () => {
    it("converts abort to text block, clears plan, returns done with abortedPlan", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "abort", args: { message: "Need clarification" } }],
      }
      mockParse([toolCallBlock])
      const initialPlanState = stateWithPlan(2)

      const result = await turn(initialPlanState, [], deps)

      expect(mockExecutor).not.toHaveBeenCalled()
      expect(result.action.type).toBe("done")
      expect(hasActivePlan(result.state)).toBe(false)
      expect(result.state.plan).toBeNull()
      expect(result.abortedPlan).toEqual(initialPlanState.plan)
      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0]).toEqual({ type: "text", content: "Need clarification" })
    })

    it("handles missing message gracefully", async () => {
      const toolCallBlock: Block = {
        type: "tool_call",
        calls: [{ id: "1", name: "abort", args: {} }],
      }
      mockParse([toolCallBlock])

      const result = await turn(stateWithPlan(2), [], deps)

      expect(result.action.type).toBe("done")
      expect(hasActivePlan(result.state)).toBe(false)
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

      const result = await turn(initialState, [], { ...deps, execute: failingExecutor })

      expect(result.blocks).toHaveLength(2)
      expect(result.blocks[1]).toEqual({
        type: "tool_result",
        callId: "1",
        result: { error: "Database connection failed" },
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

      const result = await turn(initialState, [], deps)

      expect(result.blocks).toHaveLength(3)
      expect(result.blocks[0].type).toBe("text")
      expect(result.blocks[1].type).toBe("tool_call")
      expect(result.blocks[2].type).toBe("tool_result")
    })
  })
})
