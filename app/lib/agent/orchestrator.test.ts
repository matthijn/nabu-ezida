import { describe, expect, it } from "vitest"
import { toNudge } from "./orchestrator"
import type { Block } from "./types"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  startExplorationCall,
  explorationStepCall,
  toolResult,
} from "./test-helpers"

const toolCallBlock = (): Block => ({ type: "tool_call", calls: [{ id: "1", name: "test", args: {} }] })
const manyActions = (count: number): Block[] =>
  Array.from({ length: count }, () => [toolCallBlock(), toolResult()]).flat()
const userMessage = (content = "Hello"): Block => ({ type: "user", content })
const textBlock = (content = "Response"): Block => ({ type: "text", content })

type NudgeExpectation =
  | { type: "null" }
  | { type: "empty" }
  | { type: "contains"; text: string }
  | { type: "contains_not"; text: string; not: string }

type TestCase = {
  name: string
  history: Block[]
  expect: NudgeExpectation
}

describe("toNudge", () => {
  const cases: TestCase[] = [
    // After tool_result during exploration
    {
      name: "exploring, <10 actions → exploration nudge",
      history: [startExplorationCall("Question", "Check A"), toolResult()],
      expect: { type: "contains", text: "EXPLORING:" },
    },
    {
      name: "exploring with findings, <10 actions → exploration nudge with findings",
      history: [
        startExplorationCall("Question", "Check A"),
        toolResult(),
        explorationStepCall("Found A", "continue", "Check B"),
        toolResult(),
      ],
      expect: { type: "contains", text: "Found A" },
    },
    {
      name: "exploring, exactly 10 actions → stuck nudge",
      history: [startExplorationCall("Question"), ...manyActions(10)],
      expect: { type: "contains", text: "STUCK" },
    },
    {
      name: "exploring, >10 actions → null (stops)",
      history: [startExplorationCall("Question"), ...manyActions(11)],
      expect: { type: "null" },
    },
    {
      name: "exploration completed with answer → empty nudge",
      history: [
        startExplorationCall("Question"),
        toolResult(),
        explorationStepCall("Found it", "answer"),
        toolResult(),
      ],
      expect: { type: "empty" },
    },

    // After tool_result during plan execution
    {
      name: "executing plan step, <10 actions → plan nudge",
      history: [createPlanCall("Task", ["Step 1", "Step 2"]), toolResult()],
      expect: { type: "contains", text: "EXECUTING STEP" },
    },
    {
      name: "executing plan step, exactly 10 actions → stuck nudge",
      history: [createPlanCall("Task", ["Step 1"]), ...manyActions(10)],
      expect: { type: "contains", text: "STUCK" },
    },
    {
      name: "executing plan step, >10 actions → null (stops)",
      history: [createPlanCall("Task", ["Step 1"]), ...manyActions(11)],
      expect: { type: "null" },
    },
    {
      name: "plan step count resets after complete_step",
      history: [
        createPlanCall("Task", ["Step 1", "Step 2"]),
        ...manyActions(9),
        completeStepCall(),
        toolResult(),
        ...manyActions(9),
      ],
      expect: { type: "contains_not", text: "EXECUTING STEP", not: "STUCK" },
    },

    // Plan completion
    {
      name: "plan just completed (all steps done) → completion nudge",
      history: [
        createPlanCall("Task", ["Step 1", "Step 2"]),
        toolResult(),
        completeStepCall(),
        toolResult(),
        completeStepCall(),
        toolResult(),
      ],
      expect: { type: "contains", text: "PLAN COMPLETED" },
    },
    {
      name: "plan completed, last block is text → null",
      history: [
        createPlanCall("Task", ["Step 1"]),
        toolResult(),
        completeStepCall(),
        toolResult(),
        textBlock("Summary"),
      ],
      expect: { type: "null" },
    },

    // Plan aborted
    {
      name: "plan aborted → null (stops)",
      history: [
        createPlanCall("Task", ["Step 1"]),
        toolResult(),
        abortCall("Cannot continue"),
        toolResult(),
      ],
      expect: { type: "null" },
    },

    // No exploration, no plan (chat mode)
    {
      name: "no exploration, no plan, tool_result → empty nudge",
      history: [toolResult()],
      expect: { type: "empty" },
    },

    // After user message
    {
      name: "user message → empty nudge",
      history: [userMessage("Hello")],
      expect: { type: "empty" },
    },

    // After text (no nudge needed)
    {
      name: "text block only → null",
      history: [textBlock("Response")],
      expect: { type: "null" },
    },

    // Exploration takes priority over plan
    {
      name: "exploration active during plan → exploration nudge",
      history: [
        createPlanCall("Task", ["Step 1"]),
        toolResult(),
        startExplorationCall("Question"),
        toolResult(),
      ],
      expect: { type: "contains", text: "EXPLORING:" },
    },

    // Exploration completed then plan
    {
      name: "exploration completed with plan → plan nudge",
      history: [
        startExplorationCall("Question"),
        toolResult(),
        explorationStepCall("Found it", "plan"),
        toolResult(),
        createPlanCall("Task", ["Step 1"]),
        toolResult(),
      ],
      expect: { type: "contains", text: "EXECUTING STEP" },
    },
  ]

  cases.forEach(({ name, history, expect: expectation }) => {
    it(name, () => {
      const nudge = toNudge(history)
      switch (expectation.type) {
        case "null":
          expect(nudge).toBeNull()
          break
        case "empty":
          expect(nudge).toBe("")
          break
        case "contains":
          expect(nudge).not.toBeNull()
          expect(nudge).toContain(expectation.text)
          break
        case "contains_not":
          expect(nudge).not.toBeNull()
          expect(nudge).toContain(expectation.text)
          expect(nudge).not.toContain(expectation.not)
          break
      }
    })
  })
})
