import { describe, expect, it } from "vitest"
import { parseResponse, parsePlan } from "./parse"
import type { ToolCall } from "~/domain/llm"

describe("parseResponse", () => {
  const cases = [
    {
      name: "plain text returns text type",
      content: "Hello, how can I help you?",
      toolCalls: undefined,
      expected: { type: "text", content: "Hello, how can I help you?" },
    },
    {
      name: "TASK: marker returns task type",
      content: "TASK: Build a login form",
      toolCalls: undefined,
      expected: { type: "task", task: "Build a login form" },
    },
    {
      name: "STEP_COMPLETE marker returns step_complete type",
      content: "STEP_COMPLETE Created the component successfully",
      toolCalls: undefined,
      expected: { type: "step_complete", summary: "Created the component successfully" },
    },
    {
      name: "JSON step_complete in code block",
      content: '```json\n{"type": "step_complete", "summary": "Done with step"}\n```',
      toolCalls: undefined,
      expected: { type: "step_complete", summary: "Done with step" },
    },
    {
      name: "JSON stuck in code block",
      content: '```json\n{"type": "stuck", "question": "Which database should I use?"}\n```',
      toolCalls: undefined,
      expected: { type: "stuck", question: "Which database should I use?" },
    },
    {
      name: "JSON task in code block",
      content: '```json\n{"type": "task", "task": "Implement auth"}\n```',
      toolCalls: undefined,
      expected: { type: "task", task: "Implement auth" },
    },
    {
      name: "JSON task with description field fallback",
      content: '```json\n{"type": "task", "description": "Implement auth"}\n```',
      toolCalls: undefined,
      expected: { type: "task", task: "Implement auth" },
    },
    {
      name: "JSON plan with steps",
      content: '```json\n{"type": "plan", "task": "Build form", "steps": ["Step 1", "Step 2"]}\n```',
      toolCalls: undefined,
      expectedType: "plan",
      expectedPlanTask: "Build form",
      expectedStepCount: 2,
    },
    {
      name: "JSON with steps array (no type field)",
      content: '```json\n{"task": "Build form", "steps": ["Create component", "Add validation"]}\n```',
      toolCalls: undefined,
      expectedType: "plan",
      expectedPlanTask: "Build form",
      expectedStepCount: 2,
    },
    {
      name: "OpenAI tool call takes precedence",
      content: "Some text content",
      toolCalls: [
        {
          id: "call_123",
          function: { name: "read_file", arguments: '{"path": "/src/index.ts"}' },
        },
      ] as ToolCall[],
      expected: {
        type: "tool_call",
        name: "read_file",
        id: "call_123",
        args: { path: "/src/index.ts" },
      },
    },
    {
      name: "OpenAI tool call with invalid JSON args returns empty object",
      content: "Some text",
      toolCalls: [
        {
          id: "call_456",
          function: { name: "some_tool", arguments: "not valid json" },
        },
      ] as ToolCall[],
      expected: {
        type: "tool_call",
        name: "some_tool",
        id: "call_456",
        args: {},
      },
    },
    {
      name: "stuck with default question",
      content: '```json\n{"type": "stuck"}\n```',
      toolCalls: undefined,
      expected: { type: "stuck", question: "What should I do?" },
    },
    {
      name: "invalid JSON in code block falls through to text",
      content: '```json\n{invalid json}\n```',
      toolCalls: undefined,
      expected: { type: "text", content: '```json\n{invalid json}\n```' },
    },
  ]

  cases.forEach(({ name, content, toolCalls, expected, expectedType, expectedPlanTask, expectedStepCount }) => {
    it(name, () => {
      const result = parseResponse(content, toolCalls)

      if (expected) {
        expect(result).toEqual(expected)
      } else if (expectedType === "plan") {
        expect(result.type).toBe("plan")
        if (result.type === "plan") {
          expect(result.plan.task).toBe(expectedPlanTask)
          expect(result.plan.steps).toHaveLength(expectedStepCount!)
        }
      }
    })
  })
})

describe("parsePlan", () => {
  const cases = [
    {
      name: "parses JSON plan from code block",
      content: '```json\n{"task": "Build widget", "steps": ["Create component", "Add styles", "Write tests"]}\n```',
      expectedTask: "Build widget",
      expectedSteps: ["Create component", "Add styles", "Write tests"],
    },
    {
      name: "parses steps with description objects",
      content: '```json\n{"task": "Refactor", "steps": [{"description": "Extract function"}, {"description": "Update imports"}]}\n```',
      expectedTask: "Refactor",
      expectedSteps: ["Extract function", "Update imports"],
    },
    {
      name: "parses numbered list",
      content: "Here's my plan:\n1. First step\n2. Second step\n3. Third step",
      expectedTask: "Task",
      expectedSteps: ["First step", "Second step", "Third step"],
    },
    {
      name: "parses numbered list with dots and spaces",
      content: "1.  Step one\n2.  Step two",
      expectedTask: "Task",
      expectedSteps: ["Step one", "Step two"],
    },
    {
      name: "defaults task to 'Task' when not provided in JSON",
      content: '```json\n{"steps": ["Do something"]}\n```',
      expectedTask: "Task",
      expectedSteps: ["Do something"],
    },
    {
      name: "returns null for plain text without steps",
      content: "Just some random text without any plan",
      expectedNull: true,
    },
    {
      name: "returns null for empty content",
      content: "",
      expectedNull: true,
    },
    {
      name: "returns null for JSON without steps array",
      content: '```json\n{"task": "Something", "description": "No steps here"}\n```',
      expectedNull: true,
    },
    {
      name: "assigns sequential IDs to steps",
      content: "1. First\n2. Second\n3. Third",
      expectedTask: "Task",
      expectedSteps: ["First", "Second", "Third"],
      checkIds: ["1", "2", "3"],
    },
    {
      name: "all steps start with pending status",
      content: "1. Step one\n2. Step two",
      expectedTask: "Task",
      expectedSteps: ["Step one", "Step two"],
      checkStatus: "pending",
    },
  ]

  cases.forEach(({ name, content, expectedTask, expectedSteps, expectedNull, checkIds, checkStatus }) => {
    it(name, () => {
      const result = parsePlan(content)

      if (expectedNull) {
        expect(result).toBeNull()
      } else {
        expect(result).not.toBeNull()
        expect(result!.task).toBe(expectedTask)
        expect(result!.steps.map((s) => s.description)).toEqual(expectedSteps)

        if (checkIds) {
          expect(result!.steps.map((s) => s.id)).toEqual(checkIds)
        }

        if (checkStatus) {
          result!.steps.forEach((s) => {
            expect(s.status).toBe(checkStatus)
          })
        }
      }
    })
  })
})
