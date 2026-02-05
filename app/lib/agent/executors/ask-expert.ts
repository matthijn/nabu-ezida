import { z } from "zod"
import type { Block } from "../types"
import { tool, registerTool, ok, err } from "./tool"
import { prompt } from "../stream"
import { startInterpretEntry, updateInterpretStreaming, updateInterpretReasoning, completeInterpretEntry } from "./interpret-store"
import { createShell } from "./shell/shell"

// --- Schemas ---

const AnnotationEntrySchema = z.object({
  id: z.string().optional().describe("Existing annotation ID (for updates) or [uuid-xxx] placeholder (for new)"),
  text: z.string().describe("Exact text from content (use FUZZY[approx] if unsure)"),
  code: z.string().describe("Code ID from codebook"),
  code_label: z.string().describe("Code name for readability"),
  reason: z.string().describe("Why this code applies"),
  confidence: z.enum(["high", "medium", "low"]).describe("Confidence level"),
  ambiguity: z.string().optional().describe("Explain if confidence < high"),
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

// --- Expert Registry ---

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

// --- Generated enums and descriptions ---

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

// --- Validation ---

const getExpertTask = (expert: string, task?: string): { error?: string; taskDef?: TaskDef } => {
  const expertDef = experts[expert]
  if (!expertDef) {
    return { error: `Unknown expert: ${expert}. Available: ${expertNames.join(", ")}` }
  }
  if (!task) {
    return {} // Freeform, no task
  }
  const taskDef = expertDef.tasks[task]
  if (!taskDef) {
    const available = Object.keys(expertDef.tasks).join(", ")
    return { error: `Expert '${expert}' cannot do task '${task}'. Available tasks: ${available}` }
  }
  return { taskDef }
}

// --- Shell resolution ---

const resolveShellCommand = (files: Map<string, string>, command: string): { output?: string; error?: string } => {
  const shell = createShell(files)
  const result = shell.exec(command)
  if (result.isError) {
    return { error: result.output }
  }
  return { output: result.output }
}

// --- Core interpret function ---

const buildMessages = (context: string, content: string): Block[] => [
  { type: "system", content: context },
  { type: "user", content },
]

const extractText = (blocks: Block[]): string => {
  const textBlock = blocks.find((b) => b.type === "text")
  return textBlock?.type === "text" ? textBlock.content : ""
}

type AskExpertCoreParams<T extends z.ZodType> = {
  expert: string
  task: string | null
  context: string
  content: string
  endpoint: string
  schema?: T
}

const askExpertCore = async <T extends z.ZodType>({
  expert,
  task,
  context,
  content,
  endpoint,
  schema,
}: AskExpertCoreParams<T>): Promise<{ result?: z.infer<T> | string; error?: string }> => {
  const messages = buildMessages(context, content)
  const entryId = startInterpretEntry({ expert, task, messages })

  const callbacks = {
    onChunk: (chunk: string) => updateInterpretStreaming(entryId, chunk),
    onReasoningChunk: (chunk: string) => updateInterpretReasoning(entryId, chunk),
  }

  try {
    if (schema) {
      const result = await prompt({ endpoint, messages, schema, callbacks })
      completeInterpretEntry(entryId, [{ type: "text", content: JSON.stringify(result, null, 2) }])
      return { result }
    }

    const blocks = await prompt({ endpoint, messages, callbacks })
    completeInterpretEntry(entryId, blocks)
    return { result: extractText(blocks) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

// --- Tool definition ---

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
      // Validate expert+task combination
      const { error: validationError, taskDef } = getExpertTask(expert, task)
      if (validationError) return err(validationError)

      // Resolve shell commands
      const contextResult = resolveShellCommand(files, using)
      if (contextResult.error) return err(`using: ${contextResult.error}`)

      const contentResult = resolveShellCommand(files, about)
      if (contentResult.error) return err(`about: ${contentResult.error}`)

      // Build endpoint path
      const endpoint = task ? `/ask-expert/${expert}/${task}` : `/ask-expert/${expert}`

      // Call expert
      const { result, error } = await askExpertCore({
        expert,
        task: task ?? null,
        context: contextResult.output!,
        content: contentResult.output!,
        endpoint,
        schema: taskDef?.schema,
      })

      if (error) return err(error)
      return ok(typeof result === "string" ? result : JSON.stringify(result, null, 2))
    },
  })
)

// --- Exports for plan integration ---

export const getExpertSchema = (expert: string, task?: string): z.ZodType | undefined => {
  const { taskDef } = getExpertTask(expert, task)
  return taskDef?.schema
}

export { experts, generateExpertDocs }
