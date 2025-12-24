type NabuQuestionRenderProps = {
  contentRef: (el: HTMLElement | null) => void
}

export const renderNabuQuestion = ({ contentRef }: NabuQuestionRenderProps) => (
  <div className="nabu-question">
    <span className="nabu-question-tag">@nabu</span>
    <span ref={contentRef} data-placeholder="Ask anything..." />
  </div>
)
