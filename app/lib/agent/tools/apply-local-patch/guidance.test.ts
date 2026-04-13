import { describe, expect, it } from "vitest"
import { requiresChartGuidance } from "./guidance"
import type { Operation } from "../../types"

const CHART_KEY = "qual-coding/project/output"

const makeFiles = (entries: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(entries))

const fileWithChart = `# Doc

Some prose.

\`\`\`json-chart
{
\t"id": "chart_1",
\t"title": "Old title",
\t"data": []
}
\`\`\`

More prose.
`

const fileWithAttributes = `# Doc

\`\`\`json-attributes
{
\t"name": "value"
}
\`\`\`
`

const fileWithBoth = `# Doc

\`\`\`json-attributes
{
\t"name": "value"
}
\`\`\`

\`\`\`json-chart
{
\t"id": "chart_1",
\t"title": "Old title",
\t"data": []
}
\`\`\`
`

const updateOp = (path: string, diff: string): { operation: Operation } => ({
  operation: { type: "update_file", path, diff },
})

const createOp = (path: string, diff: string): { operation: Operation } => ({
  operation: { type: "create_file", path, diff },
})

const deleteOp = (path: string): { operation: Operation } => ({
  operation: { type: "delete_file", path },
})

describe("requiresChartGuidance", () => {
  const cases: {
    name: string
    files: Map<string, string>
    args: { operation: Operation }
    expected: string[]
  }[] = [
    {
      name: "update inside json-chart block → chart key",
      files: makeFiles({ "doc.md": fileWithChart }),
      args: updateOp(
        "doc.md",
        '@@\n\t"id": "chart_1",\n-\t"title": "Old title",\n+\t"title": "New title",\n\t"data": []\n'
      ),
      expected: [CHART_KEY],
    },
    {
      name: "update inside non-chart json block → empty",
      files: makeFiles({ "doc.md": fileWithAttributes }),
      args: updateOp(
        "doc.md",
        '@@\n```json-attributes\n{\n-\t"name": "value"\n+\t"name": "updated"\n}\n'
      ),
      expected: [],
    },
    {
      name: "update file with no chart blocks at all → empty",
      files: makeFiles({ "doc.md": "# Plain markdown\n\nNo blocks here.\n" }),
      args: updateOp("doc.md", "@@\n-No blocks here.\n+No blocks at all.\n"),
      expected: [],
    },
    {
      name: "update touches non-chart block but file has chart elsewhere → empty",
      files: makeFiles({ "doc.md": fileWithBoth }),
      args: updateOp(
        "doc.md",
        '@@\n```json-attributes\n{\n-\t"name": "value"\n+\t"name": "updated"\n}\n'
      ),
      expected: [],
    },
    {
      name: "update touches chart block when file has both blocks → chart key",
      files: makeFiles({ "doc.md": fileWithBoth }),
      args: updateOp(
        "doc.md",
        '@@\n\t"id": "chart_1",\n-\t"title": "Old title",\n+\t"title": "New title",\n\t"data": []\n'
      ),
      expected: [CHART_KEY],
    },
    {
      name: "update with hunk that does not match anything → empty",
      files: makeFiles({ "doc.md": fileWithChart }),
      args: updateOp("doc.md", "@@\n unrelated context\n-old line\n+new line\n more unrelated\n"),
      expected: [],
    },
    {
      name: "create file containing json-chart fence → chart key",
      files: makeFiles({}),
      args: createOp(
        "new.md",
        '*** Add File: new.md\n# Doc\n\n```json-chart\n{\n\t"id": "chart_1",\n\t"title": "Hello"\n}\n```\n'
      ),
      expected: [CHART_KEY],
    },
    {
      name: "delete file → empty (no guidance needed)",
      files: makeFiles({ "doc.md": fileWithChart }),
      args: deleteOp("doc.md"),
      expected: [],
    },
  ]

  it.each(cases)("$name", ({ files, args, expected }) => {
    expect(requiresChartGuidance(files, args)).toEqual(expected)
  })
})
