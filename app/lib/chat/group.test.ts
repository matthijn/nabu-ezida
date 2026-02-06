import { describe, expect, it, beforeEach } from "vitest"
import type { Block } from "~/lib/agent"
import { derive } from "~/lib/agent"
import { toGroupedMessages, type GroupedMessage, type PlanGroup, type SectionGroup } from "./group"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  orientateCall,
  reorientCall,
  resetCallIdCounter,
  userBlock,
  textBlock,
} from "~/lib/agent/test-helpers"

beforeEach(() => resetCallIdCounter())

const group = (history: Block[], files = {}): GroupedMessage[] =>
  toGroupedMessages(history, derive(history, files))

const isPlanGroup = (m: GroupedMessage): m is PlanGroup => m.type === "plan-group"
const isSectionGroup = (child: unknown): child is SectionGroup =>
  (child as SectionGroup).type === "section-group"

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
        name: "messages within plan range grouped into PlanGroup",
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
            expect(result[1].children).toHaveLength(2)
          }
        },
      },
      {
        name: "completed plan has completed flag",
        history: [
          ...createPlanCall("Task", ["Step 1"]),
          ...completeStepCall("Done"),
        ],
        check: (result: GroupedMessage[]) => {
          expect(result).toHaveLength(1)
          if (isPlanGroup(result[0])) {
            expect(result[0].completed).toBe(true)
            expect(result[0].aborted).toBe(false)
          }
        },
      },
      {
        name: "aborted plan has aborted flag",
        history: [
          ...createPlanCall("Task", ["Step 1", "Step 2"]),
          ...abortCall(),
        ],
        check: (result: GroupedMessage[]) => {
          expect(result).toHaveLength(1)
          if (isPlanGroup(result[0])) {
            expect(result[0].aborted).toBe(true)
            expect(result[0].completed).toBe(false)
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
        name: "messages before plan are leaves, messages after plan start are grouped",
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
            expect(result[2].children).toHaveLength(2)
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
            expect(result[0].children).toHaveLength(1)
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
            expect(result[0].children).toHaveLength(1)
            expect(result[1].children).toHaveLength(1)
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
        name: "messages assigned to correct sections",
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
            const sectionChildren = result[0].children.filter(isSectionGroup)
            expect(sectionChildren.length).toBeGreaterThanOrEqual(1)
          }
        },
      },
    ]

    cases.forEach(({ name, history, files, check }) => {
      it(name, () => check(toGroupedMessages(history, derive(history, files ?? {}))))
    })
  })
})
