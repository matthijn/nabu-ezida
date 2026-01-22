export type Spotlight =
  | { type: "single"; text: string }
  | { type: "range"; from: string; to: string }
