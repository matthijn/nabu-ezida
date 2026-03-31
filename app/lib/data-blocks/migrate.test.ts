import { describe, it, expect } from "vitest"
import { z } from "zod"
import { shouldMigrate, migrateFile, type Migration } from "./migrate"

const block = (lang: string, content: string) => `\`\`\`${lang}\n${content}\n\`\`\``

const oldSchema = z.object({ v: z.literal(1), data: z.string() }).strict()

const upgradeToyV1: Migration = {
  blockType: "json-toy",
  from: oldSchema,
  upgrade: (md) =>
    md.replace(/```json-toy\n\{"v":1,"data":"([^"]+)"\}\n```/g, (_match, data: string) =>
      block("json-toy", JSON.stringify({ v: 2, data, migrated: true }))
    ),
}

const secondSchema = z
  .object({ v: z.literal(2), data: z.string(), migrated: z.literal(true) })
  .strict()

const upgradeToyV2: Migration = {
  blockType: "json-toy",
  from: secondSchema,
  upgrade: (md) =>
    md.replace(
      /```json-toy\n\{"v":2,"data":"([^"]+)","migrated":true\}\n```/g,
      (_match, data: string) => block("json-toy", JSON.stringify({ v: 3, data }))
    ),
}

describe("shouldMigrate", () => {
  const cases: { name: string; markdown: string; expected: boolean }[] = [
    {
      name: "no blocks",
      markdown: "just prose",
      expected: false,
    },
    {
      name: "schema does not match",
      markdown: block("json-toy", '{"v":2,"data":"x","migrated":true}'),
      expected: false,
    },
    {
      name: "wrong block type",
      markdown: block("json-other", '{"v":1,"data":"x"}'),
      expected: false,
    },
    {
      name: "malformed JSON",
      markdown: block("json-toy", "not valid json"),
      expected: false,
    },
    {
      name: "matches old schema",
      markdown: block("json-toy", '{"v":1,"data":"hello"}'),
      expected: true,
    },
    {
      name: "matches any block of that type",
      markdown: `${block("json-toy", '{"v":2,"data":"x","migrated":true}')}\n\n${block("json-toy", '{"v":1,"data":"y"}')}`,
      expected: true,
    },
  ]

  cases.forEach(({ name, markdown, expected }) => {
    it(name, () => {
      expect(shouldMigrate(markdown, upgradeToyV1)).toBe(expected)
    })
  })
})

describe("migrateFile", () => {
  const cases: {
    name: string
    markdown: string
    migrations: readonly Migration[]
    expected: { markdown: string; changed: boolean }
  }[] = [
    {
      name: "no blocks → unchanged",
      markdown: "just prose",
      migrations: [upgradeToyV1],
      expected: { markdown: "just prose", changed: false },
    },
    {
      name: "schema does not match → unchanged",
      markdown: block("json-toy", '{"v":3,"data":"x"}'),
      migrations: [upgradeToyV1],
      expected: { markdown: block("json-toy", '{"v":3,"data":"x"}'), changed: false },
    },
    {
      name: "wrong block type → unchanged",
      markdown: block("json-other", '{"v":1,"data":"x"}'),
      migrations: [upgradeToyV1],
      expected: { markdown: block("json-other", '{"v":1,"data":"x"}'), changed: false },
    },
    {
      name: "malformed JSON → unchanged",
      markdown: block("json-toy", "{broken"),
      migrations: [upgradeToyV1],
      expected: { markdown: block("json-toy", "{broken"), changed: false },
    },
    {
      name: "single migration fires",
      markdown: block("json-toy", '{"v":1,"data":"hello"}'),
      migrations: [upgradeToyV1],
      expected: {
        markdown: block("json-toy", '{"v":2,"data":"hello","migrated":true}'),
        changed: true,
      },
    },
    {
      name: "two migrations chain in order",
      markdown: block("json-toy", '{"v":1,"data":"hello"}'),
      migrations: [upgradeToyV1, upgradeToyV2],
      expected: {
        markdown: block("json-toy", '{"v":3,"data":"hello"}'),
        changed: true,
      },
    },
    {
      name: "already current shape → unchanged (idempotent)",
      markdown: block("json-toy", '{"v":3,"data":"hello"}'),
      migrations: [upgradeToyV1, upgradeToyV2],
      expected: {
        markdown: block("json-toy", '{"v":3,"data":"hello"}'),
        changed: false,
      },
    },
    {
      name: "prose preserved through migration",
      markdown: `# Title\n\nSome prose.\n\n${block("json-toy", '{"v":1,"data":"x"}')}\n\nMore prose.`,
      migrations: [upgradeToyV1],
      expected: {
        markdown: `# Title\n\nSome prose.\n\n${block("json-toy", '{"v":2,"data":"x","migrated":true}')}\n\nMore prose.`,
        changed: true,
      },
    },
  ]

  cases.forEach(({ name, markdown, migrations, expected }) => {
    it(name, () => {
      expect(migrateFile(markdown, migrations)).toEqual(expected)
    })
  })
})
