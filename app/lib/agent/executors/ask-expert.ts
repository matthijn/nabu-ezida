import { z } from "zod"
import type { Block } from "../types"
import { tool, registerTool, ok, err } from "./tool"
import { buildCaller, buildTypedCaller } from "../caller"
import { extractText } from "../stream"
import { createShell } from "./shell/shell"

const AnnotationEntrySchema = z.object({
  id: z.string().nullable().describe("Existing annotation ID (for updates) or [uuid-xxx] placeholder (for new)"),
  text: z.string().describe("Exact text from content (use FUZZY[approx] if unsure)"),
  code: z.string().describe("Code ID from codebook"),
  reason: z.string().describe("Why this code applies — user-facing, include code name"),
  confidence: z.enum(["high", "medium", "low"]).describe("Confidence level"),
  ambiguity: z.string().nullable().describe("Explain if confidence < high — what should the user weigh in on"),
})

const DeletionEntrySchema = z.object({
  id: z.string().describe("Existing annotation ID to remove"),
  reason: z.string().describe("Why this annotation should be removed"),
})

const ApplyCodebookResponseSchema = z.object({
  annotations: z.array(AnnotationEntrySchema).describe("Annotations to add or update"),
  deletions: z.array(DeletionEntrySchema).describe("Annotations to remove"),
  notes: z.string().describe("Patterns observed, potential codebook gaps, or 'none'"),
})

export type ApplyCodebookResponse = z.infer<typeof ApplyCodebookResponseSchema>
export type AnnotationEntry = z.infer<typeof AnnotationEntrySchema>
export type DeletionEntry = z.infer<typeof DeletionEntrySchema>

type TaskDef = {
  description: string
  schema?: z.ZodType
}

type ExpertDef = {
  description: string
  tasks: Record<string, TaskDef>
}

const experts: Record<string, ExpertDef> = {
  "qualitative-researcher": {
    description: "Qualitative analysis specialist",
    tasks: {
      "apply-codebook": {
        description: "Apply codebook codes to content",
        schema: ApplyCodebookResponseSchema,
      },
      "revise-codebook": {
        description: "Revise codebook based on locally resolved codings",
        schema: undefined,
      },
    },
  },
  "analyst": {
    description: "Rigorous analytical reader—evaluates arguments, surfaces assumptions, applies frameworks to content",
    tasks: {},
  },
}

const expertNames = Object.keys(experts) as [string, ...string[]]
const ExpertEnum = z.enum(expertNames)

const allTasks = [...new Set(Object.values(experts).flatMap((e) => Object.keys(e.tasks)))] as [string, ...string[]]
const TaskEnum = z.enum(allTasks)

const generateExpertDocs = (): string => {
  const lines: string[] = ["Experts & tasks:"]
  for (const [name, def] of Object.entries(experts)) {
    lines.push(`- ${name}: ${def.description}`)
    for (const [task, taskDef] of Object.entries(def.tasks)) {
      const outputNote = taskDef.schema ? " (structured output)" : ""
      lines.push(`  - ${task}: ${taskDef.description}${outputNote}`)
    }
  }
  return lines.join("\n")
}

const getExpertTask = (expert: string, task?: string): { error?: string; taskDef?: TaskDef } => {
  const expertDef = experts[expert]
  if (!expertDef) {
    return { error: `Unknown expert: ${expert}. Available: ${expertNames.join(", ")}` }
  }
  if (!task) {
    return {}
  }
  const taskDef = expertDef.tasks[task]
  if (!taskDef) {
    const available = Object.keys(expertDef.tasks).join(", ")
    return { error: `Expert '${expert}' cannot do task '${task}'. Available tasks: ${available}` }
  }
  return { taskDef }
}

const resolveShellCommand = (files: Map<string, string>, command: string): { output?: string; error?: string } => {
  const shell = createShell(files)
  const result = shell.exec(command)
  if (result.isError) {
    return { error: result.output }
  }
  return { output: result.output }
}

const buildMessages = (context: string, content: string): Block[] => [
  { type: "system", content: context },
  { type: "user", content },
]

const buildEndpoint = (expert: string, task?: string): string =>
  task ? `/ask-expert/${expert}/${task}` : `/ask-expert/${expert}`

const callExpert = async (
  expert: string,
  task: string | null,
  context: string,
  content: string,
  schema?: z.ZodType
): Promise<{ result?: string; error?: string }> => {
  const endpoint = buildEndpoint(expert, task ?? undefined)
  const messages = buildMessages(context, content)
  const name = task ? `${expert}/${task}` : expert

  try {
    if (schema) {
      const typed = buildTypedCaller(name, { endpoint }, schema)
      const out = await typed(messages)
      if ("error" in out) return { error: out.error }
      return { result: JSON.stringify(out.result, null, 2) }
    }

    const caller = buildCaller(name, { endpoint })
    const newHistory = await caller(messages)
    const responseBlocks = newHistory.slice(messages.length)
    return { result: extractText(responseBlocks) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

const AskExpertArgs = z.object({
  expert: ExpertEnum.describe("Specialist type"),
  task: TaskEnum.optional().describe("Specific task (omit for freeform response)"),
  using: z.string().min(1).describe("Shell command to get framework/context"),
  about: z.string().min(1).describe("Shell command to get content to analyze"),
})

export const askExpert = registerTool(
  tool({
    name: "ask_expert",
    description: `Ask a specialist expert to analyze content.

Args:
- expert: The type of specialist
- task: Specific task (optional - omit for freeform response)
- using: Shell command to get framework/context (e.g., "cat Codebook.md")
- about: Shell command to get content to analyze (e.g., "cat doc.md | head -n 100")

${generateExpertDocs()}`,
    schema: AskExpertArgs,
    handler: async (files, { expert, task, using, about }) => {
      const { error: validationError, taskDef } = getExpertTask(expert, task)
      if (validationError) return err(validationError)

      const contextResult = resolveShellCommand(files, using)
      if (contextResult.error) return err(`using: ${contextResult.error}`)

      const contentResult = resolveShellCommand(files, about)
      if (contentResult.error) return err(`about: ${contentResult.error}`)

      const { result, error } = await callExpert(
        expert,
        task ?? null,
        contextResult.output!,
        contentResult.output!,
        taskDef?.schema
      )

      if (error) return err(error)
      return ok(result!)
    },
  })
)

export const getExpertSchema = (expert: string, task?: string): z.ZodType | undefined => {
  const { taskDef } = getExpertTask(expert, task)
  return taskDef?.schema
}

export { experts, generateExpertDocs }
