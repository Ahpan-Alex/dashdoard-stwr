import { soldeAchat, statutLivraisonAchat } from "./achats";
import { calculerStocks } from "./calculations";
import { etatPaiementFacture, resteAPayer } from "./commercial";
import type { Permission } from "./auth/rbac";
import { factureEstFiscale } from "./facturation-mg";
import {
  produitsAMigrerComptes,
  moduleComptabiliteActif,
  depenseEnAttenteReclassement,
} from "./comptabilite";
import { evenementsCumpProduit, parcourirCump } from "./cump";
import {
  quantiteSortieComposant,
  quantiteTheoriqueComposantOf,
  reliquatsMatieres,
  stockDisponibleComposant,
} from "./fabrication";
import {
  fondsValidesMission,
  fondsRemisMission,
} from "./missions";
import { natureStockDuProduit } from "./nature-stock";
import { libelleProduit, prixAchatCatalogue } from "./produits";
import { siteEstAtelier } from "./sites";
import {
  labelsTranchesBalanceAgee,
  normaliserTranchesBalanceAgee,
  soldeClientTiers,
} from "./tiers";
import type {
  Achat,
  Acompte,
  DemandePrix,
  EntreeStock,
  Facture,
  Fournisseur,
  Inventaire,
  CompteComptable,
  JournalAudit,
  MissionAchat,
  NatureDepenseMission,
  OrdreFabrication,
  Parametres,
  PointDeVente,
  Produit,
  TransfertStock,
  Vente,
  BonATirer,
  Commande,
} from "./types";
import { batEnRetardRelance, cycleIdBat } from "./bat";
import { anomaliesFournisseurRetenu } from "./classement-fournisseurs";
import { ecartsMoyensParAcheteur } from "./dashboard-indicateurs";
import {
  etatDelaiMission,
  etatDelaiOf,
  etatDelaiTransfert,
} from "./delais-alerte";

export type CategorieAlerte = "stock" | "production" | "achat" | "vente";

export type TypeAlerte =
  | "achat_echeance_approche"
  | "achat_echeance_depassee"
  | "achat_livraison_partielle"
  | "mission_avance_non_rapprochee"
  | "mission_471_non_reclasse"
  | "dp_sans_reponse"
  | "dp_fournisseur_atypique"
  | "mission_ouverte"
  | "mission_ecart_acheteur"
  | "transfert_en_attente"
  | "of_non_cloture"
  | "vente_echeance_approche"
  | "vente_impayee"
  | "vente_partielle_sans_mouvement"
  | "vente_plafond_credit"
  | "stock_reappro"
  | "stock_rupture"
  | "stock_surstock"
  | "stock_peremption"
  | "stock_dormant"
  | "stock_cump_anormal"
  | "produit_compte_generique"
  | "of_retard"
  | "of_ecart_matiere"
  | "of_rupture_composant"
  | "atelier_surcharge"
  | "bat_relance";

export type GraviteAlerte = "info" | "warning" | "danger";

export type RegleAlerte = {
  actif: boolean;
  delaiJours?: number;
  seuilPercent?: number;
  /** Seuil d'écart en montant (Ar), ex. écart moyen acheteur. */
  seuilMontant?: number;
  /** Écart de fabrication : seuil % propre à un atelier (sinon le global). */
  seuilsParAtelier?: Record<string, number>;
};

export type ParametresAlertes = {
  achatEcheanceApproche: RegleAlerte;
  achatEcheanceDepassee: RegleAlerte;
  achatLivraisonPartielle: RegleAlerte;
  achatMissionAvance: RegleAlerte;
  achatCompte471: RegleAlerte;
  achatDpSansReponse: RegleAlerte;
  venteEcheanceApproche: RegleAlerte;
  venteImpayee: RegleAlerte;
  ventePartielleSansMouvement: RegleAlerte;
  ventePlafondCredit: RegleAlerte;
  stockReappro: RegleAlerte;
  stockRupture: RegleAlerte;
  stockSurstock: RegleAlerte;
  stockPeremption: RegleAlerte;
  stockDormant: RegleAlerte;
  stockCumpAnormal: RegleAlerte;
  productionOfRetard: RegleAlerte;
  productionEcartFabrication: RegleAlerte;
  productionRuptureComposant: RegleAlerte;
  productionSurchargeAtelier: RegleAlerte;
  batRelance: RegleAlerte;
  /** Mission ouverte sans clôture ni justificatif (mécanisme Délai + Alerte). */
  missionOuverte: RegleAlerte;
  /** Écart moyen glissant par acheteur (montant et/ou %). */
  missionEcartAcheteur: RegleAlerte;
  /** Transfert inter-sites en attente de validation. */
  transfertEnAttente: RegleAlerte;
  /** OF non clôturé depuis la dernière action (distinct du retard vs date prévue). */
  ofNonCloture: RegleAlerte;
  /** Fournisseur retenu ni moins cher ni conforme au dernier prix. */
  dpFournisseurAtypique: RegleAlerte;
};

export type AlerteInstance = {
  id: string;
  type: TypeAlerte;
  categorie: CategorieAlerte;
  titre: string;
  message: string;
  date: string;
  href: string;
  gravite: GraviteAlerte;
  entiteId: string;
  pointDeVenteId?: string;
  /** Quantité proposée pour une DP générée depuis un seuil de stock. */
  quantiteSuggeree?: number;
};

export type SuiviAlertesUser = {
  lues: string[];
  traitees: string[];
};

export type AlertesSuivi = Record<string, SuiviAlertesUser>;

export const PARAMETRES_ALERTES_DEFAUT: ParametresAlertes = {
  achatEcheanceApproche: { actif: true, delaiJours: 7 },
  achatEcheanceDepassee: { actif: true },
  achatLivraisonPartielle: { actif: true, delaiJours: 7 },
  achatMissionAvance: { actif: true, delaiJours: 7 },
  achatCompte471: { actif: true, delaiJours: 7 },
  achatDpSansReponse: { actif: true, delaiJours: 7 },
  venteEcheanceApproche: { actif: true, delaiJours: 7 },
  venteImpayee: { actif: true },
  ventePartielleSansMouvement: { actif: true, delaiJours: 14 },
  ventePlafondCredit: { actif: true, seuilPercent: 80 },
  stockReappro: { actif: true },
  stockRupture: { actif: true },
  stockSurstock: { actif: true },
  stockPeremption: { actif: true, delaiJours: 3 },
  stockDormant: { actif: true, delaiJours: 90 },
  stockCumpAnormal: { actif: true, seuilPercent: 20 },
  productionOfRetard: { actif: true, delaiJours: 0 },
  productionEcartFabrication: { actif: true, seuilPercent: 10 },
  productionRuptureComposant: { actif: true },
  productionSurchargeAtelier: { actif: true },
  batRelance: { actif: true, delaiJours: 7 },
  missionOuverte: { actif: true, delaiJours: 7 },
  missionEcartAcheteur: { actif: true, seuilPercent: 10, seuilMontant: 0 },
  transfertEnAttente: { actif: true, delaiJours: 7 },
  ofNonCloture: { actif: true, delaiJours: 7 },
  dpFournisseurAtypique: { actif: true },
};

export const MODULES_ALERTES = [
  {
    id: "stock" as const,
    label: "Stock",
    href: "/alertes",
    hrefParametres: "/parametres/pilotage?onglet=alertes&module=stock",
  },
  {
    id: "production" as const,
    label: "Production",
    href: "/alertes/production",
    hrefParametres: "/parametres/pilotage?onglet=alertes&module=production",
  },
  {
    id: "achat" as const,
    label: "Achats",
    href: "/alertes/achats",
    hrefParametres: "/parametres/pilotage?onglet=alertes&module=achat",
  },
  {
    id: "vente" as const,
    label: "Ventes",
    href: "/alertes/ventes",
    hrefParametres: "/parametres/pilotage?onglet=alertes&module=vente",
  },
] as const;

