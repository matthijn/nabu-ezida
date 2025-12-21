import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const timeUnits: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4, "week"],
  [12, "month"],
  [Infinity, "year"],
]

export function timeAgo(date: Date): string {
  let diff = (date.getTime() - Date.now()) / 1000

  for (const [amount, unit] of timeUnits) {
    if (Math.abs(diff) < amount) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        Math.round(diff),
        unit
      )
    }
    diff /= amount
  }
  return ""
}
