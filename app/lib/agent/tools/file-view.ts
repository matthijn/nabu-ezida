import { getFilesStripped } from "~/lib/files/store"
import { toExtraPretty } from "~/lib/patch/resolve/json-expand"
import { isCompanionFile } from "~/lib/embeddings/companion"

export const getViewableFiles = (): Map<string, string> =>
  new Map(
    Object.entries(getFilesStripped())
      .filter(([k]) => !isCompanionFile(k))
      .map(([k, v]) => [k, toExtraPretty(v)])
  )

export const getFileView = (path: string): string | undefined => getViewableFiles().get(path)
