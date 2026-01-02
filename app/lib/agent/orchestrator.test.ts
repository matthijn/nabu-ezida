import { describe, expect, it } from "vitest"
import { orchestrator } from "./orchestrator"
import type { State, Block, Plan, Action } from "./types"
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

describe("orchestrator", () => {
  describe("plan execution", () => {
    const cases = [
      {
        name: "returns call_llm with nudge when in exec mode with pending step",
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
        name: "returns done in chat mode",
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
        name: "returns call_llm after tool result in exec mode",
        state: stateWithPlan(2, 0),
        block: { type: "tool_result" as const, callId: "1", result: {} },
        expected: { type: "call_llm" },
      },
      {
        name: "returns done after tool result in chat mode",
        state: initialState,
        block: { type: "tool_result" as const, callId: "1", result: {} },
        expected: { type: "done" },
      },
    ]

    cases.forEach(({ name, state, block, expected }) => {
      it(name, () => {
        const result = orchestrator(state, block)
        expect(result.type).toBe(expected.type)
      })
    })
  })
})
