import { createReactBlockSpec } from "@blocknote/react"
import { renderNabuQuestion } from "./render"

export const nabuQuestionSpec = createReactBlockSpec(
  {
    type: "nabuQuestion",
    propSchema: {},
    content: "inline",
  },
  {
    render: renderNabuQuestion,
  }
)
