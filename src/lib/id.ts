/** IDs client — `crypto.randomUUID` n'existe pas en HTTP hors localhost. */
let compteurId = 0;

export function createId(prefix = "id"): string {
  compteurId += 1;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const alea =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) =>
          n.toString(16).padStart(8, "0"),
        ).join("")
      : Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  return `${prefix}-${Date.now().toString(16)}-${compteurId.toString(16)}-${alea}`;
}
