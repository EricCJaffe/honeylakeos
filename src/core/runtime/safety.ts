import { format } from "date-fns";

export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function safeFormatDate(
  value: string | Date | null | undefined,
  pattern: string,
  fallback = "Invalid date"
): string {
  if (!value) return fallback;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return fallback;
  return format(dt, pattern);
}
