import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format as formatDateFns,
  getISOWeek,
  getISOWeeksInYear,
  getISOWeekYear,
  isWithinInterval,
  parseISO,
  setISOWeek,
  setISOWeekYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { fr } from "date-fns/locale";
import { creancesClientsFactures, totalFacture } from "./commercial";
import {
  montantAchatsMarchandisesHT,
  totalPaiementsFournisseurs,
  dettesFournisseursAchats,
} from "./achats";
import {
  fluxTresorerieCompteCourant,
  soldeCompteCourant,
} from "./compte-courant";
import { libelleProduit, prixVenteCatalogue } from "./produits";
import { cumpStockRestant, etatCumpProduit, cmvSortiesPeriode, quantiteStockChronologique } from "./cump";
import type {
  Achat,
  BilanInitial,
  Charge,
  EntreeStock,
  Facture,
  Immobilisation,
  Inventaire,
  MouvementCompteCourant,
  PointDeVente,
  Produit,
  Vente,
} from "./types";

export type Periode = "semaine" | "mois" | "annee";

/** Fourchette de dates libre pour bilan / compte de résultat. */
export type DateRange = {
  debut: Date;
  fin: Date;
};

export function periodToRange(
  periode: Periode,
  reference = new Date(),
): DateRange {
  switch (periode) {
    case "semaine":
      return {
        debut: startOfWeek(reference, { weekStartsOn: 1 }),
        fin: endOfWeek(reference, { weekStartsOn: 1 }),
      };
    case "mois":
      return {
        debut: startOfMonth(reference),
        fin: endOfMonth(reference),
      };
    case "annee":
      return {
        debut: startOfYear(reference),
        fin: endOfYear(reference),
      };
  }
}

export function inDateRange(dateIso: string, range: DateRange) {
  const date = parseISO(dateIso);
  const start = startOfDay(range.debut);
  const end = endOfDay(range.fin);
  if (start > end) return false;
  return isWithinInterval(date, { start, end });
}

export function onOrBefore(dateIso: string, fin: Date) {
  return parseISO(dateIso) <= endOfDay(fin);
}

function inPeriod(dateIso: string, periode: Periode, reference = new Date()) {
  return inDateRange(dateIso, periodToRange(periode, reference));
}

function filterByPos<T extends { pointDeVenteId: string }>(
  items: T[],
  pointDeVenteId: string | "tous",
) {
  if (pointDeVenteId === "tous") return items;
  return items.filter(
    (item) =>
      item.pointDeVenteId === pointDeVenteId ||
      item.pointDeVenteId === "tous",
  );
}

export function montantVente(v: Vente) {
  return v.quantite * v.prixUnitaire;
}

export function montantAchat(e: EntreeStock) {
  return e.quantite * e.prixAchatUnitaire;
}

export function chiffreAffaires(
  ventes: Vente[],
  pointDeVenteId: string | "tous",
  periodeOrRange: Periode | DateRange,
  reference = new Date(),
) {
  const range =
    typeof periodeOrRange === "string"
      ? periodToRange(periodeOrRange, reference)
      : periodeOrRange;
  return filterByPos(ventes, pointDeVenteId)
    .filter((v) => inDateRange(v.date, range))
    .reduce((sum, v) => sum + montantVente(v), 0);
}

export function caPrecedent(
  ventes: Vente[],
  pointDeVenteId: string | "tous",
  periode: Periode,
) {
  const ref =
    periode === "semaine"
      ? subWeeks(new Date(), 1)
      : periode === "mois"
        ? subMonths(new Date(), 1)
        : subYears(new Date(), 1);
  return chiffreAffaires(ventes, pointDeVenteId, periode, ref);
}

/** Libellé lisible de la période courante (ex. « Semaine 30 · du 20 au 26 juil. 2026 »). */
export function labelPeriodeCourante(
  periode: Periode,
  reference = new Date(),
): { titre: string; detail: string; plage: string } {
  const range = periodToRange(periode, reference);
  const fmtCourt = (d: Date) =>
    formatDateFns(d, "d MMM", { locale: fr });
  const fmtLong = (d: Date) =>
    formatDateFns(d, "d MMMM yyyy", { locale: fr });

  if (periode === "semaine") {
    const n = getISOWeek(reference);
    const annee = getISOWeekYear(reference);
    return {
      titre: `Semaine ${n}`,
      detail: `${annee} · du ${fmtCourt(range.debut)} au ${fmtCourt(range.fin)}`,
      plage: `Du ${fmtLong(range.debut)} au ${fmtLong(range.fin)}`,
    };
  }
  if (periode === "mois") {
    return {
      titre: formatDateFns(reference, "MMMM yyyy", { locale: fr }),
      detail: `Du ${fmtCourt(range.debut)} au ${fmtCourt(range.fin)}`,
      plage: `Du ${fmtLong(range.debut)} au ${fmtLong(range.fin)}`,
    };
  }
  return {
    titre: formatDateFns(reference, "yyyy"),
    detail: `Du ${fmtCourt(range.debut)} au ${fmtCourt(range.fin)}`,
    plage: `Du ${fmtLong(range.debut)} au ${fmtLong(range.fin)}`,
  };
}

export type LigneComparaisonCA = {
  key: string;
  label: string;
  detail: string;
  montant: number;
  precedent: number | null;
  evolution: number | null;
  courant: boolean;
};

/**
 * Série de comparaison CA :
 * - semaine → semaines une par une (8 dernières)
 * - mois → mois par mois (12 derniers)
 * - année → 3 dernières années
 */
