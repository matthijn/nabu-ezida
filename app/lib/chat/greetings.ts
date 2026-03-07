import greetings from "./greetings.json"

export const pickGreeting = (): string =>
  greetings[Math.floor(Math.random() * greetings.length)]
