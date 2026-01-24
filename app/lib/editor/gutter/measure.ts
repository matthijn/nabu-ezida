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
  const spans = container.querySelectorAll("span[data-annotation-colors]")
  const measurements: AnnotationMeasurement[] = []

  spans.forEach((span) => {
    const element = span as HTMLElement
    const colorsAttr = element.getAttribute("data-annotation-colors")
    if (!colorsAttr) return

    const colors = colorsAttr.split(",")
    const top = getTopInScrollContainer(element, scrollContainer)
    const height = element.offsetHeight

    measurements.push({ absoluteTop: top, height, colors })
  })

  return measurements
}
