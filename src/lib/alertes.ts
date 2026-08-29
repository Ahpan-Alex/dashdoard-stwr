import { soldeAchat, statutLivraisonAchat } from "./achats";
import { calculerStocks } from "./calculations";
import { etatPaiementFacture, resteAPayer } from "./commercial";
import type { Permission } from "./auth/rbac";
import { factureEstFiscale } from "./facturation-mg";
import { libelleProduit } from "./produits";
import type {
  Achat,
  Acompte,
  EntreeStock,
  Facture,
  Fournisseur,
  Inventaire,
  JournalAudit,
  Parametres,
  PointDeVente,
  Produit,
  Vente,
} from "./types";

export type CategorieAlerte = "achat" | "vente" | "stock";

export type TypeAlerte =
  | "achat_echeance_approche"
  | "achat_echeance_depassee"
  | "achat_livraison_partielle"
  | "vente_echeance_approche"
  | "vente_impayee"
  | "vente_partielle_sans_mouvement"
  | "stock_reappro"
  | "stock_rupture"
  | "stock_surstock"
  | "stock_peremption";

export type GraviteAlerte = "info" | "warning" | "danger";

export type RegleAlerte = {
  actif: boolean;
  delaiJours?: number;
};

export type ParametresAlertes = {
  achatEcheanceApproche: RegleAlerte;
  achatEcheanceDepassee: RegleAlerte;
  achatLivraisonPartielle: RegleAlerte;
  venteEcheanceApproche: RegleAlerte;
  venteImpayee: RegleAlerte;
  ventePartielleSansMouvement: RegleAlerte;
  stockReappro: RegleAlerte;
  stockRupture: RegleAlerte;
  stockSurstock: RegleAlerte;
  stockPeremption: RegleAlerte;
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
  venteEcheanceApproche: { actif: true, delaiJours: 7 },
  venteImpayee: { actif: true },
  ventePartielleSansMouvement: { actif: true, delaiJours: 14 },
  stockReappro: { actif: true },
  stockRupture: { actif: true },
  stockSurstock: { actif: true },
  stockPeremption: { actif: true, delaiJours: 3 },
};

export const LABEL_CATEGORIE_ALERTE: Record<CategorieAlerte, string> = {
  achat: "Factures d'achat",
  vente: "Factures de vente",
  stock: "Stock",
};

export const LABEL_TYPE_ALERTE: Record<TypeAlerte, string> = {
  achat_echeance_approche: "Échéance fournisseur approchante",
  achat_echeance_depassee: "Facture d'achat en retard",
  achat_livraison_partielle: "Livraison partielle en attente",
  vente_echeance_approche: "Échéance client approchante",
  vente_impayee: "Facture de vente impayée",
  vente_partielle_sans_mouvement: "Paiement partiel sans mouvement",
  stock_reappro: "Seuil de réapprovisionnement",
  stock_rupture: "Rupture de stock",
  stock_surstock: "Surstockage",
  stock_peremption: "Péremption proche",
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

function fusionnerRegle(defaut: RegleAlerte, raw: unknown): RegleAlerte {
  const src = asRecord(raw);
  if (!src) return { ...defaut };
  const actif = src.actif === undefined ? defaut.actif : Boolean(src.actif);
  const delai =
    src.delaiJours === undefined
      ? defaut.delaiJours
      : Number(src.delaiJours);
  return {
    actif,
    delaiJours:
      delai != null && Number.isFinite(delai) && delai >= 0
        ? Math.floor(delai)
        : defaut.delaiJours,
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
  clients: { id: string; nom: string }[];
  fournisseurs: Fournisseur[];
  produits: Produit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  pointsDeVente: PointDeVente[];
  inventaires: Inventaire[];
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
      out.push({
        id: `vente_impayee:${facture.id}`,
        type: "vente_impayee",
        categorie: "vente",
        titre: `${facture.numero} — impayée`,
        message: `Relance à déclencher : ${client}, reste ${Math.round(reste)} Ar (J+${Math.abs(jours)}).`,
        date: echeance,
        href,
        gravite: "danger",
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
  if (alerte.categorie === "vente") return hasPermission("factures.lire");
  if (alerte.categorie === "stock") return hasPermission("produits.lire");
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
