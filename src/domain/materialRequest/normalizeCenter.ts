/** Normalizes SharePoint center values without assuming numeric center codes. */
export function normalizeCenter(center: unknown): string {
  return String(center ?? "").trim().replace(/\s+/g, " ");
}
