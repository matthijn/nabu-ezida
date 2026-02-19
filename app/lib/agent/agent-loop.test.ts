import { describe, expect, it } from "vitest"
import type { Block } from "./types"
import type { TaggedBlock } from "./block-store"
import type { LoopAction } from "./agent-loop"
import { processResponse, findTerminalResult, hasToolCalls, excludeReasoning } from "./agent-loop"
import { formatTaskContext, formatBranchContext, formatCompactContext, siblingKey } from "./executors/delegation"
import { textBlock, userBlock, systemBlock, toolCallBlock, terminalResult, toolResult, tagged } from "./test-helpers"

describe("processResponse", () => {
  const cases: { name: string; interactive: boolean; blocks: Block[]; expected: LoopAction }[] = [
    {
      name: "resolve → terminal ok",
      interactive: false,
      blocks: [terminalResult("resolve", "c1", { status: "ok", output: { outcome: "done" } })],
      expected: { type: "terminal", result: { status: "ok", output: { outcome: "done" } } },
    },
    {
      name: "cancel → terminal error",
      interactive: false,
      blocks: [terminalResult("cancel", "c1", { status: "ok", output: { reason: "bad input", need: "better data" } })],
      expected: { type: "terminal", result: { status: "error", output: "Cancelled: bad input. Need: better data" } },
    },
    {
      name: "text only, interactive=true → stop",
      interactive: true,
      blocks: [textBlock("Hello")],
      expected: { type: "stop" },
    },
    {
      name: "text only, interactive=false → terminal with text output",
      interactive: false,
      blocks: [textBlock("Hello")],
      expected: { type: "terminal", result: { status: "ok", output: "Hello" } },
    },
    {
      name: "no text no tools, interactive=false → continue",
      interactive: false,
      blocks: [{ type: "system", content: "nudge" } as Block],
      expected: { type: "continue" },
    },
    {
      name: "tool calls, interactive=true → continue",
      interactive: true,
      blocks: [toolCallBlock("search", "c1")],
      expected: { type: "continue" },
    },
    {
      name: "tool calls, interactive=false → continue",
      interactive: false,
      blocks: [toolCallBlock("search", "c1")],
      expected: { type: "continue" },
    },
    {
      name: "mixed text+tools → continue",
      interactive: true,
      blocks: [textBlock("thinking..."), toolCallBlock("search", "c1")],
      expected: { type: "continue" },
    },
    {
      name: "non-terminal tool result → continue",
      interactive: true,
      blocks: [toolCallBlock("search", "c1"), toolResult("c1", { status: "ok", output: "found it" })],
      expected: { type: "continue" },
    },
  ]

  cases.forEach(({ name, interactive, blocks, expected }) => {
    it(name, () => {
      expect(processResponse(interactive, blocks)).toEqual(expected)
    })
  })
})

