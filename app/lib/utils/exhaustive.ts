export const exhaustive = (value: never): never => {
  throw new Error(`unhandled: ${value}`)
}
