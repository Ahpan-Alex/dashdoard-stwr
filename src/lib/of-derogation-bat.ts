import { useAuthStore } from "./auth-store";

export type ResultatOf =
  | { ok: true }
  | { ok: false; reason?: string };

export function peutDerogerBat() {
  return useAuthStore.getState().hasPermission("fabrication.deroger_bat");
}

/**
 * Si le BAT bloque le démarrage, propose une dérogation au rôle habilité.
 * Retourne true si l'OF a démarré.
 */
export function resoudreDemarrageOf(
  premier: ResultatOf,
  relancerAvecDerogation: () => ResultatOf,
): boolean {
  if (premier.ok) return true;
  const reason = premier.reason ?? "Démarrage de l'OF refusé.";
  if (
    peutDerogerBat() &&
    typeof window !== "undefined" &&
    /BAT validé/i.test(reason) &&
    confirm(
      `${reason}\n\nOutrepasser l'obligation de BAT pour cet OF uniquement ? La dérogation sera tracée.`,
    )
  ) {
    const second = relancerAvecDerogation();
    if (second.ok) return true;
    alert(second.reason);
    return false;
  }
  alert(reason);
  return false;
}
