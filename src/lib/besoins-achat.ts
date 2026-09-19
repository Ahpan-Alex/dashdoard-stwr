import { quantiteLivreeProduit, quantiteRetourneeProduit } from "./achats";
import { nextNumero } from "./commercial";
import type { OptsNumeroDocument } from "./exercices";
import { motifRepartitionOfInvalide, sommeRepartitionsOf } from "./repartition-achat-of";
import type {
  Achat,
  AchatRepartitionOf,
  BesoinAchat,
  BesoinAchatStatut,
} from "./types";

const EPS = 1e-6;

export const BESOIN_ACHAT_STATUT_LABELS: Record<BesoinAchatStatut, string> = {
  ouvert: "Ouvert",
  partiel: "Partiellement couvert",
  couvert: "Couvert",
  annule: "Annulé",
};

export function nextNumeroBesoinAchat(
  liste: BesoinAchat[],
  opts?: OptsNumeroDocument,
) {
  return nextNumero(
    "BA",
    liste.map((b) => b.numero),
    opts,
  );
}

export function motifBesoinAchatInvalide(
  data: Pick<BesoinAchat, "produitId" | "quantiteNecessaire" | "repartitionsOf">,
): string | null {
  if (!data.produitId) return "Choisissez un article.";
  if (!(data.quantiteNecessaire > 0)) {
    return "La quantité nécessaire doit être positive.";
  }
  return motifRepartitionOfInvalide([
    {
      id: "besoin",
      quantite: data.quantiteNecessaire,
      prixAchatUnitaire: 0,
      repartitionsOf: data.repartitionsOf,
    },
  ]);
}

export function achatCouvreBesoin(achat: Achat, besoinId: string) {
  if (achat.statut === "annule") return false;
  if (achat.besoinAchatId === besoinId) return true;
  return achat.lignes.some((l) => l.besoinAchatId === besoinId);
}

export function achatsDuBesoin(besoinId: string, achats: Achat[]) {
  return achats.filter((a) => achatCouvreBesoin(a, besoinId));
}

export function lignesDuBesoin(besoin: BesoinAchat, achats: Achat[]) {
  const out: { achat: Achat; ligne: Achat["lignes"][number] }[] = [];
  for (const a of achatsDuBesoin(besoin.id, achats)) {
    for (const l of a.lignes) {
      if (l.produitId !== besoin.produitId) continue;
      if (l.besoinAchatId === besoin.id || a.besoinAchatId === besoin.id) {
        out.push({ achat: a, ligne: l });
      }
    }
  }
  return out;
}

export function couvertureBesoin(besoin: BesoinAchat, achats: Achat[]) {
  const lignes = lignesDuBesoin(besoin, achats);
  let commandee = 0;
  let livree = 0;
  const fournisseurIds = new Set<string>();
  for (const { achat, ligne } of lignes) {
    commandee += Number(ligne.quantite) || 0;
    fournisseurIds.add(achat.fournisseurId);
    if (!ligne.produitId) continue;
    livree += Math.max(
      0,
      quantiteLivreeProduit(achat, ligne.produitId) -
        quantiteRetourneeProduit(achat, ligne.produitId),
    );
  }
  const necessaire = besoin.quantiteNecessaire;
  const reliquat = Math.max(0, necessaire - commandee);
  return {
    commandee,
    livree: Math.min(livree, commandee),
    necessaire,
    reliquat,
    nbFournisseurs: fournisseurIds.size,
    pct: necessaire > 0 ? Math.min(100, (commandee / necessaire) * 100) : 0,
  };
}

export function statutBesoinAchat(
  besoin: BesoinAchat,
  achats: Achat[],
): BesoinAchatStatut {
  if (besoin.annule) return "annule";
  const { commandee, necessaire } = couvertureBesoin(besoin, achats);
  if (commandee <= EPS) return "ouvert";
  if (commandee + EPS >= necessaire) return "couvert";
  return "partiel";
}

export function badgeClasseBesoin(statut: BesoinAchatStatut) {
  if (statut === "couvert") return "badge-success";
  if (statut === "partiel") return "badge-sand";
  if (statut === "annule") return "badge-danger";
  return "badge-sea";
}

/** Recopie au prorata les répartitions OF d'un besoin vers une commande. */
export function prorataRepartitionsOf(
  reps: AchatRepartitionOf[] | undefined,
  quantiteSource: number,
  quantiteCible: number,
): Omit<AchatRepartitionOf, "id">[] {
  if (!reps?.length || !(quantiteSource > 0) || !(quantiteCible > 0)) return [];
  const frac = Math.min(1, quantiteCible / quantiteSource);
  const cibleOf = Math.min(
    quantiteCible,
    sommeRepartitionsOf({ repartitionsOf: reps }) * frac,
  );
  const out: Omit<AchatRepartitionOf, "id">[] = [];
  let alloue = 0;
  for (let i = 0; i < reps.length; i++) {
    const r = reps[i];
    const dernier = i === reps.length - 1;
    const q = dernier
      ? Math.max(0, cibleOf - alloue)
      : r.quantite * frac;
    if (q <= EPS) continue;
    alloue += q;
    out.push({
      ofId: r.ofId,
      quantite: q,
      pointDeVenteId: r.pointDeVenteId,
    });
  }
  return out;
}

export function besoinsPourOf(besoins: BesoinAchat[], ofId: string) {
  return besoins.filter((b) =>
    (b.repartitionsOf ?? []).some((r) => r.ofId === ofId),
  );
}

export function modePaiementAchatVisible(achat: Achat) {
  return achat.modePaiement || achat.paiements[0]?.modePaiement;
}
