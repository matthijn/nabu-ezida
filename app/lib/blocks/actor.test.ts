import { describe, it, expect } from "vitest"
import { stampActors } from "./actor"

const md = (block: string, language = "json-attributes") =>
  `# Doc\n\n\`\`\`${language}\n${block}\n\`\`\``

const attrs = (obj: Record<string, unknown>) =>
  JSON.stringify(obj, null, 2)

const callout = (obj: Record<string, unknown>) =>
  JSON.stringify({ id: "c_1", type: "codebook-code", title: "T", content: "C", color: "blue", collapsed: false, ...obj }, null, 2)

const parseBlock = (markdown: string, language = "json-attributes"): Record<string, unknown> => {
  const regex = new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``)
  const match = markdown.match(regex)
  return JSON.parse(match![1])
}

describe("stampActors", () => {
  describe("array-level (annotations.*.actor)", () => {
    const cases = [
      {
        name: "stamps actor on new annotations (no original)",
        original: "",
        updated: md(attrs({
          annotations: [
            { id: "a_1", text: "hello", color: "blue" },
          ],
        })),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result)
          const anns = parsed.annotations as Record<string, unknown>[]
          expect(anns[0].actor).toBe("ai")
        },
      },
      {
        name: "stamps actor on new annotation (has original without this id)",
        original: md(attrs({
          annotations: [
            { id: "a_1", text: "existing", color: "red", actor: "user" },
          ],
        })),
        updated: md(attrs({
          annotations: [
            { id: "a_1", text: "existing", color: "red", actor: "user" },
            { id: "a_2", text: "new one", color: "blue" },
          ],
        })),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result)
          const anns = parsed.annotations as Record<string, unknown>[]
          expect(anns[0].actor).toBe("user")
          expect(anns[1].actor).toBe("ai")
        },
      },
      {
        name: "preserves actor on unchanged annotation",
        original: md(attrs({
          annotations: [
            { id: "a_1", text: "hello", color: "blue", actor: "user" },
          ],
        })),
        updated: md(attrs({
          annotations: [
            { id: "a_1", text: "hello", color: "blue", actor: "user" },
          ],
        })),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result)
          const anns = parsed.annotations as Record<string, unknown>[]
          expect(anns[0].actor).toBe("user")
        },
      },
      {
        name: "stamps actor on changed annotation",
        original: md(attrs({
          annotations: [
            { id: "a_1", text: "hello", color: "blue", actor: "user" },
          ],
        })),
        updated: md(attrs({
          annotations: [
            { id: "a_1", text: "hello", color: "red", actor: "user" },
          ],
        })),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result)
          const anns = parsed.annotations as Record<string, unknown>[]
          expect(anns[0].actor).toBe("ai")
        },
      },
      {
        name: "overwrites LLM-set actor value on changed annotation",
        original: md(attrs({
          annotations: [
            { id: "a_1", text: "hello", color: "blue", actor: "ai" },
          ],
        })),
        updated: md(attrs({
          annotations: [
            { id: "a_1", text: "changed", color: "blue", actor: "user" },
          ],
        })),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result)
          const anns = parsed.annotations as Record<string, unknown>[]
          expect(anns[0].actor).toBe("ai")
        },
      },
      {
        name: "overwrites LLM-set actor on unchanged annotation (preserves old)",
        original: md(attrs({
          annotations: [
            { id: "a_1", text: "hello", color: "blue", actor: "ai" },
          ],
        })),
        updated: md(attrs({
          annotations: [
            { id: "a_1", text: "hello", color: "blue", actor: "user" },
          ],
        })),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result)
          const anns = parsed.annotations as Record<string, unknown>[]
          expect(anns[0].actor).toBe("ai")
        },
      },
      {
        name: "handles mixed: new, changed, and unchanged annotations",
        original: md(attrs({
          annotations: [
            { id: "a_1", text: "unchanged", color: "blue", actor: "user" },
            { id: "a_2", text: "will-change", color: "red", actor: "user" },
          ],
        })),
        updated: md(attrs({
          annotations: [
            { id: "a_1", text: "unchanged", color: "blue" },
            { id: "a_2", text: "changed!", color: "red" },
            { id: "a_3", text: "brand-new", color: "green" },
          ],
        })),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result)
          const anns = parsed.annotations as Record<string, unknown>[]
          expect(anns[0].actor).toBe("user")
          expect(anns[1].actor).toBe("ai")
          expect(anns[2].actor).toBe("ai")
        },
      },
    ]

    it.each(cases)("$name", ({ original, updated, actor, expected }) => {
      const result = stampActors(original, updated, actor)
      expected(result)
    })
  })

  describe("root-level (callout actor)", () => {
    const cases = [
      {
        name: "stamps actor on new callout (no original)",
        original: "",
        updated: md(callout({}), "json-callout"),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result, "json-callout")
          expect(parsed.actor).toBe("ai")
        },
      },
      {
        name: "preserves actor on unchanged callout",
        original: md(callout({ actor: "user" }), "json-callout"),
        updated: md(callout({ actor: "user" }), "json-callout"),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result, "json-callout")
          expect(parsed.actor).toBe("user")
        },
      },
      {
        name: "stamps actor on changed callout",
        original: md(callout({ actor: "user" }), "json-callout"),
        updated: md(callout({ actor: "user", title: "New Title" }), "json-callout"),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result, "json-callout")
          expect(parsed.actor).toBe("ai")
        },
      },
      {
        name: "overwrites LLM-set actor on unchanged callout",
        original: md(callout({ actor: "ai" }), "json-callout"),
        updated: md(callout({ actor: "user" }), "json-callout"),
        actor: "ai" as const,
        expected: (result: string) => {
          const parsed = parseBlock(result, "json-callout")
          expect(parsed.actor).toBe("ai")
        },
      },
    ]

    it.each(cases)("$name", ({ original, updated, actor, expected }) => {
      const result = stampActors(original, updated, actor)
      expected(result)
    })
  })

  describe("no actor paths", () => {
    it("returns updated unchanged for unknown block types", () => {
      const original = "# Doc\n\n```json-unknown\n{}\n```"
      const updated = "# Doc\n\n```json-unknown\n{\"x\": 1}\n```"
      expect(stampActors(original, updated, "ai")).toBe(updated)
    })

    it("returns updated unchanged when no json blocks", () => {
      const text = "# Just prose\n\nNo blocks here."
      expect(stampActors("", text, "ai")).toBe(text)
    })
  })
})
