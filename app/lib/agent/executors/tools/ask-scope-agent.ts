import type { Block } from "../../types"
import { patchJsonBlock as patchJsonBlockDef } from "./patch-json-block.def"
import { applyLocalPatch as applyLocalPatchDef } from "./apply-local-patch.def"
import { createExecutor } from "../execute"
import { getToolHandlers } from "../tool"
import { getFiles } from "~/lib/files/store"
import { getCodebookFiles } from "~/lib/files/selectors"
import { PREFERENCES_FILE } from "~/lib/files/filename"
import { pushBlocks } from "../../block-store"
import { runAgentLoop } from "../../agent-loop"
import { baselineNudge } from "../../steering/nudges/baseline"

export type AskScope = "local" | "codebook" | "preferences"

type ScopeAgent = { endpoint: string; source: string }

const SCOPE_AGENTS: Record<Exclude<AskScope, "local">, ScopeAgent> = {
  codebook: { endpoint: "/codebook-writer", source: "codebook-writer" },
  preferences: { endpoint: "/preferences-writer", source: "preferences-writer" },
}

const MAX_TURNS = 5
const TOOLS = [patchJsonBlockDef, applyLocalPatchDef]

let runCounter = 0
const nextSource = (base: string): string => `${base}:${++runCounter}`

const collectScopeFiles = (scope: AskScope): Record<string, string> => {
  const files = getFiles()
  switch (scope) {
    case "preferences": {
      const content = files[PREFERENCES_FILE]
      return content !== undefined ? { [PREFERENCES_FILE]: content } : {}
    }
    case "codebook":
      return Object.fromEntries(getCodebookFiles(files).map((p) => [p, files[p]]))
    case "local":
      throw new Error("runScopeAgent should not be called for local scope")
  }
}

const toFileBlock = ([path, content]: [string, string]): Block => ({
  type: "system",
  content: `File: ${path}\n${content}`,
})

const toQuestionBlock = (question: string, answer: string): Block => ({
  type: "user",
  content: `Question: ${question}\n\nAnswer: ${answer}`,
})

export const runScopeAgent = async (scope: AskScope, question: string, answer: string): Promise<void> => {
  const files = collectScopeFiles(scope)
  if (scope === "codebook" && Object.keys(files).length === 0) return

  const agent = SCOPE_AGENTS[scope as Exclude<AskScope, "local">]
  const source = nextSource(agent.source)
  pushBlocks([
    ...Object.entries(files).map(toFileBlock),
    toQuestionBlock(question, answer),
  ], source)

  await runAgentLoop({
    source,
    executor: createExecutor(getToolHandlers()),
    maxTurns: MAX_TURNS,
    resolve: () => ({
      endpoint: agent.endpoint,
      tools: TOOLS,
      nudges: [baselineNudge],
    }),
  })
}
