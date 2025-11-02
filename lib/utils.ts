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

// Currency: Indonesian Rupiah formatter
// Usage: formatIDR(125000) -> "Rp 125.000"
export function formatIDR(value: number | string | null | undefined) {
  const num = typeof value === "string" ? Number(value) : value
  if (num == null || Number.isNaN(num)) return "Rp 0"
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num)
}