export const LABEL_CATEGORIE_ALERTE: Record<CategorieAlerte, string> = {
  stock: "Stock",
  production: "Production",
  achat: "Achats",
  vente: "Ventes",
};

export const LABEL_TYPE_ALERTE: Record<TypeAlerte, string> = {
  achat_echeance_approche: "Échéance fournisseur approchante",
  achat_echeance_depassee: "Facture d'achat en retard",
  achat_livraison_partielle: "Livraison partielle en attente",
  mission_avance_non_rapprochee: "Avance de mission non rapprochée",
  mission_471_non_reclasse: "Compte 471 en attente de reclassement",
  dp_sans_reponse: "Demande de prix sans réponse",
  dp_fournisseur_atypique: "Fournisseur retenu atypique",
  mission_ouverte: "Mission ouverte sans clôture",
  mission_ecart_acheteur: "Écart moyen acheteur au-delà du seuil",
  transfert_en_attente: "Transfert en attente de validation",
  of_non_cloture: "OF non clôturé (délai d'inaction)",
  vente_echeance_approche: "Échéance client approchante",
  vente_impayee: "Facture client en retard",
  vente_partielle_sans_mouvement: "Paiement partiel sans mouvement",
  vente_plafond_credit: "Client proche du plafond de crédit",
  stock_reappro: "Seuil de réapprovisionnement",
  stock_rupture: "Rupture de matière / stock",
  stock_surstock: "Surstockage",
  stock_peremption: "Péremption proche",
  stock_dormant: "Stock semi-fini / fini dormant",
  stock_cump_anormal: "Écart de valorisation CUMP",
  produit_compte_generique: "Compte produit manquant",
  of_retard: "OF en retard",
  of_ecart_matiere: "Écart de fabrication anormal",
  of_rupture_composant: "Rupture de composant en cours d'OF",
  atelier_surcharge: "Atelier en surcharge",
  bat_relance: "BAT en attente — relance client",
};

const CLES_REGLES = Object.keys(
  PARAMETRES_ALERTES_DEFAUT,
) as (keyof ParametresAlertes)[];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function jourISO(value: Date | string = new Date()): string {
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ajouterJours(iso: string, jours: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + jours);
  return jourISO(d);
}

