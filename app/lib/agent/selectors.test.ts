import { describe, expect, it } from "vitest"
import type { Block } from "./types"
import {
  getPlan,
  getExploration,
  getCurrentStep,
  hasActivePlan,
  hasActiveExploration,
  getMode,
} from "./selectors"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  startExplorationCall,
  explorationStepCall,
} from "./test-helpers"

describe("selectors", () => {
  describe("plan", () => {
    const cases = [
      {
        name: "no history returns null plan",
        history: [] as Block[],
        check: (history: Block[]) => {
          expect(getPlan(history)).toBe(null)
          expect(hasActivePlan(history)).toBe(false)
        },
      },
      {
        name: "create_plan creates plan",
        history: [createPlanCall("Test task", ["Step 1", "Step 2"])],
        check: (history: Block[]) => {
          const plan = getPlan(history)
          expect(plan?.task).toBe("Test task")
          expect(plan?.steps).toHaveLength(2)
          expect(getCurrentStep(history)).toBe(0)
          expect(hasActivePlan(history)).toBe(true)
        },
      },
      {
        name: "complete_step marks step done and advances",
        history: [createPlanCall("Task", ["Step 1", "Step 2"]), completeStepCall("Done")],
        check: (history: Block[]) => {
          const plan = getPlan(history)
          expect(plan?.steps[0].done).toBe(true)
          expect(plan?.steps[1].done).toBe(false)
          expect(getCurrentStep(history)).toBe(1)
        },
      },
      {
        name: "all steps complete returns null currentStep",
        history: [
          createPlanCall("Task", ["Step 1", "Step 2"]),
          completeStepCall("Done 1"),
          completeStepCall("Done 2"),
        ],
        check: (history: Block[]) => {
          expect(getCurrentStep(history)).toBe(null)
          expect(hasActivePlan(history)).toBe(false)
        },
      },
      {
        name: "abort clears plan",
        history: [createPlanCall("Task", ["Step 1"]), abortCall()],
        check: (history: Block[]) => {
          expect(getPlan(history)).toBe(null)
          expect(hasActivePlan(history)).toBe(false)
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(history))
    })
  })

  describe("exploration", () => {
    const cases = [
      {
        name: "no history returns null exploration",
        history: [] as Block[],
        check: (history: Block[]) => {
          expect(getExploration(history)).toBe(null)
          expect(hasActiveExploration(history)).toBe(false)
        },
      },
      {
        name: "start_exploration creates exploration",
        history: [startExplorationCall("How does X work?", "Check the docs")],
        check: (history: Block[]) => {
          const exploration = getExploration(history)
          expect(exploration?.question).toBe("How does X work?")
          expect(exploration?.findings).toHaveLength(0)
          expect(exploration?.currentDirection).toBe("Check the docs")
          expect(hasActiveExploration(history)).toBe(true)
        },
      },
      {
        name: "exploration_step with continue adds finding",
        history: [
          startExplorationCall("Question", "Look at A"),
          explorationStepCall("Found A details", "continue", "Now look at B"),
        ],
        check: (history: Block[]) => {
          const exploration = getExploration(history)
          expect(exploration?.findings).toHaveLength(1)
          expect(exploration?.findings[0].direction).toBe("Look at A")
          expect(exploration?.findings[0].learned).toBe("Found A details")
          expect(exploration?.currentDirection).toBe("Now look at B")
          expect(hasActiveExploration(history)).toBe(true)
        },
      },
      {
        name: "exploration_step with answer clears exploration",
        history: [
          startExplorationCall("Question"),
          explorationStepCall("Answer found", "answer"),
        ],
        check: (history: Block[]) => {
          expect(getExploration(history)).toBe(null)
          expect(hasActiveExploration(history)).toBe(false)
        },
      },
      {
        name: "exploration_step with plan clears exploration",
        history: [
          startExplorationCall("Question"),
          explorationStepCall("Ready to plan", "plan"),
        ],
        check: (history: Block[]) => {
          expect(getExploration(history)).toBe(null)
        },
      },
      {
        name: "abort clears exploration",
        history: [startExplorationCall("Question"), abortCall()],
        check: (history: Block[]) => {
          expect(getExploration(history)).toBe(null)
        },
      },
      {
        name: "create_plan clears exploration",
        history: [startExplorationCall("Question"), createPlanCall("Task", ["Step 1"])],
        check: (history: Block[]) => {
          expect(getExploration(history)).toBe(null)
          expect(getPlan(history)?.task).toBe("Task")
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(history))
    })
  })

  describe("getMode", () => {
    const cases = [
      {
        name: "empty history returns chat",
        history: [] as Block[],
        expected: "chat",
      },
      {
        name: "active plan returns plan",
        history: [createPlanCall("Task", ["Step 1"])],
        expected: "plan",
      },
      {
        name: "completed plan returns chat",
        history: [createPlanCall("Task", ["Step 1"]), completeStepCall()],
        expected: "chat",
      },
      {
        name: "active exploration returns exploration",
        history: [startExplorationCall("Question")],
        expected: "exploration",
      },
      {
        name: "exploration takes priority over plan",
        history: [createPlanCall("Task", ["Step 1"]), startExplorationCall("Question")],
        expected: "exploration",
      },
    ]

    cases.forEach(({ name, history, expected }) => {
      it(name, () => {
        expect(getMode(history)).toBe(expected)
      })
    })
  })
})
