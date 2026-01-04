import { describe, expect, it } from "vitest"
import { reducer } from "./reducer"
import type { State, Plan, Exploration } from "./types"
import { initialState, getCurrentStep, hasActiveExploration } from "./types"

const createPlan = (stepCount: number, doneCount = 0): Plan => ({
  task: "Test task",
  steps: Array.from({ length: stepCount }, (_, i) => ({
    id: String(i + 1),
    description: `Step ${i + 1}`,
    done: i < doneCount,
  })),
})

const createExploration = (findingCount = 0): Exploration => ({
  question: "Test question",
  findings: Array.from({ length: findingCount }, (_, i) => ({
    id: String(i + 1),
    learned: `Finding ${i + 1}`,
  })),
})

const stateWithPlan = (stepCount: number, doneCount = 0): State => ({
  ...initialState,
  plan: createPlan(stepCount, doneCount),
})

const stateWithExploration = (findingCount = 0): State => ({
  ...initialState,
  exploration: createExploration(findingCount),
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
        name: "appends tool_call to history",
        state: initialState,
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "execute_sql", args: { sql: "SELECT 1" } }],
        },
        check: (result: State) => {
          expect(result.history).toHaveLength(1)
          expect(result.history[0].type).toBe("tool_call")
        },
      },
      {
        name: "create_plan creates plan",
        state: initialState,
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "create_plan", args: { task: "Do thing", steps: ["Step 1", "Step 2"] } }],
        },
        check: (result: State) => {
          expect(result.plan?.task).toBe("Do thing")
          expect(result.plan?.steps).toHaveLength(2)
          expect(getCurrentStep(result)).toBe(0)
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
          expect(getCurrentStep(result)).toBe(1)
        },
      },
      {
        name: "complete_step on last step results in null currentStep",
        state: stateWithPlan(2, 1),
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "complete_step", args: { summary: "Done" } }],
        },
        check: (result: State) => {
          expect(result.plan?.steps[1].done).toBe(true)
          expect(getCurrentStep(result)).toBe(null)
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

  describe("exploration", () => {
    const cases = [
      {
        name: "start_exploration creates exploration",
        state: initialState,
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "start_exploration", args: { question: "How does X work?" } }],
        },
        check: (result: State) => {
          expect(hasActiveExploration(result)).toBe(true)
          expect(result.exploration?.question).toBe("How does X work?")
          expect(result.exploration?.findings).toHaveLength(0)
        },
      },
      {
        name: "exploration_step with continue adds finding and keeps exploration",
        state: stateWithExploration(1),
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "exploration_step", args: { learned: "Found Y", decision: "continue", next: "Check Z" } }],
        },
        check: (result: State) => {
          expect(hasActiveExploration(result)).toBe(true)
          expect(result.exploration?.findings).toHaveLength(2)
          expect(result.exploration?.findings[1].learned).toBe("Found Y")
        },
      },
      {
        name: "exploration_step with answer adds finding and clears exploration",
        state: stateWithExploration(1),
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "exploration_step", args: { learned: "Answer found", decision: "answer" } }],
        },
        check: (result: State) => {
          expect(hasActiveExploration(result)).toBe(false)
          expect(result.exploration).toBe(null)
        },
      },
      {
        name: "exploration_step with plan clears exploration",
        state: stateWithExploration(2),
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "exploration_step", args: { learned: "Ready to plan", decision: "plan" } }],
        },
        check: (result: State) => {
          expect(hasActiveExploration(result)).toBe(false)
        },
      },
      {
        name: "create_plan clears active exploration",
        state: stateWithExploration(2),
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "create_plan", args: { task: "Do thing", steps: ["Step 1"] } }],
        },
        check: (result: State) => {
          expect(hasActiveExploration(result)).toBe(false)
          expect(result.plan?.task).toBe("Do thing")
        },
      },
      {
        name: "abort clears both plan and exploration",
        state: { ...stateWithPlan(2), exploration: createExploration(1) },
        block: {
          type: "tool_call" as const,
          calls: [{ id: "1", name: "abort", args: { message: "Need help" } }],
        },
        check: (result: State) => {
          expect(result.plan).toBe(null)
          expect(result.exploration).toBe(null)
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
