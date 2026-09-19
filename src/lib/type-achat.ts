import type { AchatLigne, TypeAchat } from "./types";

export const TYPES_ACHAT_PRODUIT = [
  "marchandises",
  "matieres_premieres",
  "fournitures",
  "outillage",
  "service_produit",
] as const;

export const TYPES_ACHAT_LIBRES = [
  "service_general",
  "immobilisation",
] as const;

export const TYPE_ACHAT_LABELS: Record<TypeAchat, string> = {
  marchandises: "Achat de marchandises (revente en l'état)",
  matieres_premieres: "Achat de matières premières (transformation)",
  fournitures: "Achat de fournitures consommables",
  outillage: "Outillage / Pièces d'usure",
  service_produit: "Achat de service lié à un produit / chantier",
  service_general: "Achat de service général",
  immobilisation: "Achat d'immobilisation",
};

/**
 * Préfixe PCG du compte de charge proposé par type (classe 6, sauf immo).
 * 605 = matériels / pièces d'usure ; 606 = non stockés (EPI, restauration).
 */
export const TYPE_ACHAT_COMPTE_CHARGE_PREFIX: Record<TypeAchat, string> = {
  marchandises: "607",
  matieres_premieres: "601",
  fournitures: "602",
  outillage: "605",
  service_produit: "604",
  service_general: "606",
  immobilisation: "2",
};

export function typeAchatSurFicheProduit(type: TypeAchat | undefined) {
  const t = type ?? "marchandises";
  return (TYPES_ACHAT_PRODUIT as readonly string[]).includes(t);
}

export function ligneAchatStockee(
  ligne: Pick<AchatLigne, "produitId" | "typeAchat">,
) {
  return Boolean(ligne.produitId) && typeAchatSurFicheProduit(ligne.typeAchat);
}
