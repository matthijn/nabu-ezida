import { describe, expect, it } from "vitest"
import { orchestrator } from "./orchestrator"
import type { Action } from "./types"
import { initialState } from "./types"
import {
  createPlanCall,
  completeStepCall,
  startExplorationCall,
  explorationStepCall,
  stateWithHistory,
} from "./test-helpers"

describe("orchestrator", () => {
  describe("plan execution", () => {
    const cases = [
      {
        name: "returns call_llm with nudge when plan has pending step",
        state: stateWithHistory([createPlanCall("Task", ["Step 1", "Step 2"])]),
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
        state: stateWithHistory([
          createPlanCall("Task", ["Step 1", "Step 2"]),
          completeStepCall(),
          completeStepCall(),
        ]),
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
        state: stateWithHistory([createPlanCall("Task", ["Step 1", "Step 2", "Step 3"]), completeStepCall()]),
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
        state: stateWithHistory([createPlanCall("Task", ["Step 1"])]),
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
        state: stateWithHistory([startExplorationCall("How does X work?")]),
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
        state: stateWithHistory([
          startExplorationCall("Question", "Check A"),
          explorationStepCall("Found A", "continue", "Check B"),
          explorationStepCall("Found B", "continue"),
        ]),
        block: { type: "text" as const, content: "Found more" },
        check: (action: Action) => {
          expect(action.type).toBe("call_llm")
          if (action.type === "call_llm") {
            expect(action.nudge).toContain("Found A")
            expect(action.nudge).toContain("Found B")
            expect(action.nudge).toContain("answer | plan")
          }
        },
      },
      {
        name: "exploration takes priority over plan",
        state: stateWithHistory([
          createPlanCall("Task", ["Step 1"]),
          startExplorationCall("Question"),
        ]),
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
