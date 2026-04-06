const hasTime = (iso: string): boolean => iso.includes("T")

const safeDate = (iso: string): Date | null => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

export const formatDisplayDate = (iso: string): string => {
  const d = safeDate(iso)
  if (!d) return iso
  const options: Intl.DateTimeFormatOptions = hasTime(iso)
    ? { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { year: "numeric", month: "long", day: "numeric" }
  return d.toLocaleDateString(undefined, options)
}

export const formatShortDate = (iso: string): string => {
  const d = safeDate(iso)
  if (!d) return iso
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
