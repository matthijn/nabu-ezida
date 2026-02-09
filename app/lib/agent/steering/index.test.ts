import { describe, expect, it, beforeEach } from "vitest"
import { createToNudge } from "./index"
import type { Block } from "../types"
import type { Files } from "../derived"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  orientateCall,
  reorientCall,
  toolResult,
  resetCallIdCounter,
  orchestratorTools,
} from "../test-helpers"

beforeEach(() => resetCallIdCounter())

const createTestNudge = (files: Files = {}) => createToNudge(orchestratorTools, true, () => files)

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

const extractContent = (blocks: Block[]): string[] =>
  blocks.map((b) => ("content" in b ? (b as { content: string }).content : ""))

const joinNudges = (blocks: Block[]): string => extractContent(blocks).join("\n")

describe("createToNudge", () => {
  const cases: TestCase[] = [
    // After tool_result during orientation
    {
      name: "orienting, <10 actions → orientation nudge",
      history: [...orientateCall("Question", "Check A")],
      expect: { type: "contains", text: "ORIENTING:" },
    },
    {
      name: "orienting with findings, <10 actions → orientation nudge with findings",
      history: [
        ...orientateCall("Question", "Check A"),
        ...reorientCall("ctx:a", "Found A", "continue", "Check B"),
      ],
      expect: { type: "contains", text: "Found A" },
    },
    {
      name: "orienting, exactly 30 actions → stuck nudge",
      history: [...orientateCall("Question"), ...manyActions(30)],
      expect: { type: "contains", text: "STUCK" },
    },
    {
      name: "orienting, >30 actions → orientation stops, tone nudge fires",
      history: [...orientateCall("Question"), ...manyActions(31)],
      expect: { type: "contains", text: "users see titles and names" },
    },
    {
      name: "orientation completed with answer → tone nudge fires",
      history: [
        ...orientateCall("Question"),
        ...reorientCall("ctx:done", "Found it", "answer"),
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

    // No orientation, no plan (chat mode)
    {
      name: "no orientation, no plan, first tool_result → tone nudge fires",
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

    // Orientation takes priority over plan
    {
      name: "orientation active during plan → orientation nudge",
      history: [
        ...createPlanCall("Task", ["Step 1"]),
        ...orientateCall("Question"),
      ],
      expect: { type: "contains", text: "ORIENTING:" },
    },

    // Orientation completed then plan
    {
      name: "orientation completed with plan → plan nudge",
      history: [
        ...orientateCall("Question"),
        ...reorientCall("ctx:ready", "Found it", "plan"),
        ...createPlanCall("Task", ["Step 1"]),
      ],
      expect: { type: "contains", text: "EXECUTING STEP" },
    },
  ]

  cases.forEach(({ name, history, files = {}, expect: expectation }) => {
    it(name, async () => {
      const toNudge = createTestNudge(files)
      const result = await toNudge(history)
      const nudge = joinNudges(result)
      const content = extractContent(result)
      switch (expectation.type) {
        case "none":
          expect(result).toEqual([])
          break
        case "emptyNudge":
          expect(result.length).toBeGreaterThan(0)
          expect(content.every((c) => c === "")).toBe(true)
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
