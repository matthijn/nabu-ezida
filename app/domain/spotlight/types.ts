export type Spotlight =
  | { type: "single"; blockId: string }
  | { type: "range"; from: string; to: string }
