import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format as formatDateFns,
  startOfDay,
  startOfMonth,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { fr } from "date-fns/locale";
import { montantAchatsHT } from "./achats";
import {
  caRapportAnnuelDepuis,
  caRapportHebdomadaireYoYDepuis,
  caRapportMensuelYoYDepuis,
  caRapportTrimestrielYoYDepuis,
  inDateRange,
  periodToRange,
  type DateRange,
  type Periode,
} from "./calculations";
import {
  htNetsLignesProduit,
  isLigneProduit,
  totauxFacture,
} from "./commercial";
import { cmvSortiesPeriode } from "./cump";
import { libelleProduit } from "./produits";
import type {
  Achat,
  EntreeStock,
  Facture,
  Inventaire,
  Parametres,
  Produit,
  Vente,
} from "./types";

function factureCompteDansCA(f: Facture) {
  if (
    f.statut === "annulee" ||
    f.statut === "brouillon" ||
    f.statut === "proforma"
  ) {
    return false;
  }
  if (f.type === "proforma") return false;
  // Acompte : opération partielle — on l'exclut si on compte les factures
  // standard/solde (lignes marchandises). Les avoirs réduisent le CA.
  if (f.type === "acompte") return false;
  return true;
}

export function caHtFacturesPeriode(
  factures: Facture[],
  parametres: Parametres,
  pointDeVenteId: string | "tous",
  range: DateRange,
) {
  let ca = 0;
  for (const f of factures) {
    if (!factureCompteDansCA(f)) continue;
    if (pointDeVenteId !== "tous" && f.pointDeVenteId !== pointDeVenteId) {
      continue;
    }
    if (!inDateRange(f.date, range)) continue;
    const t = totauxFacture(f, parametres);
    if (f.type === "avoir") ca -= t.totalHT;
    else ca += t.totalHT;
  }
  return Math.round(ca);
}

function ventesSynthetiquesDepuisFactures(factures: Facture[]): Vente[] {
  const out: Vente[] = [];
  for (const f of factures) {
    if (!factureCompteDansCA(f)) continue;
    const signe = f.type === "avoir" ? -1 : 1;
    for (const l of f.lignes) {
      if (!isLigneProduit(l) || !l.produitId) continue;
      out.push({
        id: `cmv-${f.id}-${l.id}`,
        pointDeVenteId: f.pointDeVenteId,
        produitId: l.produitId,
        quantite: signe * l.quantite,
        prixUnitaire: l.prixUnitaire,
        date: f.date,
        factureId: f.id,
      });
    }
  }
  return out;
}

function pdvPourProduit(
  pointDeVenteId: string | "tous",
  ventes: Vente[],
  produitId: string,
) {
  if (pointDeVenteId !== "tous") return [pointDeVenteId];
  return [
    ...new Set(
      ventes.filter((v) => v.produitId === produitId).map((v) => v.pointDeVenteId),
    ),
  ];
}

export function cmvDepuisFactures(
  factures: Facture[],
  produits: Produit[],
  entrees: EntreeStock[],
  pointDeVenteId: string | "tous",
  range: DateRange,
  inventaires: Inventaire[] = [],
) {
  const ventes = ventesSynthetiquesDepuisFactures(factures);
  let cmv = 0;
  for (const produit of produits) {
    for (const pdvId of pdvPourProduit(pointDeVenteId, ventes, produit.id)) {
      const c = cmvSortiesPeriode({
        produitId: produit.id,
        pointDeVenteId: pdvId,
        entrees,
        ventes,
        produit,
        inventaires,
        dansPeriode: (iso) => inDateRange(iso, range),
      });
      cmv += c.cmv;
    }
  }
  return Math.round(Math.max(0, cmv));
}

export type LigneMargeProduitFacture = {
  produitId: string;
  nom: string;
  unite: string;
  quantite: number;
  ca: number;
  cmv: number;
  marge: number;
};

export type SyntheseRentabilite = {
  caHt: number;
  cmv: number;
  achatsHt: number;
  margeBrute: number;
  tauxPalier1: number;
  resultat: number;
  tauxPalier2: number;
  parProduit: LigneMargeProduitFacture[];
  alertePalier1: boolean;
  alertePalier2: boolean;
  alertePalier2Negatif: boolean;
};

