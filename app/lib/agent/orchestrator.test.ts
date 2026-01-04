import { describe, expect, it } from "vitest"
import { orchestrator } from "./orchestrator"
import type { State, Block, Plan, Action, Exploration } from "./types"
import { initialState } from "./types"

const createPlan = (stepCount: number, doneCount = 0): Plan => ({
  task: "Test task",
  steps: Array.from({ length: stepCount }, (_, i) => ({
    id: String(i + 1),
    description: `Step ${i + 1}`,
    done: i < doneCount,
  })),
})

const createExploration = (findingCount = 0): Exploration => ({
  question: "How does X work?",
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

describe("orchestrator", () => {
  describe("plan execution", () => {
    const cases = [
      {
        name: "returns call_llm with nudge when plan has pending step",
        state: stateWithPlan(2, 0),
        block: { type: "text" as const, content: "Working on it" },
        check: (action: Action) => {
          expect(action.type).toBe("call_llm")
          if (action.type === "call_llm") {
            expect(action.nudge).toContain("Step 1")
            expect(action.nudge).toContain("[pending]")
          }
        },
      },
      {
        name: "returns done when plan is complete",
        state: stateWithPlan(2, 2),
        block: { type: "text" as const, content: "All done" },
        check: (action: Action) => {
          expect(action.type).toBe("done")
        },
      },
      {
        name: "returns done when no plan",
        state: initialState,
        block: { type: "text" as const, content: "Hello" },
        check: (action: Action) => {
          expect(action.type).toBe("done")
        },
      },
      {
        name: "nudge includes completed steps with done status",
        state: stateWithPlan(3, 1),
        block: { type: "text" as const, content: "Next" },
        check: (action: Action) => {
          expect(action.type).toBe("call_llm")
          if (action.type === "call_llm") {
            expect(action.nudge).toContain("[done]")
            expect(action.nudge).toContain("Step 2")
          }
        },
      },
    ]

    cases.forEach(({ name, state, block, check }) => {
      it(name, () => {
        const action = orchestrator(state, block)
        check(action)
      })
    })
  })

  describe("after tool results", () => {
    const cases = [
      {
        name: "returns call_llm after tool result with plan",
        state: stateWithPlan(2, 0),
        block: { type: "tool_result" as const, callId: "1", result: {} },
        expected: { type: "call_llm" },
      },
      {
        name: "returns call_llm after tool result without plan",
        state: initialState,
        block: { type: "tool_result" as const, callId: "1", result: {} },
        expected: { type: "call_llm" },
      },
    ]

    cases.forEach(({ name, state, block, expected }) => {
      it(name, () => {
        const result = orchestrator(state, block)
        expect(result.type).toBe(expected.type)
      })
    })
  })

  describe("exploration", () => {
    const cases = [
      {
        name: "returns call_llm with nudge when exploration active with no findings",
        state: stateWithExploration(0),
        block: { type: "text" as const, content: "Investigating" },
        check: (action: Action) => {
          expect(action.type).toBe("call_llm")
          if (action.type === "call_llm") {
            expect(action.nudge).toContain("How does X work?")
            expect(action.nudge).toContain("Investigate and call exploration_step")
          }
        },
      },
      {
        name: "returns call_llm with nudge showing findings",
        state: stateWithExploration(2),
        block: { type: "text" as const, content: "Found more" },
        check: (action: Action) => {
          expect(action.type).toBe("call_llm")
          if (action.type === "call_llm") {
            expect(action.nudge).toContain("Finding 1")
            expect(action.nudge).toContain("Finding 2")
            expect(action.nudge).toContain("answer | plan")
          }
        },
      },
      {
        name: "exploration takes priority over plan",
        state: { ...stateWithPlan(2, 0), exploration: createExploration(1) },
        block: { type: "text" as const, content: "Both active" },
        check: (action: Action) => {
          expect(action.type).toBe("call_llm")
          if (action.type === "call_llm") {
            expect(action.nudge).toContain("Exploring:")
            expect(action.nudge).not.toContain("Plan:")
          }
        },
      },
    ]

    cases.forEach(({ name, state, block, check }) => {
      it(name, () => {
        const action = orchestrator(state, block)
        check(action)
      })
    })
  })
})