function joursEntre(debut: string, fin: string): number {
  const a = new Date(`${debut.slice(0, 10)}T12:00:00`).getTime();
  const b = new Date(`${fin.slice(0, 10)}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function delaiPositif(regle: RegleAlerte, fallback: number): number {
  const n = Number(regle.delaiJours);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function percentPositif(regle: RegleAlerte, fallback: number): number {
  const n = Number(regle.seuilPercent);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function seuilAtelier(regle: RegleAlerte, atelierId: string, fallback: number) {
  const propre = regle.seuilsParAtelier?.[atelierId];
  if (propre != null && Number.isFinite(propre) && propre >= 0) return propre;
  return percentPositif(regle, fallback);
}

function fusionnerRegle(defaut: RegleAlerte, raw: unknown): RegleAlerte {
  const src = asRecord(raw);
  if (!src) return { ...defaut, seuilsParAtelier: defaut.seuilsParAtelier };
  const actif = src.actif === undefined ? defaut.actif : Boolean(src.actif);
  const delai =
    src.delaiJours === undefined
      ? defaut.delaiJours
      : Number(src.delaiJours);
  const pctRaw =
    src.seuilPercent === undefined
      ? defaut.seuilPercent
      : Number(src.seuilPercent);
  const montantRaw =
    src.seuilMontant === undefined
      ? defaut.seuilMontant
      : Number(src.seuilMontant);
  const ateliersRaw = asRecord(src.seuilsParAtelier);
  const seuilsParAtelier: Record<string, number> = {
    ...(defaut.seuilsParAtelier ?? {}),
  };
  if (ateliersRaw) {
    for (const [k, v] of Object.entries(ateliersRaw)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) seuilsParAtelier[k] = n;
    }
  }
  return {
    actif,
    delaiJours:
      delai != null && Number.isFinite(delai) && delai >= 0
        ? Math.floor(delai)
        : defaut.delaiJours,
    seuilPercent:
      pctRaw != null && Number.isFinite(pctRaw) && pctRaw >= 0
        ? pctRaw
        : defaut.seuilPercent,
    seuilMontant:
      montantRaw != null && Number.isFinite(montantRaw) && montantRaw >= 0
        ? montantRaw
        : defaut.seuilMontant,
    seuilsParAtelier:
      Object.keys(seuilsParAtelier).length > 0 ? seuilsParAtelier : undefined,
  };
}

export function normaliserParametresAlertes(raw: unknown): ParametresAlertes {
  const src = asRecord(raw) ?? {};
  const out = { ...PARAMETRES_ALERTES_DEFAUT };
  for (const cle of CLES_REGLES) {
    out[cle] = fusionnerRegle(PARAMETRES_ALERTES_DEFAUT[cle], src[cle]);
  }
  return out;
}

export function suiviVide(): SuiviAlertesUser {
  return { lues: [], traitees: [] };
}

export function normaliserSuiviUser(raw: unknown): SuiviAlertesUser {
  const src = asRecord(raw);
  if (!src) return suiviVide();
  const lues = Array.isArray(src.lues)
    ? src.lues.filter((x): x is string => typeof x === "string")
    : [];
  const traitees = Array.isArray(src.traitees)
    ? src.traitees.filter((x): x is string => typeof x === "string")
    : [];
  return { lues: [...new Set(lues)], traitees: [...new Set(traitees)] };
}

export function fusionnerAlertesSuivi(
  current: unknown,
  incoming: unknown,
  userId: string,
): AlertesSuivi {
  const cur = asRecord(current) ?? {};
  const inc = asRecord(incoming) ?? {};
  return {
    ...(cur as AlertesSuivi),
    [userId]: normaliserSuiviUser(inc[userId] ?? cur[userId]),
  };
}

function factureEligible(f: Facture) {
  if (f.type === "avoir" || f.type === "proforma") return false;
  if (f.statut === "brouillon" || f.statut === "proforma" || f.statut === "annulee") {
    return false;
  }
  return factureEstFiscale(f);
}

function dernierMouvementPaiement(
  facture: Facture,
  acomptes: Acompte[],
  journal: JournalAudit[],
): string {
  const dates: string[] = [facture.date];
  if (facture.dateValidation) dates.push(facture.dateValidation);
  for (const a of acomptes) {
    if (a.statut === "annule") continue;
    if (a.factureId === facture.id || a.factureAcompteId === facture.id) {
      dates.push(a.date);
    }
  }
  for (const j of journal) {
    if (j.entiteId === facture.id && j.action === "facture_paiement") {
      dates.push(j.date);
    }
  }
  return dates.sort().at(-1) ?? facture.date;
}

function dateDerniereReception(achat: Achat): string {
  const dates = achat.livraisons
    .filter((l) => l.statut !== "annulee")
    .filter((l) => l.lignes.some((x) => x.quantiteLivree > 0))
    .map((l) => l.date);
  if (dates.length === 0) return achat.date;
  return dates.sort().at(-1) ?? achat.date;
}

export type LotStockRestant = {
  date: string;
  datePeremption?: string;
  reste: number;
};

/** Consomme les ventes (et retours) en FIFO sur les lots d'entrée positifs. */
export function lotsRestantsFifo(
  entrees: EntreeStock[],
  ventes: Vente[],
  produitId: string,
  pointDeVenteId: string,
): LotStockRestant[] {
  const lots = entrees
    .filter(
      (e) =>
        e.produitId === produitId &&
        e.pointDeVenteId === pointDeVenteId &&
        e.quantite > 0,
    )
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: e.date,
      datePeremption: e.datePeremption,
      reste: e.quantite,
    }));

  let consomme =
    ventes
      .filter(
        (v) => v.produitId === produitId && v.pointDeVenteId === pointDeVenteId,
      )
      .reduce((s, v) => s + v.quantite, 0) +
    entrees
      .filter(
        (e) =>
          e.produitId === produitId &&
          e.pointDeVenteId === pointDeVenteId &&
          e.quantite < 0,
      )
      .reduce((s, e) => s + Math.abs(e.quantite), 0);

  const restants: LotStockRestant[] = [];
  for (const lot of lots) {
    const pris = Math.min(lot.reste, Math.max(0, consomme));
    consomme -= pris;
    const reste = lot.reste - pris;
    if (reste > 1e-9) {
      restants.push({
        date: lot.date,
        datePeremption: lot.datePeremption,
        reste,
      });
    }
  }
  return restants;
}

export type ContexteAlertes = {
  parametresAlertes: ParametresAlertes;
  parametres: Parametres;
  achats: Achat[];
  factures: Facture[];
  acomptes: Acompte[];
  journalAudit: JournalAudit[];
  clients: { id: string; nom: string; plafondCredit?: number }[];
  fournisseurs: Fournisseur[];
  produits: Produit[];
  comptesComptables?: CompteComptable[];
  entrees: EntreeStock[];
  ventes: Vente[];
  pointsDeVente: PointDeVente[];
  inventaires: Inventaire[];
  ordresFabrication?: OrdreFabrication[];
  missionsAchat?: MissionAchat[];
  naturesDepenseMission?: NatureDepenseMission[];
  demandesPrix?: DemandePrix[];
  bonsATirer?: BonATirer[];
  commandes?: Commande[];
  transfertsStock?: TransfertStock[];
  aujourdHui?: string;
};

export function evaluerAlertes(ctx: ContexteAlertes): AlerteInstance[] {
  const cfg = normaliserParametresAlertes(ctx.parametresAlertes);
  const today = ctx.aujourdHui ?? jourISO();
  const out: AlerteInstance[] = [];

  for (const achat of ctx.achats) {
    if (achat.statut !== "valide") continue;
    const frn =
      ctx.fournisseurs.find((f) => f.id === achat.fournisseurId)?.nom ??
      "Fournisseur";
    const solde = soldeAchat(achat);
    const href = `/achats?id=${encodeURIComponent(achat.id)}`;

    if (solde > 0.5 && achat.echeance) {
      const echeance = jourISO(achat.echeance);
      const jours = joursEntre(today, echeance);
      if (jours < 0 && cfg.achatEcheanceDepassee.actif) {
        out.push({
          id: `achat_echeance_depassee:${achat.id}`,
          type: "achat_echeance_depassee",
          categorie: "achat",
          titre: `${achat.numero} — échéance dépassée`,
          message: `Solde ${Math.round(solde)} Ar dû à ${frn}, échéance le ${echeance} (J+${Math.abs(jours)}).`,
          date: echeance,
          href,
          gravite: "danger",
          entiteId: achat.id,
          pointDeVenteId: achat.pointDeVenteId,
        });
      } else if (
        cfg.achatEcheanceApproche.actif &&
        jours >= 0 &&
        jours <= delaiPositif(cfg.achatEcheanceApproche, 7)
      ) {
        out.push({
          id: `achat_echeance_approche:${achat.id}`,
          type: "achat_echeance_approche",
          categorie: "achat",
          titre: `${achat.numero} — échéance dans ${jours} j`,
          message: `Paiement fournisseur ${frn} à régler avant le ${echeance}.`,
          date: echeance,
          href,
          gravite: jours <= 2 ? "warning" : "info",
          entiteId: achat.id,
          pointDeVenteId: achat.pointDeVenteId,
        });
      }
    }

    if (
      cfg.achatLivraisonPartielle.actif &&
      statutLivraisonAchat(achat) === "partielle"
    ) {
      const depuis = dateDerniereReception(achat);
      const attente = joursEntre(jourISO(depuis), today);
      const delai = delaiPositif(cfg.achatLivraisonPartielle, 7);
      if (attente >= delai) {
        out.push({
          id: `achat_livraison_partielle:${achat.id}`,
          type: "achat_livraison_partielle",
          categorie: "achat",
          titre: `${achat.numero} — livraison partielle`,
          message: `Reliquat en attente depuis ${attente} jour${attente > 1 ? "s" : ""} (${frn}).`,
          date: depuis,
          href,
          gravite: "warning",
          entiteId: achat.id,
          pointDeVenteId: achat.pointDeVenteId,
        });
      }
    }
  }

  for (const facture of ctx.factures) {
    if (!factureEligible(facture)) continue;
    const reste = resteAPayer(
      facture,
      ctx.parametres,
      ctx.acomptes,
      ctx.factures,
    );
    if (reste <= 0.5) continue;
    const client =
      ctx.clients.find((c) => c.id === facture.clientId)?.nom ?? "Client";
    const href = `/factures/liste?facture=${encodeURIComponent(facture.id)}`;
    const echeance = jourISO(facture.echeance);
    const jours = joursEntre(today, echeance);
    const etat = etatPaiementFacture(
      facture,
      ctx.parametres,
      ctx.acomptes,
      ctx.factures,
    );

    if (jours < 0 && cfg.venteImpayee.actif) {
      const age = joursEntre(jourISO(facture.date), today);
      const bornes = normaliserTranchesBalanceAgee(
        ctx.parametres.tranchesBalanceAgeeJours,
      );
      const labels = labelsTranchesBalanceAgee(bornes);
      let idx = bornes.length;
      for (let i = 0; i < bornes.length; i++) {
        if (age <= bornes[i]) {
          idx = i;
          break;
        }
      }
      const tranche = labels[idx] ?? `Plus de ${bornes[bornes.length - 1]} j`;
      out.push({
        id: `vente_impayee:${facture.id}`,
        type: "vente_impayee",
        categorie: "vente",
        titre: `${facture.numero} — ${tranche}`,
        message: `Facture client en retard : ${client}, reste ${Math.round(reste)} Ar, échéance le ${echeance} (J+${Math.abs(jours)}, tranche ${tranche}).`,
        date: echeance,
        href,
        gravite: idx >= bornes.length - 1 ? "danger" : "warning",
        entiteId: facture.id,
        pointDeVenteId: facture.pointDeVenteId,
      });
    } else if (
      cfg.venteEcheanceApproche.actif &&
      jours >= 0 &&
      jours <= delaiPositif(cfg.venteEcheanceApproche, 7)
    ) {
      out.push({
        id: `vente_echeance_approche:${facture.id}`,
        type: "vente_echeance_approche",
        categorie: "vente",
        titre: `${facture.numero} — échéance dans ${jours} j`,
        message: `Paiement client ${client} attendu le ${echeance}.`,
        date: echeance,
        href,
        gravite: jours <= 2 ? "warning" : "info",
        entiteId: facture.id,
        pointDeVenteId: facture.pointDeVenteId,
      });
    }

    if (cfg.ventePartielleSansMouvement.actif && etat === "partiellement_payee") {
      const dernier = dernierMouvementPaiement(
        facture,
        ctx.acomptes,
        ctx.journalAudit,
      );
      const silence = joursEntre(jourISO(dernier), today);
      const delai = delaiPositif(cfg.ventePartielleSansMouvement, 14);
      if (silence >= delai) {
        out.push({
          id: `vente_partielle_sans_mouvement:${facture.id}`,
          type: "vente_partielle_sans_mouvement",
          categorie: "vente",
          titre: `${facture.numero} — sans encaissement`,
          message: `${client} : aucun mouvement depuis ${silence} jour${silence > 1 ? "s" : ""} (reste ${Math.round(reste)} Ar).`,
          date: dernier,
          href,
          gravite: "warning",
          entiteId: facture.id,
          pointDeVenteId: facture.pointDeVenteId,
        });
      }
    }
  }

  if (cfg.ventePlafondCredit.actif) {
    const seuil = percentPositif(cfg.ventePlafondCredit, 80);
    for (const client of ctx.clients) {
      const plafond = Math.max(0, client.plafondCredit ?? 0);
      if (plafond <= 0) continue;
      const solde = soldeClientTiers(client.id, {
        factures: ctx.factures,
        acomptes: ctx.acomptes,
        parametres: ctx.parametres,
      }).solde;
      if (solde <= 0.5) continue;
      const usage = (solde / plafond) * 100;
      if (usage + 1e-6 < seuil) continue;
      out.push({
        id: `vente_plafond_credit:${client.id}`,
        type: "vente_plafond_credit",
        categorie: "vente",
        titre: `${client.nom} — ${Math.round(usage)} % du plafond`,
        message: `Encours ${Math.round(solde)} Ar / plafond ${Math.round(plafond)} Ar. Le blocage automatique n'intervient qu'à 100 %.`,
        date: today,
        href: `/tiers/${encodeURIComponent(client.id)}`,
        gravite: usage >= 100 ? "danger" : "warning",
        entiteId: client.id,
      });
    }
  }

  if (
    cfg.stockReappro.actif ||
    cfg.stockRupture.actif ||
    cfg.stockSurstock.actif ||
    cfg.stockPeremption.actif
  ) {
    const stocks = calculerStocks(
      ctx.produits,
      ctx.entrees,
      ctx.ventes,
      "tous",
      ctx.pointsDeVente,
      undefined,
      ctx.inventaires,
    );

    for (const ligne of stocks) {
      const p = ligne.produit;
      const qty = ligne.quantiteRestante;
      const pdv =
        ctx.pointsDeVente.find((x) => x.id === ligne.pointDeVenteId)?.nom ??
        "Point de vente";
      const href = `/stocks?produit=${encodeURIComponent(p.id)}&pdv=${encodeURIComponent(ligne.pointDeVenteId)}`;
      const nom = libelleProduit(p);
      const unite = p.unite || "u";

      const seuilRupture =
        p.seuilRupture != null && Number.isFinite(p.seuilRupture)
          ? p.seuilRupture
          : undefined;
      const seuilReappro =
        p.seuilReappro != null && Number.isFinite(p.seuilReappro)
          ? p.seuilReappro
          : undefined;
      const seuilSurstock =
        p.seuilSurstock != null && Number.isFinite(p.seuilSurstock)
          ? p.seuilSurstock
          : undefined;

      const rupture =
        cfg.stockRupture.actif &&
        seuilRupture != null &&
        qty <= seuilRupture;
      if (rupture) {
        const effective = qty <= 0;
        out.push({
          id: `stock_rupture:${p.id}:${ligne.pointDeVenteId}`,
          type: "stock_rupture",
          categorie: "stock",
          titre: effective
            ? `${p.code} — rupture`
            : `${p.code} — rupture imminente`,
          message: `${nom} · ${pdv} : ${qty} ${unite} (seuil ${seuilRupture}).`,
          date: today,
          href,
          gravite: effective ? "danger" : "warning",
          entiteId: p.id,
          pointDeVenteId: ligne.pointDeVenteId,
          quantiteSuggeree: Math.max(1, Math.ceil((seuilRupture ?? 1) - qty)),
        });
      } else if (
        cfg.stockReappro.actif &&
        seuilReappro != null &&
        qty <= seuilReappro
      ) {
        out.push({
          id: `stock_reappro:${p.id}:${ligne.pointDeVenteId}`,
          type: "stock_reappro",
          categorie: "stock",
          titre: `${p.code} — réapprovisionnement`,
          message: `${nom} · ${pdv} : ${qty} ${unite} (seuil ${seuilReappro}).`,
          date: today,
          href,
          gravite: "warning",
          entiteId: p.id,
          pointDeVenteId: ligne.pointDeVenteId,
          quantiteSuggeree: Math.max(1, Math.ceil((seuilReappro ?? 1) - qty)),
        });
      }

      if (cfg.stockSurstock.actif && seuilSurstock != null && qty >= seuilSurstock) {
        out.push({
          id: `stock_surstock:${p.id}:${ligne.pointDeVenteId}`,
          type: "stock_surstock",
          categorie: "stock",
          titre: `${p.code} — surstock`,
          message: `${nom} · ${pdv} : ${qty} ${unite} (seuil ${seuilSurstock}).`,
          date: today,
          href,
          gravite: "info",
          entiteId: p.id,
          pointDeVenteId: ligne.pointDeVenteId,
        });
      }

      if (cfg.stockPeremption.actif && p.gerePeremption) {
        const delai = delaiPositif(cfg.stockPeremption, 3);
        const limite = ajouterJours(today, delai);
        const lots = lotsRestantsFifo(
          ctx.entrees,
          ctx.ventes,
          p.id,
          ligne.pointDeVenteId,
        ).filter((l) => l.datePeremption && jourISO(l.datePeremption) <= limite);
        for (const lot of lots) {
          const dlc = jourISO(lot.datePeremption!);
          const j = joursEntre(today, dlc);
          out.push({
            id: `stock_peremption:${p.id}:${ligne.pointDeVenteId}:${dlc}`,
            type: "stock_peremption",
            categorie: "stock",
            titre:
              j < 0
                ? `${p.code} — périmé`
                : `${p.code} — péremption J-${j}`,
            message: `${nom} · ${pdv} : ${lot.reste} ${unite} (DLC ${dlc}).`,
            date: dlc,
            href,
            gravite: j < 0 ? "danger" : "warning",
            entiteId: p.id,
            pointDeVenteId: ligne.pointDeVenteId,
          });
        }
      }
    }
  }

  if (cfg.stockDormant.actif || cfg.stockCumpAnormal.actif) {
    const stocksTous = calculerStocks(
      ctx.produits,
      ctx.entrees,
      ctx.ventes,
      "tous",
      ctx.pointsDeVente,
      undefined,
      ctx.inventaires,
    );
    const delaiDormant = delaiPositif(cfg.stockDormant, 90);
    const seuilCump = percentPositif(cfg.stockCumpAnormal, 20);

    for (const ligne of stocksTous) {
      const p = ligne.produit;
      const nature = natureStockDuProduit(p);
      const pdv =
        ctx.pointsDeVente.find((x) => x.id === ligne.pointDeVenteId)?.nom ??
        "Site";
      const nom = libelleProduit(p);

      if (
        cfg.stockDormant.actif &&
        ligne.quantiteRestante > 1e-9 &&
        (nature === "semi_fini" || nature === "fini")
      ) {
        const sorties: string[] = [];
        const entreesDates: string[] = [];
        for (const v of ctx.ventes) {
          if (v.produitId === p.id && v.pointDeVenteId === ligne.pointDeVenteId) {
            sorties.push(v.date);
          }
        }
        for (const e of ctx.entrees) {
          if (e.produitId !== p.id || e.pointDeVenteId !== ligne.pointDeVenteId) {
            continue;
          }
          if (e.origine === "transfert_sortie") sorties.push(e.date);
          else entreesDates.push(e.date);
        }
        const dernierSortie = sorties.sort().at(-1);
        const premierIn = entreesDates.sort().at(0);
        const depuis = jourISO(dernierSortie ?? premierIn ?? today);
        const silence = joursEntre(depuis, today);
        if (silence >= delaiDormant) {
          out.push({
            id: `stock_dormant:${p.id}:${ligne.pointDeVenteId}`,
            type: "stock_dormant",
            categorie: "stock",
            titre: `${p.code} — stock dormant`,
            message: `${nom} · ${pdv} : ${ligne.quantiteRestante} ${p.unite || "u"} sans vente ni transfert depuis ${silence} j.`,
            date: depuis,
            href: `/stocks?produit=${encodeURIComponent(p.id)}&pdv=${encodeURIComponent(ligne.pointDeVenteId)}`,
            gravite: "warning",
            entiteId: p.id,
            pointDeVenteId: ligne.pointDeVenteId,
          });
        }
      }

      if (cfg.stockCumpAnormal.actif && ligne.quantiteRestante >= 0) {
        let dernierChoc:
          | { date: string; pct: number; avant: number; apres: number }
          | undefined;
        parcourirCump(
          evenementsCumpProduit({
            produitId: p.id,
            pointDeVenteId: ligne.pointDeVenteId,
            entrees: ctx.entrees,
            ventes: ctx.ventes,
            inventaires: ctx.inventaires,
          }),
          prixAchatCatalogue(p),
          ({ etatAvant, etatApres, event }) => {
            if (event.kind !== "entree" || event.quantite <= 0) return;
            if (etatAvant.quantite <= 1e-9 || etatAvant.cump <= 1e-9) return;
            const pct =
              (Math.abs(etatApres.cump - etatAvant.cump) / etatAvant.cump) * 100;
            if (pct + 1e-6 >= seuilCump) {
              dernierChoc = {
                date: event.date,
                pct,
                avant: etatAvant.cump,
                apres: etatApres.cump,
              };
            }
          },
        );
        if (dernierChoc) {
          out.push({
            id: `stock_cump_anormal:${p.id}:${ligne.pointDeVenteId}`,
            type: "stock_cump_anormal",
            categorie: "stock",
            titre: `${p.code} — CUMP ${dernierChoc.pct.toFixed(0)} %`,
            message: `${nom} · ${pdv} : CUMP passé de ${Math.round(dernierChoc.avant)} à ${Math.round(dernierChoc.apres)} Ar à l'entrée du ${jourISO(dernierChoc.date)} (seuil ${seuilCump} %).`,
            date: jourISO(dernierChoc.date),
            href: `/stocks?produit=${encodeURIComponent(p.id)}&pdv=${encodeURIComponent(ligne.pointDeVenteId)}`,
            gravite: dernierChoc.pct >= seuilCump * 2 ? "danger" : "warning",
            entiteId: p.id,
            pointDeVenteId: ligne.pointDeVenteId,
          });
        }
      }
    }
  }

  const ofs = ctx.ordresFabrication ?? [];
  const ofsOuverts = ofs.filter(
    (o) => o.statut === "en_cours" || o.statut === "brouillon",
  );

  if (cfg.productionOfRetard.actif) {
    const grace = delaiPositif(cfg.productionOfRetard, 0);
    for (const of_ of ofsOuverts) {
      if (!of_.dateCloturePrevue) continue;
      const prevue = jourISO(of_.dateCloturePrevue);
      const retard = joursEntre(prevue, today);
      if (retard < grace) continue;
      if (retard < 0) continue;
      out.push({
        id: `of_retard:${of_.id}`,
        type: "of_retard",
        categorie: "production",
        titre: `${of_.numero} — en retard`,
        message: `Date de clôture prévue ${prevue} dépassée de ${retard} j, OF toujours ouvert.`,
        date: prevue,
        href: `/fabrication/${of_.id}`,
        gravite: retard >= grace + 7 ? "danger" : "warning",
        entiteId: of_.id,
        pointDeVenteId: of_.atelierId,
      });
    }
  }

  if (cfg.productionEcartFabrication.actif) {
    const fallback = percentPositif(cfg.productionEcartFabrication, 10);
    for (const of_ of ofs.filter(
      (o) => o.statut === "en_cours" || o.statut === "cloture",
    )) {
      const seuil = seuilAtelier(
        cfg.productionEcartFabrication,
        of_.atelierId,
        fallback,
      );
      let sorti = 0;
      let perte = 0;
      const retours = of_.retoursMatieres ?? [];
      for (const s of of_.sorties) sorti += s.quantite;
      for (const r of reliquatsMatieres(of_)) {
        const rendu = retours
          .filter((x) => x.composantId === r.composantId)
          .reduce((acc, x) => acc + x.quantite, 0);
        perte += Math.max(0, r.reliquat - rendu);
      }
      if (sorti <= 1e-9) continue;
      const pct = (perte / sorti) * 100;
      if (pct + 1e-6 < seuil) continue;
      const atelier =
        ctx.pointsDeVente.find((s) => s.id === of_.atelierId)?.nom ?? "Atelier";
      out.push({
        id: `of_ecart_matiere:${of_.id}`,
        type: "of_ecart_matiere",
        categorie: "production",
        titre: `${of_.numero} — perte ${pct.toFixed(0)} %`,
        message: `Perte matière ${pct.toFixed(1)} % sur ${atelier} (reliquat non retourné / sorties). Seuil ${seuil} %.`,
        date: jourISO(of_.dateClotureReelle ?? of_.dateCreation),
        href: `/fabrication/${of_.id}`,
        gravite: pct >= seuil * 2 ? "danger" : "warning",
        entiteId: of_.id,
        pointDeVenteId: of_.atelierId,
      });
    }
  }

  if (cfg.productionRuptureComposant.actif) {
    for (const of_ of ofsOuverts.filter((o) => o.statut === "en_cours")) {
      for (const ligne of of_.nomenclatureLignes) {
        const besoin = quantiteTheoriqueComposantOf(of_, ligne.composantId);
        const sorti = quantiteSortieComposant(of_, ligne.composantId);
        const restant = Math.max(0, besoin - sorti);
        if (restant <= 1e-9) continue;
        const stock = stockDisponibleComposant({
          produitId: ligne.composantId,
          siteId: of_.atelierId,
          entrees: ctx.entrees,
          ventes: ctx.ventes,
          inventaires: ctx.inventaires,
          exclureOfId: of_.id,
        });
        if (stock + 1e-9 >= restant) continue;
        const p = ctx.produits.find((x) => x.id === ligne.composantId);
        out.push({
          id: `of_rupture_composant:${of_.id}:${ligne.composantId}`,
          type: "of_rupture_composant",
          categorie: "production",
          titre: `${of_.numero} — composant manquant`,
          message: `${p ? libelleProduit(p) : ligne.composantId} : encore ${restant} à sortir, stock atelier ${stock}. Une demande d'achat peut déjà avoir été créée.`,
          date: today,
          href: `/fabrication/${of_.id}`,
          gravite: stock <= 0 ? "danger" : "warning",
          entiteId: of_.id,
          pointDeVenteId: of_.atelierId,
        });
      }
    }
  }

  if (cfg.productionSurchargeAtelier.actif) {
    const ateliers = ctx.pointsDeVente.filter(
      (s) => s.actif && siteEstAtelier(s),
    );
    for (const atelier of ateliers) {
      const capa = Math.max(0, atelier.capaciteOfSimultanes ?? 0);
      if (capa <= 0) continue;
      const n = ofsOuverts.filter((o) => o.atelierId === atelier.id).length;
      if (n <= capa) continue;
      out.push({
        id: `atelier_surcharge:${atelier.id}`,
        type: "atelier_surcharge",
        categorie: "production",
        titre: `${atelier.nom} — surcharge`,
        message: `${n} OF ouverts pour une capacité de ${capa} OF simultanés.`,
        date: today,
        href: `/fabrication`,
        gravite: n >= capa * 2 ? "danger" : "warning",
        entiteId: atelier.id,
        pointDeVenteId: atelier.id,
      });
    }
  }

  const missions = ctx.missionsAchat ?? [];
  if (cfg.achatMissionAvance.actif) {
    const delai = delaiPositif(cfg.achatMissionAvance, 7);
    for (const m of missions) {
      if (
        m.statut === "cloture" ||
        m.statut === "cloture_annule" ||
        m.statut === "annule" ||
        m.statut === "rejetee"
      ) {
        continue;
      }
      if (m.statutReglement === "regle") continue;
      if (fondsValidesMission(m) <= 0.5 && fondsRemisMission(m) <= 0.5) continue;
      const remises = (m.mouvementsFonds ?? []).filter((x) => x.type === "remise");
      const ref =
        remises.map((x) => x.date).sort().at(-1) ??
        m.date ??
        today;
      const attente = joursEntre(jourISO(ref), today);
      if (attente < delai) continue;
      out.push({
        id: `mission_avance_non_rapprochee:${m.id}`,
        type: "mission_avance_non_rapprochee",
        categorie: "achat",
        titre: `${m.numero} — avance non rapprochée`,
        message: `Fonds remis / validés sans clôture ni rapprochement depuis ${attente} j.`,
        date: jourISO(ref),
        href: `/missions/${m.id}`,
        gravite: attente >= delai * 2 ? "danger" : "warning",
        entiteId: m.id,
        pointDeVenteId: m.siteDestinataireId,
      });
    }
  }

  if (cfg.achatCompte471.actif) {
    const delai = delaiPositif(cfg.achatCompte471, 7);
    const natures = ctx.naturesDepenseMission ?? [];
    for (const m of missions) {
      for (const d of m.depensesDiverses) {
        if (!(d.montant > 0)) continue;
        if (!depenseEnAttenteReclassement(d, natures)) continue;
        const depuis = jourISO(d.date ?? m.dateCloture ?? m.date);
        const attente = joursEntre(depuis, today);
        if (attente < delai) continue;
        out.push({
          id: `mission_471_non_reclasse:${m.id}:${d.id}`,
          type: "mission_471_non_reclasse",
          categorie: "achat",
          titre: `${m.numero} — 471 depuis ${attente} j`,
          message: `Dépense « ${d.nature} » de ${Math.round(d.montant)} Ar imputée au compte d'attente, non reclassée.`,
          date: depuis,
          href: `/comptabilite/reclassement`,
          gravite: attente >= delai * 2 ? "danger" : "warning",
          entiteId: m.id,
        });
      }
    }
  }

  if (cfg.achatDpSansReponse.actif) {
    const delai = delaiPositif(cfg.achatDpSansReponse, 7);
    for (const dp of ctx.demandesPrix ?? []) {
      if (dp.statut === "annulee" || dp.statut === "cloturee" || dp.statut === "cloturee_sans_suite") continue;
      const offresOk = dp.offres.some((o) => o.prixUnitaire > 0);
      if (offresOk) continue;
      const attente = joursEntre(jourISO(dp.date), today);
      if (attente < delai) continue;
      out.push({
        id: `dp_sans_reponse:${dp.id}`,
        type: "dp_sans_reponse",
        categorie: "achat",
        titre: `${dp.numero} — sans réponse`,
        message: `Aucune offre de prix depuis ${attente} j (seuil ${delai} j).`,
        date: jourISO(dp.date),
        href: `/demandes-prix/${dp.id}`,
        gravite: "warning",
        entiteId: dp.id,
      });
    }
  }

  if (moduleComptabiliteActif(ctx.parametres)) {
    const aMigrer = produitsAMigrerComptes(
      ctx.produits,
      ctx.comptesComptables ?? [],
    );
    for (const p of aMigrer) {
      out.push({
        id: `produit_compte_generique:${p.id}`,
        type: "produit_compte_generique",
        categorie: "stock",
        titre: `${p.code} — compte comptable manquant`,
        message: `${libelleProduit(p)} n'a pas de compte de charge et/ou de vente associé.`,
        date: today,
        href: `/comptabilite/produits-sans-compte`,
        gravite: "warning",
        entiteId: p.id,
      });
    }
  }

  if (cfg.batRelance.actif) {
    const delai = delaiPositif(cfg.batRelance, 7);
    const cmdParId = new Map((ctx.commandes ?? []).map((c) => [c.id, c]));
    const courants = new Map<string, BonATirer>();
    for (const b of ctx.bonsATirer ?? []) {
      const cid = cycleIdBat(b);
      const prev = courants.get(cid);
      if (!prev || b.version > prev.version) courants.set(cid, b);
    }
    for (const bat of courants.values()) {
      if (!batEnRetardRelance(bat, delai, new Date(`${today}T12:00:00`))) continue;
      const cmd = cmdParId.get(bat.commandeId);
      const attente = joursEntre(jourISO(bat.dateEnvoi), today);
      out.push({
        id: `bat_relance:${cycleIdBat(bat)}`,
        type: "bat_relance",
        categorie: "vente",
        titre: `${cmd?.numero ?? "Commande"} — BAT V${bat.version} à relancer`,
        message: `En attente de validation depuis ${attente} j (seuil ${delai} j). Relance client nécessaire.`,
        date: jourISO(bat.dateEnvoi),
        href: `/commandes/bat`,
        gravite: attente >= delai * 2 ? "danger" : "warning",
        entiteId: bat.id,
        pointDeVenteId: cmd?.pointDeVenteId,
      });
    }
  }

  if (cfg.missionOuverte.actif) {
    for (const m of missions) {
      const etat = etatDelaiMission(m, cfg, today);
      if (!etat?.enRetard) continue;
      out.push({
        id: `mission_ouverte:${m.id}`,
        type: "mission_ouverte",
        categorie: "achat",
        titre: `${m.numero} — ouverte sans clôture`,
        message: `Aucune clôture ni justificatif depuis ${etat.joursAttente} j (seuil ${etat.delaiJours} j).`,
        date: etat.dateDerniereAction,
        href: `/missions/${m.id}`,
        gravite: etat.joursAttente >= etat.delaiJours * 2 ? "danger" : "warning",
        entiteId: m.id,
        pointDeVenteId: m.siteDestinataireId,
      });
    }
  }

  if (cfg.missionEcartAcheteur.actif) {
    const seuilPct = percentPositif(cfg.missionEcartAcheteur, 10);
    const seuilMontant = Number(cfg.missionEcartAcheteur.seuilMontant);
    const montantActif = Number.isFinite(seuilMontant) && seuilMontant > 0;
    for (const row of ecartsMoyensParAcheteur(missions)) {
      const depassePct =
        row.ecartMoyenPercent != null &&
        Math.abs(row.ecartMoyenPercent) >= seuilPct;
      const depasseMontant =
        montantActif && Math.abs(row.ecartMoyenMontant) >= seuilMontant;
      if (!depassePct && !depasseMontant) continue;
      out.push({
        id: `mission_ecart_acheteur:${row.acheteurUserId}`,
        type: "mission_ecart_acheteur",
        categorie: "achat",
        titre: `${row.acheteurNom} — écart moyen hors seuil`,
        message: `Écart moyen ${Math.round(row.ecartMoyenMontant)} Ar (${row.ecartMoyenPercent == null ? "—" : `${row.ecartMoyenPercent.toFixed(1)} %`}) sur ${row.nbMissions} mission(s).`,
        date: today,
        href: "/missions/suivi",
        gravite: "warning",
        entiteId: row.acheteurUserId,
      });
    }
  }

  if (cfg.dpFournisseurAtypique.actif) {
    for (const dp of ctx.demandesPrix ?? []) {
      if (
        dp.statut === "annulee" ||
        dp.statut === "brouillon" ||
        dp.statut === "cloturee_sans_suite"
      ) {
        continue;
      }
      const anomalies = anomaliesFournisseurRetenu(dp, ctx.achats);
      if (anomalies.length === 0) continue;
      out.push({
        id: `dp_fournisseur_atypique:${dp.id}`,
        type: "dp_fournisseur_atypique",
        categorie: "achat",
        titre: `${dp.numero} — fournisseur retenu atypique`,
        message: `${anomalies.length} ligne(s) : le retenu n'est ni le moins cher du comparatif ni conforme au dernier prix connu.`,
        date: jourISO(dp.date),
        href: `/demandes-prix/${dp.id}`,
        gravite: "warning",
        entiteId: dp.id,
      });
    }
  }

  if (cfg.transfertEnAttente.actif) {
    for (const t of ctx.transfertsStock ?? []) {
      const etat = etatDelaiTransfert(t, cfg, today);
      if (!etat?.enRetard) continue;
      out.push({
        id: `transfert_en_attente:${t.id}`,
        type: "transfert_en_attente",
        categorie: "stock",
        titre: `${t.numero} — transfert en attente`,
        message: `Validation en attente depuis ${etat.joursAttente} j (seuil ${etat.delaiJours} j).`,
        date: etat.dateDerniereAction,
        href: "/transferts",
        gravite: etat.joursAttente >= etat.delaiJours * 2 ? "danger" : "warning",
        entiteId: t.id,
        pointDeVenteId: t.siteSourceId,
      });
    }
  }

  if (cfg.ofNonCloture.actif) {
    for (const of_ of ofs) {
      const etat = etatDelaiOf(of_, cfg, today);
      if (!etat?.enRetard) continue;
      out.push({
        id: `of_non_cloture:${of_.id}`,
        type: "of_non_cloture",
        categorie: "production",
        titre: `${of_.numero} — non clôturé`,
        message: `Aucune clôture depuis ${etat.joursAttente} j (seuil ${etat.delaiJours} j, dernière action).`,
        date: etat.dateDerniereAction,
        href: `/fabrication/${of_.id}`,
        gravite: etat.joursAttente >= etat.delaiJours * 2 ? "danger" : "warning",
        entiteId: of_.id,
        pointDeVenteId: of_.atelierId,
      });
    }
  }

  return out.sort((a, b) => {
    const g = { danger: 0, warning: 1, info: 2 };
    if (g[a.gravite] !== g[b.gravite]) return g[a.gravite] - g[b.gravite];
    return a.date.localeCompare(b.date);
  });
}