export function caSerieComparaison(
  ventes: Vente[],
  pointDeVenteId: string | "tous",
  periode: Periode,
  reference = new Date(),
): LigneComparaisonCA[] {
  const count = periode === "semaine" ? 8 : periode === "mois" ? 12 : 3;
  const refs: Date[] = [];

  for (let i = count - 1; i >= 0; i--) {
    if (periode === "semaine") refs.push(subWeeks(reference, i));
    else if (periode === "mois") refs.push(subMonths(reference, i));
    else refs.push(subYears(reference, i));
  }

  const lignes: LigneComparaisonCA[] = refs.map((ref, index) => {
    const range = periodToRange(periode, ref);
    const montant = chiffreAffaires(ventes, pointDeVenteId, range);
    const labels = labelPeriodeCourante(periode, ref);
    const key =
      periode === "semaine"
        ? `${getISOWeekYear(ref)}-W${getISOWeek(ref)}`
        : periode === "mois"
          ? formatDateFns(ref, "yyyy-MM")
          : formatDateFns(ref, "yyyy");

    return {
      key,
      label:
        periode === "semaine"
          ? labels.titre
          : periode === "mois"
            ? formatDateFns(ref, "MMM yyyy", { locale: fr })
            : labels.titre,
      detail:
        periode === "semaine"
          ? `du ${formatDateFns(range.debut, "d MMM", { locale: fr })} au ${formatDateFns(range.fin, "d MMM yyyy", { locale: fr })}`
          : periode === "mois"
            ? `du ${formatDateFns(range.debut, "d")} au ${formatDateFns(range.fin, "d MMM yyyy", { locale: fr })}`
            : labels.plage,
      montant,
      precedent: null,
      evolution: null,
      courant: index === refs.length - 1,
    };
  });

  for (let i = 0; i < lignes.length; i++) {
    if (i === 0) continue;
    const prev = lignes[i - 1].montant;
    lignes[i].precedent = prev;
    lignes[i].evolution =
      prev === 0 ? null : ((lignes[i].montant - prev) / prev) * 100;
  }

  return lignes;
}

export type LigneCaYoY = {
  key: string;
  label: string;
  caAnnee: number;
  caAnneePrec: number;
  ecart: number;
  pct: number | null;
  /** Plage de dates de la période (année N) pour le détail produits. */
  rangeAnnee: DateRange;
  rangeAnneePrec: DateRange;
};

export type RapportCaYoY = {
  annee: number;
  anneePrec: number;
  titrePeriodique: string;
  titreCumule: string;
  lignes: LigneCaYoY[];
  lignesCumulees: LigneCaYoY[];
  total: Omit<LigneCaYoY, "key" | "label" | "rangeAnnee" | "rangeAnneePrec">;
  moyenne: Omit<LigneCaYoY, "key" | "label" | "rangeAnnee" | "rangeAnneePrec">;
  totalCumule: Omit<LigneCaYoY, "key" | "label" | "rangeAnnee" | "rangeAnneePrec">;
  moyenneCumule: Omit<LigneCaYoY, "key" | "label" | "rangeAnnee" | "rangeAnneePrec">;
};

function ecartPct(caAnnee: number, caAnneePrec: number) {
  const ecart = caAnnee - caAnneePrec;
  const pct = caAnneePrec === 0 ? null : (ecart / caAnneePrec) * 100;
  return { ecart, pct };
}

function agregatsYoY(lignes: LigneCaYoY[]) {
  const n = lignes.length || 1;
  const caAnnee = lignes.reduce((s, l) => s + l.caAnnee, 0);
  const caAnneePrec = lignes.reduce((s, l) => s + l.caAnneePrec, 0);
  const { ecart, pct } = ecartPct(caAnnee, caAnneePrec);
  const moyAnnee = caAnnee / n;
  const moyPrec = caAnneePrec / n;
  const moy = ecartPct(moyAnnee, moyPrec);
  return {
    total: { caAnnee, caAnneePrec, ecart, pct },
    moyenne: {
      caAnnee: moyAnnee,
      caAnneePrec: moyPrec,
      ecart: moy.ecart,
      pct: moy.pct,
    },
  };
}

function avecCumul(lignes: LigneCaYoY[]) {
  let cumN = 0;
  let cumP = 0;
  const debutN = lignes[0]?.rangeAnnee.debut;
  const debutP = lignes[0]?.rangeAnneePrec.debut;
  return lignes.map((l) => {
    cumN += l.caAnnee;
    cumP += l.caAnneePrec;
    const { ecart, pct } = ecartPct(cumN, cumP);
    return {
      ...l,
      key: `c-${l.key}`,
      caAnnee: cumN,
      caAnneePrec: cumP,
      ecart,
      pct,
      rangeAnnee: {
        debut: debutN ?? l.rangeAnnee.debut,
        fin: l.rangeAnnee.fin,
      },
      rangeAnneePrec: {
        debut: debutP ?? l.rangeAnneePrec.debut,
        fin: l.rangeAnneePrec.fin,
      },
    };
  });
}

function construireRapportYoY(
  annee: number,
  lignes: LigneCaYoY[],
  titrePeriodique: string,
  titreCumule: string,
): RapportCaYoY {
  const lignesCumulees = avecCumul(lignes);
  const periodique = agregatsYoY(lignes);
  const cumule = agregatsYoY(lignesCumulees);
  return {
    annee,
    anneePrec: annee - 1,
    titrePeriodique,
    titreCumule,
    lignes,
    lignesCumulees,
    total: periodique.total,
    moyenne: periodique.moyenne,
    totalCumule: cumule.total,
    moyenneCumule: cumule.moyenne,
  };
}

