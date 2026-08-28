import { getActiviteActor } from "./activity-actor";
import { factureImpacteExploitation, isLigneProduit } from "./commercial";
import type {
  BonDeLivraison,
  CibleTransformation,
  Commande,
  Devis,
  Facture,
  LigneDocument,
  SourceTransformation,
  VerrouTransformation,
} from "./types";

/** Durée du verrou pendant l'écran de validation (10 minutes). */
export const DUREE_VERROU_TRANSFORMATION_MS = 10 * 60 * 1000;

export const LABEL_CIBLE_TRANSFORMATION: Record<CibleTransformation, string> = {
  commande: "commande",
  bon_de_livraison: "bon de livraison",
  facture: "facture",
};

export const LABEL_SOURCE_TRANSFORMATION: Record<SourceTransformation, string> = {
  devis: "devis",
  commande: "commande",
  bon_de_livraison: "bon de livraison",
};

export type AvancementQuantite = "aucune" | "partielle" | "totale";

export const LABEL_AVANCEMENT_LIVRAISON: Record<AvancementQuantite, string> = {
  aucune: "Non livrée",
  partielle: "Partiellement livrée",
  totale: "Totalement livrée",
};

export const LABEL_AVANCEMENT_FACTURATION: Record<AvancementQuantite, string> = {
  aucune: "Non facturée",
  partielle: "Partiellement facturée",
  totale: "Totalement facturée",
};

const EPS = 1e-6;

export function verrouTransformationActif(
  v?: VerrouTransformation | null,
): boolean {
  if (!v?.jusquA) return false;
  const t = Date.parse(v.jusquA);
  return Number.isFinite(t) && t > Date.now();
}

export function documentEstVerrouille(doc: {
  verrouTransformation?: VerrouTransformation | null;
}): boolean {
  return verrouTransformationActif(doc.verrouTransformation);
}

export function secondesRestantesVerrou(
  v?: VerrouTransformation | null,
): number {
  if (!v?.jusquA) return 0;
  const t = Date.parse(v.jusquA);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((t - Date.now()) / 1000));
}

export function formatDureeRestante(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function creerVerrouTransformation(
  cible: CibleTransformation,
  statutPrecedent: string,
): VerrouTransformation {
  const actor = getActiviteActor();
  return {
    jusquA: new Date(Date.now() + DUREE_VERROU_TRANSFORMATION_MS).toISOString(),
    userId: actor.id,
    userNom: actor.nom,
    cible,
    statutPrecedent,
  };
}

export function clonerLignesDocument(
  lignes: LigneDocument[],
  prefix: string,
): LigneDocument[] {
  return lignes.map((l) => ({ ...l, id: `${prefix}-${l.id}` }));
}

function quantitesParProduit(lignes: LigneDocument[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of lignes) {
    if (!isLigneProduit(l) || !l.produitId) continue;
    m.set(l.produitId, (m.get(l.produitId) ?? 0) + Math.max(0, l.quantite));
  }
  return m;
}

function fusionnerQuantites(maps: Map<string, number>[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of maps) {
    for (const [id, q] of m) {
      out.set(id, (out.get(id) ?? 0) + q);
    }
  }
  return out;
}

function comparerAvancement(
  base: Map<string, number>,
  used: Map<string, number>,
): AvancementQuantite {
  let besoin = 0;
  for (const q of base.values()) besoin += q;
  if (besoin <= EPS) {
    let usedT = 0;
    for (const q of used.values()) usedT += q;
    return usedT > EPS ? "totale" : "aucune";
  }
  let couvert = 0;
  for (const [id, q] of base) {
    couvert += Math.min(q, used.get(id) ?? 0);
  }
  if (couvert <= EPS) return "aucune";
  if (couvert + EPS < besoin) return "partielle";
  return "totale";
}

function blComptePourLivraison(b: BonDeLivraison): boolean {
  return b.statut !== "annule" && b.statut !== "brouillon";
}

function factureComptePourAvancement(f: Facture): boolean {
  return f.type !== "avoir" && factureImpacteExploitation(f);
}

export function avancementLivraisonCommande(
  commande: Commande,
  bons: BonDeLivraison[],
): AvancementQuantite {
  const bls = bons.filter(
    (b) => b.commandeId === commande.id && blComptePourLivraison(b),
  );
  return comparerAvancement(
    quantitesParProduit(commande.lignes),
    fusionnerQuantites(bls.map((b) => quantitesParProduit(b.lignes))),
  );
}

export function avancementFacturationCommande(
  commande: Commande,
  factures: Facture[],
): AvancementQuantite {
  const facs = factures.filter(
    (f) => f.commandeId === commande.id && factureComptePourAvancement(f),
  );
  return comparerAvancement(
    quantitesParProduit(commande.lignes),
    fusionnerQuantites(facs.map((f) => quantitesParProduit(f.lignes))),
  );
}

export function avancementFacturationBl(
  bl: BonDeLivraison,
  factures: Facture[],
): AvancementQuantite {
  const facs = factures.filter(
    (f) => f.bonDeLivraisonId === bl.id && factureComptePourAvancement(f),
  );
  return comparerAvancement(
    quantitesParProduit(bl.lignes),
    fusionnerQuantites(facs.map((f) => quantitesParProduit(f.lignes))),
  );
}

export function couleurAvancement(
  a: AvancementQuantite,
): "sand" | "warning" | "success" {
  if (a === "aucune") return "sand";
  if (a === "partielle") return "warning";
  return "success";
}

export function statutCommandeSelonLivraison(
  avancement: AvancementQuantite,
): "en_cours" | "livree" {
  return avancement === "totale" ? "livree" : "en_cours";
}

const DEVIS_EN_COURS = new Set([
  "brouillon",
  "envoye",
  "accepte",
  "en_transformation",
]);

export function devisEstEnCours(statut: string): boolean {
  return DEVIS_EN_COURS.has(statut);
}

export function devisPeutEtreTransforme(d: Devis): boolean {
  return (
    d.statut !== "transforme" &&
    d.statut !== "refuse" &&
    d.statut !== "expire"
  );
}

export function raisonDocumentNonModifiable(doc: {
  statut: string;
  verrouTransformation?: VerrouTransformation | null;
}): string | null {
  if (verrouTransformationActif(doc.verrouTransformation)) {
    const nom = doc.verrouTransformation?.userNom;
    return nom
      ? `Document verrouillé — transformation en cours (${nom}).`
      : "Document verrouillé — transformation en cours.";
  }
  return null;
}
