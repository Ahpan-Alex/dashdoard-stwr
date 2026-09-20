import { endOfDay, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { nextNumero } from "./commercial";
import type { OptsNumeroDocument } from "./exercices";
import { achatConcerneSite, htAchatPourSite, repartirQuantiteLivree } from "./sites";
import { ligneAchatStockee } from "./type-achat";
import type {
  Achat,
  AchatLigne,
  AvoirAchat,
  DivergenceLivraison,
  EntreeStock,
  LivraisonAchat,
  LivraisonAchatLigne,
  LivraisonAchatStatut,
  ModePaiement,
  PaiementAchatStatut,
  Produit,
  DestinationAchat,
  OrdreFabrication,
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

export const DESTINATION_ACHAT_LABELS: Record<DestinationAchat, string> = {
  projet_client: "Projet client",
  approvisionnement_stock: "Approvisionnement stock",
};

export function motifDestinationAchatManquante(doc: {
  destinationAchat?: DestinationAchat;
  commandeId?: string;
}): string | null {
  if (!doc.destinationAchat) {
    return "Indiquez si c'est un projet client ou un approvisionnement stock.";
  }
  if (doc.destinationAchat === "projet_client" && !doc.commandeId) {
    return "Choisissez la commande client (projet) liée.";
  }
  return null;
}

/** Achat sans rattachement projet client (hors réappro stock explicite). */
export function achatSansLienProjetClient(
  a: Pick<Achat, "statut" | "destinationAchat" | "commandeId">,
) {
  if (a.statut === "annule") return false;
  if (a.destinationAchat === "approvisionnement_stock") return false;
  return !a.commandeId;
}

export function destinationDepuisOf(
  of: Pick<OrdreFabrication, "commandeId"> | undefined,
): { destinationAchat: DestinationAchat; commandeId?: string } {
  if (of?.commandeId) {
    return { destinationAchat: "projet_client", commandeId: of.commandeId };
  }
  return { destinationAchat: "approvisionnement_stock" };
}

export function montantHTLigne(l: Pick<AchatLigne, "quantite" | "prixAchatUnitaire">) {
  return l.quantite * l.prixAchatUnitaire;
}

export function totauxAchat(achat: Achat) {
  const ht = achat.lignes.reduce((s, l) => s + montantHTLigne(l), 0);
  const tva =
    achat.tauxTVA > 0
      ? achat.lignes.reduce((s, l) => {
          if (l.taxable === false) return s;
          return s + Math.round(montantHTLigne(l) * (achat.tauxTVA / 100));
        }, 0)
      : 0;
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
  return achat.paiements
    .filter((p) => p.statutCheque !== "rejete")
    .reduce((s, p) => s + p.montant, 0);
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

export function reliquatProduit(achat: Achat, produitId: string | undefined) {
  if (!produitId) return 0;
  const cmd = achat.lignes.find((l) => l.produitId === produitId)?.quantite ?? 0;
  return Math.max(0, cmd - quantiteLivreeProduit(achat, produitId));
}

export function reliquatTotal(achat: Achat) {
  return achat.lignes
    .filter(ligneAchatStockee)
    .reduce((s, l) => s + reliquatProduit(achat, l.produitId), 0);
}

export function quantiteCommandee(achat: Achat) {
  return achat.lignes.reduce((s, l) => s + l.quantite, 0);
}

export function quantiteLivreeTotale(achat: Achat) {
  return achat.lignes
    .filter(ligneAchatStockee)
    .reduce((s, l) => s + quantiteLivreeProduit(achat, l.produitId ?? ""), 0);
}

export function statutLivraisonAchat(achat: Achat): LivraisonAchatStatut {
  if (achat.statut === "annule") return "annulee";
  const stockees = achat.lignes.filter(ligneAchatStockee);
  if (stockees.length === 0) {
    return achat.statut === "valide" ? "livree" : "en_attente";
  }
  let aucune = true;
  let toutesCouvertes = true;
  for (const l of stockees) {
    const liv = quantiteLivreeProduit(achat, l.produitId ?? "");
    if (liv > 1e-9) aucune = false;
    if (liv + 1e-9 < l.quantite) toutesCouvertes = false;
  }
  if (aucune) return "en_attente";
  if (!toutesCouvertes) return "partielle";
  return "livree";
}

/** Statut opérationnel pour pastilles : brouillon, en cours, partielle, livrée, annulée. */
export function statutSuiviAchat(achat: Achat): {
  id: "brouillon" | "en_cours" | "partielle" | "livree" | "annule";
  label: string;
} {
  if (achat.statut === "brouillon") return { id: "brouillon", label: "Brouillon" };
  if (achat.statut === "annule") return { id: "annule", label: "Annulée" };
  const liv = statutLivraisonAchat(achat);
  if (liv === "livree") return { id: "livree", label: "Livrée" };
  if (liv === "partielle") return { id: "partielle", label: "Livraison partielle" };
  return { id: "en_cours", label: "En cours" };
}

export function statutLivraisonRecord(liv: LivraisonAchat): LivraisonAchatStatut {
  if (liv.statut === "annulee") return "annulee";
  const prevue = liv.lignes.reduce((s, l) => s + l.quantitePrevue, 0);
  const recue = liv.lignes.reduce((s, l) => s + l.quantiteLivree, 0);
  if (recue <= 0) return "en_attente";
  if (recue + 1e-9 < prevue) return "partielle";
  return "livree";
}

export function nextNumeroAchat(achats: Achat[], opts?: OptsNumeroDocument) {
  return nextNumero("ACH", achats.map((a) => a.numero), opts);
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

/** Achats validés HT, tous types (marchandises, MP, services, immos…), nets des avoirs. */
export function montantAchatsHT(
  achats: Achat[],
  pointDeVenteId: string | "tous",
  range?: PlageDates,
) {
  let total = 0;
  for (const a of achats) {
    if (!achatImpacteCompteResultat(a)) continue;
    if (!achatConcerneSite(a, pointDeVenteId)) continue;
    if (!range || dansPlage(a.date, range)) {
      total += htAchatPourSite(a, pointDeVenteId);
    }
    for (const av of avoirsValides(a)) {
      if (!range || dansPlage(av.date, range)) {
        total -= totauxAvoir(av, a.tauxTVA).ht;
      }
    }
  }
  return total;
}

/** @deprecated Utiliser montantAchatsHT (tous types). */
export function montantAchatsMarchandisesHT(
  achats: Achat[],
  pointDeVenteId: string | "tous",
  range?: PlageDates,
) {
  return montantAchatsHT(achats, pointDeVenteId, range);
}

export function totalPaiementsFournisseurs(
  achats: Achat[],
  pointDeVenteId: string | "tous",
  range?: PlageDates,
) {
  let total = 0;
  for (const a of achats) {
    if (a.statut === "annule") continue;
    if (!achatConcerneSite(a, pointDeVenteId)) continue;
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
    if (!achatConcerneSite(a, pointDeVenteId)) continue;
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

export function coutUnitaireEntreeAchat(ligne: Pick<AchatLigne, "quantite" | "prixAchatUnitaire" | "fraisAnnexe">) {
  const q = Number(ligne.quantite) || 0;
  const pu = Number(ligne.prixAchatUnitaire) || 0;
  const frais = Math.max(0, Number(ligne.fraisAnnexe) || 0);
  if (q <= 0) return pu;
  return pu + frais / q;
}

export function divergenceQuantites(
  quantiteLivree: number,
  quantiteCommandee: number,
): DivergenceLivraison {
  const d = (Number(quantiteLivree) || 0) - (Number(quantiteCommandee) || 0);
  if (d > 1e-9) return "surplus";
  if (d < -1e-9) return "manque";
  return "aucune";
}

export const DIVERGENCE_LIVRAISON_LABELS: Record<DivergenceLivraison, string> = {
  aucune: "Aucune",
  surplus: "Surplus",
  manque: "Manque",
};

export function completerLigneLivraison(
  ligne: LivraisonAchatLigne,
  quantiteCommandee: number,
  opts?: {
    validerEcarts?: boolean;
    actor?: { id?: string; nom?: string };
    /** Quantité déjà réceptionnée sur d'autres livraisons (hors celle-ci). */
    dejaLivre?: number;
  },
): LivraisonAchatLigne {
  const qLiv = Math.max(0, Number(ligne.quantiteLivree) || 0);
  const qCmd = Math.max(0, Number(quantiteCommandee) || 0);
  const cumul = Math.max(0, Number(opts?.dejaLivre) || 0) + qLiv;
  const divergence = divergenceQuantites(cumul, qCmd);
  const validation = divergence !== "aucune" && Boolean(opts?.validerEcarts);
  return {
    ...ligne,
    quantiteLivree: qLiv,
    quantiteCommandee: qCmd,
    divergence,
    validationDivergence: validation || undefined,
    valideeParId: validation ? opts?.actor?.id : undefined,
    valideeParNom: validation ? opts?.actor?.nom : undefined,
    valideeAt: validation ? new Date().toISOString() : undefined,
  };
}

export function motifEcartLivraisonNonValide(lignes: LivraisonAchatLigne[]) {
  const ecarts = lignes.filter(
    (l) => (l.divergence ?? "aucune") !== "aucune" && l.quantiteLivree > 0,
  );
  if (ecarts.length === 0) return null;
  const nonValides = ecarts.filter((l) => !l.validationDivergence);
  if (nonValides.length === 0) return null;
  const resume = nonValides
    .map((l) => {
      const cmd = l.quantiteCommandee ?? l.quantitePrevue;
      const delta = (l.quantiteLivree - cmd).toFixed(2);
      const sens = l.divergence === "surplus" ? "surplus" : "manque";
      return `${sens} ${delta} (commandé ${cmd}, livré ${l.quantiteLivree})`;
    })
    .join(" ; ");
  return `Écart quantité à valider manuellement : ${resume}.`;
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
      if (l.quantiteLivree <= 0 || !l.produitId) continue;
      const ligneCmd = achat.lignes.find(
        (x) => ligneAchatStockee(x) && x.produitId === l.produitId,
      );
      if (!ligneCmd) continue;
      const prod = produits.find((p) => p.id === l.produitId);
      const pu = ligneCmd ? coutUnitaireEntreeAchat(ligneCmd) : (prod?.prixAchat ?? 0);
      const pv = prod?.prixVenteHT ?? 0;
      const parts = ligneCmd
        ? repartirQuantiteLivree(ligneCmd, l.quantiteLivree, achat.pointDeVenteId)
        : [{ pointDeVenteId: achat.pointDeVenteId, quantite: l.quantiteLivree }];
      for (const part of parts) {
        out.push({
          pointDeVenteId: part.pointDeVenteId,
          produitId: l.produitId,
          quantite: part.quantite,
          prixAchatUnitaire: pu,
          prixVenteUnitaire: pv,
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
  }
  for (const av of avoirsValides(achat)) {
    for (const l of av.lignes) {
      if (l.quantite <= 0 || !l.produitId) continue;
      const prod = produits.find((p) => p.id === l.produitId);
      const ligneCmd = achat.lignes.find(
        (x) => ligneAchatStockee(x) && x.produitId === l.produitId,
      );
      if (!ligneCmd) continue;
      const parts = ligneCmd
        ? repartirQuantiteLivree(ligneCmd, l.quantite, achat.pointDeVenteId)
        : [{ pointDeVenteId: achat.pointDeVenteId, quantite: l.quantite }];
      for (const part of parts) {
        out.push({
          pointDeVenteId: part.pointDeVenteId,
          produitId: l.produitId,
          quantite: -part.quantite,
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
  "cheque_comptant",
  "cheque_differe",
  "prelevement",
  "carte",
  "mobile_money",
  "autre",
];
