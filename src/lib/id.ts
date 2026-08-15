/** IDs client — `crypto.randomUUID` n'existe pas en HTTP hors localhost. */
export function createId(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${rand.replace(/-/g, "").slice(0, 12)}`;
}
