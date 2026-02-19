import { describe, expect, it, beforeEach } from "vitest"
import type { Block } from "~/lib/agent"
import { derive } from "~/lib/agent"
import { toGroupedMessages, type GroupedMessage, type PlanHeader, type PlanItem, type PlanStep, type PlanSectionGroup } from "./group"
import {
  createPlanCall,
  completeStepCall,
  cancelCall,
  resetCallIdCounter,
  userBlock,
  textBlock,
} from "~/lib/agent/test-helpers"

beforeEach(() => resetCallIdCounter())

const group = (history: Block[], files = {}): GroupedMessage[] =>
  toGroupedMessages(history, derive(history, files))

const isPlanHeader = (m: GroupedMessage): m is PlanHeader => m.type === "plan-header"
const isPlanItem = (m: GroupedMessage): m is PlanItem => m.type === "plan-item"
const isPlanStepItem = (m: GroupedMessage): m is PlanItem =>
  m.type === "plan-item" && m.child.type === "plan-step"
const isSectionGroupItem = (m: GroupedMessage): m is PlanItem & { child: PlanSectionGroup } =>
  m.type === "plan-item" && m.child.type === "plan-section-group"
const planSteps = (result: GroupedMessage[]): PlanStep[] =>
  result.filter(isPlanStepItem).map((m) => m.child as PlanStep)

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
        name: "plan header and items contain steps and messages interleaved",
        history: [
          userBlock("Help me"),
          ...createPlanCall("Build feature", ["Design", "Implement"]),
          textBlock("Starting design"),
          ...completeStepCall("Designed"),
          textBlock("Now implementing"),
        ],
        check: (result: GroupedMessage[]) => {
          expect(result[0].type).toBe("text")
          const header = result.find(isPlanHeader)!
          expect(header.task).toBe("Build feature")
          expect(header.completed).toBe(false)
          expect(header.aborted).toBe(false)
          const steps = planSteps(result)
          expect(steps).toHaveLength(2)
          expect(steps[0].status).toBe("completed")
          expect(steps[0].summary).toBe("Designed")
          expect(steps[1].status).toBe("active")
        },
      },
      {
        name: "completed plan has completed flag and all steps completed",
        history: [
          ...createPlanCall("Task", ["Step 1"]),
          ...completeStepCall("Done"),
        ],
        check: (result: GroupedMessage[]) => {
          const header = result.find(isPlanHeader)!
          expect(header.completed).toBe(true)
          expect(header.aborted).toBe(false)
          const steps = planSteps(result)
          expect(steps[0].status).toBe("completed")
        },
      },
      {
        name: "cancelled plan has aborted flag and cancelled step",
        history: [
          ...createPlanCall("Task", ["Step 1", "Step 2"]),
          ...cancelCall(),
        ],
        check: (result: GroupedMessage[]) => {
          const header = result.find(isPlanHeader)!
          expect(header.aborted).toBe(true)
          expect(header.completed).toBe(false)
          const steps = planSteps(result)
          expect(steps[0].status).toBe("cancelled")
          expect(steps[1].status).toBe("pending")
        },
      },
      {
        name: "all plan items have section=false and dimmed=false for simple plans",
        history: [
          ...createPlanCall("Task", ["Step 1", "Step 2"]),
          textBlock("Working"),
        ],
        check: (result: GroupedMessage[]) => {
          const items = result.filter(isPlanItem)
          expect(items.length).toBeGreaterThan(0)
          items.forEach((item) => {
            expect(item.section).toBe(false)
            expect(item.dimmed).toBe(false)
          })
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
        name: "messages before plan are leaves, messages after plan start are items",
        history: [
          userBlock("Before plan"),
          textBlock("Response before"),
          ...createPlanCall("Task", ["Step 1"]),
          textBlock("Inside plan"),
          ...completeStepCall("Done"),
          userBlock("After completion"),
        ],
        check: (result: GroupedMessage[]) => {
          expect(result[0].type).toBe("text")
          expect(result[1].type).toBe("text")
          expect(result[2].type).toBe("plan-header")
          const textItems = result.filter((m) => m.type === "plan-item" && m.child.type === "text")
          expect(textItems).toHaveLength(2)
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
          const headers = result.filter(isPlanHeader)
          expect(headers).toHaveLength(2)
          expect(headers[0].task).toBe("First")
          expect(headers[1].task).toBe("Second")
          const textItems = result.filter((m) =>
            m.type === "plan-item" && m.child.type === "text"
          ) as PlanItem[]
          expect(textItems).toHaveLength(1)
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
        name: "each plan gets its own PlanHeader",
        history: [
          ...createPlanCall("First task", ["Step A"]),
          textBlock("Working on first"),
          ...cancelCall(),
          ...createPlanCall("Second task", ["Step B"]),
          textBlock("Working on second"),
        ],
        check: (result: GroupedMessage[]) => {
          const headers = result.filter(isPlanHeader)
          expect(headers).toHaveLength(2)
          expect(headers[0].task).toBe("First task")
          expect(headers[0].aborted).toBe(true)
          expect(headers[1].task).toBe("Second task")
          expect(headers[1].aborted).toBe(false)
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
        name: "per-section plan has section labels and inner steps with section flag",
        history: [
          ...createPlanCall(
            "Process files",
            ["Setup", { per_section: ["Analyze", "Transform"], files: ["file1.txt", "file2.txt"] }, "Finalize"],
          ),
          textBlock("Setting up"),
          ...completeStepCall("Setup done"),
          textBlock("Analyzing file1"),
          ...completeStepCall("Analyzed"),
          textBlock("Transforming file1"),
          ...completeStepCall("Transformed"),
          textBlock("Analyzing file2"),
        ],
        files: { "file1.txt": "content1", "file2.txt": "content2" } as Record<string, string>,
        check: (result: GroupedMessage[]) => {
          expect(result.find(isPlanHeader)).toBeTruthy()
          const sectionGroups = result.filter(isSectionGroupItem)
          expect(sectionGroups.length).toBeGreaterThanOrEqual(1)
          sectionGroups.forEach((item) => expect(item.section).toBe(true))
          const innerSteps = sectionGroups.flatMap((sg) =>
            (sg.child as PlanSectionGroup).children.filter((c) => c.type === "plan-step")
          )
          expect(innerSteps.length).toBeGreaterThanOrEqual(2)
        },
      },
      {
        name: "untouched sections show as dimmed section groups",
        history: [
          ...createPlanCall(
            "Process",
            ["Setup", { per_section: ["Do it"], files: ["a.txt", "b.txt"] }, "Finalize"],
          ),
          ...completeStepCall("Setup done"),
          textBlock("Working on first"),
        ],
        files: { "a.txt": "a", "b.txt": "b" } as Record<string, string>,
        check: (result: GroupedMessage[]) => {
          const sectionGroups = result.filter(isSectionGroupItem)
          expect(sectionGroups.length).toBe(2)
          expect(sectionGroups[0].dimmed).toBe(false)
          expect(sectionGroups[1].dimmed).toBe(true)
        },
      },
    ]

    cases.forEach(({ name, history, files, check }) => {
      it(name, () => check(toGroupedMessages(history, derive(history, files ?? {}))))
    })
  })

  describe("streaming not in message list", () => {
    const cases = [
      {
        name: "toGroupedMessages does not accept streaming param",
        history: [
          ...createPlanCall("Task", ["Step 1"]),
          textBlock("Working"),
        ],
        check: (result: GroupedMessage[]) => {
          const textItems = result.filter((m) =>
            (m.type === "plan-item" && m.child.type === "text") || m.type === "text"
          )
          expect(textItems).toHaveLength(1)
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(group(history)))
    })
  })
})
