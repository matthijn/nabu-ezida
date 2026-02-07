import { describe, it, expect } from "vitest"
import { addAnnotation, markForDeletion, summarizeExpertise } from "./expert-tools"

const makeFiles = (entries: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(entries))

const docWithBlock = (prose: string, json: object): string =>
  `# Title\n\n${prose}\n\n\`\`\`json-attributes\n${JSON.stringify(json, null, 2)}\n\`\`\`\n`

const docPlain = (prose: string): string =>
  `# Title\n\n${prose}\n`

const PROSE = "The participant mentioned their privacy concerns were paramount. They felt the policy was unclear on data retention."

describe("add_annotation", () => {
  type Case = {
    name: string
    files: Map<string, string>
    args: Record<string, unknown>
    expectStatus: "ok" | "error"
    expectOutput: string | RegExp
    expectMutations?: number
  }

  const cases: Case[] = [
    {
      name: "adds annotation to doc with no attributes block",
      files: makeFiles({ "doc.md": docPlain(PROSE) }),
      args: {
        path: "doc.md",
        text: "privacy concerns were paramount",
        code: "code_privacy",
        reason: "Discusses privacy",
        confidence: "high",
      },
      expectStatus: "ok",
      expectOutput: /Created annotation/,
      expectMutations: 1,
    },
    {
      name: "appends to existing annotations",
      files: makeFiles({
        "doc.md": docWithBlock(PROSE, {
          annotations: [{
            text: "policy was unclear on data retention",
            code: "code_policy",
            reason: "Policy clarity",
          }],
        }),
      }),
      args: {
        path: "doc.md",
        text: "privacy concerns were paramount",
        code: "code_privacy",
        reason: "Discusses privacy",
        confidence: "high",
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "creates annotations array when block exists but empty",
      files: makeFiles({ "doc.md": docWithBlock(PROSE, {}) }),
      args: {
        path: "doc.md",
        text: "privacy concerns were paramount",
        code: "code_privacy",
        reason: "Discusses privacy",
        confidence: "high",
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "error when file not found",
      files: makeFiles({}),
      args: {
        path: "missing.md",
        text: "anything",
        code: "code_x",
        reason: "reason",
        confidence: "high",
      },
      expectStatus: "error",
      expectOutput: /No such file or no prose/,
    },
    {
      name: "wraps unmatched text in FUZZY for pipeline resolution",
      files: makeFiles({ "doc.md": docPlain(PROSE) }),
      args: {
        path: "doc.md",
        text: "this text does not exist in the document at all",
        code: "code_x",
        reason: "reason",
        confidence: "high",
      },
      expectStatus: "ok",
      expectOutput: /Created annotation/,
      expectMutations: 1,
    },
    {
      name: "medium confidence adds ambiguity",
      files: makeFiles({ "doc.md": docPlain(PROSE) }),
      args: {
        path: "doc.md",
        text: "privacy concerns were paramount",
        code: "code_privacy",
        reason: "Discusses privacy",
        confidence: "medium",
        ambiguity: "Could also be about data security",
      },
      expectStatus: "ok",
      expectOutput: /Created annotation/,
      expectMutations: 1,
    },
    {
      name: "low confidence without explicit ambiguity uses default",
      files: makeFiles({ "doc.md": docPlain(PROSE) }),
      args: {
        path: "doc.md",
        text: "privacy concerns were paramount",
        code: "code_privacy",
        reason: "Discusses privacy",
        confidence: "low",
      },
      expectStatus: "ok",
      expectOutput: /Created annotation/,
      expectMutations: 1,
    },
  ]

  it.each(cases)("$name", async ({ files, args, expectStatus, expectOutput, expectMutations }) => {
    const result = await addAnnotation.handle(files, args)
    expect(result.status).toBe(expectStatus)
    if (expectOutput instanceof RegExp) {
      expect(result.output).toMatch(expectOutput)
    } else {
      expect(result.output).toBe(expectOutput)
    }
    if (expectMutations !== undefined) {
      expect(result.mutations).toHaveLength(expectMutations)
    }
  })
})

describe("mark_for_deletion", () => {
  type Case = {
    name: string
    files: Map<string, string>
    args: Record<string, unknown>
    expectStatus: "ok" | "error"
    expectOutput: string | RegExp
    expectMutations?: number
  }

  const cases: Case[] = [
    {
      name: "marks existing annotation for deletion by ID",
      files: makeFiles({
        "doc.md": docWithBlock(PROSE, {
          annotations: [{
            id: "annotation_abc12345",
            text: "privacy concerns were paramount",
            code: "code_privacy",
            reason: "Discusses privacy",
          }],
        }),
      }),
      args: {
        path: "doc.md",
        id: "annotation_abc12345",
        reason: "Code no longer applies",
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "error when annotation ID not found",
      files: makeFiles({
        "doc.md": docWithBlock(PROSE, {
          annotations: [{
            id: "annotation_abc12345",
            text: "privacy concerns were paramount",
            code: "code_privacy",
            reason: "Discusses privacy",
          }],
        }),
      }),
      args: {
        path: "doc.md",
        id: "annotation_nonexistent",
        reason: "Removing",
      },
      expectStatus: "error",
      expectOutput: /No annotation found with ID/,
    },
    {
      name: "error when no annotations exist",
      files: makeFiles({ "doc.md": docWithBlock(PROSE, {}) }),
      args: {
        path: "doc.md",
        id: "annotation_anything",
        reason: "Removing",
      },
      expectStatus: "error",
      expectOutput: /No annotation found with ID/,
    },
  ]

  it.each(cases)("$name", async ({ files, args, expectStatus, expectOutput, expectMutations }) => {
    const result = await markForDeletion.handle(files, args)
    expect(result.status).toBe(expectStatus)
    if (expectOutput instanceof RegExp) {
      expect(result.output).toMatch(expectOutput)
    } else {
      expect(result.output).toBe(expectOutput)
    }
    if (expectMutations !== undefined) {
      expect(result.mutations).toHaveLength(expectMutations)
    }
  })
})

describe("summarize_expertise", () => {
  it("returns summary object", async () => {
    const files = makeFiles({})
    const result = await summarizeExpertise.handle(files, {
      orchestrator_summary: "Found 3 codes, 1 ambiguous. Gap: no code covers data retention concerns.",
    })
    expect(result.status).toBe("ok")
    expect(result.output).toEqual({
      orchestrator_summary: "Found 3 codes, 1 ambiguous. Gap: no code covers data retention concerns.",
    })
    expect(result.mutations).toHaveLength(0)
  })
})
