type CreateArgs = { name: string; description?: string }
type UpdateArgs = { project_id: string; name: string; description?: string }
type IdArgs = { project_id: string }

const createCommand = <T>(action: string, aggregateType: string, payload: T) => ({
  type: "Command" as const,
  action,
  aggregate_type: aggregateType,
  payload,
})

const command = <T>(action: string, aggregateId: string, payload: T) => ({
  type: "Command" as const,
  action,
  aggregate_type: "Project" as const,
  aggregate_id: aggregateId,
  payload,
})

export const projectCommands = {
  create_project: (args: CreateArgs) =>
    createCommand("CreateProject", "Project", { name: args.name, description: args.description ?? "" }),

  update_project: (args: UpdateArgs) =>
    command("UpdateProject", args.project_id, { name: args.name, description: args.description ?? "" }),

  pin_project: (args: IdArgs) =>
    command("PinProject", args.project_id, {}),

  unpin_project: (args: IdArgs) =>
    command("UnpinProject", args.project_id, {}),

  delete_project: (args: IdArgs) =>
    command("DeleteProject", args.project_id, {}),
}
