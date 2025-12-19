import { getApiUrl } from "../env"
import type { DomainEvent } from "./client"

export type ProjectSummary = {
  id: string
  version: number
  healthy: boolean
  name: string
  description: string
  pinned: boolean
}

export type PaginationQuery = {
  page?: number
  page_size?: number
}

export type PaginationResult<T> = {
  items: T[]
  total: number
  page: number
  page_size: number
}

export type QueryError = {
  status: number
  statusText: string
}

export const isQueryError = (error: unknown): error is QueryError =>
  typeof error === "object" && error !== null && "status" in error && "statusText" in error

const buildQueryString = (params: Record<string, unknown>): string => {
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

export const getProjectEvents = async (projectId: string): Promise<DomainEvent[]> =>
  fetchQuery<DomainEvent[]>(`/queries/projects/${projectId}/events`)
