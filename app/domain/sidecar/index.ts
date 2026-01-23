export { DocumentMeta } from "./schema"
export type { DocumentMeta as DocumentMetaType, SidecarAnnotation, DocumentMetaField } from "./schema"
export {
  validateDocumentMeta,
  validateFieldChanges,
  validateFieldChangesInternal,
  getChangedFields,
  validateField,
  type ValidationResult,
  type ValidationSuccess,
  type ValidationError,
  type ValidationIssue,
  type FieldRejection,
  type FieldValidationResult,
} from "./validate"
export {
  prepareUpsertAnnotations,
  prepareDeleteAnnotations,
  type AnnotationInput,
  type UpsertResult,
  type DeleteResult,
} from "./annotations"
