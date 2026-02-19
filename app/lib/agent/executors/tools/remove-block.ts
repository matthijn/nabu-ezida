import { tool, registerTool, ok, err } from "../tool"
import { removeBlock as def } from "./remove-block.def"
import { generateBlockRemovalDiff } from "~/lib/diff/json-block/remove"

export const removeBlock = registerTool(
  tool({
    ...def,
    handler: async (files, { path, language, id }) => {
      const content = files.get(path)
      if (!content) return err(`${path}: No such file`)

      const result = generateBlockRemovalDiff(content, language, id)
      if (!result.ok) return err(`${path}: ${result.error}`)

      return ok(`Removed \`${language}\` block from ${path}`, [{ type: "update_file", path, diff: result.patch }])
    },
  })
)
