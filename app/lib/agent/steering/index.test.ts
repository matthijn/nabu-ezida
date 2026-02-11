import { describe, expect, it, beforeEach } from "vitest"
import { createToNudge } from "./index"
import type { Block } from "../types"
import type { Files } from "../derived"
import {
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

    {
      name: "no orientation, first tool_result → tone nudge fires",
      history: [toolResult("1")],
      expect: { type: "contains", text: "users see titles and names" },
    },

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

    {
      name: "text block only → null",
      history: [textBlock("Response")],
      expect: { type: "none" },
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
