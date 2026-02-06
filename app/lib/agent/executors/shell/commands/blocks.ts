import { command, ok, err, normalizePath, isGlob, expandGlob } from "./command"
import { findBlocksByLanguage, parseBlockJson } from "~/domain/blocks"

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

    const pattern = normalizePath(rawPattern)
    const includeFiles = flags.has("-p")
    const results: BlockResult[] = []

    const processFile = (filePath: string, content: string) => {
      const codeBlocks = findBlocksByLanguage(content, language)
      for (const block of codeBlocks) {
        const parsed = parseBlockJson(block)
        if (parsed !== null) {
          results.push({ file: filePath, block: parsed })
        }
      }
    }

    if (pattern) {
      if (isGlob(pattern)) {
        const matches = expandGlob(files, pattern)
        for (const filePath of matches) {
          processFile(filePath, files.get(filePath)!)
        }
      } else {
        const content = files.get(pattern)
        if (!content) return err(`blocks: ${pattern}: No such file`)
        processFile(pattern, content)
      }
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
