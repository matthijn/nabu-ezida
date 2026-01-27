import { describe, expect, it } from "vitest"
import type { Block } from "./types"
import { derive, lastPlan, hasActivePlan, hasActiveExploration, getMode } from "./selectors"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  startExplorationCall,
  explorationStepCall,
  userBlock,
} from "./test-helpers"

describe("selectors", () => {
  describe("plan", () => {
    const cases = [
      {
        name: "no history returns null plan",
        history: [] as Block[],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d)).toBe(null)
          expect(hasActivePlan(d)).toBe(false)
        },
      },
      {
        name: "create_plan creates plan",
        history: [createPlanCall("Test task", ["Step 1", "Step 2"])],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d)
          expect(plan?.task).toBe("Test task")
          expect(plan?.steps).toHaveLength(2)
          expect(plan?.currentStep).toBe(0)
          expect(hasActivePlan(d)).toBe(true)
        },
      },
      {
        name: "complete_step marks step done and advances",
        history: [createPlanCall("Task", ["Step 1", "Step 2"]), completeStepCall("Done")],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d)
          expect(plan?.steps[0].done).toBe(true)
          expect(plan?.steps[1].done).toBe(false)
          expect(plan?.currentStep).toBe(1)
        },
      },
      {
        name: "complete_step stores internal context",
        history: [createPlanCall("Task", ["Step 1"]), completeStepCall("Done", "id:123, count:5")],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d)
          expect(plan?.steps[0].internal).toBe("id:123, count:5")
          expect(plan?.steps[0].summary).toBe("Done")
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
          const d = derive(history)
          expect(lastPlan(d)?.currentStep).toBe(null)
          expect(hasActivePlan(d)).toBe(false)
        },
      },
      {
        name: "abort marks plan as aborted",
        history: [createPlanCall("Task", ["Step 1"]), abortCall()],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d)?.aborted).toBe(true)
          expect(hasActivePlan(d)).toBe(false)
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
          const d = derive(history)
          expect(d.exploration).toBe(null)
          expect(hasActiveExploration(d)).toBe(false)
        },
      },
      {
        name: "start_exploration creates exploration",
        history: [startExplorationCall("How does X work?", "Check the docs")],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.question).toBe("How does X work?")
          expect(d.exploration?.findings).toHaveLength(0)
          expect(d.exploration?.currentDirection).toBe("Check the docs")
          expect(hasActiveExploration(d)).toBe(true)
        },
      },
      {
        name: "exploration_step with continue adds finding",
        history: [
          startExplorationCall("Question", "Look at A"),
          explorationStepCall("Found A details", "continue", "Now look at B"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.findings).toHaveLength(1)
          expect(d.exploration?.findings[0].direction).toBe("Look at A")
          expect(d.exploration?.findings[0].learned).toBe("Found A details")
          expect(d.exploration?.currentDirection).toBe("Now look at B")
          expect(hasActiveExploration(d)).toBe(true)
        },
      },
      {
        name: "exploration_step stores internal context",
        history: [
          startExplorationCall("Question", "Look at A"),
          explorationStepCall("Found it", "continue", "Next", "fileId:abc"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.findings[0].internal).toBe("fileId:abc")
          expect(d.exploration?.findings[0].learned).toBe("Found it")
        },
      },
      {
        name: "exploration_step with answer marks completed",
        history: [
          startExplorationCall("Question"),
          explorationStepCall("Answer found", "answer"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.completed).toBe(true)
          expect(hasActiveExploration(d)).toBe(false)
        },
      },
      {
        name: "exploration_step with plan marks completed",
        history: [
          startExplorationCall("Question"),
          explorationStepCall("Ready to plan", "plan"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.completed).toBe(true)
        },
      },
      {
        name: "abort clears exploration",
        history: [startExplorationCall("Question"), abortCall()],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration).toBe(null)
        },
      },
      {
        name: "create_plan clears exploration",
        history: [startExplorationCall("Question"), createPlanCall("Task", ["Step 1"])],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration).toBe(null)
          expect(lastPlan(d)?.task).toBe("Task")
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
        expect(getMode(derive(history))).toBe(expected)
      })
    })
  })

})
