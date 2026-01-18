import { createWebSocketConnection } from "~/lib/sync/websocket"
import { applyPatchableMessage, getDocumentChanges, type PatchableMessage, type DocumentChange } from "~/lib/sync/patch"
import { buildUrl } from "~/lib/url"
import { debounce, collect } from "~/lib/utils"
import { runPrompt, createToolExecutor } from "~/lib/agent"
import { initializeDatabase } from "~/lib/db/init"
import type { Database } from "~/lib/db/types"
import { projectSchema, syncProjectToDatabase } from "~/domain/project"
import type { Project } from "~/domain/project"
import type { Document, BlockFingerprint } from "~/domain/document"
import { blocksToMarkdown, computeBlockFingerprint, hasSignificantDrift } from "~/domain/document"

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
const lastBlockFingerprints = new Map<string, BlockFingerprint>()

const getExecutor = () =>
  createToolExecutor({
    query: database?.query,
    project: currentState.project ?? undefined,
  })

const formatDocumentContext = (doc: Document): string =>
  `Document ID: ${doc.id}\n\nThis is the document:\n----\n${blocksToMarkdown(doc)}`

const isContentChange = (change: DocumentChange): boolean =>
  change.path.includes("/blocks")

const shouldTag = (doc: Document): boolean => {
  const current = computeBlockFingerprint(Object.values(doc.blocks))
  const previous = lastBlockFingerprints.get(doc.id)
  return !previous || hasSignificantDrift(previous, current)
}

const markTagged = (doc: Document): void => {
  lastBlockFingerprints.set(doc.id, computeBlockFingerprint(Object.values(doc.blocks)))
}

const tagDocument = (doc: Document): void => {
  if (!shouldTag(doc)) return

  const context = formatDocumentContext(doc)
  runPrompt("/chat/tag?tool_choice=required", context, getExecutor())
    .then(() => markTagged(doc))
    .catch((e) => console.error("[ProjectSync] Tag prompt failed:", e))
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
  const prev = currentState
  currentState = { ...currentState, ...updates }
  console.debug("[HERMES:DEBUG] ProjectSync setState", {
    projectWas: prev.project?.id ?? "null",
    projectNow: currentState.project?.id ?? "null",
    isConnected: currentState.isConnected,
    error: currentState.error,
    docCount: currentState.project ? Object.keys(currentState.project.documents).length : 0,
  })
  listeners.forEach((fn) => fn(currentState))
  if (updates.project) debouncedDbSync()
}

const handleMessage = (msg: PatchableMessage<Project>): void => {
  console.debug("[HERMES:DEBUG] ProjectSync handleMessage", { type: msg.type })
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
  console.debug("[HERMES:DEBUG] ProjectSync connect called", { projectId, hasExisting: !!connection })
  if (connection) {
    console.debug("[HERMES:DEBUG] ProjectSync disconnecting existing connection")
    disconnect()
  }

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
  console.debug("[HERMES:DEBUG] ProjectSync disconnect called")
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
