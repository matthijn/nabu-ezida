import { createContext, useContext, type ReactNode } from "react"

export type EditorDocumentInfo = {
  documentId: string
  documentName: string
}

const EditorDocumentContext = createContext<EditorDocumentInfo | null>(null)

type EditorDocumentProviderProps = {
  documentId: string
  documentName: string
  children: ReactNode
}

export const EditorDocumentProvider = ({
  documentId,
  documentName,
  children,
}: EditorDocumentProviderProps) => (
  <EditorDocumentContext.Provider value={{ documentId, documentName }}>
    {children}
  </EditorDocumentContext.Provider>
)

export const useEditorDocument = (): EditorDocumentInfo | null =>
  useContext(EditorDocumentContext)