export function alerteVisiblePourUtilisateur(
  alerte: AlerteInstance,
  hasPermission: (p: Permission) => boolean,
): boolean {
  if (alerte.type === "bat_relance") {
    return hasPermission("commercial.lire") || hasPermission("factures.lire");
  }
  if (alerte.categorie === "vente") return hasPermission("factures.lire");
  if (alerte.categorie === "stock") return hasPermission("produits.lire");
  if (alerte.categorie === "production") return hasPermission("produits.lire");
  if (alerte.categorie === "achat") return true;
  return true;
}

export function filtrerAlertesPdv(
  alertes: AlerteInstance[],
  pointDeVenteActifId: string | "tous",
) {
  if (pointDeVenteActifId === "tous") return alertes;
  return alertes.filter(
    (a) => !a.pointDeVenteId || a.pointDeVenteId === pointDeVenteActifId,
  );
}

export type ExplicationAlerte = {
  signification: string;
  calcul: string;
  seuil: string;
  hrefParametre: string;
};

export function hrefParametreAlerte(categorie: CategorieAlerte) {
  return (
    MODULES_ALERTES.find((m) => m.id === categorie)?.hrefParametres ??
    "/parametres/pilotage?onglet=alertes"
  );
}

export function explicationAlerte(
  type: TypeAlerte,
  cfg: ParametresAlertes,
  parametres: Parametres,
): ExplicationAlerte {
  const n = normaliserParametresAlertes(cfg);
  const href = (cat: CategorieAlerte) => hrefParametreAlerte(cat);
  switch (type) {
    case "stock_rupture":
      return {
        signification:
          "Le stock d'un article est tombé au niveau (ou en dessous) du seuil de rupture saisi sur sa fiche.",
        calcul:
          "Quantité restante par site, comparée au seuil de rupture individuel du produit. 0 = rupture à zéro.",
        seuil: "Seuil actuel : fiche produit (individuel)",
        hrefParametre: "/parametres/produits",
      };
    case "stock_reappro":
      return {
        signification:
          "Le stock atteint le seuil de réapprovisionnement de la fiche article, avant la rupture.",
        calcul: "Quantité restante ≤ seuil de réappro du produit, si renseigné.",
        seuil: "Seuil actuel : fiche produit (individuel)",
        hrefParametre: "/parametres/produits",
      };
    case "stock_surstock":
      return {
        signification:
          "Le stock dépasse le niveau de surstock défini sur la fiche article.",
        calcul: "Quantité restante ≥ seuil de surstock du produit, si renseigné.",
        seuil: "Seuil actuel : fiche produit (individuel)",
        hrefParametre: "/parametres/produits",
      };
    case "stock_peremption":
      return {
        signification:
          "Un lot encore en stock arrive à sa date limite de consommation.",
        calcul: `Lots FIFO restants dont la DLC est dans ${delaiPositif(n.stockPeremption, 3)} jour(s) ou déjà dépassée.`,
        seuil: `Seuil actuel : ${delaiPositif(n.stockPeremption, 3)} jours avant DLC`,
        hrefParametre: href("stock"),
      };
    case "stock_dormant":
      return {
        signification:
          "Un semi-fini ou un fini reste en stock sans avoir été vendu ni transféré depuis trop longtemps — capital immobilisé.",
        calcul:
          "Dernière vente ou sortie de transfert ; à défaut, date de première entrée. Comparé au seuil en jours.",
        seuil: `Seuil actuel : ${delaiPositif(n.stockDormant, 90)} jours`,
        hrefParametre: href("stock"),
      };
    case "stock_cump_anormal":
      return {
        signification:
          "Une entrée a fait varier le coût unitaire moyen pondéré au-delà du pourcentage autorisé — possible erreur de prix.",
        calcul:
          "Pour chaque entrée, |CUMP après − CUMP avant| / CUMP avant. Première entrée d'un article exclue.",
        seuil: `Seuil actuel : ${percentPositif(n.stockCumpAnormal, 20)} %`,
        hrefParametre: href("stock"),
      };
    case "produit_compte_generique":
      return {
        signification:
          "La fiche article n'a pas de compte de charge et/ou de vente, ce qui empêche une imputation comptable fiable.",
        calcul: "Articles à migrer (comptes manquants) lorsque le module Comptabilité est actif.",
        seuil: "Aucun seuil — présence des comptes sur la fiche",
        hrefParametre: "/parametres/produits",
      };
    case "of_retard":
      return {
        signification:
          "Un ordre de fabrication ouvert a dépassé sa date de clôture prévue.",
        calcul: `Aujourd'hui − date de clôture prévue ≥ ${delaiPositif(n.productionOfRetard, 0)} j, OF en cours ou brouillon.`,
        seuil: `Seuil actuel : ${delaiPositif(n.productionOfRetard, 0)} jour(s) après la date prévue`,
        hrefParametre: href("production"),
      };
    case "of_ecart_matiere":
      return {
        signification:
          "La perte matière d'un OF (reliquat non retourné) dépasse le pourcentage toléré.",
        calcul:
          "Perte = reliquat − retours, rapportée aux quantités sorties. Seuil global, surchargeable par atelier.",
        seuil: `Seuil actuel : ${percentPositif(n.productionEcartFabrication, 10)} % (global, ou propre à l'atelier)`,
        hrefParametre: href("production"),
      };
    case "of_rupture_composant":
      return {
        signification:
          "Un OF en cours n'a plus assez de composant sur l'atelier pour finir la nomenclature prévue — en plus de la demande d'achat éventuelle.",
        calcul:
          "Besoin restant (nomenclature × qté prévue − déjà sorti) > stock atelier du composant.",
        seuil: "Aucun seuil chiffré — déclenché dès que le stock atelier est insuffisant",
        hrefParametre: href("production"),
      };
    case "atelier_surcharge":
      return {
        signification:
          "L'atelier a plus d'OF ouverts que sa capacité déclarée (nombre d'OF simultanés).",
        calcul:
          "Nombre d'OF brouillon ou en cours de l'atelier, comparé à la capacité saisie sur la fiche atelier.",
        seuil: "Seuil actuel : capacité de chaque atelier (fiche site / Paramètres Production)",
        hrefParametre: href("production"),
      };
    case "achat_echeance_approche":
      return {
        signification:
          "Une facture fournisseur approche de sa date d'échéance, avec un solde encore dû.",
        calcul: `Jours restants jusqu'à l'échéance ≤ ${delaiPositif(n.achatEcheanceApproche, 7)}, achat validé non soldé.`,
        seuil: `Seuil actuel : ${delaiPositif(n.achatEcheanceApproche, 7)} jours avant échéance`,
        hrefParametre: href("achat"),
      };
    case "achat_echeance_depassee":
      return {
        signification:
          "L'échéance de paiement fournisseur est dépassée et un solde reste dû.",
        calcul: "Achat validé, solde > 0, date d'échéance < aujourd'hui.",
        seuil: "Aucun délai supplémentaire — dès le lendemain de l'échéance",
        hrefParametre: href("achat"),
      };
    case "achat_livraison_partielle":
      return {
        signification:
          "Une commande fournisseur n'est livrée que partiellement depuis trop longtemps.",
        calcul: `Statut livraison = partielle, et ${delaiPositif(n.achatLivraisonPartielle, 7)} j depuis la dernière réception.`,
        seuil: `Seuil actuel : ${delaiPositif(n.achatLivraisonPartielle, 7)} jours d'attente`,
        hrefParametre: href("achat"),
      };
    case "mission_avance_non_rapprochee":
      return {
        signification:
          "Une avance de caisse de mission d'achat n'a pas été clôturée ni rapprochée dans le délai.",
        calcul: `Mission non clôturée, fonds validés/remis, règlement non soldé, depuis la dernière remise.`,
        seuil: `Seuil actuel : ${delaiPositif(n.achatMissionAvance, 7)} jours`,
        hrefParametre: href("achat"),
      };
    case "mission_471_non_reclasse":
      return {
        signification:
          "Une dépense diverse de mission (nature libre ou sans compte) est toujours imputée au compte d'attente 471.",
        calcul: "Dépense en attente de reclassement, âge depuis sa date (ou clôture de mission).",
        seuil: `Seuil actuel : ${delaiPositif(n.achatCompte471, 7)} jours`,
        hrefParametre: href("achat"),
      };
    case "dp_sans_reponse":
      return {
        signification:
          "Une demande de prix n'a reçu aucune offre de fournisseur dans le délai attendu.",
        calcul: `DP non clôturée / non annulée, aucune offre à prix > 0, âge depuis la date de la DP.`,
        seuil: `Seuil actuel : ${delaiPositif(n.achatDpSansReponse, 7)} jours`,
        hrefParametre: href("achat"),
      };
    case "vente_echeance_approche":
      return {
        signification:
          "Une facture client approche de son échéance, avec un reste à payer.",
        calcul: `Jours restants ≤ ${delaiPositif(n.venteEcheanceApproche, 7)}, facture fiscale non soldée.`,
        seuil: `Seuil actuel : ${delaiPositif(n.venteEcheanceApproche, 7)} jours avant échéance`,
        hrefParametre: href("vente"),
      };
    case "vente_impayee": {
      const bornes = normaliserTranchesBalanceAgee(
        parametres.tranchesBalanceAgeeJours,
      );
      const labels = labelsTranchesBalanceAgee(bornes);
      return {
        signification:
          "Une facture client n'est pas soldée après l'échéance. Elle est classée dans la même grille que la balance âgée.",
        calcul: `Reste à payer > 0 et échéance dépassée. Tranche selon l'âge de la facture (${labels.join(" / ")}).`,
        seuil: `Tranches actuelles : ${labels.join(" · ")}`,
        hrefParametre: href("vente"),
      };
    }
    case "vente_partielle_sans_mouvement":
      return {
        signification:
          "Un acompte a été encaissé, mais aucun nouveau règlement n'est arrivé depuis trop longtemps.",
        calcul: `État = partiellement payée, silence depuis le dernier encaissement ≥ ${delaiPositif(n.ventePartielleSansMouvement, 14)} j.`,
        seuil: `Seuil actuel : ${delaiPositif(n.ventePartielleSansMouvement, 14)} jours sans mouvement`,
        hrefParametre: href("vente"),
      };
    case "vente_plafond_credit":
      return {
        signification:
          "L'encours client approche du plafond de crédit, avant le blocage automatique à 100 %.",
        calcul: `Encours (factures − acomptes) / plafond ≥ ${percentPositif(n.ventePlafondCredit, 80)} %. Distinct du refus de vente à 100 %.`,
        seuil: `Seuil actuel : ${percentPositif(n.ventePlafondCredit, 80)} % du plafond`,
        hrefParametre: href("vente"),
      };
    case "bat_relance":
      return {
        signification:
          "Un Bon à Tirer est resté en attente de validation client au-delà du délai paramétré — une relance est nécessaire.",
        calcul: `Dernière version du cycle en statut « En attente », âge depuis la date d'envoi ≥ délai.`,
        seuil: `Seuil actuel : ${delaiPositif(n.batRelance, 7)} jours`,
        hrefParametre: "/parametres/bat",
      };
    case "mission_ouverte":
      return {
        signification:
          "Une mission d'achat est restée ouverte sans clôture ni justificatif au-delà du délai paramétré.",
        calcul:
          "Dernière action (création, validation ou mouvement de fonds) ; mission hors clôturée / annulée / rejetée, sans justificatif.",
        seuil: `Seuil actuel : ${delaiPositif(n.missionOuverte, 7)} jours`,
        hrefParametre: "/parametres/achats",
      };
    case "mission_ecart_acheteur":
      return {
        signification:
          "L'écart moyen glissant d'un acheteur (avance − réel) dépasse le seuil en montant ou en pourcentage.",
        calcul:
          "Moyenne des écarts des dernières missions clôturées avec avance, par acheteur.",
        seuil: `Seuil actuel : ${percentPositif(n.missionEcartAcheteur, 10)} %${
          n.missionEcartAcheteur.seuilMontant
            ? ` ou ${n.missionEcartAcheteur.seuilMontant} Ar`
            : ""
        }`,
        hrefParametre: "/parametres/achats",
      };
    case "dp_fournisseur_atypique":
      return {
        signification:
          "Le fournisseur retenu n'est ni le moins cher du comparatif, ni au dernier prix d'achat connu.",
        calcul:
          "Pour chaque ligne retenue : prix net ≠ mini du comparatif ET prix net ≠ dernier achat réel de l'article.",
        seuil: "Alerte combinée — les deux écarts en même temps",
        hrefParametre: href("achat"),
      };
    case "transfert_en_attente":
      return {
        signification:
          "Un transfert inter-sites attend encore une validation (demande ou réception) au-delà du délai.",
        calcul:
          "Statut demande : délai depuis la date de demande. Statut expédié : délai depuis l'expédition.",
        seuil: `Seuil actuel : ${delaiPositif(n.transfertEnAttente, 7)} jours`,
        hrefParametre: "/parametres/stock",
      };
    case "of_non_cloture":
      return {
        signification:
          "Un OF brouillon ou en cours n'a pas été clôturé depuis trop longtemps (inaction), indépendamment de la date de clôture prévue.",
        calcul:
          "Dernière action = dernière validation d'étape, sinon date de création. Distinct de l'alerte « OF en retard » (date prévue).",
        seuil: `Seuil actuel : ${delaiPositif(n.ofNonCloture, 7)} jours`,
        hrefParametre: "/parametres/fabrication",
      };
  }
}
