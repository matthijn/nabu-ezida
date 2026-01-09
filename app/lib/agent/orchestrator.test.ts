import { describe, expect, it } from "vitest"
import { toNudge } from "./orchestrator"
import type { Block } from "./types"
import {
  createPlanCall,
  completeStepCall,
  startExplorationCall,
  explorationStepCall,
  toolResult,
} from "./test-helpers"

describe("toNudge", () => {
  describe("plan execution", () => {
    const cases = [
      {
        name: "returns nudge when plan has pending step",
        history: [createPlanCall("Task", ["Step 1", "Step 2"]), toolResult()],
        check: (nudge: string | null) => {
          expect(nudge).not.toBeNull()
          expect(nudge).toContain("Step 1")
          expect(nudge).toContain("[pending]")
        },
      },
      {
        name: "returns null when plan is complete and last block is text",
        history: [
          createPlanCall("Task", ["Step 1", "Step 2"]),
          toolResult(),
          completeStepCall(),
          toolResult(),
          completeStepCall(),
          toolResult(),
          { type: "text" as const, content: "All done" },
        ],
        check: (nudge: string | null) => {
          expect(nudge).toBeNull()
        },
      },
      {
        name: "returns null when no plan and last block is text",
        history: [{ type: "text" as const, content: "Hello" }],
        check: (nudge: string | null) => {
          expect(nudge).toBeNull()
        },
      },
      {
        name: "nudge includes completed steps with done status",
        history: [
          createPlanCall("Task", ["Step 1", "Step 2", "Step 3"]),
          toolResult(),
          completeStepCall(),
          toolResult(),
        ],
        check: (nudge: string | null) => {
          expect(nudge).not.toBeNull()
          expect(nudge).toContain("[done]")
          expect(nudge).toContain("Step 2")
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => {
        const nudge = toNudge(history)
        check(nudge)
      })
    })
  })

  describe("after tool results", () => {
    const cases = [
      {
        name: "returns nudge after tool result with active plan",
        history: [createPlanCall("Task", ["Step 1"]), toolResult()],
        expectNudge: true,
      },
      {
        name: "returns empty nudge after tool result without plan (chat mode)",
        history: [toolResult()],
        expectNudge: true,
        expectEmpty: true,
      },
      {
        name: "returns completion nudge after tool result when plan just completed",
        history: [
          createPlanCall("Task", ["Step 1", "Step 2"]),
          toolResult(),
          completeStepCall(),
          toolResult(),
          completeStepCall(),
          toolResult(),
        ],
        expectNudge: true,
        expectContains: "PLAN COMPLETED",
      },
    ]

    cases.forEach(({ name, history, expectNudge, expectEmpty, expectContains }) => {
      it(name, () => {
        const nudge = toNudge(history)
        if (expectNudge) {
          expect(nudge).not.toBeNull()
          if (expectEmpty) expect(nudge).toBe("")
          if (expectContains) expect(nudge).toContain(expectContains)
        } else {
          expect(nudge).toBeNull()
        }
      })
    })
  })

  describe("exploration", () => {
    const cases = [
      {
        name: "returns nudge when exploration active with no findings",
        history: [startExplorationCall("How does X work?"), toolResult()],
        check: (nudge: string | null) => {
          expect(nudge).not.toBeNull()
          expect(nudge).toContain("How does X work?")
          expect(nudge).toContain("exploration_step")
        },
      },
      {
        name: "returns nudge showing findings",
        history: [
          startExplorationCall("Question", "Check A"),
          toolResult(),
          explorationStepCall("Found A", "continue", "Check B"),
          toolResult(),
          explorationStepCall("Found B", "continue"),
          toolResult(),
        ],
        check: (nudge: string | null) => {
          expect(nudge).not.toBeNull()
          expect(nudge).toContain("Found A")
          expect(nudge).toContain("Found B")
          expect(nudge).toContain('"answer"')
        },
      },
      {
        name: "exploration takes priority over plan",
        history: [
          createPlanCall("Task", ["Step 1"]),
          toolResult(),
          startExplorationCall("Question"),
          toolResult(),
        ],
        check: (nudge: string | null) => {
          expect(nudge).not.toBeNull()
          expect(nudge).toContain("EXPLORING:")
          expect(nudge).not.toContain("EXECUTING STEP")
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => {
        const nudge = toNudge(history)
        check(nudge)
      })
    })
  })

  describe("stuck detection", () => {
    const toolCallBlock = (): Block => ({ type: "tool_call", calls: [{ id: "1", name: "test", args: {} }] })
    const manyActions = (count: number): Block[] =>
      Array.from({ length: count }, () => [toolCallBlock(), toolResult()]).flat()

    const cases = [
      {
        name: "returns normal nudge when under limit",
        history: [createPlanCall("Task", ["Step 1"]), ...manyActions(9)],
        check: (nudge: string | null) => {
          expect(nudge).not.toBeNull()
          expect(nudge).toContain("EXECUTING STEP")
          expect(nudge).not.toContain("STUCK")
        },
      },
      {
        name: "returns stuck nudge at limit",
        history: [createPlanCall("Task", ["Step 1"]), ...manyActions(10)],
        check: (nudge: string | null) => {
          expect(nudge).not.toBeNull()
          expect(nudge).toContain("STUCK")
          expect(nudge).toContain("abort")
        },
      },
      {
        name: "returns null when over limit",
        history: [createPlanCall("Task", ["Step 1"]), ...manyActions(11)],
        check: (nudge: string | null) => {
          expect(nudge).toBeNull()
        },
      },
      {
        name: "resets count after complete_step",
        history: [
          createPlanCall("Task", ["Step 1", "Step 2"]),
          ...manyActions(9),
          completeStepCall(),
          ...manyActions(9),
        ],
        check: (nudge: string | null) => {
          expect(nudge).not.toBeNull()
          expect(nudge).toContain("EXECUTING STEP")
          expect(nudge).not.toContain("STUCK")
        },
      },
      {
        name: "exploration stuck nudge at limit",
        history: [startExplorationCall("Question"), ...manyActions(10)],
        check: (nudge: string | null) => {
          expect(nudge).not.toBeNull()
          expect(nudge).toContain("STUCK")
          expect(nudge).toContain("exploration_step")
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => {
        const nudge = toNudge(history)
        check(nudge)
      })
    })
  })
})
