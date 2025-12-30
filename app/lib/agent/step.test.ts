import { describe, expect, it } from "vitest"
import { step } from "./step"
import type { AgentState, LLMCaller, StepResult, Compactor } from "./types"
import { createInitialState } from "./types"

const createMockCaller = (responses: string[]): LLMCaller => {
  let callIndex = 0
  return async () => {
    const content = responses[callIndex] ?? ""
    callIndex++
    return { content }
  }
}

const createMockCallerWithToolCalls = (
  responses: Array<{ content: string; toolCalls?: { id: string; name: string; args: unknown }[] }>
): LLMCaller => {
  let callIndex = 0
  return async () => {
    const response = responses[callIndex] ?? { content: "" }
    callIndex++
    return response
  }
}

describe("step", () => {
  describe("simple chat", () => {
    const cases = [
      {
        name: "returns text response and stays in converse",
        responses: ["Hello, how can I help?"],
        expectedResponse: "Hello, how can I help?",
        expectedPath: "/chat/converse" as const,
        expectedNeedsUser: true,
      },
      {
        name: "handles empty response",
        responses: [""],
        expectedResponse: "",
        expectedPath: "/chat/converse" as const,
        expectedNeedsUser: true,
      },
    ]

    cases.forEach(({ name, responses, expectedResponse, expectedPath, expectedNeedsUser }) => {
      it(name, async () => {
        const state = createInitialState()
        const result = await step(state, "Hello", { callLLM: createMockCaller(responses) })

        expect(result.response).toBe(expectedResponse)
        expect(result.state.path).toBe(expectedPath)
        expect(result.needsUser).toBe(expectedNeedsUser)
      })
    })
  })

  describe("task detection", () => {
    it("detects task and transitions to plan path", async () => {
      const responses = [
        "TASK: Build a todo app",
        '```json\n{"type": "plan", "task": "Build todo", "steps": ["Create UI", "Add logic"]}\n```',
        "STEP_COMPLETE Created the UI",
        "STEP_COMPLETE Added the logic",
      ]

      const state = createInitialState()
      const result = await step(state, "Build me a todo app", { callLLM: createMockCaller(responses) })

      expect(result.state.path).toBe("/chat/converse")
      expect(result.state.plan).toBeNull()
      expect(result.needsUser).toBe(true)
    })
  })

  describe("plan execution", () => {
    it("executes all steps and returns to converse", async () => {
      const responses = [
        '```json\n{"type": "plan", "task": "Test task", "steps": ["Step 1", "Step 2"]}\n```',
        "STEP_COMPLETE Did step 1",
        "STEP_COMPLETE Did step 2",
      ]

      const state: AgentState = { ...createInitialState(), path: "/chat/plan" }
      const result = await step(state, "Create a plan", { callLLM: createMockCaller(responses) })

      expect(result.state.path).toBe("/chat/converse")
      expect(result.state.plan).toBeNull()
      expect(result.response).toBe("All steps completed")
    })

    it("stops when stuck and asks user", async () => {
      const responses = [
        '```json\n{"type": "plan", "task": "Test task", "steps": ["Step 1"]}\n```',
        '```json\n{"type": "stuck", "question": "What database should I use?"}\n```',
      ]

      const state: AgentState = { ...createInitialState(), path: "/chat/plan" }
      const result = await step(state, "Create a plan", { callLLM: createMockCaller(responses) })

      expect(result.needsUser).toBe(true)
      expect(result.response).toBe("What database should I use?")
    })
  })

  describe("tool calls", () => {
    it("executes tool and continues", async () => {
      const responses = [
        { content: "", toolCalls: [{ id: "call_1", name: "search", args: { query: "test" } }] },
        { content: "Found results for test" },
      ]

      const mockHandler = async (args: unknown) => ({ results: ["item1", "item2"] })

      const state = createInitialState()
      const result = await step(state, "Search for test", {
        callLLM: createMockCallerWithToolCalls(responses),
        toolHandlers: { search: mockHandler },
      })

      expect(result.response).toBe("Found results for test")
      expect(result.state.history.some((m) => m.role === "tool")).toBe(true)
    })

    it("handles unknown tool gracefully", async () => {
      const responses = [
        { content: "", toolCalls: [{ id: "call_1", name: "unknown_tool", args: {} }] },
        { content: "I could not find that tool" },
      ]

      const state = createInitialState()
      const result = await step(state, "Use unknown tool", {
        callLLM: createMockCallerWithToolCalls(responses),
        toolHandlers: {},
      })

      expect(result.response).toBe("I could not find that tool")
    })
  })

  describe("abort handling", () => {
    it("returns early when aborted", async () => {
      const controller = new AbortController()
      controller.abort()

      const state = createInitialState()
      const result = await step(state, "Hello", {
        callLLM: createMockCaller(["Should not reach"]),
        signal: controller.signal,
      })

      expect(result.response).toBe("")
      expect(result.needsUser).toBe(true)
      expect(result.state).toBe(state)
    })
  })

  describe("history management", () => {
    it("appends user and assistant messages to history", async () => {
      const state = createInitialState()
      const result = await step(state, "Hello", { callLLM: createMockCaller(["Hi there"]) })

      expect(result.state.history).toHaveLength(2)
      expect(result.state.history[0]).toEqual({ role: "user", content: "Hello" })
      expect(result.state.history[1]).toEqual({ role: "assistant", content: "Hi there" })
    })

    it("preserves existing history", async () => {
      const state: AgentState = {
        ...createInitialState(),
        history: [
          { role: "user", content: "Previous" },
          { role: "assistant", content: "Previous response" },
        ],
      }

      const result = await step(state, "New message", { callLLM: createMockCaller(["New response"]) })

      expect(result.state.history).toHaveLength(4)
    })
  })

  describe("call limit", () => {
    it("stops when call limit reached", async () => {
      const state = createInitialState()
      const result = await step(
        state,
        "Hello",
        { callLLM: createMockCaller(["Response"]) },
        0
      )

      expect(result.response).toBe("Step exceeded call limit")
      expect(result.needsUser).toBe(true)
    })

    it("decrements call limit on each recurse", async () => {
      const responses = [
        "TASK: Do something",
        "TASK: Do more",
        "TASK: Keep going",
      ]

      const state = createInitialState()
      const result = await step(
        state,
        "Do task",
        { callLLM: createMockCaller(responses) },
        2
      )

      expect(result.response).toBe("Step exceeded call limit")
    })

    it("resets call limit on new plan step", async () => {
      const responses = [
        '```json\n{"type": "plan", "task": "Test", "steps": ["Step 1", "Step 2"]}\n```',
        "STEP_COMPLETE Done step 1",
        "STEP_COMPLETE Done step 2",
      ]

      const state: AgentState = { ...createInitialState(), path: "/chat/plan" }
      const result = await step(
        state,
        "Plan this",
        { callLLM: createMockCaller(responses), maxCallsPerStep: 5 },
        1
      )

      expect(result.response).toBe("All steps completed")
    })
  })

  describe("compaction", () => {
    const createMockCompactor = (): Compactor => async (history, compactions) => ({
      history: [],
      compactions: [...compactions, { block_id: "new", summary: `Compacted ${history.length} messages` }],
    })

    it("compacts when history exceeds threshold", async () => {
      const state: AgentState = {
        ...createInitialState(),
        history: Array.from({ length: 25 }, (_, i) => ({ role: "user" as const, content: `msg ${i}` })),
      }

      const result = await step(state, "Hello", {
        callLLM: createMockCaller(["Response"]),
        compact: createMockCompactor(),
        compactionThreshold: 20,
      })

      expect(result.state.history).toHaveLength(0)
      expect(result.state.compactions).toHaveLength(1)
      expect(result.state.compactions[0].summary).toContain("Compacted")
    })

    it("does not compact when below threshold", async () => {
      const state: AgentState = {
        ...createInitialState(),
        history: [{ role: "user", content: "Previous" }],
      }

      const result = await step(state, "Hello", {
        callLLM: createMockCaller(["Response"]),
        compact: createMockCompactor(),
        compactionThreshold: 20,
      })

      expect(result.state.history).toHaveLength(3)
      expect(result.state.compactions).toHaveLength(0)
    })

    it("compacts and continues recursing", async () => {
      const responses = [
        "TASK: Do something",
        '```json\n{"type": "plan", "task": "Test", "steps": ["Step 1"]}\n```',
        "STEP_COMPLETE Done",
      ]

      const state: AgentState = {
        ...createInitialState(),
        history: Array.from({ length: 25 }, (_, i) => ({ role: "user" as const, content: `msg ${i}` })),
      }

      const result = await step(state, "Do task", {
        callLLM: createMockCaller(responses),
        compact: createMockCompactor(),
        compactionThreshold: 20,
      })

      expect(result.state.compactions.length).toBeGreaterThan(0)
      expect(result.needsUser).toBe(true)
    })
  })
})
