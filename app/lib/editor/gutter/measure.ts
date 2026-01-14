import type { AnnotationMeasurement } from "~/domain/document/gutter"

const getTopInScrollContainer = (element: HTMLElement, scrollContainer: HTMLElement): number => {
  const elementRect = element.getBoundingClientRect()
  const containerRect = scrollContainer.getBoundingClientRect()
  return elementRect.top - containerRect.top + scrollContainer.scrollTop
}

export const measureAnnotationSpans = (
  container: HTMLElement,
  scrollContainer: HTMLElement
): AnnotationMeasurement[] => {
  const spans = container.querySelectorAll("span[data-annotation-ids]")
  const measurements: AnnotationMeasurement[] = []

  spans.forEach((span) => {
    const element = span as HTMLElement
    const idsAttr = element.getAttribute("data-annotation-ids")
    const colorsAttr = element.getAttribute("data-annotation-colors")
    if (!idsAttr || !colorsAttr) return

    const ids = idsAttr.split(",")
    const colors = colorsAttr.split(",")
    const top = getTopInScrollContainer(element, scrollContainer)
    const height = element.offsetHeight

    ids.forEach((id, index) => {
      measurements.push({
        absoluteTop: top,
        height,
        color: colors[index] ?? "gray",
        ids: [id],
      })
    })
  })

  return measurements
}
