import {
  isLigneProduit,
  montantLigneHT,
  totauxFacture,
} from "./commercial";
import {
  coutAchatMoyen,
  inDateRange,
  type DateRange,
} from "./calculations";
import type {
  Charge,
  ChargeCategorie,
  ChargeNatureEconomique,
  EntreeStock,
  Facture,
  Parametres,
  Produit,
} from "./types";

export const NATURE_ECONOMIQUE_LABELS: Record<ChargeNatureEconomique, string> =
  {
    variable_vente: "Variable de vente (Palier 1)",
    fixe_structure: "Structure / exploitation (Palier 2)",
    financiere: "Financière (Palier 2)",
    exceptionnelle: "Exceptionnelle (Palier 2)",
    impot_benefice: "Impôt sur les bénéfices (Palier 2)",
  };

/** Mapping catégorie métier → nature par défaut (PCG 2005 analytique). */
export function natureParDefautCategorie(
  categorie: ChargeCategorie,
): ChargeNatureEconomique {
  switch (categorie) {
    case "emballage":
    case "transport":
      return "variable_vente";
    case "interets":
      return "financiere";
    case "exceptionnel":
      return "exceptionnelle";
    case "impot_benefice":
      return "impot_benefice";
    default:
      return "fixe_structure";
  }
}

export function natureEffective(c: Charge): ChargeNatureEconomique {
  return c.natureEconomique ?? natureParDefautCategorie(c.categorie);
}

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

export function cmvDepuisFactures(
  factures: Facture[],
  produits: Produit[],
  entrees: EntreeStock[],
  pointDeVenteId: string | "tous",
  range: DateRange,
) {
  const coutCache = new Map<string, number>();
  function cout(produitId: string) {
    const cached = coutCache.get(produitId);
    if (cached !== undefined) return cached;
    const produit = produits.find((p) => p.id === produitId);
    if (!produit) {
      coutCache.set(produitId, 0);
      return 0;
    }
    const v = coutAchatMoyen(produitId, pointDeVenteId, entrees, produit);
    coutCache.set(produitId, v);
    return v;
  }

  let cmv = 0;
  for (const f of factures) {
    if (!factureCompteDansCA(f) || f.type === "avoir") continue;
    if (pointDeVenteId !== "tous" && f.pointDeVenteId !== pointDeVenteId) {
      continue;
    }
    if (!inDateRange(f.date, range)) continue;
    for (const l of f.lignes) {
      if (!isLigneProduit(l) || !l.produitId) continue;
      cmv += l.quantite * cout(l.produitId);
    }
  }

  // Avoirs : réduire le CMV au prorata des quantités annulées
  for (const f of factures) {
    if (f.type !== "avoir" || f.statut === "annulee") continue;
    if (pointDeVenteId !== "tous" && f.pointDeVenteId !== pointDeVenteId) {
      continue;
    }
    if (!inDateRange(f.date, range)) continue;
    for (const l of f.lignes) {
      if (!isLigneProduit(l) || !l.produitId) continue;
      cmv -= l.quantite * cout(l.produitId);
    }
  }

  return Math.round(Math.max(0, cmv));
}

function chargesFiltrees(
  charges: Charge[],
  pointDeVenteId: string | "tous",
  range: DateRange,
) {
  return charges.filter((c) => {
    if (pointDeVenteId !== "tous") {
      if (c.pointDeVenteId !== pointDeVenteId && c.pointDeVenteId !== "tous") {
        return false;
      }
    }
    return inDateRange(c.date, range);
  });
}

export function totalChargesParNature(
  charges: Charge[],
  nature: ChargeNatureEconomique,
  pointDeVenteId: string | "tous",
  range: DateRange,
) {
  return chargesFiltrees(charges, pointDeVenteId, range)
    .filter((c) => natureEffective(c) === nature)
    .reduce((s, c) => s + c.montant, 0);
}

export type LigneChargeNature = {
  nature: ChargeNatureEconomique;
  label: string;
  montant: number;
};

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
  chargesVariables: number;
  beneficeAvantAutres: number;
  tauxPalier1: number;
  chargesStructure: number;
  chargesFinancieres: number;
  chargesExceptionnelles: number;
  impotsBenefice: number;
  beneficeApresAutres: number;
  tauxPalier2: number;
  detailNatures: LigneChargeNature[];
  parProduit: LigneMargeProduitFacture[];
  alertePalier1: boolean;
  alertePalier2: boolean;
  alertePalier2Negatif: boolean;
};

