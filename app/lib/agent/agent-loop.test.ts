import { describe, expect, it } from "vitest"
import type { Block } from "./client"
import { shouldContinue, hasToolCalls, excludeReasoning } from "./agent-loop"
import { deriveMode } from "./executors/modes"
import { textBlock, userBlock, toolCallBlock, terminalResult, toolResult } from "./test-helpers"

describe("shouldContinue", () => {
  const cases: { name: string; blocks: Block[]; expected: boolean }[] = [
    {
      name: "text only → false (stop)",
      blocks: [textBlock("Hello")],
      expected: false,
    },
    {
      name: "no text no tools → true (continue)",
      blocks: [{ type: "system", content: "nudge" } as Block],
      expected: true,
    },
    {
      name: "tool calls → true (continue)",
      blocks: [toolCallBlock("search", "c1")],
      expected: true,
    },
    {
      name: "mixed text+tools → true (continue)",
      blocks: [textBlock("thinking..."), toolCallBlock("search", "c1")],
      expected: true,
    },
    {
      name: "non-terminal tool result → true (continue)",
      blocks: [
        toolCallBlock("search", "c1"),
        toolResult("c1", { status: "ok", output: "found it" }),
      ],
      expected: true,
    },
  ]

  cases.forEach(({ name, blocks, expected }) => {
    it(name, () => {
      expect(shouldContinue(blocks)).toBe(expected)
    })
  })
})

describe("hasToolCalls", () => {
  const cases: { name: string; blocks: Block[]; expected: boolean }[] = [
    { name: "empty → false", blocks: [], expected: false },
    { name: "text only → false", blocks: [textBlock("hi")], expected: false },
    { name: "has tool_call → true", blocks: [toolCallBlock("search", "c1")], expected: true },
    {
      name: "mixed → true",
      blocks: [textBlock("hi"), toolCallBlock("search", "c1")],
      expected: true,
    },
  ]

  cases.forEach(({ name, blocks, expected }) => {
    it(name, () => {
      expect(hasToolCalls(blocks)).toBe(expected)
    })
  })
})

describe("excludeReasoning", () => {
  const cases: { name: string; blocks: Block[]; expected: Block[] }[] = [
    {
      name: "removes reasoning",
      blocks: [textBlock("hi"), { type: "reasoning", content: "think" }],
      expected: [textBlock("hi")],
    },
    {
      name: "keeps everything else",
      blocks: [textBlock("hi"), userBlock("yo")],
      expected: [textBlock("hi"), userBlock("yo")],
    },
  ]

  cases.forEach(({ name, blocks, expected }) => {
    it(name, () => {
      expect(excludeReasoning(blocks)).toEqual(expected)
    })
  })
})

describe("deriveMode", () => {
  const cases: { name: string; blocks: Block[]; expected: string }[] = [
    {
      name: "empty blocks → chat",
      blocks: [],
      expected: "chat",
    },
    {
      name: "no trigger tool_results → chat",
      blocks: [textBlock("hi"), toolCallBlock("search", "c1"), toolResult("c1", { status: "ok" })],
      expected: "chat",
    },
    {
      name: "planning prompt marker → plan",
      blocks: [
        toolCallBlock("preflight", "c1"),
        toolResult("c1", { status: "ok", output: "preflight result" }),
        { type: "system", content: "<!-- prompt: planning -->" } as Block,
      ],
      expected: "plan",
    },
    {
      name: "preflight without prompt marker → chat",
      blocks: [
        toolCallBlock("preflight", "c1"),
        toolResult("c1", { status: "ok", output: "no plan needed" }),
      ],
      expected: "chat",
    },
    {
      name: "submit_plan result → exec",
      blocks: [
        { type: "system", content: "<!-- prompt: planning -->" } as Block,
        toolCallBlock("submit_plan", "c2", { task: "do stuff", steps: [] }),
        terminalResult("submit_plan", "c2", { status: "ok", output: "exec mode" }),
      ],
      expected: "exec",
    },
    {
      name: "cancel result → chat",
      blocks: [
        { type: "system", content: "<!-- prompt: planning -->" } as Block,
        terminalResult("cancel", "c2", { status: "ok", output: { reason: "nah" } }),
      ],
      expected: "chat",
    },
    {
      name: "uses last signal (plan then exec)",
      blocks: [
        { type: "system", content: "<!-- prompt: planning -->" } as Block,
        textBlock("here's the plan"),
        terminalResult("submit_plan", "c2", { status: "ok", output: "exec" }),
      ],
      expected: "exec",
    },
    {
      name: "prompt marker survives non-trigger results",
      blocks: [
        { type: "system", content: "<!-- prompt: planning -->" } as Block,
        toolCallBlock("run_local_shell", "c2"),
        toolResult("c2", { status: "ok", output: "file content" }),
        textBlock("analyzing..."),
      ],
      expected: "plan",
    },
  ]

  cases.forEach(({ name, blocks, expected }) => {
    it(name, () => {
      expect(deriveMode(blocks)).toBe(expected)
    })
  })
})