/** CA mensuel Jan→Déc : année N vs N-1 (+ cumulé). */
export function caRapportMensuelYoY(
  ventes: Vente[],
  pointDeVenteId: string | "tous",
  annee = new Date().getFullYear(),
): RapportCaYoY {
  const lignes: LigneCaYoY[] = [];
  for (let month = 0; month < 12; month++) {
    const refN = new Date(annee, month, 15);
    const refP = new Date(annee - 1, month, 15);
    const rangeAnnee = periodToRange("mois", refN);
    const rangeAnneePrec = periodToRange("mois", refP);
    const caAnnee = chiffreAffaires(ventes, pointDeVenteId, rangeAnnee);
    const caAnneePrec = chiffreAffaires(ventes, pointDeVenteId, rangeAnneePrec);
    const { ecart, pct } = ecartPct(caAnnee, caAnneePrec);
    lignes.push({
      key: `m-${month}`,
      label: formatDateFns(refN, "MMMM", { locale: fr }),
      caAnnee,
      caAnneePrec,
      ecart,
      pct,
      rangeAnnee,
      rangeAnneePrec,
    });
  }
  return construireRapportYoY(annee, lignes, "CA mensuel", "CA cumulé");
}

/** CA hebdomadaire S1→Sn : année N vs N-1 (+ cumulé). */
export function caRapportHebdomadaireYoY(
  ventes: Vente[],
  pointDeVenteId: string | "tous",
  annee = new Date().getFullYear(),
): RapportCaYoY {
  const weeks = getISOWeeksInYear(new Date(annee, 5, 1));
  const lignes: LigneCaYoY[] = [];
  for (let week = 1; week <= weeks; week++) {
    const refN = setISOWeek(setISOWeekYear(new Date(), annee), week);
    const refP = setISOWeek(setISOWeekYear(new Date(), annee - 1), week);
    const rangeAnnee = periodToRange("semaine", refN);
    const rangeAnneePrec = periodToRange("semaine", refP);
    const caAnnee = chiffreAffaires(ventes, pointDeVenteId, rangeAnnee);
    const caAnneePrec = chiffreAffaires(ventes, pointDeVenteId, rangeAnneePrec);
    const { ecart, pct } = ecartPct(caAnnee, caAnneePrec);
    lignes.push({
      key: `w-${week}`,
      label: `Semaine ${week}`,
      caAnnee,
      caAnneePrec,
      ecart,
      pct,
      rangeAnnee,
      rangeAnneePrec,
    });
  }
  return construireRapportYoY(
    annee,
    lignes,
    "CA hebdomadaire",
    "CA cumulé",
  );
}

/** CA annuel sur 3 années (présentation type rapport, sans 2e année en colonnes). */
export type LigneCaAnnuel = {
  key: string;
  label: string;
  ca: number;
  caPrec: number;
  ecart: number;
  pct: number | null;
  courant: boolean;
};

export function caRapportAnnuel(
  ventes: Vente[],
  pointDeVenteId: string | "tous",
  annee = new Date().getFullYear(),
): { annees: number[]; lignes: LigneCaAnnuel[]; total: Omit<LigneCaAnnuel, "key" | "label" | "courant">; moyenne: Omit<LigneCaAnnuel, "key" | "label" | "courant"> } {
  const annees = [annee - 2, annee - 1, annee];
  const lignes: LigneCaAnnuel[] = annees.map((y, i) => {
    const ca = chiffreAffaires(
      ventes,
      pointDeVenteId,
      "annee",
      new Date(y, 6, 1),
    );
    const caPrec =
      i === 0
        ? chiffreAffaires(
            ventes,
            pointDeVenteId,
            "annee",
            new Date(y - 1, 6, 1),
          )
        : 0;
    return { key: `y-${y}`, label: String(y), ca, caPrec, ecart: 0, pct: null, courant: y === annee };
  });

  // Fill caPrec / ecart from previous row in series (and year before first)
  for (let i = 0; i < lignes.length; i++) {
    const caPrec =
      i === 0
        ? chiffreAffaires(
            ventes,
            pointDeVenteId,
            "annee",
            new Date(annees[0] - 1, 6, 1),
          )
        : lignes[i - 1].ca;
    const { ecart, pct } = ecartPct(lignes[i].ca, caPrec);
    lignes[i].caPrec = caPrec;
    lignes[i].ecart = ecart;
    lignes[i].pct = pct;
  }

  const n = lignes.length || 1;
  const ca = lignes.reduce((s, l) => s + l.ca, 0);
  const caPrec = lignes.reduce((s, l) => s + l.caPrec, 0);
  const tot = ecartPct(ca, caPrec);
  const moy = ecartPct(ca / n, caPrec / n);

  return {
    annees,
    lignes,
    total: { ca, caPrec, ecart: tot.ecart, pct: tot.pct },
    moyenne: {
      ca: ca / n,
      caPrec: caPrec / n,
      ecart: moy.ecart,
      pct: moy.pct,
    },
  };
}

