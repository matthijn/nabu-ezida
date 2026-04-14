import { describe, it, expect } from "vitest"
import { deriveTypedOps, deriveOpsJsonSchema } from "./derive"
import { getBlockConfig } from "../registry"

type JsonSchema = Record<string, unknown>

const mustGetConfig = (language: string) => {
  const config = getBlockConfig(language)
  if (!config) throw new Error(`no config for ${language}`)
  return config
}

describe("deriveTypedOps", () => {
  interface Case {
    name: string
    language: string
    expectShortName: string
    expectSingleton: boolean
    expectAllowedFiles?: string[]
    expectImmutableFields: string[]
    expectMultilineFields: string[]
    expectArrayOps: string[]
    expectUpdateFields: string[]
  }

  const cases: Case[] = [
    {
      name: "json-attributes: singleton, no object arrays, no immutable",
      language: "json-attributes",
      expectShortName: "attributes",
      expectSingleton: true,
      expectImmutableFields: [],
      expectMultilineFields: [],
      expectArrayOps: [],
      expectUpdateFields: ["tags", "date"],
    },
    {
      name: "json-annotations: singleton, annotations array with id",
      language: "json-annotations",
      expectShortName: "annotations",
      expectSingleton: true,
      expectImmutableFields: [],
      expectMultilineFields: [],
      expectArrayOps: ["annotations"],
      expectUpdateFields: [],
    },
    {
      name: "json-callout: non-singleton, id is immutable, multiline content",
      language: "json-callout",
      expectShortName: "callout",
      expectSingleton: false,
      expectImmutableFields: ["id"],
      expectMultilineFields: ["content"],
      expectArrayOps: [],
      expectUpdateFields: ["type", "title", "content", "color", "collapsed"],
    },
    {
      name: "json-settings: singleton, tags and searches arrays with id, file-locked",
      language: "json-settings",
      expectShortName: "settings",
      expectSingleton: true,
      expectAllowedFiles: ["settings.hidden.md"],
      expectImmutableFields: [],
      expectMultilineFields: [],
      expectArrayOps: ["tags", "searches"],
      expectUpdateFields: [],
    },
    {
      name: "json-chart: non-singleton, id is immutable, nested objects",
      language: "json-chart",
      expectShortName: "chart",
      expectSingleton: false,
      expectImmutableFields: ["id"],
      expectMultilineFields: [],
      expectArrayOps: [],
      expectUpdateFields: ["caption", "query", "spec"],
    },
  ]

  it.each(cases)(
    "$name",
    ({
      language,
      expectShortName,
      expectSingleton,
      expectAllowedFiles,
      expectImmutableFields,
      expectMultilineFields,
      expectArrayOps,
      expectUpdateFields,
    }) => {
      const config = mustGetConfig(language)
      const spec = deriveTypedOps(language, config)

      expect(spec.shortName).toBe(expectShortName)
      expect(spec.singleton).toBe(expectSingleton)
      expect(spec.allowedFiles).toEqual(expectAllowedFiles)
      expect(spec.immutableFields).toEqual(expectImmutableFields)
      expect(spec.multilineFields).toEqual(expectMultilineFields)
      expect(spec.arrayOps.map((a) => a.fieldName)).toEqual(expectArrayOps)

      const updateProps = (spec.updateFieldsSchema as JsonSchema).properties as Record<
        string,
        unknown
      >
      expect(Object.keys(updateProps).sort()).toEqual([...expectUpdateFields].sort())
    }
  )
})

describe("deriveOpsJsonSchema", () => {
  interface Case {
    name: string
    language: string
    expectOpNames: string[]
    expectIsArray: boolean
  }

  const cases: Case[] = [
    {
      name: "attributes: only update op",
      language: "json-attributes",
      expectOpNames: ["update"],
      expectIsArray: true,
    },
    {
      name: "annotations: update + add/remove/update_annotation",
      language: "json-annotations",
      expectOpNames: ["update", "add_annotation", "remove_annotation", "update_annotation"],
      expectIsArray: true,
    },
    {
      name: "settings: update + add/remove/update for tag and search",
      language: "json-settings",
      expectOpNames: [
        "update",
        "add_tag",
        "remove_tag",
        "update_tag",
        "add_search",
        "remove_search",
        "update_search",
      ],
      expectIsArray: true,
    },
    {
      name: "callout: update + patch_content",
      language: "json-callout",
      expectOpNames: ["update", "patch_content"],
      expectIsArray: true,
    },
    {
      name: "chart: only update op",
      language: "json-chart",
      expectOpNames: ["update"],
      expectIsArray: true,
    },
  ]

  const extractOpNames = (schema: unknown): string[] => {
    const s = schema as JsonSchema
    const items = s.items as JsonSchema
    if (items.oneOf) {
      return (items.oneOf as JsonSchema[]).map(
        (variant) => ((variant.properties as Record<string, JsonSchema>).op.enum as string[])[0]
      )
    }
    return [((items.properties as Record<string, JsonSchema>).op.enum as string[])[0]]
  }

  it.each(cases)("$name", ({ language, expectOpNames, expectIsArray }) => {
    const config = mustGetConfig(language)
    const spec = deriveTypedOps(language, config)
    const schema = deriveOpsJsonSchema(spec)
    const s = schema as JsonSchema

    expect(s.type).toBe(expectIsArray ? "array" : undefined)
    expect(extractOpNames(schema)).toEqual(expectOpNames)
  })
})
