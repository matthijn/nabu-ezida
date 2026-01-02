import { describe, expect, it } from "vitest"
import { step } from "./step"
import type { AgentState, LLMCaller, StepResult } from "./types"
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
        '```json\n{"type": "task", "description": "Build a todo app"}\n```',
        '```json\n{"type": "plan", "task": "Build todo", "steps": [{"description": "Create UI"}, {"description": "Add logic"}]}\n```',
        '```json\n{"type": "step_complete", "summary": "Created the UI"}\n```',
        '```json\n{"type": "step_complete", "summary": "Added the logic"}\n```',
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
        '```json\n{"type": "plan", "task": "Test task", "steps": [{"description": "Step 1"}, {"description": "Step 2"}]}\n```',
        '```json\n{"type": "step_complete", "summary": "Did step 1"}\n```',
        '```json\n{"type": "step_complete", "summary": "Did step 2"}\n```',
      ]

      const state: AgentState = { ...createInitialState(), path: "/chat/plan" }
      const result = await step(state, "Create a plan", { callLLM: createMockCaller(responses) })

      expect(result.state.path).toBe("/chat/converse")
      expect(result.state.plan).toBeNull()
      expect(result.response).toBe("All steps completed")
    })

    it("stops when stuck and asks user", async () => {
      const responses = [
        '```json\n{"type": "plan", "task": "Test task", "steps": [{"description": "Step 1"}]}\n```',
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

    it("includes tool_calls in assistant message before tool results", async () => {
      const responses = [
        { content: "", toolCalls: [{ id: "call_1", name: "search", args: { query: "test" } }] },
        { content: "Found it" },
      ]

      const state = createInitialState()
      const result = await step(state, "Search", {
        callLLM: createMockCallerWithToolCalls(responses),
        toolHandlers: { search: async () => ({ found: true }) },
      })

      const assistantWithToolCalls = result.state.history.find(
        (m) => m.role === "assistant" && m.tool_calls?.length
      )
      expect(assistantWithToolCalls).toBeDefined()
      expect(assistantWithToolCalls?.tool_calls?.[0]).toEqual({
        id: "call_1",
        type: "function",
        function: {
          name: "search",
          arguments: '{"query":"test"}',
        },
      })

      const toolResultIndex = result.state.history.findIndex((m) => m.role === "tool")
      const assistantIndex = result.state.history.findIndex(
        (m) => m.role === "assistant" && m.tool_calls?.length
      )
      expect(assistantIndex).toBeLessThan(toolResultIndex)
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

    it("executes multiple tools in parallel", async () => {
      const executionOrder: string[] = []

      const responses = [
        {
          content: "",
          toolCalls: [
            { id: "call_1", name: "search_a", args: { query: "cognitive load" } },
            { id: "call_2", name: "search_b", args: { query: "working memory" } },
          ],
        },
        { content: "Found results from both searches" },
      ]

      const handlers = {
        search_a: async (args: unknown) => {
          executionOrder.push("a_start")
          await new Promise((r) => setTimeout(r, 10))
          executionOrder.push("a_end")
          return { papers: ["paper1"] }
        },
        search_b: async (args: unknown) => {
          executionOrder.push("b_start")
          await new Promise((r) => setTimeout(r, 5))
          executionOrder.push("b_end")
          return { papers: ["paper2"] }
        },
      }

      const state = createInitialState()
      const result = await step(state, "Search for papers", {
        callLLM: createMockCallerWithToolCalls(responses),
        toolHandlers: handlers,
      })

      expect(result.response).toBe("Found results from both searches")
      expect(executionOrder).toEqual(["a_start", "b_start", "b_end", "a_end"])

      const toolMessages = result.state.history.filter((m) => m.role === "tool")
      expect(toolMessages).toHaveLength(2)
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

  describe("parse error recovery", () => {
    it("retries when LLM produces invalid format", async () => {
      const responses = [
        '```json\n{"type": "task", "task": "wrong field name"}\n```',
        '```json\n{"type": "task", "description": "correct format"}\n```',
        '```json\n{"type": "plan", "task": "do it", "steps": [{"description": "step 1"}]}\n```',
        '```json\n{"type": "step_complete", "summary": "done"}\n```',
      ]

      const state = createInitialState()
      const result = await step(state, "Do something", { callLLM: createMockCaller(responses) })

      expect(result.state.path).toBe("/chat/converse")
      expect(result.needsUser).toBe(true)
    })

    it("stops retrying when call limit reached", async () => {
      const responses = [
        '```json\n{"type": "task", "task": "wrong"}\n```',
        '```json\n{"type": "task", "task": "still wrong"}\n```',
        '```json\n{"type": "task", "task": "keeps failing"}\n```',
      ]

      const state = createInitialState()
      const result = await step(state, "Do something", { callLLM: createMockCaller(responses) }, 2)

      expect(result.response).toBe("Step exceeded call limit")
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
        '```json\n{"type": "task", "description": "Do something"}\n```',
        '```json\n{"type": "task", "description": "Do more"}\n```',
        '```json\n{"type": "task", "description": "Keep going"}\n```',
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
        '```json\n{"type": "plan", "task": "Test", "steps": [{"description": "Step 1"}, {"description": "Step 2"}]}\n```',
        '```json\n{"type": "step_complete", "summary": "Done step 1"}\n```',
        '```json\n{"type": "step_complete", "summary": "Done step 2"}\n```',
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

})
