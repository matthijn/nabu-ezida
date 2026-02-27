import { describe, expect, it, beforeEach } from "vitest"
import type { Block } from "../types"
import { derive, lastPlan, hasActivePlan, getMode, isPlanPaused, guardCompleteStep } from "."
import {
  submitPlanCall,
  completeStepCall,
  cancelCall,
  textBlock,
  userBlock,
  resetCallIdCounter,
} from "../test-helpers"

beforeEach(() => resetCallIdCounter())

describe("derived", () => {
  describe("plan", () => {
    const cases = [
      {
        name: "no history returns null plan",
        history: [] as Block[],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d.plans)).toBe(null)
          expect(hasActivePlan(d.plans)).toBe(false)
        },
      },
      {
        name: "submit_plan creates plan",
        history: [...submitPlanCall("Test task", [{ title: "Step 1", expected: "Done 1" }, { title: "Step 2", expected: "Done 2" }])],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d.plans)
          expect(plan?.task).toBe("Test task")
          expect(plan?.steps).toHaveLength(2)
          expect(plan?.currentStep).toBe(0)
          expect(hasActivePlan(d.plans)).toBe(true)
        },
      },
      {
        name: "complete_step marks step done and advances",
        history: [...submitPlanCall("Task", [{ title: "Step 1", expected: "Done 1" }, { title: "Step 2", expected: "Done 2" }]), ...completeStepCall("Done")],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d.plans)
          expect(plan?.steps[0].done).toBe(true)
          expect(plan?.steps[1].done).toBe(false)
          expect(plan?.currentStep).toBe(1)
        },
      },
      {
        name: "complete_step stores internal context",
        history: [...submitPlanCall("Task", [{ title: "Step 1", expected: "Complete" }]), ...completeStepCall("Done", "id:123, count:5")],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d.plans)
          expect(plan?.steps[0].internal).toBe("id:123, count:5")
          expect(plan?.steps[0].summary).toBe("Done")
        },
      },
      {
        name: "all steps complete returns null currentStep",
        history: [
          ...submitPlanCall("Task", [{ title: "Step 1", expected: "Done 1" }, { title: "Step 2", expected: "Done 2" }]),
          ...completeStepCall("Done 1"),
          ...completeStepCall("Done 2"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d.plans)?.currentStep).toBe(null)
          expect(hasActivePlan(d.plans)).toBe(false)
        },
      },
      {
        name: "cancel marks plan as aborted",
        history: [...submitPlanCall("Task", [{ title: "Step 1", expected: "Complete" }]), ...cancelCall()],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d.plans)?.aborted).toBe(true)
          expect(hasActivePlan(d.plans)).toBe(false)
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
        name: "active plan returns exec",
        history: [...submitPlanCall("Task", [{ title: "Step 1", expected: "Complete" }])],
        expected: "exec",
      },
      {
        name: "completed plan returns chat",
        history: [...submitPlanCall("Task", [{ title: "Step 1", expected: "Complete" }]), ...completeStepCall()],
        expected: "chat",
      },
    ]

    cases.forEach(({ name, history, expected }) => {
      it(name, () => {
        expect(getMode(derive(history))).toBe(expected)
      })
    })
  })

  describe("isPlanPaused", () => {
    const cases = [
      {
        name: "empty history is not paused",
        history: [] as Block[],
        expected: false,
      },
      {
        name: "right after submit_plan is not paused",
        history: [...submitPlanCall("Task", ["Step 1"])],
        expected: false,
      },
      {
        name: "text block after step boundary is paused",
        history: [
          ...submitPlanCall("Task", ["Step 1"]),
          textBlock("Let me ask you something"),
        ],
        expected: true,
      },
      {
        name: "text block followed by user message is still paused",
        history: [
          ...submitPlanCall("Task", ["Step 1"]),
          textBlock("What should I do?"),
          userBlock("Do this"),
        ],
        expected: true,
      },
      {
        name: "text block followed by tool call is still paused",
        history: [
          ...submitPlanCall("Task", ["Step 1"]),
          textBlock("Let me check"),
          { type: "tool_call" as const, calls: [{ id: "99", name: "shell", args: { command: "ls" } }] },
          { type: "tool_result" as const, callId: "99", result: { status: "ok" } },
        ],
        expected: true,
      },
      {
        name: "complete_step after text un-pauses",
        history: [
          ...submitPlanCall("Task", ["Step 1", "Step 2"]),
          textBlock("Pausing here"),
          userBlock("Continue"),
          ...completeStepCall("Done"),
        ],
        expected: false,
      },
      {
        name: "no plan at all is not paused",
        history: [textBlock("Just chatting")],
        expected: false,
      },
    ]

    cases.forEach(({ name, history, expected }) => {
      it(name, () => {
        expect(isPlanPaused(history)).toBe(expected)
      })
    })
  })

  describe("nested steps", () => {
    const cases = [
      {
        name: "creates plan with nested steps flattened",
        history: () => [
          ...submitPlanCall("Analyze docs", [
            { title: "Research", expected: "Research done" },
            { nested: ["Analyze", "Code"] },
            { title: "Summary", expected: "Summarized" },
          ]),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d.plans)
          expect(plan?.steps).toHaveLength(4)
          expect(plan?.steps.map((s) => s.id)).toEqual(["1", "2.1", "2.2", "3"])
        },
      },
      {
        name: "nested steps advance linearly",
        history: () => [
          ...submitPlanCall("Task", [
            { title: "Pre", expected: "Pre done" },
            { nested: ["Inner 1", "Inner 2"] },
            { title: "Post", expected: "Post done" },
          ]),
          ...completeStepCall("Pre done"),
          ...completeStepCall("Inner 1 done"),
        ],
        check: (history: Block[]) => {
          const plan = lastPlan(derive(history).plans)
          expect(plan?.currentStep).toBe(2)
          expect(plan?.steps[1].done).toBe(true)
          expect(plan?.steps[2].done).toBe(false)
        },
      },
      {
        name: "completing all nested steps advances to next top-level",
        history: () => [
          ...submitPlanCall("Task", [
            { nested: ["Analyze", "Code"] },
            { title: "Summary", expected: "Summarized" },
          ]),
          ...completeStepCall("Analyzed"),
          ...completeStepCall("Coded"),
        ],
        check: (history: Block[]) => {
          const plan = lastPlan(derive(history).plans)
          expect(plan?.currentStep).toBe(2)
          expect(plan?.steps[0].done).toBe(true)
          expect(plan?.steps[1].done).toBe(true)
          expect(plan?.steps[2].done).toBe(false)
        },
      },
      {
        name: "all steps complete including nested",
        history: () => [
          ...submitPlanCall("Task", [
            { nested: ["Process"] },
            { title: "Final", expected: "Final done" },
          ]),
          ...completeStepCall("Processed"),
          ...completeStepCall("Final done"),
        ],
        check: (history: Block[]) => {
          const plan = lastPlan(derive(history).plans)
          expect(plan?.currentStep).toBe(null)
          expect(hasActivePlan(derive(history).plans)).toBe(false)
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(history()))
    })
  })

  describe("guards", () => {
    const cases = [
      {
        name: "guardCompleteStep: allowed on regular step",
        plan: () => {
          const history = [
            ...submitPlanCall("Task", [{ title: "Regular", expected: "Done" }]),
          ]
          return lastPlan(derive(history).plans)!
        },
        guard: guardCompleteStep,
        expected: true,
      },
      {
        name: "guardCompleteStep: allowed on nested step",
        plan: () => {
          const history = [
            ...submitPlanCall("Task", [{ nested: ["A", "B"] }]),
          ]
          return lastPlan(derive(history).plans)!
        },
        guard: guardCompleteStep,
        expected: true,
      },
      {
        name: "guardCompleteStep: denied when plan complete",
        plan: () => {
          const history = [
            ...submitPlanCall("Task", [{ title: "Step", expected: "Done" }]),
            ...completeStepCall("Done"),
          ]
          return lastPlan(derive(history).plans)!
        },
        guard: guardCompleteStep,
        expected: false,
      },
    ]

    cases.forEach(({ name, plan, guard, expected }) => {
      it(name, () => {
        expect(guard(plan()).allowed).toBe(expected)
      })
    })
  })

})