/** CA trimestriel année N vs N-1 (+ cumulé) — vue annuelle type rapport. */
export function caRapportTrimestrielYoY(
  ventes: Vente[],
  pointDeVenteId: string | "tous",
  annee = new Date().getFullYear(),
): RapportCaYoY {
  const trimestres = [
    { label: "1er trimestre", months: [0, 1, 2] },
    { label: "2e trimestre", months: [3, 4, 5] },
    { label: "3e trimestre", months: [6, 7, 8] },
    { label: "4e trimestre", months: [9, 10, 11] },
  ];
  const lignes: LigneCaYoY[] = trimestres.map((t, i) => {
    const rangeAnnee: DateRange = {
      debut: startOfMonth(new Date(annee, t.months[0], 1)),
      fin: endOfMonth(new Date(annee, t.months[2], 1)),
    };
    const rangeAnneePrec: DateRange = {
      debut: startOfMonth(new Date(annee - 1, t.months[0], 1)),
      fin: endOfMonth(new Date(annee - 1, t.months[2], 1)),
    };
    const caAnnee = chiffreAffaires(ventes, pointDeVenteId, rangeAnnee);
    const caAnneePrec = chiffreAffaires(ventes, pointDeVenteId, rangeAnneePrec);
    const { ecart, pct } = ecartPct(caAnnee, caAnneePrec);
    return {
      key: `t-${i}`,
      label: t.label,
      caAnnee,
      caAnneePrec,
      ecart,
      pct,
      rangeAnnee,
      rangeAnneePrec,
    };
  });
  return construireRapportYoY(annee, lignes, "CA trimestriel", "CA cumulé");
}

export type LigneStock = {
  produit: Produit;
  pointDeVenteId: string;
  quantiteEntree: number;
  quantiteVendue: number;
  quantiteRestante: number;
  valeurAchat: number;
  valeurVente: number;
};

export function calculerStocks(
  produits: Produit[],
  entrees: EntreeStock[],
  ventes: Vente[],
  pointDeVenteId: string | "tous",
  pointsDeVente: PointDeVente[],
  /** Si fourni, ne prend que les mouvements jusqu'à cette date (arrêté). */
  dateArrete?: Date,
  inventaires: Inventaire[] = [],
  exclureInventaireId?: string,
): LigneStock[] {
  const pdvIds =
    pointDeVenteId === "tous"
      ? pointsDeVente.map((p) => p.id)
      : [pointDeVenteId];

  const entreesFiltrees = dateArrete
    ? entrees.filter((e) => onOrBefore(e.date, dateArrete))
    : entrees;
  const ventesFiltrees = dateArrete
    ? ventes.filter((v) => onOrBefore(v.date, dateArrete))
    : ventes;

  const lignes: LigneStock[] = [];

  for (const pdvId of pdvIds) {
    for (const produit of produits) {
      const etat = etatCumpProduit({
        produitId: produit.id,
        pointDeVenteId: pdvId,
        entrees: entreesFiltrees,
        ventes: ventesFiltrees,
        inventaires,
        exclureInventaireId,
        jusquA: dateArrete,
        produit,
      });

      const quantiteEntree = entreesFiltrees
        .filter(
          (e) => e.pointDeVenteId === pdvId && e.produitId === produit.id,
        )
        .reduce((s, e) => s + e.quantite, 0);

      const quantiteVendue = ventesFiltrees
        .filter(
          (v) => v.pointDeVenteId === pdvId && v.produitId === produit.id,
        )
        .reduce((s, v) => s + v.quantite, 0);

      const quantiteRestante = etat.quantite;
      if (quantiteEntree === 0 && quantiteVendue === 0 && quantiteRestante === 0) {
        continue;
      }

      const entreesProduit = entreesFiltrees.filter(
        (e) => e.pointDeVenteId === pdvId && e.produitId === produit.id,
      );

      const valeurVenteEntrees = entreesProduit.reduce(
        (s, e) =>
          s + e.quantite * (e.prixVenteUnitaire ?? prixVenteCatalogue(produit)),
        0,
      );

      const prixVenteMoyen =
        quantiteEntree > 0
          ? valeurVenteEntrees / quantiteEntree
          : prixVenteCatalogue(produit);

      lignes.push({
        produit,
        pointDeVenteId: pdvId,
        quantiteEntree,
        quantiteVendue,
        quantiteRestante,
        valeurAchat: etat.valeur,
        valeurVente: quantiteRestante * prixVenteMoyen,
      });
    }
  }

  return lignes.sort((a, b) => b.valeurAchat - a.valeurAchat);
}

export function totalAchats(
  entrees: EntreeStock[],
  pointDeVenteId: string | "tous",
  periodeOrRange?: Periode | DateRange,
  reference = new Date(),
  achats: Achat[] = [],
) {
  const range =
    typeof periodeOrRange === "string"
      ? periodToRange(periodeOrRange, reference)
      : periodeOrRange;
  const depuisAchats = montantAchatsMarchandisesHT(
    achats,
    pointDeVenteId,
    range,
  );
  const legacy = filterByPos(entrees, pointDeVenteId)
    .filter((e) => !e.achatId)
    .filter((e) => e.origine !== "stock_initial")
    .filter((e) => (range ? inDateRange(e.date, range) : true))
    .reduce((s, e) => s + montantAchat(e), 0);
  return depuisAchats + legacy;
}

export function totalCharges(
  charges: Charge[],
  pointDeVenteId: string | "tous",
  periodeOrRange?: Periode | DateRange,
  reference = new Date(),
) {
  const range =
    typeof periodeOrRange === "string"
      ? periodToRange(periodeOrRange, reference)
      : periodeOrRange;
  return charges
    .filter((c) => {
      if (pointDeVenteId === "tous") return true;
      return c.pointDeVenteId === pointDeVenteId || c.pointDeVenteId === "tous";
    })
    .filter((c) => (range ? inDateRange(c.date, range) : true))
    .reduce((s, c) => s + c.montant, 0);
}

export type LigneChargeCR = {
  categorie: string;
  label: string;
  montant: number;
  type: "personnel" | "externe";
};

