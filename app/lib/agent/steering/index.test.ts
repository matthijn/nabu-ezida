import { describe, expect, it, beforeEach } from "vitest"
import { collect } from "./nudge-tools"
import type { Block } from "../types"
import type { Files } from "../derived"
import type { Nudger } from "./nudge-tools"
import { buildToolNudges } from "./nudges"
import { baselineNudge } from "./nudges/baseline"
import {
  orientateCall,
  reorientCall,
  toolResult,
  resetCallIdCounter,
} from "../test-helpers"

beforeEach(() => resetCallIdCounter())

const orchestratorToolNames = ["orientate", "reorient", "run_local_shell"]

const buildTestNudge = (files: Files = {}) => {
  const toolNudges = buildToolNudges(() => files)
  const nudgers: Nudger[] = orchestratorToolNames.flatMap((n) => toolNudges[n] ?? [])
  nudgers.push(baselineNudge)
  const nudge = collect(...nudgers)
  const excludeReasoning = (history: Block[]): Block[] =>
    history.filter((b) => b.type !== "reasoning")
  return (history: Block[]) => nudge(excludeReasoning(history))
}

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

type TestCase = {
  name: string
  history: Block[]
  files?: Record<string, string>
  expect: NudgeExpectation
}

const extractContent = (blocks: Block[]): string[] =>
  blocks.map((b) => ("content" in b ? (b as { content: string }).content : ""))

const joinNudges = (blocks: Block[]): string => extractContent(blocks).join("\n")

describe("nudge integration", () => {
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
      name: "orienting, >30 actions → orientation stops, baseline emptyNudge",
      history: [...orientateCall("Question"), ...manyActions(31)],
      expect: { type: "emptyNudge" },
    },
    {
      name: "orientation completed with answer → baseline emptyNudge",
      history: [
        ...orientateCall("Question"),
        ...reorientCall("ctx:done", "Found it", "answer"),
      ],
      expect: { type: "emptyNudge" },
    },
    {
      name: "no orientation, first tool_result → baseline emptyNudge",
      history: [toolResult("1")],
      expect: { type: "emptyNudge" },
    },
    {
      name: "shell error → reminder nudge",
      history: [toolCallBlock(), shellErrorResult()],
      expect: { type: "contains", text: "Shell error" },
    },
    {
      name: "user message → baseline emptyNudge",
      history: [userMessage("Hello")],
      expect: { type: "emptyNudge" },
    },
    {
      name: "text block only → no nudge (not a trigger)",
      history: [textBlock("Response")],
      expect: { type: "none" },
    },
  ]

  cases.forEach(({ name, history, files = {}, expect: expectation }) => {
    it(name, async () => {
      const toNudge = buildTestNudge(files)
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
      }
    })
  })
})
