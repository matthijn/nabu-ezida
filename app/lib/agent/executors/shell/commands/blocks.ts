import { command, ok, err, normalizePath, isGlob, resolveFiles } from "./command"
import { findBlocksByLanguage } from "~/domain/blocks"
import { parsePrettyJson } from "~/lib/json"

type BlockResult = { file: string; block: unknown }

export const blocks = command({
  description: "Extract JSON from fenced code blocks (e.g. json-callout, json-attributes). Returns array.",
  details: `Output: Without -p: [{...block}, ...]. With -p: [{file:"path", json:{...block}}, ...].
Example: blocks json-callout -p doc.md | jq ".[0].json.title" or jq ".[] | select(.json.type==\"code\")"`,
  usage: "blocks <language> [-p] [file-pattern]\n  blocks json-callout doc.md | jq \".[0].title\"\n  blocks json-callout -p \"*.md\" | jq \".[].json.annotations\"",
  flags: {
    "-p": { alias: "--paths", description: "wrap output as {file, json} for cross-file queries" },
  },
  handler: (files) => (args, flags) => {
    const [language, rawPattern] = args
    if (!language) return err("blocks: missing language argument")

    const includeFiles = flags.has("-p")
    const results: BlockResult[] = []

    const processFile = (filePath: string, content: string) => {
      const codeBlocks = findBlocksByLanguage(content, language)
      for (const block of codeBlocks) {
        const parsed = parsePrettyJson(block.content)
        if (parsed !== null) {
          results.push({ file: filePath, block: parsed })
        }
      }
    }

    if (rawPattern) {
      const resolved = resolveFiles(files, rawPattern)
      if (resolved.length === 0 && !isGlob(rawPattern)) return err(`blocks: ${normalizePath(rawPattern)}: No such file`)
      for (const filePath of resolved) { processFile(filePath, files.get(filePath)!) }
    } else {
      for (const [filePath, content] of files) {
        processFile(filePath, content)
      }
    }

    const output = includeFiles
      ? results.map((r) => ({ file: r.file, json: r.block }))
      : results.map((r) => r.block)

    return ok(JSON.stringify(output, null, 2))
  },
})
