import type { Database } from "~/lib/db/types"
import { sampleByLanguage } from "~/lib/project-description/sample"
import { generateDescription } from "~/lib/project-description/generate"

const DEFAULT_DESCRIPTION = "A document collection."

export const ensureDescription = async (
  current: string | undefined,
  db: Database
): Promise<string> => {
  if (current) return current

  const result = await sampleByLanguage(db)
  if (!result.ok) return DEFAULT_DESCRIPTION

  const hasContent = result.value.some((s) => s.passages.length > 0)
  if (!hasContent) return DEFAULT_DESCRIPTION

  try {
    return await generateDescription(result.value)
  } catch {
    return DEFAULT_DESCRIPTION
  }
}
