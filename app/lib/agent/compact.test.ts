import { describe, expect, it } from "vitest"
import { compactHistory, stepCompactHistory, stepCompactedIndices } from "./compact"
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

const reasoningBlock = (content: string): Block => ({ type: "reasoning", content })

const completeStepCall = (summary: string, internal: string, id = "cs_0"): Block => ({
  type: "tool_call",
  calls: [{ id, name: "complete_step", args: { summary, internal } }],
})

const completeStepResult = (id = "cs_0"): Block => ({
  type: "tool_result",
  callId: id,
  toolName: "complete_step",
  result: { status: "ok" },
})

const workCall = (name: string, id = "w_0"): Block => ({
  type: "tool_call",
  calls: [{ id, name, args: {} }],
})

const workResult = (name: string, id = "w_0"): Block => ({
  type: "tool_result",
  callId: id,
  toolName: name,
  result: { status: "ok", output: "data" },
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

describe("stepCompactHistory", () => {
  const cases = [
    {
      name: "no plan — blocks unchanged",
      blocks: [userBlock("hi"), textBlock("hello")],
      expected: [userBlock("hi"), textBlock("hello")],
    },
    {
      name: "plan with no completed steps — blocks unchanged",
      blocks: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }]),
        planResult(),
        textBlock("working"),
        workCall("read_section", "w1"),
        workResult("read_section", "w1"),
      ],
      expected: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }]),
        planResult(),
        textBlock("working"),
        workCall("read_section", "w1"),
        workResult("read_section", "w1"),
      ],
    },
    {
      name: "one completed step — filters work blocks, keeps boundaries",
      blocks: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }, { title: "B", expected: "done" }]),
        planResult(),
        systemBlock("mode: exec"),
        textBlock("working on A"),
        workCall("read_section", "w1"),
        workResult("read_section", "w1"),
        reasoningBlock("thinking"),
        completeStepCall("Did A", "found 3 items"),
        completeStepResult(),
        textBlock("now B"),
      ],
      expected: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }, { title: "B", expected: "done" }]),
        planResult(),
        systemBlock("mode: exec"),
        completeStepCall("Did A", "found 3 items"),
        completeStepResult(),
        textBlock("now B"),
      ],
    },
    {
      name: "user block within completed step survives",
      blocks: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }]),
        planResult(),
        textBlock("working"),
        userBlock("checkpoint"),
        completeStepCall("Done", "ctx"),
        completeStepResult(),
      ],
      expected: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }]),
        planResult(),
        userBlock("checkpoint"),
        completeStepCall("Done", "ctx"),
        completeStepResult(),
      ],
    },
    {
      name: "compacted tool_call/result within step survives",
      blocks: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }]),
        planResult(),
        textBlock("working"),
        compactedToolCall("Mid-step summary"),
        compactedResult(),
        workCall("read_section", "w1"),
        workResult("read_section", "w1"),
        completeStepCall("Done", "ctx"),
        completeStepResult(),
      ],
      expected: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }]),
        planResult(),
        compactedToolCall("Mid-step summary"),
        compactedResult(),
        completeStepCall("Done", "ctx"),
        completeStepResult(),
      ],
    },
    {
      name: "two completed steps — both compacted, in-progress untouched",
      blocks: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }, { title: "B", expected: "done" }, { title: "C", expected: "done" }]),
        planResult(),
        textBlock("step A"),
        workCall("read_section", "w1"),
        workResult("read_section", "w1"),
        completeStepCall("Did A", "ctx-a", "cs1"),
        completeStepResult("cs1"),
        textBlock("step B"),
        workCall("apply_local_patch", "w2"),
        workResult("apply_local_patch", "w2"),
        completeStepCall("Did B", "ctx-b", "cs2"),
        completeStepResult("cs2"),
        textBlock("step C in progress"),
        workCall("read_section", "w3"),
        workResult("read_section", "w3"),
      ],
      expected: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }, { title: "B", expected: "done" }, { title: "C", expected: "done" }]),
        planResult(),
        completeStepCall("Did A", "ctx-a", "cs1"),
        completeStepResult("cs1"),
        completeStepCall("Did B", "ctx-b", "cs2"),
        completeStepResult("cs2"),
        textBlock("step C in progress"),
        workCall("read_section", "w3"),
        workResult("read_section", "w3"),
      ],
    },
    {
      name: "blocks before submit_plan are untouched",
      blocks: [
        userBlock("hi"),
        textBlock("planning..."),
        submitPlanCall("Task", [{ title: "A", expected: "done" }]),
        planResult(),
        textBlock("working"),
        completeStepCall("Done", "ctx"),
        completeStepResult(),
      ],
      expected: [
        userBlock("hi"),
        textBlock("planning..."),
        submitPlanCall("Task", [{ title: "A", expected: "done" }]),
        planResult(),
        completeStepCall("Done", "ctx"),
        completeStepResult(),
      ],
    },
  ]

  it.each(cases)("$name", ({ blocks, expected }) => {
    expect(stepCompactHistory(blocks)).toEqual(expected)
  })
})

describe("stepCompactedIndices", () => {
  const cases = [
    {
      name: "no plan — empty set",
      blocks: [userBlock("hi"), textBlock("hello")],
      expected: new Set<number>(),
    },
    {
      name: "one completed step — returns work block indices",
      blocks: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }]),
        planResult(),
        textBlock("working"),
        workCall("read_section", "w1"),
        workResult("read_section", "w1"),
        completeStepCall("Done", "ctx"),
        completeStepResult(),
      ],
      expected: new Set([2, 3, 4]),
    },
    {
      name: "system and user blocks not in compacted set",
      blocks: [
        submitPlanCall("Task", [{ title: "A", expected: "done" }]),
        planResult(),
        systemBlock("mode"),
        userBlock("checkpoint"),
        textBlock("working"),
        completeStepCall("Done", "ctx"),
        completeStepResult(),
      ],
      expected: new Set([4]),
    },
  ]

  it.each(cases)("$name", ({ blocks, expected }) => {
    expect(stepCompactedIndices(blocks)).toEqual(expected)
  })
})
