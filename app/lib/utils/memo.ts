export const memoByRef = <In, Out>(fn: (input: In) => Out): ((input: In) => Out) => {
  let cachedInput: In | undefined
  let cachedOutput: Out | undefined
  return (input) => {
    if (input !== cachedInput) {
      cachedInput = input
      cachedOutput = fn(input)
    }
    return cachedOutput as Out
  }
}
