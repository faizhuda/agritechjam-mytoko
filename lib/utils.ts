import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize search text so different inputs behave the same across components.
// - lowercases
// - remove diacritics
// - strip punctuation (keep word chars, spaces and hyphens)
// - collapse spaces
// - trim
export function normalizeSearch(input: string) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^\w\s-]/g, " ") // strip punctuation
    .replace(/\s+/g, " ")
    .trim()
}
