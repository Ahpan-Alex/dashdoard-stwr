import { useAuthStore } from "./auth-store";

export type ResultatFacture =
  | { ok: true; id: string }
  | { ok: false; reason: string };

export function peutDerogerPlafondCredit() {
  return useAuthStore.getState().hasPermission("ventes.deroger_credit");
}

/**
 * Si le plafond bloque la vente, propose une dérogation au rôle habilité.
 * Retourne l'id de facture ou null.
 */
export function resoudreCreationFacture(
  premier: ResultatFacture,
  relancerAvecDerogation: () => ResultatFacture,
): string | null {
  if (premier.ok) return premier.id;
  if (
    peutDerogerPlafondCredit() &&
    typeof window !== "undefined" &&
    confirm(
      `${premier.reason}\n\nOutrepasser le plafond pour cette vente uniquement ?`,
    )
  ) {
    const second = relancerAvecDerogation();
    if (second.ok) return second.id;
    alert(second.reason);
    return null;
  }
  alert(premier.reason ?? "Vente bloquée : plafond de crédit dépassé.");
  return null;
}