export function syntheseRentabiliteDeuxPaliers(opts: {
  factures: Facture[];
  achats: Achat[];
  produits: Produit[];
  entrees: EntreeStock[];
  inventaires?: Inventaire[];
  parametres: Parametres;
  pointDeVenteId: string | "tous";
  range: DateRange;
}): SyntheseRentabilite {
  const {
    factures,
    achats,
    produits,
    entrees,
    inventaires = [],
    parametres,
    pointDeVenteId,
    range,
  } = opts;

  const caHt = caHtFacturesPeriode(
    factures,
    parametres,
    pointDeVenteId,
    range,
  );
  const cmv = cmvDepuisFactures(
    factures,
    produits,
    entrees,
    pointDeVenteId,
    range,
    inventaires,
  );
  const achatsHt = Math.round(
    montantAchatsHT(achats, pointDeVenteId, range),
  );
  const margeBrute = caHt - cmv;
  const resultat = caHt - achatsHt;

  const tauxPalier1 = caHt > 0 ? (margeBrute / caHt) * 100 : 0;
  const tauxPalier2 = caHt > 0 ? (resultat / caHt) * 100 : 0;

  const seuil1 = parametres.seuilMargePalier1Percent ?? 25;
  const seuil2 = parametres.seuilMargePalier2Percent ?? 5;

  const parProduit = margeParProduitFactures(
    factures,
    produits,
    entrees,
    pointDeVenteId,
    range,
    inventaires,
  );

  return {
    caHt,
    cmv,
    achatsHt,
    margeBrute,
    tauxPalier1,
    resultat,
    tauxPalier2,
    parProduit,
    alertePalier1: caHt > 0 && tauxPalier1 < seuil1,
    alertePalier2: caHt > 0 && tauxPalier2 < seuil2,
    alertePalier2Negatif: resultat < 0,
  };
}

export function margeParProduitFactures(
  factures: Facture[],
  produits: Produit[],
  entrees: EntreeStock[],
  pointDeVenteId: string | "tous",
  range: DateRange,
  inventaires: Inventaire[] = [],
): LigneMargeProduitFacture[] {
  const ventes = ventesSynthetiquesDepuisFactures(factures);
  const map = new Map<
    string,
    { quantite: number; ca: number; cmv: number }
  >();

  for (const f of factures) {
    if (!factureCompteDansCA(f)) continue;
    if (pointDeVenteId !== "tous" && f.pointDeVenteId !== pointDeVenteId) {
      continue;
    }
    if (!inDateRange(f.date, range)) continue;
    const signe = f.type === "avoir" ? -1 : 1;
    const lignes = f.lignes.filter((l) => isLigneProduit(l) && l.produitId);
    const htsNets = htNetsLignesProduit(
      lignes,
      f.remiseGlobale ?? 0,
      f.remiseGlobaleMode,
    );
    lignes.forEach((l, i) => {
      const prev = map.get(l.produitId!) ?? { quantite: 0, ca: 0, cmv: 0 };
      prev.quantite += signe * l.quantite;
      prev.ca += signe * (htsNets[i] ?? 0);
      map.set(l.produitId!, prev);
    });
  }

  for (const [produitId, prev] of map) {
    const produit = produits.find((p) => p.id === produitId);
    if (!produit) continue;
    let cmv = 0;
    for (const pdvId of pdvPourProduit(pointDeVenteId, ventes, produitId)) {
      cmv += cmvSortiesPeriode({
        produitId,
        pointDeVenteId: pdvId,
        entrees,
        ventes,
        produit,
        inventaires,
        dansPeriode: (iso) => inDateRange(iso, range),
      }).cmv;
    }
    prev.cmv = cmv;
  }

  return [...map.entries()]
    .map(([produitId, v]) => {
      const p = produits.find((x) => x.id === produitId);
      return {
        produitId,
        nom: p?.libelleCourt ?? produitId,
        unite: p?.unite ?? "",
        quantite: v.quantite,
        ca: Math.round(v.ca),
        cmv: Math.round(v.cmv),
        marge: Math.round(v.ca - v.cmv),
      };
    })
    .filter((l) => l.ca !== 0 || l.quantite !== 0)
    .sort((a, b) => b.marge - a.marge);
}

