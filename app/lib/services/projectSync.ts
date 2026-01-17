import { createWebSocketConnection } from "~/lib/sync/websocket"
import { applyPatchableMessage, getDocumentChanges, type PatchableMessage, type DocumentChange } from "~/lib/sync/patch"
import { buildUrl } from "~/lib/url"
import { debounce, collect } from "~/lib/utils"
import { runPrompt, createToolExecutor } from "~/lib/agent"
import { initializeDatabase } from "~/lib/db/init"
import type { Database } from "~/lib/db/types"
import { projectSchema, syncProjectToDatabase } from "~/domain/project"
import type { Project } from "~/domain/project"
import type { Document } from "~/domain/document"
import { blocksToMarkdown } from "~/domain/document"

type ConnectionState = {
  project: Project | null
  isConnected: boolean
  error: string | null
}

type StateListener = (state: ConnectionState) => void
type WebSocketConnection = ReturnType<typeof createWebSocketConnection>

const DOCUMENT_CHANGE_DEBOUNCE_MS = 300
const DB_SYNC_DEBOUNCE_MS = 100

let connection: WebSocketConnection | null = null
let database: Database | null = null
let currentState: ConnectionState = { project: null, isConnected: false, error: null }
const listeners = new Set<StateListener>()

const getExecutor = () =>
  createToolExecutor({
    query: database?.query,
    project: currentState.project ?? undefined,
  })

const formatDocumentContext = (doc: Document): string =>
  `Document ID: ${doc.id}\n\nThis is the document:\n----\n${blocksToMarkdown(doc)}`

const isContentChange = (change: DocumentChange): boolean =>
  change.path.includes("/blocks")

const tagDocument = (doc: Document): void => {
  const context = formatDocumentContext(doc)
  runPrompt("/chat/tag?tool_choice=required", context, getExecutor()).catch((e) => {
    console.error("[ProjectSync] Tag prompt failed:", e)
  })
}

const handleDocumentContentChange = (ids: string[]): void => {
  const project = currentState.project
  if (!project) return

  for (const id of ids) {
    const doc = project.documents[id]
    if (doc) tagDocument(doc)
  }
}

const syncDatabase = (): void => {
  if (!database || !currentState.project) return
  syncProjectToDatabase(database.instance, currentState.project).catch((e) => {
    console.error("[ProjectSync] Database sync failed:", e)
  })
}

const collected = collect<string>(handleDocumentContentChange)
const debouncedFlush = debounce(collected.flush, DOCUMENT_CHANGE_DEBOUNCE_MS)
const debouncedDbSync = debounce(syncDatabase, DB_SYNC_DEBOUNCE_MS)

const setState = (updates: Partial<ConnectionState>): void => {
  currentState = { ...currentState, ...updates }
  listeners.forEach((fn) => fn(currentState))
  if (updates.project) debouncedDbSync()
}

const handleMessage = (msg: PatchableMessage<Project>): void => {
  const newProject = applyPatchableMessage(currentState.project, msg)
  setState({ project: newProject })

  if (msg.type === "patch") {
    const contentChangeIds = [...new Set(
      getDocumentChanges(msg.data)
        .filter(isContentChange)
        .map(c => c.id)
    )]
    if (contentChangeIds.length > 0) {
      collected(contentChangeIds)
      debouncedFlush()
    }
  }
}

export const connect = async (wsBaseUrl: string, projectId: string): Promise<void> => {
  if (connection) disconnect()

  database = await initializeDatabase(projectSchema)

  const url = buildUrl(wsBaseUrl, projectId)

  connection = createWebSocketConnection<PatchableMessage<Project>>({
    url,
    onMessage: handleMessage,
    onOpen: () => setState({ isConnected: true, error: null }),
    onClose: () => setState({ isConnected: false }),
    onError: () => setState({ error: "WebSocket connection error" }),
  })
}

export const disconnect = (): void => {
  debouncedFlush.cancel()
  debouncedDbSync.cancel()
  collected.clear()
  connection?.close()
  connection = null
  database = null
  setState({ project: null, isConnected: false, error: null })
}

export const subscribe = (fn: StateListener): (() => void) => {
  listeners.add(fn)
  fn(currentState)
  return () => listeners.delete(fn)
}

export const getState = (): ConnectionState => currentState

export const getQuery = () => database?.query
