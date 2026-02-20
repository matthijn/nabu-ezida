import { describe, expect, it } from "vitest"
import type { Block } from "./types"
import { shouldContinue, hasToolCalls, excludeReasoning } from "./agent-loop"
import { deriveMode, buildModeResult, hasUserSincePlanEntry } from "./executors/modes"
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
      blocks: [toolCallBlock("search", "c1"), toolResult("c1", { status: "ok", output: "found it" })],
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
    { name: "mixed → true", blocks: [textBlock("hi"), toolCallBlock("search", "c1")], expected: true },
  ]

  cases.forEach(({ name, blocks, expected }) => {
    it(name, () => {
      expect(hasToolCalls(blocks)).toBe(expected)
    })
  })
})

describe("excludeReasoning", () => {
  const cases: { name: string; blocks: Block[]; expected: Block[] }[] = [
    { name: "removes reasoning", blocks: [textBlock("hi"), { type: "reasoning", content: "think" }], expected: [textBlock("hi")] },
    { name: "keeps everything else", blocks: [textBlock("hi"), userBlock("yo")], expected: [textBlock("hi"), userBlock("yo")] },
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
      name: "execute_with_plan result → plan",
      blocks: [
        toolCallBlock("execute_with_plan", "c1"),
        terminalResult("execute_with_plan", "c1", { status: "ok", output: "mode: plan" }),
      ],
      expected: "plan",
    },
    {
      name: "create_plan result → exec",
      blocks: [
        terminalResult("execute_with_plan", "c1", { status: "ok", output: "plan mode" }),
        toolCallBlock("create_plan", "c2", { task: "do stuff", steps: [] }),
        terminalResult("create_plan", "c2", { status: "ok", output: "exec mode" }),
      ],
      expected: "exec",
    },
    {
      name: "cancel result → chat",
      blocks: [
        terminalResult("execute_with_plan", "c1", { status: "ok", output: "plan" }),
        terminalResult("cancel", "c2", { status: "ok", output: { reason: "nah" } }),
      ],
      expected: "chat",
    },
    {
      name: "uses last trigger (plan then exec)",
      blocks: [
        terminalResult("execute_with_plan", "c1", { status: "ok", output: "plan" }),
        textBlock("here's the plan"),
        terminalResult("create_plan", "c2", { status: "ok", output: "exec" }),
      ],
      expected: "exec",
    },
    {
      name: "non-trigger results between triggers ignored",
      blocks: [
        terminalResult("execute_with_plan", "c1", { status: "ok", output: "plan" }),
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

describe("buildModeResult", () => {
  const cases: { name: string; mode: "chat" | "plan" | "exec"; contains: string[] }[] = [
    {
      name: "chat mode lists tools",
      mode: "chat",
      contains: ["Mode: chat", "execute_with_plan"],
    },
    {
      name: "plan mode lists tools",
      mode: "plan",
      contains: ["Mode: plan", "create_plan", "cancel"],
    },
    {
      name: "exec mode lists tools",
      mode: "exec",
      contains: ["Mode: exec", "complete_step"],
    },
  ]

  cases.forEach(({ name, mode, contains }) => {
    it(name, () => {
      const result = buildModeResult(mode)
      contains.forEach((s) => expect(result).toContain(s))
    })
  })
})

describe("hasUserSincePlanEntry", () => {
  const cases: { name: string; blocks: Block[]; expected: boolean }[] = [
    {
      name: "no plan entry → false",
      blocks: [textBlock("hi"), userBlock("hello")],
      expected: false,
    },
    {
      name: "plan entry, no user after → false",
      blocks: [
        terminalResult("execute_with_plan", "c1", { status: "ok", output: "plan" }),
        textBlock("What would you like?"),
      ],
      expected: false,
    },
    {
      name: "plan entry, user after → true",
      blocks: [
        terminalResult("execute_with_plan", "c1", { status: "ok", output: "plan" }),
        textBlock("What approach?"),
        userBlock("Let's do option A"),
      ],
      expected: true,
    },
    {
      name: "user before plan entry doesn't count",
      blocks: [
        userBlock("Start planning"),
        terminalResult("execute_with_plan", "c1", { status: "ok", output: "plan" }),
        textBlock("analyzing..."),
      ],
      expected: false,
    },
  ]

  cases.forEach(({ name, blocks, expected }) => {
    it(name, () => {
      expect(hasUserSincePlanEntry(blocks)).toBe(expected)
    })
  })
})