describe("findTerminalResult", () => {
  const cases: { name: string; blocks: Block[]; expected: ReturnType<typeof findTerminalResult> }[] = [
    {
      name: "no terminal tools → null",
      blocks: [textBlock("Hello"), toolCallBlock("search", "c1")],
      expected: null,
    },
    {
      name: "resolve → ok result",
      blocks: [terminalResult("resolve", "c1", { status: "ok", output: { outcome: "done" } })],
      expected: { status: "ok", output: { outcome: "done" } },
    },
    {
      name: "cancel → error result",
      blocks: [terminalResult("cancel", "c1", { status: "ok", output: { reason: "nope", need: "help" } })],
      expected: { status: "error", output: "Cancelled: nope. Need: help" },
    },
    {
      name: "tool_result without toolName → null",
      blocks: [toolResult("c1")],
      expected: null,
    },
  ]

  cases.forEach(({ name, blocks, expected }) => {
    it(name, () => {
      expect(findTerminalResult(blocks)).toEqual(expected)
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

describe("block visibility per agent", () => {
  const forInstance = (blocks: TaggedBlock[], instance: string): TaggedBlock[] =>
    blocks.filter((b) => b.origin.instance === instance)

  describe("orchestrator delegates to expert, expert chats with user", () => {
    const session: TaggedBlock[] = [
      ...tagged("orchestrator-1", [systemBlock("You are an orchestrator")]),           // 1
      ...tagged("orchestrator-1", [userBlock("Analyze this code")]),                   // 2
      ...tagged("orchestrator-1", [textBlock("I'll delegate this")]),                  // 3
      ...tagged("orchestrator-1", [toolCallBlock("delegate", "d1", { who: "expert" })]), // 4
      ...tagged("orchestrator-1", [toolResult("d1")]),                                 // 5
      ...tagged("expert-2", [systemBlock("You are an expert")]),                       // 6
      ...tagged("expert-2", [systemBlock("# Delegated Task\n**Intent:** Analyze")]),   // 7
      ...tagged("expert-2", [textBlock("Let me analyze...")]),                         // 8
      ...tagged("expert-2", [userBlock("Can you check the imports?")]),                // 9
      ...tagged("expert-2", [textBlock("Sure, checking imports...")]),                  // 10
      ...tagged("expert-2", [toolCallBlock("search", "s1")]),                          // 11
      ...tagged("expert-2", [toolResult("s1", { status: "ok", output: "found" })]),    // 12
      ...tagged("expert-2", [textBlock("Here's what I found")]),                       // 13
      ...tagged("expert-2", [userBlock("Thanks, looks good")]),                        // 14
      ...tagged("expert-2", [toolCallBlock("resolve", "r1", { outcome: "done" })]),    // 15
      ...tagged("expert-2", [terminalResult("resolve", "r1", { status: "ok", output: { outcome: "done" } })]), // 16
      ...tagged("orchestrator-1", [textBlock("The expert finished")]),                 // 17
      ...tagged("orchestrator-1", [toolCallBlock("resolve", "r2", { outcome: "all done" })]), // 18
      ...tagged("orchestrator-1", [terminalResult("resolve", "r2", { status: "ok", output: { outcome: "all done" } })]), // 19
    ]

    it("orchestrator-1 sees only its own blocks", () => {
      const blocks = forInstance(session, "orchestrator-1")
      expect(blocks).toHaveLength(8)
    })

    it("expert-2 sees only its own blocks", () => {
      const blocks = forInstance(session, "expert-2")
      expect(blocks).toHaveLength(11)
    })

    it("user block #9 belongs to expert-2 only", () => {
      const expertBlocks = forInstance(session, "expert-2")
      const orchBlocks = forInstance(session, "orchestrator-1")
      expect(expertBlocks.filter((b) => b.type === "user" && b.content === "Can you check the imports?")).toHaveLength(1)
      expect(orchBlocks.filter((b) => b.type === "user" && b.content === "Can you check the imports?")).toHaveLength(0)
    })

    it("user block #14 belongs to expert-2 only", () => {
      const expertBlocks = forInstance(session, "expert-2")
      const orchBlocks = forInstance(session, "orchestrator-1")
      expect(expertBlocks.filter((b) => b.type === "user" && b.content === "Thanks, looks good")).toHaveLength(1)
      expect(orchBlocks.filter((b) => b.type === "user" && b.content === "Thanks, looks good")).toHaveLength(0)
    })

    it("user block #2 belongs to orchestrator-1 only", () => {
      const orchBlocks = forInstance(session, "orchestrator-1")
      const expertBlocks = forInstance(session, "expert-2")
      expect(orchBlocks.filter((b) => b.type === "user" && b.content === "Analyze this code")).toHaveLength(1)
      expect(expertBlocks.filter((b) => b.type === "user" && b.content === "Analyze this code")).toHaveLength(0)
    })
  })

  describe("sequential delegations (two experts)", () => {
    const session: TaggedBlock[] = [
      ...tagged("orchestrator-1", [systemBlock("You are an orchestrator")]),               // 1
      ...tagged("orchestrator-1", [userBlock("Process both files")]),                      // 2
      ...tagged("expert-2", [systemBlock("Expert for file A")]),                           // 3
      ...tagged("expert-2", [userBlock("How should I handle A?")]),                        // 4
      ...tagged("expert-2", [textBlock("Handle A like this")]),                            // 5
      ...tagged("expert-2", [terminalResult("resolve", "r1", { status: "ok", output: {} })]), // 6
      ...tagged("orchestrator-1", [textBlock("First expert done")]),                       // 7
      ...tagged("orchestrator-1", [toolCallBlock("delegate", "d2", { who: "expert" })]),   // 8
      ...tagged("expert-3", [systemBlock("Expert for file B")]),                           // 9
      ...tagged("expert-3", [userBlock("How should I handle B?")]),                        // 10
      ...tagged("expert-3", [textBlock("Handle B like this")]),                            // 11
      ...tagged("expert-3", [terminalResult("resolve", "r2", { status: "ok", output: {} })]), // 12
      ...tagged("orchestrator-1", [terminalResult("resolve", "r3", { status: "ok", output: {} })]), // 13
    ]

    it("orchestrator-1 sees 5 blocks", () => {
      expect(forInstance(session, "orchestrator-1")).toHaveLength(5)
    })

    it("expert-2 sees 4 blocks", () => {
      expect(forInstance(session, "expert-2")).toHaveLength(4)
    })

    it("expert-3 sees 4 blocks", () => {
      expect(forInstance(session, "expert-3")).toHaveLength(4)
    })

    it("zero overlap between expert-2 and expert-3", () => {
      const e2 = forInstance(session, "expert-2")
      const e3 = forInstance(session, "expert-3")
      const e2Set = new Set(e2)
      expect(e3.filter((b) => e2Set.has(b))).toHaveLength(0)
    })

    it("user block #4 in expert-2 only", () => {
      expect(forInstance(session, "expert-2").filter((b) => b.type === "user" && b.content === "How should I handle A?")).toHaveLength(1)
      expect(forInstance(session, "expert-3").filter((b) => b.type === "user" && b.content === "How should I handle A?")).toHaveLength(0)
    })

    it("user block #10 in expert-3 only", () => {
      expect(forInstance(session, "expert-3").filter((b) => b.type === "user" && b.content === "How should I handle B?")).toHaveLength(1)
      expect(forInstance(session, "expert-2").filter((b) => b.type === "user" && b.content === "How should I handle B?")).toHaveLength(0)
    })
  })

  describe("execute_with_plan (plan → exec)", () => {
    const session: TaggedBlock[] = [
      ...tagged("expert-2", [systemBlock("Expert context")]),                              // 1
      ...tagged("expert-2", [toolCallBlock("execute_with_plan", "ep1", { intent: "do it" })]), // 2
      ...tagged("plan-3", [systemBlock("Plan phase")]),                                    // 3
      ...tagged("plan-3", [userBlock("What approach?")]),                                  // 4
      ...tagged("plan-3", [textBlock("Here's the plan")]),                                 // 5
      ...tagged("plan-3", [terminalResult("resolve", "pr1", { status: "ok", output: { outcome: "planned" } })]), // 6
      ...tagged("exec-4", [systemBlock("Exec phase")]),                                    // 7
      ...tagged("exec-4", [textBlock("Executing...")]),                                    // 8
      ...tagged("exec-4", [terminalResult("resolve", "er1", { status: "ok", output: { outcome: "executed" } })]), // 9
      ...tagged("expert-2", [terminalResult("resolve", "r1", { status: "ok", output: {} })]), // 10
    ]

    it("expert-2 sees 3 blocks", () => {
      expect(forInstance(session, "expert-2")).toHaveLength(3)
    })

    it("plan-3 sees 4 blocks", () => {
      expect(forInstance(session, "plan-3")).toHaveLength(4)
    })

    it("exec-4 sees 3 blocks", () => {
      expect(forInstance(session, "exec-4")).toHaveLength(3)
    })

    it("user block #4 in plan-3 only", () => {
      expect(forInstance(session, "plan-3").filter((b) => b.type === "user")).toHaveLength(1)
      expect(forInstance(session, "exec-4").filter((b) => b.type === "user")).toHaveLength(0)
      expect(forInstance(session, "expert-2").filter((b) => b.type === "user")).toHaveLength(0)
    })

    it("no agent sees another agent's internal blocks", () => {
      const plan = forInstance(session, "plan-3")
      const exec = forInstance(session, "exec-4")
      const expert = forInstance(session, "expert-2")

      expect(plan.every((b) => b.origin.instance === "plan-3")).toBe(true)
      expect(exec.every((b) => b.origin.instance === "exec-4")).toBe(true)
      expect(expert.every((b) => b.origin.instance === "expert-2")).toBe(true)
    })
  })
})

describe("context formatting", () => {
  describe("formatTaskContext", () => {
    const cases: { name: string; args: { intent: string; context?: string }; contains: string[]; excludes?: string[] }[] = [
      {
        name: "intent only",
        args: { intent: "Analyze the code" },
        contains: ["Delegated Task", "Analyze the code"],
        excludes: ["Context"],
      },
      {
        name: "intent with context",
        args: { intent: "Analyze the code", context: "Focus on imports" },
        contains: ["Delegated Task", "Analyze the code", "Focus on imports"],
      },
    ]

    cases.forEach(({ name, args, contains, excludes }) => {
      it(name, () => {
        const result = formatTaskContext(args)
        contains.forEach((s) => expect(result).toContain(s))
        excludes?.forEach((s) => expect(result).not.toContain(s))
      })
    })
  })

  describe("formatBranchContext", () => {
    const cases: { name: string; task: string; file: string; content: string; annotations: string; priorResults: { file: string; result: { status: "ok"; output: unknown } }[]; contains: string[]; excludes?: string[] }[] = [
      {
        name: "file without annotations or prior results",
        task: "Review code",
        file: "src/main.ts",
        content: "const x = 1",
        annotations: "",
        priorResults: [],
        contains: ["Review code", "src/main.ts", "const x = 1"],
        excludes: ["Annotations", "Prior Results"],
      },
      {
        name: "file with annotations and prior results",
        task: "Review code",
        file: "src/util.ts",
        content: "export const add = (a, b) => a + b",
        annotations: '[{"type":"note"}]',
        priorResults: [{ file: "src/main.ts", result: { status: "ok", output: "reviewed" } }],
        contains: ["Review code", "src/util.ts", "export const add", "Annotations", "Prior Results", "src/main.ts"],
      },
    ]

    cases.forEach(({ name, task, file, content, annotations, priorResults, contains, excludes }) => {
      it(name, () => {
        const result = formatBranchContext(task, file, content, annotations, priorResults)
        contains.forEach((s) => expect(result).toContain(s))
        excludes?.forEach((s) => expect(result).not.toContain(s))
      })
    })
  })

  describe("formatCompactContext", () => {
    const cases: { name: string; task: string; results: { file: string; result: { status: "ok"; output: unknown } }[]; contains: string[] }[] = [
      {
        name: "compact with results",
        task: "Process all files",
        results: [
          { file: "a.ts", result: { status: "ok", output: "done a" } },
          { file: "b.ts", result: { status: "ok", output: "done b" } },
        ],
        contains: ["Compact Results", "Process all files", "**Files processed:** 2", "a.ts", "b.ts"],
      },
    ]

    cases.forEach(({ name, task, results, contains }) => {
      it(name, () => {
        const result = formatCompactContext(task, results)
        contains.forEach((s) => expect(result).toContain(s))
      })
    })
  })

  describe("siblingKey", () => {
    const cases: { name: string; agentKey: string; suffix: string; expected: string }[] = [
      { name: "simple agent", agentKey: "expert", suffix: "merge", expected: "expert/merge" },
      { name: "nested agent", agentKey: "team/expert", suffix: "merge", expected: "team/merge" },
      { name: "deeply nested", agentKey: "team/sub/expert", suffix: "plan", expected: "team/sub/plan" },
    ]

    cases.forEach(({ name, agentKey, suffix, expected }) => {
      it(name, () => {
        expect(siblingKey(agentKey, suffix)).toBe(expected)
      })
    })
  })
})
