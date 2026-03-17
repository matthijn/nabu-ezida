import { getApiUrl } from "../env"

export interface ProjectSummary {
  id: string
  version: number
  healthy: boolean
  name: string
  description: string
  pinned: boolean
}

interface PaginationQuery {
  page?: number
  page_size?: number
}

interface PaginationResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

interface QueryError {
  status: number
  statusText: string
}

const buildQueryString = (params: object): string => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return ""
  return "?" + entries.map(([k, v]) => `${k}=${v}`).join("&")
}

const fetchQuery = async <T>(path: string): Promise<T> => {
  const url = getApiUrl(path)
  const response = await fetch(url)

  if (!response.ok) {
    const error: QueryError = {
      status: response.status,
      statusText: response.statusText,
    }
    throw error
  }

  return response.json()
}

export const getProjects = async (
  query: PaginationQuery = {}
): Promise<PaginationResult<ProjectSummary>> => {
  const path = `/queries/projects${buildQueryString(query)}`
  const results = await fetchQuery<PaginationResult<ProjectSummary>[]>(path)
  return results[0]
}
