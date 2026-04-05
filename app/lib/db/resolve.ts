export interface SqlContext {
  file?: string
}

const escapeSqlString = (value: string): string => value.replace(/'/g, "''")

export const resolveSqlPlaceholders = (sql: string, context: SqlContext): string => {
  if (!context.file) return sql
  return sql.replace(/\$file/g, `'${escapeSqlString(context.file)}'`)
}
