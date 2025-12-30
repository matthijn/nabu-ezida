const command = <T>(action: string, aggregateId: string, payload: T) => ({
  type: "Command" as const,
  action,
  aggregate_type: "Project" as const,
  aggregate_id: aggregateId,
  payload,
})

/**
 * Commands for managing research projects.
 *
 * @example
 * ```ts
 * import { projectCommands } from "~/domain/api/commands"
 *
 * // Create a research project
 * await api.send(projectCommands.create(
 *   "proj-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
 *   "Cognitive Load Theory Review",
 *   "Systematic review of CLT interventions in STEM education 2015-2024"
 * ))
 *
 * // Pin active projects for quick access
 * await api.send(projectCommands.pin("proj-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"))
 * ```
 */
export const projectCommands = {
  /**
   * Creates a new research project.
   * @param projectId - Unique identifier for the new project
   * @param name - Project title (max 200 chars)
   * @param description - Optional description (max 2000 chars)
   *
   * @example
   * ```ts
   * projectCommands.create(
   *   "proj-2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
   *   "PhD Dissertation",
   *   "Working memory and multimedia learning in higher education"
   * )
   * ```
   */
  create: (projectId: string, name: string, description = "") =>
    command("CreateProject", projectId, { name, description }),

  /**
   * Updates project metadata.
   * @param projectId - Project to update
   * @param name - New project title
   * @param description - New description
   *
   * @example
   * ```ts
   * projectCommands.update(
   *   "proj-2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
   *   "PhD Dissertation - Final",
   *   "Submitted version with reviewer feedback incorporated"
   * )
   * ```
   */
  update: (projectId: string, name: string, description = "") =>
    command("UpdateProject", projectId, { name, description }),

  /**
   * Pins a project for quick access.
   * @param projectId - Project to pin
   *
   * @example
   * ```ts
   * // Pin active research projects
   * projectCommands.pin("proj-3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f")
   * ```
   */
  pin: (projectId: string) =>
    command("PinProject", projectId, {}),

  /**
   * Unpins a previously pinned project.
   * @param projectId - Project to unpin
   *
   * @example
   * ```ts
   * // Unpin completed project
   * projectCommands.unpin("proj-4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a")
   * ```
   */
  unpin: (projectId: string) =>
    command("UnpinProject", projectId, {}),

  /**
   * Deletes a project and all its documents permanently.
   * @param projectId - Project to delete
   *
   * @example
   * ```ts
   * // Remove abandoned project
   * projectCommands.delete("proj-5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b")
   * ```
   */
  delete: (projectId: string) =>
    command("DeleteProject", projectId, {}),
}