export type CompteResultat = {
  produitsExploitation: number;
  achatsMarchandises: number;
  variationStocks: number;
  margeCommerciale: number;
  chargesExternes: number;
  chargesPersonnel: number;
  detailCharges: LigneChargeCR[];
  resultatExploitation: number;
  resultatNet: number;
};

export const CATEGORIES_PERSONNEL = ["salaires", "charges_sociales"] as const;

export function compteDeResultat(
  ventes: Vente[],
  entrees: EntreeStock[],
  charges: Charge[],
  produits: Produit[],
  pointsDeVente: PointDeVente[],
  pointDeVenteId: string | "tous",
  periodeOrRange: Periode | DateRange = "annee",
  inventaires: Inventaire[] = [],
  achats: Achat[] = [],
): CompteResultat {
  const range =
    typeof periodeOrRange === "string"
      ? periodToRange(periodeOrRange)
      : periodeOrRange;

  const produitsExploitation = chiffreAffaires(
    ventes,
    pointDeVenteId,
    range,
  );
  const achatsMarchandises = totalAchats(
    entrees,
    pointDeVenteId,
    range,
    new Date(),
    achats,
  );

  const stocks = calculerStocks(
    produits,
    entrees,
    ventes,
    pointDeVenteId,
    pointsDeVente,
    range.fin,
    inventaires,
  );
  const stockActuel = stocks.reduce((s, l) => s + l.valeurAchat, 0);

  // Approximation : variation = stock actuel - achats hors période (simplifié)
  // Pour un bilan instantané : stock final = valeur stock actuel
  const variationStocks = stockActuel;

  const margeCommerciale =
    produitsExploitation - achatsMarchandises + variationStocks;

  const chargesFiltrees = charges.filter((c) => {
    if (pointDeVenteId === "tous") return true;
    return c.pointDeVenteId === pointDeVenteId || c.pointDeVenteId === "tous";
  }).filter((c) => inDateRange(c.date, range));

  const isPersonnel = (categorie: string) =>
    (CATEGORIES_PERSONNEL as readonly string[]).includes(categorie);

  const chargesPersonnel = chargesFiltrees
    .filter((c) => isPersonnel(c.categorie))
    .reduce((s, c) => s + c.montant, 0);

  const chargesExternes = chargesFiltrees
    .filter((c) => !isPersonnel(c.categorie))
    .reduce((s, c) => s + c.montant, 0);

  const parCategorie = new Map<string, number>();
  for (const c of chargesFiltrees) {
    parCategorie.set(
      c.categorie,
      (parCategorie.get(c.categorie) ?? 0) + c.montant,
    );
  }

  const detailCharges: LigneChargeCR[] = [...parCategorie.entries()]
    .map(([categorie, montant]) => ({
      categorie,
      label: CATEGORIE_LABELS[categorie] ?? categorie,
      montant,
      type: isPersonnel(categorie) ? ("personnel" as const) : ("externe" as const),
    }))
    .sort((a, b) => b.montant - a.montant);

  const resultatExploitation =
    margeCommerciale - chargesExternes - chargesPersonnel;

  return {
    produitsExploitation,
    achatsMarchandises,
    variationStocks,
    margeCommerciale,
    chargesExternes,
    chargesPersonnel,
    detailCharges,
    resultatExploitation,
    resultatNet: resultatExploitation,
  };
}

export type Bilan = {
  actif: {
    immobilisationsBrutes: number;
    amortissements: number;
    immobilisationsNettes: number;
    stocks: number;
    creancesClients: number;
    disponibilites: number;
    /** Solde débiteur du CCA (l'associé doit à l'entreprise). */
    compteCourantDebiteur: number;
    total: number;
  };
  passif: {
    capital: number;
    resultatReporte: number;
    resultat: number;
    emprunts: number;
    dettesFournisseurs: number;
    dettesSociales: number;
    /** Solde créditeur du CCA (l'entreprise doit à l'associé). */
    compteCourantCrediteur: number;
    total: number;
  };
  /** Solde net du compte courant (positif = crédit, négatif = débit). */
  compteCourantSolde: number;
};

/** Valeur nette d'une immobilisation (amortissement linéaire). */
export function valeurNetteImmobilisation(
  immo: Immobilisation,
  reference = new Date(),
) {
  const debut = parseISO(immo.dateAcquisition);
  const annees =
    (reference.getTime() - debut.getTime()) / (365.25 * 24 * 3600 * 1000);
  const duree = Math.max(1, immo.dureeAmortissementAns);
  const amorti = Math.min(
    immo.valeurAcquisition,
    Math.max(0, (immo.valeurAcquisition / duree) * annees),
  );
  return {
    brut: immo.valeurAcquisition,
    amortissement: amorti,
    net: immo.valeurAcquisition - amorti,
  };
}

export function totalImmobilisations(
  immobilisations: Immobilisation[],
  reference = new Date(),
) {
  return immobilisations.reduce(
    (acc, immo) => {
      const v = valeurNetteImmobilisation(immo, reference);
      return {
        brut: acc.brut + v.brut,
        amortissement: acc.amortissement + v.amortissement,
        net: acc.net + v.net,
      };
    },
    { brut: 0, amortissement: 0, net: 0 },
  );
}

