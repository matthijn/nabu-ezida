import { z } from "zod"

const containsSemanticCall = (sql: string): boolean => /\bSEMANTIC\s*\(/i.test(sql)

export const ChartSchema = z.object({
  id: z.string(),
  title: z.string().describe("Chart title displayed in header"),
  query: z
    .string()
    .describe("SQL query against database tables. Use $file for current filename.")
    .refine((q) => !containsSemanticCall(q), {
      message: "SEMANTIC() is a search-only function and cannot be used in chart queries.",
    }),
  tooltip: z
    .string()
    .describe(
      "Tooltip template with {column} placeholders interpolated from row data. Entity IDs render as styled pills."
    ),
  options: z
    .record(z.string(), z.unknown())
    .describe(
      "ECharts option object — series, encode, etc. Dataset is injected from query results."
    ),
})

export type ChartBlock = z.infer<typeof ChartSchema>

export const parseChart = (content: string): ChartBlock | null => {
  try {
    const json = JSON.parse(content)
    const result = ChartSchema.safeParse(json)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
