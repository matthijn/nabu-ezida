import { describe, expect, it } from "vitest"
import { getNabuStatus } from "./status"
import type { Block } from "./blocks"

const user = (content: string): Block => ({ type: "user", content })
const text = (content: string): Block => ({ type: "text", content })
const draft = (content: string): Block => ({ type: "text", content, draft: true as const })

const askToolCall = (callId: string): Block => ({
  type: "tool_call",
  calls: [{ id: callId, name: "ask", args: { question: "pick one", scope: "chat" } }],
})

const toolResult = (callId: string): Block => ({
  type: "tool_result",
  callId,
  result: { output: "yes" },
})

describe("getNabuStatus", () => {
  const cases: {
    name: string
    loading: boolean
    history: Block[]
    inPlan?: boolean
    expected: ReturnType<typeof getNabuStatus>
  }[] = [
    {
      name: "empty history, not loading → idle",
      loading: false,
      history: [],
      expected: "idle",
    },
    {
      name: "loading, no ask → busy",
      loading: true,
      history: [user("hello"), text("hi")],
      expected: "busy",
    },
    {
      name: "unanswered ask → waiting-for-ask",
      loading: true,
      history: [user("hello"), askToolCall("c1")],
      expected: "waiting-for-ask",
    },
    {
      name: "answered ask → busy (loading true)",
      loading: true,
      history: [user("hello"), askToolCall("c1"), toolResult("c1")],
      expected: "busy",
    },
    {
      name: "answered ask, not loading → idle",
      loading: false,
      history: [user("hello"), askToolCall("c1"), toolResult("c1")],
      expected: "idle",
    },
    {
      name: "ask followed by text → not waiting",
      loading: false,
      history: [askToolCall("c1"), text("ok")],
      expected: "idle",
    },
    {
      name: "ask followed by user → not waiting",
      loading: false,
      history: [askToolCall("c1"), user("answer")],
      expected: "idle",
    },
    {
      name: "in plan, not loading → planning",
      loading: false,
      history: [],
      inPlan: true,
      expected: "planning",
    },
    {
      name: "in plan + loading → busy takes priority",
      loading: true,
      history: [],
      inPlan: true,
      expected: "busy",
    },
    {
      name: "in plan + waiting-for-ask → ask takes priority",
      loading: false,
      history: [askToolCall("c1")],
      inPlan: true,
      expected: "waiting-for-ask",
    },
    {
      name: "draft block is skipped — ask is still pending",
      loading: true,
      history: [askToolCall("c1"), draft("thinking...")],
      expected: "waiting-for-ask",
    },
    {
      name: "waiting-for-ask takes priority over busy",
      loading: true,
      history: [text("intro"), askToolCall("c1")],
      expected: "waiting-for-ask",
    },
  ]

  it.each(cases)("$name", ({ loading, history, expected, inPlan }) => {
    expect(getNabuStatus(loading, history, inPlan)).toBe(expected)
  })
})