export function bilanInstantane(
  ventes: Vente[],
  entrees: EntreeStock[],
  charges: Charge[],
  produits: Produit[],
  pointsDeVente: PointDeVente[],
  pointDeVenteId: string | "tous",
  bilanInitial: BilanInitial,
  immobilisations: Immobilisation[],
  factures: Facture[] = [],
  periodeOrRange: Periode | DateRange = "annee",
  mouvementsCompteCourant: MouvementCompteCourant[] = [],
  inventaires: Inventaire[] = [],
  achats: Achat[] = [],
): Bilan {
  const range =
    typeof periodeOrRange === "string"
      ? periodToRange(periodeOrRange)
      : periodeOrRange;

  const stocks = calculerStocks(
    produits,
    entrees,
    ventes,
    pointDeVenteId,
    pointsDeVente,
    range.fin,
    inventaires,
  );
  const valeurStocksCourants = stocks.reduce((s, l) => s + l.valeurAchat, 0);
  // Stocks = max(stock courant calculé, ouverture) — on privilégie le stock réel courant
  const valeurStocks = valeurStocksCourants;

  const immosArretees = immobilisations.filter((i) =>
    onOrBefore(i.dateAcquisition, range.fin),
  );
  const immos = totalImmobilisations(immosArretees, range.fin);
  // Si aucune immo saisie, conserver le solde d'ouverture
  const immobilisationsBrutes =
    immosArretees.length > 0
      ? immos.brut
      : bilanInitial.immobilisations;
  const amortissements = immosArretees.length > 0 ? immos.amortissement : 0;
  const immobilisationsNettes =
    immosArretees.length > 0 ? immos.net : bilanInitial.immobilisations;

  const caVentes = chiffreAffaires(ventes, pointDeVenteId, range);
  const caFacturesPeriode = factures
    .filter((f) => f.statut !== "annulee" && f.statut !== "brouillon")
    .filter(
      (f) =>
        pointDeVenteId === "tous" || f.pointDeVenteId === pointDeVenteId,
    )
    .filter((f) => inDateRange(f.date, range))
    .reduce((s, f) => s + totalFacture(f), 0);

  const caPeriode = caVentes + caFacturesPeriode;
  const achatsPeriode = totalAchats(
    entrees,
    pointDeVenteId,
    range,
    new Date(),
    achats,
  );
  const paiementsFournisseursPeriode = totalPaiementsFournisseurs(
    achats,
    pointDeVenteId,
    range,
  );
  const achatsLegacyCash = filterByPos(entrees, pointDeVenteId)
    .filter((e) => !e.achatId)
    .filter((e) => e.origine !== "stock_initial")
    .filter((e) => inDateRange(e.date, range))
    .reduce((s, e) => s + montantAchat(e), 0);
  const chargesPeriode = totalCharges(charges, pointDeVenteId, range);
  const acquisitionsPeriode = immobilisations
    .filter((i) => inDateRange(i.dateAcquisition, range))
    .reduce((s, i) => s + i.valeurAcquisition, 0);

  const facturesArretees = factures.filter((f) =>
    onOrBefore(f.date, range.fin),
  );
  const encaissementsFactures = facturesArretees
    .filter((f) => f.statut !== "annulee")
    .filter(
      (f) =>
        pointDeVenteId === "tous" || f.pointDeVenteId === pointDeVenteId,
    )
    .reduce((s, f) => s + f.montantPaye, 0);

  const fluxCca = fluxTresorerieCompteCourant(
    mouvementsCompteCourant,
    range.fin,
  );
  const soldeCca = soldeCompteCourant(
    bilanInitial.compteCourantAssocie ?? 0,
    mouvementsCompteCourant,
    range.fin,
  );
  const compteCourantCrediteur = Math.max(0, soldeCca);
  const compteCourantDebiteur = Math.max(0, -soldeCca);

  const disponibilites = Math.max(
    0,
    bilanInitial.disponibilites +
      caVentes +
      encaissementsFactures -
      paiementsFournisseursPeriode -
      achatsLegacyCash -
      chargesPeriode -
      acquisitionsPeriode +
      fluxCca,
  );

  const creancesClients =
    bilanInitial.creancesClients +
    creancesClientsFactures(facturesArretees);

  const resultatExercice =
    caPeriode - achatsPeriode - chargesPeriode - amortissements;

  const dettesFournisseurs =
    bilanInitial.dettesFournisseurs +
    dettesFournisseursAchats(achats, pointDeVenteId, range.fin);
  const dettesSociales =
    bilanInitial.dettesSociales +
    charges
      .filter((c) => c.categorie === "charges_sociales")
      .filter((c) => {
        if (pointDeVenteId === "tous") return true;
        return (
          c.pointDeVenteId === pointDeVenteId || c.pointDeVenteId === "tous"
        );
      })
      .filter((c) => inDateRange(c.date, range))
      .reduce((s, c) => s + c.montant, 0);

  const capital = bilanInitial.capital;
  const resultatReporte = bilanInitial.resultatReporte;
  const emprunts = bilanInitial.emprunts;

  const actifTotal =
    immobilisationsNettes +
    valeurStocks +
    creancesClients +
    disponibilites +
    compteCourantDebiteur;
  const passifHorsEquilibre =
    capital +
    resultatReporte +
    resultatExercice +
    emprunts +
    dettesFournisseurs +
    dettesSociales +
    compteCourantCrediteur;
  const ajustement = actifTotal - passifHorsEquilibre;

  return {
    actif: {
      immobilisationsBrutes,
      amortissements,
      immobilisationsNettes,
      stocks: valeurStocks,
      creancesClients,
      disponibilites,
      compteCourantDebiteur,
      total: actifTotal,
    },
    passif: {
      capital,
      resultatReporte,
      resultat: resultatExercice + ajustement,
      emprunts,
      dettesFournisseurs,
      dettesSociales,
      compteCourantCrediteur,
      total: actifTotal,
    },
    compteCourantSolde: soldeCca,
  };
}

