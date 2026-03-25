import { franc } from "franc"

const SAMPLE_LENGTH = 200
const UNDETERMINED = "und"

const SUPPORTED_LANGUAGES = [
  "eng",
  "spa",
  "fra",
  "deu",
  "por",
  "ita",
  "nld",
  "pol",
  "tur",
  "rus",
  "ukr",
  "swe",
  "dan",
  "nor",
  "fin",
  "ces",
  "ron",
  "hun",
  "ind",
  "vie",
]

export const detectLanguage = (prose: string): string | undefined => {
  const sample = prose.slice(0, SAMPLE_LENGTH)
  const code = franc(sample, { only: SUPPORTED_LANGUAGES })
  return code === UNDETERMINED ? undefined : code
}