export function serieRentabiliteMensuelle(opts: {
  factures: Facture[];
  achats: Achat[];
  produits: Produit[];
  entrees: EntreeStock[];
  inventaires?: Inventaire[];
  parametres: Parametres;
  pointDeVenteId: string | "tous";
  annee: number;
}): { mois: string; caHt: number; palier1: number; palier2: number }[] {
  const { annee, ...rest } = opts;
  const out: { mois: string; caHt: number; palier1: number; palier2: number }[] =
    [];
  for (let m = 0; m < 12; m++) {
    const debut = new Date(annee, m, 1, 0, 0, 0, 0);
    const fin = new Date(annee, m + 1, 0, 23, 59, 59, 999);
    const s = syntheseRentabiliteDeuxPaliers({
      ...rest,
      range: { debut, fin },
    });
    out.push({
      mois: debut.toLocaleDateString("fr-FR", {
        month: "short",
      }),
      caHt: s.caHt,
      palier1: s.margeBrute,
      palier2: s.resultat,
    });
  }
  return out;
}

/** CA HT des factures fiscales validées (date de facture, hors paiement). */
export function chiffreAffairesFactures(
  factures: Facture[],
  parametres: Parametres,
  pointDeVenteId: string | "tous",
  periodeOrRange: Periode | DateRange,
  reference = new Date(),
) {
  const range =
    typeof periodeOrRange === "string"
      ? periodToRange(periodeOrRange, reference)
      : periodeOrRange;
  return caHtFacturesPeriode(factures, parametres, pointDeVenteId, range);
}

export function caPrecedentFactures(
  factures: Facture[],
  parametres: Parametres,
  pointDeVenteId: string | "tous",
  periode: Periode,
) {
  const ref =
    periode === "semaine"
      ? subWeeks(new Date(), 1)
      : periode === "mois"
        ? subMonths(new Date(), 1)
        : subYears(new Date(), 1);
  return chiffreAffairesFactures(
    factures,
    parametres,
    pointDeVenteId,
    periode,
    ref,
  );
}

function caFacturesInRange(
  factures: Facture[],
  parametres: Parametres,
  pointDeVenteId: string | "tous",
) {
  return (range: DateRange) =>
    caHtFacturesPeriode(factures, parametres, pointDeVenteId, range);
}

export function caRapportMensuelYoYFactures(
  factures: Facture[],
  parametres: Parametres,
  pointDeVenteId: string | "tous",
  annee = new Date().getFullYear(),
) {
  return caRapportMensuelYoYDepuis(
    caFacturesInRange(factures, parametres, pointDeVenteId),
    annee,
  );
}

export function caRapportHebdomadaireYoYFactures(
  factures: Facture[],
  parametres: Parametres,
  pointDeVenteId: string | "tous",
  annee = new Date().getFullYear(),
) {
  return caRapportHebdomadaireYoYDepuis(
    caFacturesInRange(factures, parametres, pointDeVenteId),
    annee,
  );
}

export function caRapportTrimestrielYoYFactures(
  factures: Facture[],
  parametres: Parametres,
  pointDeVenteId: string | "tous",
  annee = new Date().getFullYear(),
) {
  return caRapportTrimestrielYoYDepuis(
    caFacturesInRange(factures, parametres, pointDeVenteId),
    annee,
  );
}

export function caRapportAnnuelFactures(
  factures: Facture[],
  parametres: Parametres,
  pointDeVenteId: string | "tous",
  annee = new Date().getFullYear(),
) {
  return caRapportAnnuelDepuis(
    (y) =>
      chiffreAffairesFactures(
        factures,
        parametres,
        pointDeVenteId,
        "annee",
        new Date(y, 6, 1),
      ),
    annee,
  );
}

export type LigneCaProduitFacture = {
  id: string;
  nom: string;
  unite: string;
  quantite: number;
  montant: number;
};