export function caParJour(
  ventes: Vente[],
  pointDeVenteId: string | "tous",
  jours = 14,
) {
  const result: { date: string; label: string; montant: number }[] = [];
  const now = new Date();

  for (let i = jours - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const montant = filterByPos(ventes, pointDeVenteId)
      .filter((v) => {
        const vd = parseISO(v.date);
        return vd >= d && vd < next;
      })
      .reduce((s, v) => s + montantVente(v), 0);

    result.push({
      date: d.toISOString(),
      label: new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(d),
      montant,
    });
  }

  return result;
}

export function caParPointDeVente(
  ventes: Vente[],
  pointsDeVente: PointDeVente[],
  periode: Periode,
) {
  return pointsDeVente.map((pdv) => ({
    id: pdv.id,
    nom: pdv.nom,
    montant: chiffreAffaires(ventes, pdv.id, periode),
  }));
}

/** Stock restant pour un produit sur un point de vente. */
export function stockDisponible(
  produitId: string,
  pointDeVenteId: string,
  entrees: EntreeStock[],
  ventes: Vente[],
  inventaires: Inventaire[] = [],
) {
  if (!pointDeVenteId || pointDeVenteId === "tous") return 0;
  return quantiteStockChronologique({
    produitId,
    pointDeVenteId,
    entrees,
    ventes,
    inventaires,
  });
}

/**
 * Stock encore saisissable sur un document :
 * stock physique − quantités déjà placées sur les autres lignes du document.
 */
export function stockRestantPourSaisie(
  produitId: string,
  pointDeVenteId: string,
  entrees: EntreeStock[],
  ventes: Vente[],
  lignesEnCours: {
    key?: string;
    produitId?: string;
    quantite: number;
    type?: string;
  }[],
  excludeKey?: string,
  inventaires: Inventaire[] = [],
) {
  const dispo = stockDisponible(
    produitId,
    pointDeVenteId,
    entrees,
    ventes,
    inventaires,
  );
  const reserve = lignesEnCours
    .filter(
      (l) =>
        (l.type ?? "produit") === "produit" &&
        l.produitId === produitId &&
        l.key !== excludeKey,
    )
    .reduce((s, l) => s + (Number(l.quantite) || 0), 0);
  return Math.max(0, dispo - reserve);
}

