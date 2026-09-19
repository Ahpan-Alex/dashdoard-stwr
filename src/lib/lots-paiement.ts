import { nextNumero } from "./commercial";
import type { OptsNumeroDocument } from "./exercices";
import { soldeAchat } from "./achats";
import type { Achat, LotPaiementFournisseur } from "./types";

const EPS = 0.5;

export function dateAncienneteAchat(achat: Pick<Achat, "date" | "echeance">) {
  return achat.echeance || achat.date;
}

export function comparerAncienneteAchat(
  a: Pick<Achat, "date" | "echeance" | "numero">,
  b: Pick<Achat, "date" | "echeance" | "numero">,
) {
  const da = dateAncienneteAchat(a);
  const db = dateAncienneteAchat(b);
  return da.localeCompare(db) || a.date.localeCompare(b.date) || a.numero.localeCompare(b.numero);
}

/** Factures fournisseur ouvertes (validées, solde > 0), plus anciennes d'abord. */
export function facturesOuvertesFournisseur(
  achats: Achat[],
  fournisseurId: string,
) {
  return achats
    .filter(
      (a) =>
        a.fournisseurId === fournisseurId &&
        a.statut === "valide" &&
        soldeAchat(a) > EPS,
    )
    .sort(comparerAncienneteAchat);
}

export function sommeSoldes(achats: Achat[]) {
  return achats.reduce((s, a) => s + soldeAchat(a), 0);
}

export type VentilationSaisie = {
  achatId: string;
  montant: number;
};

/** Répartition FIFO par ancienneté (balance âgée : échéance sinon date). */
export function ventilerParAnciennete(
  achats: Achat[],
  montant: number,
): VentilationSaisie[] {
  let reste = Math.round(Math.max(0, montant));
  const out: VentilationSaisie[] = [];
  for (const a of [...achats].sort(comparerAncienneteAchat)) {
    if (reste <= 0) break;
    const solde = Math.round(soldeAchat(a));
    if (solde <= 0) continue;
    const take = Math.min(solde, reste);
    out.push({ achatId: a.id, montant: take });
    reste -= take;
  }
  return out;
}

export function totalVentilation(ventilations: VentilationSaisie[]) {
  return ventilations.reduce((s, v) => s + Math.round(Number(v.montant) || 0), 0);
}

export function motifVentilationInvalide(
  achats: Achat[],
  ventilations: VentilationSaisie[],
  montantLot: number,
) {
  const total = totalVentilation(ventilations);
  const cible = Math.round(montantLot);
  if (ventilations.length === 0) return "Sélectionnez au moins une facture.";
  if (cible <= 0) return "Le montant du paiement doit être positif.";
  if (Math.abs(total - cible) > EPS) {
    return `La ventilation (${Math.round(total)} Ar) doit égaler le montant du paiement (${cible} Ar).`;
  }
  const vus = new Set<string>();
  for (const v of ventilations) {
    if (vus.has(v.achatId)) return "Une facture est ventilée deux fois.";
    vus.add(v.achatId);
    const montant = Math.round(Number(v.montant) || 0);
    if (montant < 0) return "Une ventilation est négative.";
    if (montant === 0) continue;
    const achat = achats.find((a) => a.id === v.achatId);
    if (!achat) return "Facture introuvable dans le lot.";
    if (achat.statut !== "valide") {
      return `La facture ${achat.numero} n'est pas validée.`;
    }
    const solde = soldeAchat(achat);
    if (montant - solde > EPS) {
      return `La ventilation de ${achat.numero} dépasse le solde restant (${Math.round(solde)} Ar).`;
    }
  }
  const retenues = ventilations.filter((v) => Math.round(Number(v.montant) || 0) > 0);
  if (retenues.length === 0) return "Aucune facture n'est ventilée.";
  const fournisseurId = achats.find((a) => a.id === retenues[0].achatId)?.fournisseurId;
  if (
    retenues.some((v) => {
      const a = achats.find((x) => x.id === v.achatId);
      return a && a.fournisseurId !== fournisseurId;
    })
  ) {
    return "Toutes les factures du lot doivent appartenir au même fournisseur.";
  }
  return null;
}

export function nextNumeroLotPaiement(
  lots: LotPaiementFournisseur[],
  opts?: OptsNumeroDocument,
) {
  return nextNumero(
    "LOT-PAI",
    lots.map((l) => l.numero),
    opts,
  );
}

export type PartModeVentilation = {
  achatId: string;
  modeLigneId: string;
  montant: number;
};

/** Ventile chaque mode du lot sur les factures (même combinaison, sans écriture propre au lot). */
export function repartirModesSurVentilations(
  modes: Array<{ id: string; montant: number }>,
  ventilations: VentilationSaisie[],
): PartModeVentilation[] {
  const restes = modes.map((m) => ({
    id: m.id,
    reste: Math.round(Math.max(0, m.montant)),
  }));
  const out: PartModeVentilation[] = [];
  for (const v of ventilations) {
    let need = Math.round(Math.max(0, v.montant));
    for (const m of restes) {
      if (need <= 0) break;
      if (m.reste <= 0) continue;
      const take = Math.min(m.reste, need);
      if (take > 0) {
        out.push({ achatId: v.achatId, modeLigneId: m.id, montant: take });
        m.reste -= take;
        need -= take;
      }
    }
  }
  return out;
}

export function lotsActifsCouvrantAchat(
  lots: LotPaiementFournisseur[] | undefined,
  achatId: string,
) {
  return (lots ?? []).filter(
    (l) =>
      l.statut === "actif" &&
      l.ventilations.some((v) => v.achatId === achatId),
  );
}
