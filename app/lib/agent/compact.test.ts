import { describe, expect, it } from "vitest"
import { compactHistory } from "./compact"
import type { Block } from "./types"

const userBlock = (content: string): Block => ({ type: "user", content })
const textBlock = (content: string): Block => ({ type: "text", content })
const systemBlock = (content: string): Block => ({ type: "system", content })

const compactedToolCall = (summary: string, directives?: Record<string, string>): Block => ({
  type: "tool_call",
  calls: [{ id: "compact_0", name: "compacted", args: { summary, ...(directives ? { directives } : {}) } }],
})

const compactedResult = (): Block => ({
  type: "tool_result",
  callId: "compact_0",
  toolName: "compacted",
  result: { status: "ok", output: "ok" },
})

const toolResult = (callId: string, name: string, result: unknown): Block => ({
  type: "tool_result",
  callId,
  toolName: name,
  result,
})

const submitPlanCall = (task: string, steps: { title: string; expected: string }[]): Block => ({
  type: "tool_call",
  calls: [{ id: "plan_0", name: "submit_plan", args: { task, steps } }],
})

const planResult = (): Block => ({
  type: "tool_result",
  callId: "plan_0",
  toolName: "submit_plan",
  result: { status: "ok", output: "ok" },
})

describe("compactHistory", () => {
  const cases = [
    {
      name: "no compacted in history — blocks unchanged",
      blocks: [userBlock("hi"), textBlock("hello")],
      files: {},
      expected: [userBlock("hi"), textBlock("hello")],
    },
    {
      name: "compacted at end — preserves pending user block",
      blocks: [
        userBlock("hi"),
        textBlock("hello"),
        userBlock("do something"),
        compactedToolCall("Summary of conversation"),
        compactedResult(),
      ],
      files: {},
      expected: [systemBlock("Summary of conversation"), userBlock("do something")],
    },
    {
      name: "compacted at end — preserves pending tool_result",
      blocks: [
        userBlock("hi"),
        textBlock("hello"),
        toolResult("c1", "shell", { output: "file contents" }),
        compactedToolCall("Summary of conversation"),
        compactedResult(),
      ],
      files: {},
      expected: [systemBlock("Summary of conversation"), toolResult("c1", "shell", { output: "file contents" })],
    },
    {
      name: "compacted at end — skips text blocks when finding pending",
      blocks: [
        userBlock("hi"),
        textBlock("hello"),
        compactedToolCall("Summary"),
        compactedResult(),
      ],
      files: {},
      expected: [systemBlock("Summary"), userBlock("hi")],
    },
    {
      name: "compacted at end, active plan — preserves pending + plan context",
      blocks: [
        submitPlanCall("Analyze data", [
          { title: "Read files", expected: "Files loaded" },
          { title: "Process data", expected: "Data processed" },
        ]),
        planResult(),
        userBlock("go"),
        textBlock("working on it"),
        compactedToolCall("We are analyzing data"),
        compactedResult(),
      ],
      files: {},
      expected: [
        systemBlock(
          "We are analyzing data\n\nActive plan: Analyze data\n" +
          "[    ] Read files\n" +
          "[    ] Process data"
        ),
        userBlock("go"),
      ],
    },
    {
      name: "compacted with blocks after — pending + trailing",
      blocks: [
        userBlock("hi"),
        compactedToolCall("Earlier conversation"),
        compactedResult(),
        userBlock("continue"),
        textBlock("sure"),
      ],
      files: {},
      expected: [
        systemBlock("Earlier conversation"),
        userBlock("hi"),
        userBlock("continue"),
        textBlock("sure"),
      ],
    },
    {
      name: "multiple compacted calls — last one wins with pending",
      blocks: [
        compactedToolCall("First summary"),
        compactedResult(),
        userBlock("more work"),
        textBlock("doing things"),
        compactedToolCall("Second summary"),
        compactedResult(),
        userBlock("final"),
      ],
      files: {},
      expected: [
        systemBlock("Second summary"),
        userBlock("more work"),
        userBlock("final"),
      ],
    },
    {
      name: "compacted with directives — pending + directive blocks",
      blocks: [
        userBlock("hi"),
        compactedToolCall("Summary here", { prompt: "planning", reasoning: "high" }),
        compactedResult(),
      ],
      files: {},
      expected: [
        systemBlock("Summary here"),
        systemBlock("<!-- prompt: planning -->"),
        systemBlock("<!-- reasoning: high -->"),
        userBlock("hi"),
      ],
    },
    {
      name: "compacted with directives and trailing blocks",
      blocks: [
        userBlock("hi"),
        compactedToolCall("Summary", { prompt: "execution" }),
        compactedResult(),
        userBlock("continue"),
      ],
      files: {},
      expected: [
        systemBlock("Summary"),
        systemBlock("<!-- prompt: execution -->"),
        userBlock("hi"),
        userBlock("continue"),
      ],
    },
    {
      name: "no pending block found — no user or tool_result before compaction",
      blocks: [
        textBlock("just text"),
        compactedToolCall("Summary"),
        compactedResult(),
      ],
      files: {},
      expected: [systemBlock("Summary")],
    },
  ]

  it.each(cases)("$name", ({ blocks, files, expected }) => {
    const result = compactHistory(blocks, files)
    expect(result).toEqual(expected)
  })
})