/** Prix de vente suggéré à partir du dernier lot entré (sinon catalogue). */
export function prixVenteSuggere(
  produitId: string,
  pointDeVenteId: string,
  entrees: EntreeStock[],
  produit: Produit,
) {
  const derniere = [...entrees]
    .filter(
      (e) => e.pointDeVenteId === pointDeVenteId && e.produitId === produitId,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return derniere?.prixVenteUnitaire ?? prixVenteCatalogue(produit);
}

export function caParProduit(
  ventes: Vente[],
  produits: Produit[],
  pointDeVenteId: string | "tous",
  periodeOrRange: Periode | DateRange,
  reference = new Date(),
) {
  const range =
    typeof periodeOrRange === "string"
      ? periodToRange(periodeOrRange, reference)
      : periodeOrRange;
  return produits
    .map((produit) => {
      const lignes = filterByPos(ventes, pointDeVenteId).filter(
        (v) => v.produitId === produit.id && inDateRange(v.date, range),
      );
      const quantite = lignes.reduce((s, v) => s + v.quantite, 0);
      const montant = lignes.reduce((s, v) => s + montantVente(v), 0);
      return {
        id: produit.id,
        nom: libelleProduit(produit),
        unite: produit.unite,
        quantite,
        montant,
      };
    })
    .filter((l) => l.montant > 0)
    .sort((a, b) => b.montant - a.montant);
}

/** Ventes détaillées d'une période (pour drill-down CA). */
export function detailVentesPeriode(
  ventes: Vente[],
  pointDeVenteId: string | "tous",
  range: DateRange,
) {
  return filterByPos(ventes, pointDeVenteId)
    .filter((v) => inDateRange(v.date, range))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

/** Coût d'achat unitaire moyen pondéré (chronologie CUMP, inventaires inclus). */
export function coutAchatMoyen(
  produitId: string,
  pointDeVenteId: string | "tous",
  entrees: EntreeStock[],
  produit: Produit,
  ventes: Vente[] = [],
  inventaires: Inventaire[] = [],
) {
  return cumpStockRestant(
    produitId,
    pointDeVenteId,
    entrees,
    ventes,
    produit,
    inventaires,
  );
}

export type LigneBeneficeProduit = {
  id: string;
  nom: string;
  unite: string;
  quantite: number;
  ca: number;
  coutAchat: number;
  benefice: number;
};

export function beneficesParProduit(
  ventes: Vente[],
  entrees: EntreeStock[],
  produits: Produit[],
  pointDeVenteId: string | "tous",
  range: DateRange,
  inventaires: Inventaire[] = [],
): LigneBeneficeProduit[] {
  return produits
    .map((produit) => {
      const pdvIds =
        pointDeVenteId === "tous"
          ? [
              ...new Set(
                ventes
                  .filter((v) => v.produitId === produit.id)
                  .map((v) => v.pointDeVenteId),
              ),
            ]
          : [pointDeVenteId];
      let quantite = 0;
      let cmv = 0;
      let ca = 0;
      for (const pdvId of pdvIds) {
        const lignes = ventes.filter(
          (v) =>
            v.produitId === produit.id &&
            v.pointDeVenteId === pdvId &&
            inDateRange(v.date, range),
        );
        ca += lignes.reduce((s, v) => s + montantVente(v), 0);
        const c = cmvSortiesPeriode({
          produitId: produit.id,
          pointDeVenteId: pdvId,
          entrees,
          ventes,
          produit,
          inventaires,
          dansPeriode: (iso) => inDateRange(iso, range),
        });
        quantite += c.quantite;
        cmv += c.cmv;
      }
      return {
        id: produit.id,
        nom: libelleProduit(produit),
        unite: produit.unite,
        quantite,
        ca,
        coutAchat: cmv,
        benefice: ca - cmv,
      };
    })
    .filter((l) => l.ca > 0 || l.quantite > 0)
    .sort((a, b) => b.benefice - a.benefice);
}

export type SyntheseBenefices = {
  lignes: LigneBeneficeProduit[];
  ca: number;
  coutAchat: number;
  benefice: number;
  charges: number;
  beneficeNet: number;
};

export function syntheseBenefices(
  ventes: Vente[],
  entrees: EntreeStock[],
  charges: Charge[],
  produits: Produit[],
  pointDeVenteId: string | "tous",
  range: DateRange,
  inventaires: Inventaire[] = [],
): SyntheseBenefices {
  const lignes = beneficesParProduit(
    ventes,
    entrees,
    produits,
    pointDeVenteId,
    range,
    inventaires,
  );
  const ca = lignes.reduce((s, l) => s + l.ca, 0);
  const coutAchat = lignes.reduce((s, l) => s + l.coutAchat, 0);
  const benefice = ca - coutAchat;
  const chargesTotal = totalCharges(charges, pointDeVenteId, range);
  return {
    lignes,
    ca,
    coutAchat,
    benefice,
    charges: chargesTotal,
    beneficeNet: benefice - chargesTotal,
  };
}

export type PointBeneficeSerie = {
  key: string;
  label: string;
  ca: number;
  coutAchat: number;
  benefice: number;
};

/** Série temporelle des bénéfices (par jour ou par mois selon l'amplitude). */
export function beneficesSerieTemporelle(
  ventes: Vente[],
  entrees: EntreeStock[],
  produits: Produit[],
  pointDeVenteId: string | "tous",
  range: DateRange,
  mode: "jour" | "mois" | "auto" = "auto",
  inventaires: Inventaire[] = [],
): PointBeneficeSerie[] {
  const jours = differenceInCalendarDays(range.fin, range.debut) + 1;
  const granularite: "jour" | "mois" =
    mode === "auto" ? (jours <= 62 ? "jour" : "mois") : mode;

  const agregat = (bucket: DateRange) => {
    const lignes = beneficesParProduit(
      ventes,
      entrees,
      produits,
      pointDeVenteId,
      bucket,
      inventaires,
    );
    const ca = lignes.reduce((s, l) => s + l.ca, 0);
    const coutAchat = lignes.reduce((s, l) => s + l.coutAchat, 0);
    return { ca, coutAchat, benefice: ca - coutAchat };
  };

  if (granularite === "jour") {
    return eachDayOfInterval({
      start: startOfDay(range.debut),
      end: endOfDay(range.fin),
    }).map((day) => {
      const t = agregat({
        debut: startOfDay(day),
        fin: endOfDay(day),
      });
      return {
        key: formatDateFns(day, "yyyy-MM-dd"),
        label: formatDateFns(day, "d MMM", { locale: fr }),
        ...t,
      };
    });
  }

  return eachMonthOfInterval({
    start: startOfMonth(range.debut),
    end: endOfMonth(range.fin),
  }).map((month) => {
    const t = agregat({
      debut: startOfMonth(month),
      fin: endOfMonth(month),
    });
    return {
      key: formatDateFns(month, "yyyy-MM"),
      label: formatDateFns(month, "MMM yyyy", { locale: fr }),
      ...t,
    };
  });
}

export const CATEGORIE_LABELS: Record<string, string> = {
  poisson: "Poisson",
  crustace: "Crustacé",
  coquillage: "Coquillage",
  autre: "Autre",
  loyer: "Loyer",
  salaires: "Salaires",
  charges_sociales: "Charges sociales",
  energie: "Électricité / énergie",
  eau: "Eau",
  telephone: "Téléphone / internet",
  emballage: "Emballages",
  transport: "Transport",
  entretien: "Entretien",
  frais: "Frais divers",
  assurance: "Assurance",
  amortissement: "Amortissements",
  interets: "Intérêts / charges financières",
  exceptionnel: "Charges exceptionnelles",
  impot_benefice: "Impôt sur les bénéfices",
};

export const CHARGE_CATEGORIES: {
  id: import("./types").ChargeCategorie;
  label: string;
}[] = [
  { id: "loyer", label: "Loyer" },
  { id: "salaires", label: "Salaires" },
  { id: "charges_sociales", label: "Charges sociales" },
  { id: "energie", label: "Électricité / énergie" },
  { id: "eau", label: "Eau" },
  { id: "telephone", label: "Téléphone / internet" },
  { id: "emballage", label: "Emballages" },
  { id: "transport", label: "Transport" },
  { id: "entretien", label: "Entretien" },
  { id: "frais", label: "Frais divers" },
  { id: "assurance", label: "Assurance" },
  { id: "amortissement", label: "Amortissements" },
  { id: "interets", label: "Intérêts / financier" },
  { id: "exceptionnel", label: "Exceptionnel" },
  { id: "impot_benefice", label: "Impôt sur les bénéfices" },
  { id: "autre", label: "Autre" },
];
