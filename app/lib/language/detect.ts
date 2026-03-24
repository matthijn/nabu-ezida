import { franc } from "franc"

const SAMPLE_LENGTH = 200
const UNDETERMINED = "und"

export const detectLanguage = (prose: string): string | undefined => {
  const sample = prose.slice(0, SAMPLE_LENGTH)
  const code = franc(sample)
  return code === UNDETERMINED ? undefined : code
}
