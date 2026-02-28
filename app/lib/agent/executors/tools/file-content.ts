import { getFileRaw } from "~/lib/files"
import { stripAttributesBlock } from "~/lib/text/markdown"

export const readFileContent = (file: string): string =>
  stripAttributesBlock(getFileRaw(file) ?? "")
