export type HttpError = {
  status: number
  statusText: string
  body: ErrorBody | null
}

export type ErrorBody = {
  message: string
  fields?: Record<string, string>
}

export type FormattedError = {
  title: string
  description: string
}

export const jsonHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
})

export const tryParseJson = async <T>(response: Response): Promise<T | null> => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const body = await tryParseJson<ErrorBody>(response)
    const error: HttpError = {
      status: response.status,
      statusText: response.statusText,
      body,
    }
    throw error
  }
  return response.json()
}

export const isHttpError = (error: unknown): error is HttpError =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  "statusText" in error

export const formatHttpError = (error: HttpError): FormattedError => ({
  title: `${error.status} ${error.statusText}`,
  description: error.body?.message ?? "Unknown error",
})

export const formatNetworkError = (): FormattedError => ({
  title: "Network Error",
  description: "Could not connect to server",
})

export const formatError = (error: unknown): FormattedError =>
  isHttpError(error) ? formatHttpError(error) : formatNetworkError()
