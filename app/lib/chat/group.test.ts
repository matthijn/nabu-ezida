import { describe, expect, it, beforeEach } from "vitest"
import type { Block } from "~/lib/agent"
import { derive } from "~/lib/agent"
import { toGroupedMessages, type GroupedMessage, type PlanGroup, type PlanStep, type PlanSection } from "./group"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  resetCallIdCounter,
  userBlock,
  textBlock,
} from "~/lib/agent/test-helpers"

beforeEach(() => resetCallIdCounter())

const group = (history: Block[], files = {}): GroupedMessage[] =>
  toGroupedMessages(history, derive(history, files))

const isPlanGroup = (m: GroupedMessage): m is PlanGroup => m.type === "plan-group"
const isPlanStep = (child: unknown): child is PlanStep =>
  (child as PlanStep).type === "plan-step"
const isPlanSection = (child: unknown): child is PlanSection =>
  (child as PlanSection).type === "plan-section"

describe("toGroupedMessages", () => {
  describe("no plan", () => {
    const cases = [
      {
        name: "empty history returns empty",
        history: [] as Block[],
        check: (result: GroupedMessage[]) => {
          expect(result).toEqual([])
        },
      },
      {
        name: "flat text messages pass through as leaves",
        history: [userBlock("Hello"), textBlock("Hi there")],
        check: (result: GroupedMessage[]) => {
          expect(result).toHaveLength(2)
          expect(result[0]).toEqual({ type: "text", role: "user", content: "Hello" })
          expect(result[1]).toEqual({ type: "text", role: "assistant", content: "Hi there" })
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(group(history)))
    })
  })

  describe("simple plan (no sections)", () => {
    const cases = [
      {
        name: "plan group contains steps and messages interleaved",
        history: [
          userBlock("Help me"),
          ...createPlanCall("Build feature", ["Design", "Implement"]),
          textBlock("Starting design"),
          ...completeStepCall("Designed"),
          textBlock("Now implementing"),
        ],
        check: (result: GroupedMessage[]) => {
          expect(result).toHaveLength(2)
          expect(result[0].type).toBe("text")
          expect(isPlanGroup(result[1])).toBe(true)
          if (isPlanGroup(result[1])) {
            expect(result[1].task).toBe("Build feature")
            expect(result[1].completed).toBe(false)
            expect(result[1].aborted).toBe(false)
            const steps = result[1].children.filter(isPlanStep)
            expect(steps).toHaveLength(2)
            expect(steps[0].status).toBe("completed")
            expect(steps[0].summary).toBe("Designed")
            expect(steps[1].status).toBe("active")
          }
        },
      },
      {
        name: "completed plan has completed flag and all steps completed",
        history: [
          ...createPlanCall("Task", ["Step 1"]),
          ...completeStepCall("Done"),
        ],
        check: (result: GroupedMessage[]) => {
          expect(result).toHaveLength(1)
          if (isPlanGroup(result[0])) {
            expect(result[0].completed).toBe(true)
            expect(result[0].aborted).toBe(false)
            const steps = result[0].children.filter(isPlanStep)
            expect(steps[0].status).toBe("completed")
          }
        },
      },
      {
        name: "aborted plan has aborted flag and cancelled step",
        history: [
          ...createPlanCall("Task", ["Step 1", "Step 2"]),
          ...abortCall(),
        ],
        check: (result: GroupedMessage[]) => {
          expect(result).toHaveLength(1)
          if (isPlanGroup(result[0])) {
            expect(result[0].aborted).toBe(true)
            expect(result[0].completed).toBe(false)
            const steps = result[0].children.filter(isPlanStep)
            expect(steps[0].status).toBe("cancelled")
            expect(steps[1].status).toBe("pending")
          }
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(group(history)))
    })
  })

  describe("messages before and after plan", () => {
    const cases = [
      {
        name: "messages before plan are leaves, messages after plan start are in group",
        history: [
          userBlock("Before plan"),
          textBlock("Response before"),
          ...createPlanCall("Task", ["Step 1"]),
          textBlock("Inside plan"),
          ...completeStepCall("Done"),
          userBlock("After completion"),
        ],
        check: (result: GroupedMessage[]) => {
          expect(result).toHaveLength(3)
          expect(result[0].type).toBe("text")
          expect(result[1].type).toBe("text")
          expect(isPlanGroup(result[2])).toBe(true)
          if (isPlanGroup(result[2])) {
            const texts = result[2].children.filter((c) => c.type === "text")
            expect(texts).toHaveLength(2)
          }
        },
      },
      {
        name: "messages between two plans belong to the earlier plan",
        history: [
          ...createPlanCall("First", ["Step 1"]),
          ...completeStepCall("Done"),
          textBlock("Between plans"),
          ...createPlanCall("Second", ["Step 2"]),
        ],
        check: (result: GroupedMessage[]) => {
          expect(result).toHaveLength(2)
          expect(isPlanGroup(result[0])).toBe(true)
          expect(isPlanGroup(result[1])).toBe(true)
          if (isPlanGroup(result[0])) {
            expect(result[0].task).toBe("First")
            const texts = result[0].children.filter((c) => c.type === "text")
            expect(texts).toHaveLength(1)
          }
          if (isPlanGroup(result[1])) {
            expect(result[1].task).toBe("Second")
          }
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(group(history)))
    })
  })

  describe("multiple plans", () => {
    const cases = [
      {
        name: "each plan gets its own PlanGroup",
        history: [
          ...createPlanCall("First task", ["Step A"]),
          textBlock("Working on first"),
          ...abortCall(),
          ...createPlanCall("Second task", ["Step B"]),
          textBlock("Working on second"),
        ],
        check: (result: GroupedMessage[]) => {
          expect(result).toHaveLength(2)
          expect(isPlanGroup(result[0])).toBe(true)
          expect(isPlanGroup(result[1])).toBe(true)
          if (isPlanGroup(result[0]) && isPlanGroup(result[1])) {
            expect(result[0].task).toBe("First task")
            expect(result[0].aborted).toBe(true)
            expect(result[1].task).toBe("Second task")
            expect(result[1].aborted).toBe(false)
          }
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(group(history)))
    })
  })

  describe("plan with sections", () => {
    const cases = [
      {
        name: "per-section plan has section labels and inner steps",
        history: [
          ...createPlanCall(
            "Process files",
            ["Setup", { per_section: ["Analyze", "Transform"] }, "Finalize"],
            ["file1.txt", "file2.txt"]
          ),
          textBlock("Setting up"),
          ...completeStepCall("Setup done"),
          textBlock("Analyzing file1"),
          ...completeStepCall("Analyzed"),
          textBlock("Transforming file1"),
          ...completeStepCall("Transformed"),
          textBlock("Analyzing file2"),
        ],
        files: { "file1.txt": "content1", "file2.txt": "content2" },
        check: (result: GroupedMessage[]) => {
          expect(result).toHaveLength(1)
          expect(isPlanGroup(result[0])).toBe(true)
          if (isPlanGroup(result[0])) {
            const sections = result[0].children.filter(isPlanSection)
            expect(sections.length).toBeGreaterThanOrEqual(1)
            const steps = result[0].children.filter(isPlanStep)
            expect(steps.length).toBeGreaterThanOrEqual(2)
          }
        },
      },
    ]

    cases.forEach(({ name, history, files, check }) => {
      it(name, () => check(toGroupedMessages(history, derive(history, files ?? {}))))
    })
  })
})
