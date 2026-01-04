import type { State, Block } from "./types"

export const reducer = (state: State, block: Block): State => ({
  ...state,
  history: [...state.history, block],
})
