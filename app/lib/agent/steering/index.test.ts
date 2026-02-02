import { describe, expect, it, beforeEach } from "vitest"
import { toNudge } from "./index"
import type { Block } from "../types"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  startExplorationCall,
  explorationStepCall,
  toolResult,
  resetCallIdCounter,
} from "../test-helpers"

beforeEach(() => resetCallIdCounter())

const toolCallBlock = (): Block => ({ type: "tool_call", calls: [{ id: "1", name: "test", args: {} }] })
const manyActions = (count: number): Block[] =>
  Array.from({ length: count }, () => [toolCallBlock(), toolResult("1")]).flat()
const userMessage = (content = "Hello"): Block => ({ type: "user", content })
const textBlock = (content = "Response"): Block => ({ type: "text", content })
const shellErrorResult = (): Block => ({ type: "tool_result", callId: "1", toolName: "run_local_shell", result: { status: "error", output: "unknown command" } })

type NudgeExpectation =
  | { type: "none" }
  | { type: "emptyNudge" }
  | { type: "contains"; text: string }
  | { type: "contains_not"; text: string; not: string }

type TestCase = {
  name: string
  history: Block[]
  files?: Record<string, string>
  expect: NudgeExpectation
}

const joinNudges = (nudges: string[]): string => nudges.join("\n")

describe("toNudge", () => {
  const cases: TestCase[] = [
    // After tool_result during exploration
    {
      name: "exploring, <10 actions → exploration nudge",
      history: [...startExplorationCall("Question", "Check A")],
      expect: { type: "contains", text: "EXPLORING:" },
    },
    {
      name: "exploring with findings, <10 actions → exploration nudge with findings",
      history: [
        ...startExplorationCall("Question", "Check A"),
        ...explorationStepCall("ctx:a", "Found A", "continue", "Check B"),
      ],
      expect: { type: "contains", text: "Found A" },
    },
    {
      name: "exploring, exactly 30 actions → stuck nudge",
      history: [...startExplorationCall("Question"), ...manyActions(30)],
      expect: { type: "contains", text: "STUCK" },
    },
    {
      name: "exploring, >30 actions → exploration stops, tone nudge fires",
      history: [...startExplorationCall("Question"), ...manyActions(31)],
      expect: { type: "contains", text: "users see titles and names" },
    },
    {
      name: "exploration completed with answer → tone nudge fires",
      history: [
        ...startExplorationCall("Question"),
        ...explorationStepCall("ctx:done", "Found it", "answer"),
      ],
      expect: { type: "contains", text: "users see titles and names" },
    },

    // After tool_result during plan execution
    {
      name: "executing plan step, <10 actions → plan nudge",
      history: [...createPlanCall("Task", ["Step 1", "Step 2"])],
      expect: { type: "contains", text: "EXECUTING STEP" },
    },
    {
      name: "executing plan step, exactly 10 actions → stuck nudge",
      history: [...createPlanCall("Task", ["Step 1"]), ...manyActions(10)],
      expect: { type: "contains", text: "STUCK" },
    },
    {
      name: "executing plan step, >10 actions → plan stops, tone nudge fires",
      history: [...createPlanCall("Task", ["Step 1"]), ...manyActions(11)],
      expect: { type: "contains", text: "users see titles and names" },
    },
    {
      name: "plan step count resets after complete_step",
      history: [
        ...createPlanCall("Task", ["Step 1", "Step 2"]),
        ...manyActions(9),
        ...completeStepCall(),
        ...manyActions(9),
      ],
      expect: { type: "contains_not", text: "EXECUTING STEP", not: "STUCK" },
    },

    // Plan completion
    {
      name: "plan just completed (all steps done) → completion nudge",
      history: [
        ...createPlanCall("Task", ["Step 1", "Step 2"]),
        ...completeStepCall(),
        ...completeStepCall(),
      ],
      expect: { type: "contains", text: "PLAN COMPLETED" },
    },
    {
      name: "plan completed, last block is text → null",
      history: [
        ...createPlanCall("Task", ["Step 1"]),
        ...completeStepCall(),
        textBlock("Summary"),
      ],
      expect: { type: "none" },
    },

    // Plan aborted
    {
      name: "plan aborted → tone nudge fires",
      history: [
        ...createPlanCall("Task", ["Step 1"]),
        ...abortCall("Cannot continue"),
      ],
      expect: { type: "contains", text: "users see titles and names" },
    },

    // No exploration, no plan (chat mode)
    {
      name: "no exploration, no plan, first tool_result → tone nudge fires",
      history: [toolResult("1")],
      expect: { type: "contains", text: "users see titles and names" },
    },

    // Shell error nudge
    {
      name: "shell error → reminder nudge",
      history: [toolCallBlock(), shellErrorResult()],
      expect: { type: "contains", text: "Shell error" },
    },
    {
      name: "user message → no shell nudge (tool defs in request)",
      history: [userMessage("Hello")],
      expect: { type: "emptyNudge" },
    },

    // After text (no nudge needed)
    {
      name: "text block only → null",
      history: [textBlock("Response")],
      expect: { type: "none" },
    },

    // Exploration takes priority over plan
    {
      name: "exploration active during plan → exploration nudge",
      history: [
        ...createPlanCall("Task", ["Step 1"]),
        ...startExplorationCall("Question"),
      ],
      expect: { type: "contains", text: "EXPLORING:" },
    },

    // Exploration completed then plan
    {
      name: "exploration completed with plan → plan nudge",
      history: [
        ...startExplorationCall("Question"),
        ...explorationStepCall("ctx:ready", "Found it", "plan"),
        ...createPlanCall("Task", ["Step 1"]),
      ],
      expect: { type: "contains", text: "EXECUTING STEP" },
    },
  ]

  cases.forEach(({ name, history, files = {}, expect: expectation }) => {
    it(name, () => {
      const result = toNudge(history, files)
      const nudge = joinNudges(result)
      switch (expectation.type) {
        case "none":
          expect(result).toEqual([])
          break
        case "emptyNudge":
          expect(result.length).toBeGreaterThan(0)
          expect(result.every((r) => r === "")).toBe(true)
          break
        case "contains":
          expect(result.length).toBeGreaterThan(0)
          expect(nudge).toContain(expectation.text)
          break
        case "contains_not":
          expect(result.length).toBeGreaterThan(0)
          expect(nudge).toContain(expectation.text)
          expect(nudge).not.toContain(expectation.not)
          break
      }
    })
  })
})
