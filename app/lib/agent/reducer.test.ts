import { describe, expect, it } from "vitest"
import { reducer } from "./reducer"
import type { State, Block, Plan } from "./types"
import { initialState } from "./types"

const createPlan = (stepCount: number, doneCount = 0): Plan => ({
  task: "Test task",
  steps: Array.from({ length: stepCount }, (_, i) => ({
    id: String(i + 1),
    description: `Step ${i + 1}`,
    done: i < doneCount,
  })),
})

const stateWithPlan = (stepCount: number, doneCount = 0): State => ({
  ...initialState,
  mode: "exec",
  plan: createPlan(stepCount, doneCount),
  currentStep: doneCount < stepCount ? doneCount : null,
})

describe("reducer", () => {
  describe("text blocks", () => {
    const cases = [
      {
        name: "appends text block to history",
        state: initialState,
        block: { type: "text" as const, content: "Hello" },
        expected: { historyLength: 1, lastContent: "Hello" },
      },
      {
        name: "preserves existing history",
        state: { ...initialState, history: [{ type: "text" as const, content: "First" }] },
        block: { type: "text" as const, content: "Second" },
        expected: { historyLength: 2, lastContent: "Second" },
      },
    ]

    cases.forEach(({ name, state, block, expected }) => {
      it(name, () => {
        const result = reducer(state, block)
        expect(result.history).toHaveLength(expected.historyLength)
        const last = result.history[result.history.length - 1]
        if (last.type === "text") {
          expect(last.content).toBe(expected.lastContent)
        }
      })
    })
  })

  describe("tool_call blocks", () => {
    const cases = [
      {
        name: "sets pendingToolCalls",
        state: initialState,
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "execute_sql", args: { sql: "SELECT 1" } }],
        },
        check: (result: State) => {
          expect(result.pendingToolCalls).toHaveLength(1)
          expect(result.pendingToolCalls?.[0].name).toBe("execute_sql")
        },
      },
      {
        name: "create_plan sets mode to exec and creates plan",
        state: initialState,
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "create_plan", args: { task: "Do thing", steps: ["Step 1", "Step 2"] } }],
        },
        check: (result: State) => {
          expect(result.mode).toBe("exec")
          expect(result.plan?.task).toBe("Do thing")
          expect(result.plan?.steps).toHaveLength(2)
          expect(result.currentStep).toBe(0)
        },
      },
      {
        name: "complete_step marks current step done and advances",
        state: stateWithPlan(3, 0),
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "complete_step", args: { summary: "Did it" } }],
        },
        check: (result: State) => {
          expect(result.plan?.steps[0].done).toBe(true)
          expect(result.plan?.steps[1].done).toBe(false)
          expect(result.currentStep).toBe(1)
        },
      },
      {
        name: "complete_step on last step sets currentStep to null",
        state: stateWithPlan(2, 1),
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "complete_step", args: { summary: "Done" } }],
        },
        check: (result: State) => {
          expect(result.plan?.steps[1].done).toBe(true)
          expect(result.currentStep).toBe(null)
        },
      },
      {
        name: "multiple tool calls in one block",
        state: initialState,
        block: {
          type: "tool_call" as const,
          calls: [
            { id: "1", name: "execute_sql", args: {} },
            { id: "2", name: "execute_sql", args: {} },
          ],
        },
        check: (result: State) => {
          expect(result.pendingToolCalls).toHaveLength(2)
        },
      },
    ]

    cases.forEach(({ name, state, block, check }) => {
      it(name, () => {
        const result = reducer(state, block)
        check(result)
      })
    })
  })

  describe("tool_result blocks", () => {
    const cases = [
      {
        name: "removes completed call from pendingToolCalls",
        state: {
          ...initialState,
          pendingToolCalls: [
            { id: "1", name: "a", args: {} },
            { id: "2", name: "b", args: {} },
          ],
        },
        block: { type: "tool_result" as const, callId: "1", result: { ok: true } },
        check: (result: State) => {
          expect(result.pendingToolCalls).toHaveLength(1)
          expect(result.pendingToolCalls?.[0].id).toBe("2")
        },
      },
      {
        name: "sets pendingToolCalls to null when last call completes",
        state: {
          ...initialState,
          pendingToolCalls: [{ id: "1", name: "a", args: {} }],
        },
        block: { type: "tool_result" as const, callId: "1", result: {} },
        check: (result: State) => {
          expect(result.pendingToolCalls).toBe(null)
        },
      },
      {
        name: "appends to history",
        state: initialState,
        block: { type: "tool_result" as const, callId: "1", result: { data: "test" } },
        check: (result: State) => {
          expect(result.history).toHaveLength(1)
          expect(result.history[0].type).toBe("tool_result")
        },
      },
    ]

    cases.forEach(({ name, state, block, check }) => {
      it(name, () => {
        const result = reducer(state, block)
        check(result)
      })
    })
  })
})
