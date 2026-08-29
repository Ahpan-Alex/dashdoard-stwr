import { endOfDay, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { nextNumero } from "./commercial";
import type {
  Achat,
  AchatLigne,
  AvoirAchat,
  EntreeStock,
  LivraisonAchat,
  LivraisonAchatStatut,
  ModePaiement,
  PaiementAchatStatut,
  Produit,
} from "./types";

export type PlageDates = { debut: Date; fin: Date };

function dansPlage(dateIso: string, range?: PlageDates) {
  if (!range) return true;
  const date = parseISO(dateIso);
  const start = startOfDay(range.debut);
  const end = endOfDay(range.fin);
  if (start > end) return false;
  return isWithinInterval(date, { start, end });
}

export const STATUT_ACHAT_LABELS: Record<Achat["statut"], string> = {
  brouillon: "Brouillon",
  valide: "Validé",
  annule: "Annulé",
};

export const STATUT_LIVRAISON_LABELS: Record<LivraisonAchatStatut, string> = {
  en_attente: "En attente",
  partielle: "Partielle",
  livree: "Livrée",
  annulee: "Annulée",
};

export const STATUT_PAIEMENT_LABELS: Record<PaiementAchatStatut, string> = {
  non_paye: "Non payé",
  partiel: "Partiel",
  paye: "Payé",
};

export function montantHTLigne(l: Pick<AchatLigne, "quantite" | "prixAchatUnitaire">) {
  return l.quantite * l.prixAchatUnitaire;
}

export function totauxAchat(achat: Achat) {
  const ht = achat.lignes.reduce((s, l) => s + montantHTLigne(l), 0);
  const tva =
    achat.tauxTVA > 0 ? Math.round(ht * (achat.tauxTVA / 100)) : 0;
  return { ht, tva, ttc: ht + tva };
}

export function totauxAvoir(avoir: AvoirAchat, tauxTVA: number) {
  const ht = avoir.lignes.reduce(
    (s, l) => s + l.quantite * l.prixAchatUnitaire,
    0,
  );
  const tva = tauxTVA > 0 ? Math.round(ht * (tauxTVA / 100)) : 0;
  return { ht, tva, ttc: ht + tva };
}

export function avoirsValides(achat: Achat) {
  return achat.avoirs.filter((a) => a.statut === "valide");
}

export function htAvoirsValides(achat: Achat) {
  return avoirsValides(achat).reduce(
    (s, a) => s + totauxAvoir(a, achat.tauxTVA).ht,
    0,
  );
}

export function ttcAvoirsValides(achat: Achat) {
  return avoirsValides(achat).reduce(
    (s, a) => s + totauxAvoir(a, achat.tauxTVA).ttc,
    0,
  );
}

export function totalPaye(achat: Achat) {
  return achat.paiements.reduce((s, p) => s + p.montant, 0);
}

export function soldeAchat(achat: Achat) {
  const { ttc } = totauxAchat(achat);
  return Math.max(0, ttc - ttcAvoirsValides(achat) - totalPaye(achat));
}

export function statutPaiementAchat(achat: Achat): PaiementAchatStatut {
  const du = totauxAchat(achat).ttc - ttcAvoirsValides(achat);
  const paye = totalPaye(achat);
  if (du <= 0 || paye >= du - 0.5) return "paye";
  if (paye > 0.5) return "partiel";
  return "non_paye";
}

export function livraisonsActives(achat: Achat) {
  return achat.livraisons.filter((l) => l.statut !== "annulee");
}

export function quantiteLivreeProduit(achat: Achat, produitId: string) {
  return livraisonsActives(achat).reduce((s, liv) => {
    const ligne = liv.lignes.find((l) => l.produitId === produitId);
    return s + (ligne?.quantiteLivree ?? 0);
  }, 0);
}

export function quantiteRetourneeProduit(achat: Achat, produitId: string) {
  return avoirsValides(achat).reduce((s, av) => {
    const ligne = av.lignes.find((l) => l.produitId === produitId);
    return s + (ligne?.quantite ?? 0);
  }, 0);
}

export function reliquatProduit(achat: Achat, produitId: string) {
  const cmd = achat.lignes.find((l) => l.produitId === produitId)?.quantite ?? 0;
  return Math.max(0, cmd - quantiteLivreeProduit(achat, produitId));
}

export function reliquatTotal(achat: Achat) {
  return achat.lignes.reduce((s, l) => s + reliquatProduit(achat, l.produitId), 0);
}

export function quantiteCommandee(achat: Achat) {
  return achat.lignes.reduce((s, l) => s + l.quantite, 0);
}

export function quantiteLivreeTotale(achat: Achat) {
  return achat.lignes.reduce(
    (s, l) => s + quantiteLivreeProduit(achat, l.produitId),
    0,
  );
}

export function statutLivraisonAchat(achat: Achat): LivraisonAchatStatut {
  if (achat.statut === "annule") return "annulee";
  const cmd = quantiteCommandee(achat);
  const liv = quantiteLivreeTotale(achat);
  if (liv <= 0) return "en_attente";
  if (liv + 1e-9 < cmd) return "partielle";
  return "livree";
}

export function statutLivraisonRecord(liv: LivraisonAchat): LivraisonAchatStatut {
  if (liv.statut === "annulee") return "annulee";
  const prevue = liv.lignes.reduce((s, l) => s + l.quantitePrevue, 0);
  const recue = liv.lignes.reduce((s, l) => s + l.quantiteLivree, 0);
  if (recue <= 0) return "en_attente";
  if (recue + 1e-9 < prevue) return "partielle";
  return "livree";
}

export function nextNumeroAchat(achats: Achat[]) {
  return nextNumero("ACH", achats.map((a) => a.numero));
}

export function nextNumeroLivraison(achats: Achat[]) {
  return nextNumero(
    "LIV",
    achats.flatMap((a) => a.livraisons.map((l) => l.numero)),
  );
}

export function nextNumeroAvoirAchat(achats: Achat[]) {
  return nextNumero(
    "AVR",
    achats.flatMap((a) => a.avoirs.map((x) => x.numero)),
  );
}

export function achatImpacteCompteResultat(achat: Achat) {
  return achat.statut === "valide";
}

/** Achats de marchandises HT, nets des avoirs, sur la période (PCG 607). */
export function montantAchatsMarchandisesHT(
  achats: Achat[],
  pointDeVenteId: string | "tous",
  range?: PlageDates,
) {
  let total = 0;
  for (const a of achats) {
    if (!achatImpacteCompteResultat(a)) continue;
    if (pointDeVenteId !== "tous" && a.pointDeVenteId !== pointDeVenteId) {
      continue;
    }
    if (!range || dansPlage(a.date, range)) {
      total += totauxAchat(a).ht;
    }
    for (const av of avoirsValides(a)) {
      if (!range || dansPlage(av.date, range)) {
        total -= totauxAvoir(av, a.tauxTVA).ht;
      }
    }
  }
  return total;
}

export function totalPaiementsFournisseurs(
  achats: Achat[],
  pointDeVenteId: string | "tous",
  range?: PlageDates,
) {
  let total = 0;
  for (const a of achats) {
    if (a.statut === "annule") continue;
    if (pointDeVenteId !== "tous" && a.pointDeVenteId !== pointDeVenteId) {
      continue;
    }
    for (const p of a.paiements) {
      if (!range || dansPlage(p.date, range)) total += p.montant;
    }
  }
  return total;
}

/** Dettes fournisseurs : soldes TTC des achats validés à la date d'arrêté. */
export function dettesFournisseursAchats(
  achats: Achat[],
  pointDeVenteId: string | "tous",
  dateArrete?: Date,
) {
  const range: PlageDates | undefined = dateArrete
    ? { debut: new Date(0), fin: dateArrete }
    : undefined;
  let total = 0;
  for (const a of achats) {
    if (!achatImpacteCompteResultat(a)) continue;
    if (pointDeVenteId !== "tous" && a.pointDeVenteId !== pointDeVenteId) {
      continue;
    }
    if (range && !dansPlage(a.date, range)) continue;
    const ttc = totauxAchat(a).ttc;
    const avoirs = a.avoirs
      .filter((av) => av.statut === "valide")
      .filter((av) => !range || dansPlage(av.date, range))
      .reduce((s, av) => s + totauxAvoir(av, a.tauxTVA).ttc, 0);
    const paye = a.paiements
      .filter((p) => !range || dansPlage(p.date, range))
      .reduce((s, p) => s + p.montant, 0);
    total += Math.max(0, ttc - avoirs - paye);
  }
  return total;
}

export function entreesDepuisAchat(
  achat: Achat,
  produits: Produit[],
  fournisseurNom: string,
): Omit<EntreeStock, "id">[] {
  const out: Omit<EntreeStock, "id">[] = [];
  const frn = fournisseurNom || "Fournisseur";
  for (const liv of achat.livraisons) {
    if (liv.statut === "annulee" || liv.statut === "en_attente") continue;
    for (const l of liv.lignes) {
      if (l.quantiteLivree <= 0) continue;
      const ligneCmd = achat.lignes.find((x) => x.produitId === l.produitId);
      const prod = produits.find((p) => p.id === l.produitId);
      out.push({
        pointDeVenteId: achat.pointDeVenteId,
        produitId: l.produitId,
        quantite: l.quantiteLivree,
        prixAchatUnitaire: ligneCmd?.prixAchatUnitaire ?? prod?.prixAchat ?? 0,
        prixVenteUnitaire: prod?.prixVenteHT ?? 0,
        fournisseur: frn,
        fournisseurId: achat.fournisseurId,
        date: liv.date,
        origine: "livraison_achat",
        achatId: achat.id,
        livraisonId: liv.id,
        note: liv.note,
        datePeremption: liv.datePeremption,
      });
    }
  }
  for (const av of avoirsValides(achat)) {
    for (const l of av.lignes) {
      if (l.quantite <= 0) continue;
      const prod = produits.find((p) => p.id === l.produitId);
      out.push({
        pointDeVenteId: achat.pointDeVenteId,
        produitId: l.produitId,
        quantite: -l.quantite,
        prixAchatUnitaire: l.prixAchatUnitaire,
        prixVenteUnitaire: prod?.prixVenteHT ?? 0,
        fournisseur: frn,
        fournisseurId: achat.fournisseurId,
        date: av.date,
        origine: "retour_fournisseur",
        achatId: achat.id,
        avoirAchatId: av.id,
        note: av.note,
      });
    }
  }
  return out;
}

export function achatMentionneProduit(achat: Achat, produitId: string) {
  if (achat.lignes.some((l) => l.produitId === produitId)) return true;
  if (
    achat.livraisons.some((liv) =>
      liv.lignes.some((l) => l.produitId === produitId),
    )
  ) {
    return true;
  }
  return achat.avoirs.some((av) =>
    av.lignes.some((l) => l.produitId === produitId),
  );
}

export function historiqueAchatsProduit(
  achats: Achat[],
  produitId: string,
  fournisseurId?: string,
) {
  return achats
    .filter((a) => (fournisseurId ? a.fournisseurId === fournisseurId : true))
    .filter((a) => achatMentionneProduit(a, produitId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const MODES_PAIEMENT_ACHAT: ModePaiement[] = [
  "especes",
  "virement",
  "cheque",
  "mobile_money",
  "autre",
];