export function caParProduitFactures(
  factures: Facture[],
  produits: Produit[],
  pointDeVenteId: string | "tous",
  periodeOrRange: Periode | DateRange,
  reference = new Date(),
): LigneCaProduitFacture[] {
  const range =
    typeof periodeOrRange === "string"
      ? periodToRange(periodeOrRange, reference)
      : periodeOrRange;
  const map = new Map<string, { quantite: number; montant: number }>();
  for (const f of factures) {
    if (!factureCompteDansCA(f)) continue;
    if (pointDeVenteId !== "tous" && f.pointDeVenteId !== pointDeVenteId) {
      continue;
    }
    if (!inDateRange(f.date, range)) continue;
    const signe = f.type === "avoir" ? -1 : 1;
    const lignes = f.lignes.filter((l) => isLigneProduit(l) && l.produitId);
    const htsNets = htNetsLignesProduit(
      lignes,
      f.remiseGlobale ?? 0,
      f.remiseGlobaleMode,
    );
    lignes.forEach((l, i) => {
      const prev = map.get(l.produitId!) ?? { quantite: 0, montant: 0 };
      prev.quantite += signe * l.quantite;
      prev.montant += signe * (htsNets[i] ?? 0);
      map.set(l.produitId!, prev);
    });
  }
  return [...map.entries()]
    .map(([id, v]) => {
      const p = produits.find((x) => x.id === id);
      return {
        id,
        nom: p ? libelleProduit(p) : id,
        unite: p?.unite ?? "",
        quantite: v.quantite,
        montant: Math.round(v.montant),
      };
    })
    .filter((l) => l.montant !== 0 || l.quantite !== 0)
    .sort((a, b) => b.montant - a.montant);
}

export type LigneDetailFactureCa = {
  id: string;
  date: string;
  numero: string;
  type: Facture["type"];
  pointDeVenteId: string;
  clientId: string;
  totalHT: number;
};

export function detailFacturesCaPeriode(
  factures: Facture[],
  parametres: Parametres,
  pointDeVenteId: string | "tous",
  range: DateRange,
): LigneDetailFactureCa[] {
  const out: LigneDetailFactureCa[] = [];
  for (const f of factures) {
    if (!factureCompteDansCA(f)) continue;
    if (pointDeVenteId !== "tous" && f.pointDeVenteId !== pointDeVenteId) {
      continue;
    }
    if (!inDateRange(f.date, range)) continue;
    const t = totauxFacture(f, parametres);
    const ht = f.type === "avoir" ? -t.totalHT : t.totalHT;
    out.push({
      id: f.id,
      date: f.date,
      numero: f.numero,
      type: f.type,
      pointDeVenteId: f.pointDeVenteId,
      clientId: f.clientId,
      totalHT: Math.round(ht),
    });
  }
  return out.sort(
    (a, b) => b.date.localeCompare(a.date) || b.numero.localeCompare(a.numero),
  );
}

export function serieRentabiliteTemporelle(opts: {
  factures: Facture[];
  achats: Achat[];
  produits: Produit[];
  entrees: EntreeStock[];
  inventaires?: Inventaire[];
  parametres: Parametres;
  pointDeVenteId: string | "tous";
  range: DateRange;
  mode?: "jour" | "mois" | "auto";
}): { key: string; label: string; ca: number; coutAchat: number; benefice: number }[] {
  const { range, mode = "auto", ...rest } = opts;
  const jours = differenceInCalendarDays(range.fin, range.debut) + 1;
  const granularite: "jour" | "mois" =
    mode === "auto" ? (jours <= 62 ? "jour" : "mois") : mode;

  const agregat = (bucket: DateRange) => {
    const s = syntheseRentabiliteDeuxPaliers({ ...rest, range: bucket });
    return { ca: s.caHt, coutAchat: s.cmv, benefice: s.margeBrute };
  };

  if (granularite === "jour") {
    return eachDayOfInterval({
      start: startOfDay(range.debut),
      end: endOfDay(range.fin),
    }).map((day) => ({
      key: formatDateFns(day, "yyyy-MM-dd"),
      label: formatDateFns(day, "d MMM", { locale: fr }),
      ...agregat({ debut: startOfDay(day), fin: endOfDay(day) }),
    }));
  }

  return eachMonthOfInterval({
    start: startOfMonth(range.debut),
    end: endOfMonth(range.fin),
  }).map((month) => ({
    key: formatDateFns(month, "yyyy-MM"),
    label: formatDateFns(month, "MMM yyyy", { locale: fr }),
    ...agregat({
      debut: startOfMonth(month),
      fin: endOfMonth(month),
    }),
  }));
}
