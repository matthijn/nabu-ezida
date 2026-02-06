export const filterMatchingAnnotations = <T extends { text: string }>(
  annotations: T[],
  prose: string
): T[] => annotations.filter((a) => prose.includes(a.text))
