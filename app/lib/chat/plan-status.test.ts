import { describe, expect, it, beforeEach } from "vitest"
import { derive } from "~/lib/agent"
import { getPlanStatus, type PlanStatus } from "./plan-status"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  resetCallIdCounter,
} from "~/lib/agent/test-helpers"

beforeEach(() => resetCallIdCounter())

describe("getPlanStatus", () => {
  const cases = [
    {
      name: "no plan returns null",
      history: [],
      expected: null,
    },
    {
      name: "active plan returns current and next step",
      history: [
        ...createPlanCall("Build feature", ["Design", "Implement", "Test"]),
      ],
      expected: {
        task: "Build feature",
        current: { description: "Design" },
        next: { description: "Implement" },
        progress: null,
      },
    },
    {
      name: "active plan after completing first step",
      history: [
        ...createPlanCall("Build feature", ["Design", "Implement", "Test"]),
        ...completeStepCall("Designed"),
      ],
      expected: {
        task: "Build feature",
        current: { description: "Implement" },
        next: { description: "Test" },
        progress: null,
      },
    },
    {
      name: "last step of plan has null next",
      history: [
        ...createPlanCall("Build feature", ["Design", "Implement"]),
        ...completeStepCall("Designed"),
      ],
      expected: {
        task: "Build feature",
        current: { description: "Implement" },
        next: null,
        progress: null,
      },
    },
    {
      name: "completed plan returns null",
      history: [
        ...createPlanCall("Task", ["Step 1"]),
        ...completeStepCall("Done"),
      ],
      expected: null,
    },
    {
      name: "aborted plan returns null",
      history: [
        ...createPlanCall("Task", ["Step 1"]),
        ...abortCall(),
      ],
      expected: null,
    },
    {
      name: "per-section plan includes progress",
      history: [
        ...createPlanCall(
          "Process files",
          ["Setup", { per_section: ["Analyze", "Transform"] }, "Finalize"],
          ["file1.txt", "file2.txt"]
        ),
      ],
      files: { "file1.txt": "content1", "file2.txt": "content2" },
      expected: {
        task: "Process files",
        current: { description: "Setup" },
        next: { description: "Analyze" },
        progress: { completed: 0, total: 2 },
      },
    },
  ]

  cases.forEach(({ name, history, expected, files }) => {
    it(name, () => {
      const derived = derive(history, (files as Record<string, string>) ?? {})
      const result = getPlanStatus(derived)
      if (expected === null) {
        expect(result).toBeNull()
      } else {
        expect(result).toEqual(expected)
      }
    })
  })
})
