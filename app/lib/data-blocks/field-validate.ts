import { z } from "zod"

export const emptyToUndefined = <T>(schema: z.ZodType<T>): z.ZodType<T | undefined> =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional()) as z.ZodType<T | undefined>
