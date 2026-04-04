interface ReviewedAnnotation {
  text: string
  reason: string
  review?: string
}

const formatAnnotation = (a: ReviewedAnnotation, i: number): string =>
  [`${i + 1}. "${a.text}"`, `   Reason: ${a.reason}`, `   Review: ${a.review}`].join("\n")

export const buildCodeReviewContext = (
  codeTitle: string,
  codeDetail: string,
  flagged: ReviewedAnnotation[]
): string =>
  [
    `Code: ${codeTitle}`,
    `Definition: ${codeDetail}`,
    "",
    `Flagged annotations (${flagged.length}):`,
    ...flagged.map(formatAnnotation),
  ].join("\n")

export const buildExplainCodingContext = (
  codeTitle: string,
  codeDetail: string,
  annotationText: string,
  annotationReason: string
): string =>
  [
    `Code: ${codeTitle}`,
    `Definition: ${codeDetail}`,
    "",
    `Annotated text: "${annotationText}"`,
    `Reason: ${annotationReason}`,
  ].join("\n")