export function syntheseRentabiliteDeuxPaliers(opts: {
  factures: Facture[];
  charges: Charge[];
  produits: Produit[];
  entrees: EntreeStock[];
  parametres: Parametres;
  pointDeVenteId: string | "tous";
  range: DateRange;
}): SyntheseRentabilite {
  const {
    factures,
    charges,
    produits,
    entrees,
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
  );
  const chargesVariables = totalChargesParNature(
    charges,
    "variable_vente",
    pointDeVenteId,
    range,
  );
  const chargesStructure = totalChargesParNature(
    charges,
    "fixe_structure",
    pointDeVenteId,
    range,
  );
  const chargesFinancieres = totalChargesParNature(
    charges,
    "financiere",
    pointDeVenteId,
    range,
  );
  const chargesExceptionnelles = totalChargesParNature(
    charges,
    "exceptionnelle",
    pointDeVenteId,
    range,
  );
  const impotsBenefice = totalChargesParNature(
    charges,
    "impot_benefice",
    pointDeVenteId,
    range,
  );

  const beneficeAvantAutres = caHt - cmv - chargesVariables;
  const beneficeApresAutres =
    beneficeAvantAutres -
    chargesStructure -
    chargesFinancieres -
    chargesExceptionnelles -
    impotsBenefice;

  const tauxPalier1 = caHt > 0 ? (beneficeAvantAutres / caHt) * 100 : 0;
  const tauxPalier2 = caHt > 0 ? (beneficeApresAutres / caHt) * 100 : 0;

  const seuil1 = parametres.seuilMargePalier1Percent ?? 25;
  const seuil2 = parametres.seuilMargePalier2Percent ?? 5;

  const detailNatures: LigneChargeNature[] = (
    Object.keys(NATURE_ECONOMIQUE_LABELS) as ChargeNatureEconomique[]
  )
    .map((nature) => ({
      nature,
      label: NATURE_ECONOMIQUE_LABELS[nature],
      montant: totalChargesParNature(charges, nature, pointDeVenteId, range),
    }))
    .filter((l) => l.montant > 0);

  const parProduit = margeParProduitFactures(
    factures,
    produits,
    entrees,
    pointDeVenteId,
    range,
  );

  return {
    caHt,
    cmv,
    chargesVariables,
    beneficeAvantAutres,
    tauxPalier1,
    chargesStructure,
    chargesFinancieres,
    chargesExceptionnelles,
    impotsBenefice,
    beneficeApresAutres,
    tauxPalier2,
    detailNatures,
    parProduit,
    alertePalier1: caHt > 0 && tauxPalier1 < seuil1,
    alertePalier2: caHt > 0 && tauxPalier2 < seuil2,
    alertePalier2Negatif: beneficeApresAutres < 0,
  };
}

export function margeParProduitFactures(
  factures: Facture[],
  produits: Produit[],
  entrees: EntreeStock[],
  pointDeVenteId: string | "tous",
  range: DateRange,
): LigneMargeProduitFacture[] {
  const map = new Map<
    string,
    { quantite: number; ca: number; cmv: number }
  >();

  const coutCache = new Map<string, number>();
  function cout(produitId: string) {
    const cached = coutCache.get(produitId);
    if (cached !== undefined) return cached;
    const produit = produits.find((p) => p.id === produitId);
    if (!produit) {
      coutCache.set(produitId, 0);
      return 0;
    }
    const v = coutAchatMoyen(produitId, pointDeVenteId, entrees, produit);
    coutCache.set(produitId, v);
    return v;
  }

  for (const f of factures) {
    if (!factureCompteDansCA(f)) continue;
    if (pointDeVenteId !== "tous" && f.pointDeVenteId !== pointDeVenteId) {
      continue;
    }
    if (!inDateRange(f.date, range)) continue;
    const signe = f.type === "avoir" ? -1 : 1;
    for (const l of f.lignes) {
      if (!isLigneProduit(l) || !l.produitId) continue;
      const prev = map.get(l.produitId) ?? { quantite: 0, ca: 0, cmv: 0 };
      prev.quantite += signe * l.quantite;
      prev.ca += signe * montantLigneHT(l);
      prev.cmv += signe * l.quantite * cout(l.produitId);
      map.set(l.produitId, prev);
    }
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
  charges: Charge[];
  produits: Produit[];
  entrees: EntreeStock[];
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
      palier1: s.beneficeAvantAutres,
      palier2: s.beneficeApresAutres,
    });
  }
  return out;
}
