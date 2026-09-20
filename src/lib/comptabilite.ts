import {
  isLigneProduit,
  htNetsLignesProduit,
  appliqueTVA,
  libelleClient,
} from "./commercial";
import { montantHTLigne } from "./achats";
import { factureEstFiscale } from "./facturation-mg";
import { createId } from "./id";
import type {
  Achat,
  AchatLigne,
  AvoirAchat,
  Client,
  Acompte,
  CompteComptable,
  CompteTresorerie,
  EcritureComptable,
  Facture,
  Fournisseur,
  JournalEcriture,
  JournalTresorerie,
  LotPaiementFournisseur,
  ModePaiementParam,
  MouvementTresorerie,
  LigneEcritureComptable,
  MissionAchat,
  NatureDepenseMission,
  Parametres,
  Produit,
  RoleCompteComptable,
  RoleTiers,
  SortieAtelier,
  Tiers,
  TypeAchat,
  TypeCompteTresorerie,
} from "./types";
import { tousMouvementsTresorerie } from "./tresorerie";
import {
  idJournalDedieCompte,
  journalTresorerieEstPartage,
  journauxTresorerieTries,
} from "./journaux-tresorerie";
import {
  produitEstVendable,
  typeAchatEstAttendu,
} from "./nature-stock";
import { montantLigneRealisee, TIERS_DIVERS_MARCHE_NOM } from "./missions";
import {
  libelleNatureDepense,
  natureCatalogueDepense,
} from "./natures-depense-mission";
import {
  TYPE_ACHAT_COMPTE_CHARGE_PREFIX,
  TYPE_ACHAT_LABELS,
  TYPES_ACHAT_LIBRES,
  TYPES_ACHAT_PRODUIT,
  ligneAchatStockee,
  typeAchatSurFicheProduit,
} from "./type-achat";

export {
  TYPE_ACHAT_LABELS,
  TYPES_ACHAT_LIBRES,
  TYPES_ACHAT_PRODUIT,
  ligneAchatStockee,
  typeAchatSurFicheProduit,
};

export const LONGUEUR_COMPTE_MIN = 6;
export const LONGUEUR_COMPTE_MAX = 9;

export const ROLE_COMPTE_LABELS: Record<RoleCompteComptable, string> = {
  general: "Général",
  tva_deductible: "TVA déductible",
  tva_collectee: "TVA collectée",
  defaut_charge: "Charge à définir",
  defaut_vente: "Produit à définir",
};

export const MSG_COMPTE_VERROUILLE =
  "Ce compte a déjà été utilisé dans une écriture générée et ne peut plus être modifié.";

export function classeNumeroCompte(numero: string) {
  return chiffresNumeroCompte(numero).slice(0, 1);
}

export function comptesParClasse(
  comptes: CompteComptable[],
  classe: "2" | "5" | "6" | "7",
) {
  return comptes
    .filter((c) => classeNumeroCompte(c.numero) === classe)
    .sort((a, b) => a.numero.localeCompare(b.numero));
}

export const LIBELLE_COMPTE_DEFAUT_CHARGE = "Compte de charge à définir";
export const LIBELLE_COMPTE_DEFAUT_VENTE = "Compte de produits à définir";
export const ID_COMPTE_DEFAUT_CHARGE = "cpt-defaut-charge";
export const ID_COMPTE_DEFAUT_VENTE = "cpt-defaut-vente";

export const PREFIXE_COMPTE_FOURNISSEUR = "401";
export const PREFIXE_COMPTE_CLIENT = "411";
export const VALEUR_COMPTE_TIERS_AUTO = "__auto__";

export const MSG_COMPTE_TIERS_AUTO =
  "Créer automatiquement un sous-compte unique";

export function numeroCompteDefaut(classe: "6" | "7", longueur: number) {
  return completerNumeroCompte(classe, longueur);
}

export function appliquerSeedComptesDefaut(
  comptes: CompteComptable[],
  _longueur: number,
): { comptes: CompteComptable[]; ajoutes: CompteComptable[] } {
  return { comptes, ajoutes: [] };
}

export function compteParPrefixe(comptes: CompteComptable[], prefix: string) {
  const p = chiffresNumeroCompte(prefix);
  if (!p) return undefined;
  const matches = comptes.filter((c) =>
    chiffresNumeroCompte(c.numero).startsWith(p),
  );
  if (matches.length === 0) return undefined;
  return [...matches].sort(
    (a, b) =>
      chiffresNumeroCompte(a.numero).length -
      chiffresNumeroCompte(b.numero).length,
  )[0];
}

export function compteChargeDefautPourType(
  type: TypeAchat | undefined,
  comptes: CompteComptable[],
) {
  const prefix = TYPE_ACHAT_COMPTE_CHARGE_PREFIX[type ?? "marchandises"];
  return compteParPrefixe(comptes, prefix);
}

export function compteChargeProduit(
  produit: Pick<Produit, "compteChargeId" | "compteComptableId" | "typeAchat">,
  comptes: CompteComptable[],
) {
  if (produit.compteChargeId) {
    const matches = comptes.filter((c) => c.id === produit.compteChargeId);
    return (
      matches.find((c) => classeNumeroCompte(c.numero) === "6") ?? matches[0]
    );
  }
  if (produit.compteComptableId) {
    const legacy = comptes.find((c) => c.id === produit.compteComptableId);
    if (legacy && classeNumeroCompte(legacy.numero) === "6") return legacy;
  }
  if (produit.typeAchat === "outillage") {
    return compteChargeDefautPourType("outillage", comptes);
  }
  return undefined;
}

export function compteVenteProduit(
  produit: Pick<Produit, "compteVenteId" | "compteComptableId">,
  comptes: CompteComptable[],
) {
  if (produit.compteVenteId) {
    const matches = comptes.filter((c) => c.id === produit.compteVenteId);
    return (
      matches.find((c) => classeNumeroCompte(c.numero) === "7") ?? matches[0]
    );
  }
  if (produit.compteComptableId) {
    const legacy = comptes.find((c) => c.id === produit.compteComptableId);
    if (legacy && classeNumeroCompte(legacy.numero) === "7") return legacy;
  }
  return undefined;
}

export function estCompteGeneriqueProduit(compte: CompteComptable | undefined) {
  if (!compte) return false;
  if (
    compte.roleCompte === "defaut_charge" ||
    compte.roleCompte === "defaut_vente"
  ) {
    return true;
  }
  return (
    compte.libelle === LIBELLE_COMPTE_DEFAUT_CHARGE ||
    compte.libelle === LIBELLE_COMPTE_DEFAUT_VENTE
  );
}

/**
 * L'ancien générateur d'IDs tronquait l'entropie : un import PCG/CSV
 * pouvait attribuer le même id à des centaines de comptes. On réassigne.
 */
export function dedupliquerIdsComptes(comptes: CompteComptable[]): CompteComptable[] {
  const seen = new Set<string>();
  let changed = false;
  const next = comptes.map((c) => {
    const id = String(c?.id ?? "").trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      return c.id === id ? c : { ...c, id };
    }
    changed = true;
    let nouveau = createId("cpt");
    while (seen.has(nouveau)) nouveau = createId("cpt");
    seen.add(nouveau);
    return { ...c, id: nouveau };
  });
  return changed ? next : comptes;
}

/** Module Comptabilité actif pour l'entreprise (absent = actif, rétrocompat). */
export function moduleComptabiliteActif(
  parametres: Pick<Parametres, "moduleComptabilite"> | undefined,
) {
  return parametres?.moduleComptabilite !== false;
}

export const MSG_PRODUIT_SANS_COMPTE =
  "Ce produit n'a pas de compte comptable associé. Voulez-vous continuer sans génération d'écriture, ou renseigner le compte maintenant ?";

/**
 * Les comptes produit ne sont plus obligatoires, quel que soit le type d'achat.
 */
export function champsComptesProduitRequis(_type?: TypeAchat): {
  charge: boolean;
  vente: boolean;
} {
  return { charge: false, vente: false };
}

export function compteProduitEstRenseigne(
  compte: CompteComptable | undefined,
): compte is CompteComptable {
  return Boolean(compte) && !estCompteGeneriqueProduit(compte);
}

export function produitSansCompteComptable(
  produit: Pick<
    Produit,
    | "compteChargeId"
    | "compteVenteId"
    | "compteComptableId"
    | "natureStock"
    | "usageCommercial"
    | "achatSousTraitance"
    | "typeAchat"
  >,
  comptes: CompteComptable[],
) {
  const manqueCharge =
    typeAchatEstAttendu(produit) &&
    !compteProduitEstRenseigne(compteChargeProduit(produit, comptes));
  const manqueVente =
    produitEstVendable(produit) &&
    !compteProduitEstRenseigne(compteVenteProduit(produit, comptes));
  return manqueCharge || manqueVente;
}

export function produitSansComptePourNature(
  produit: Pick<
    Produit,
    | "compteChargeId"
    | "compteVenteId"
    | "compteComptableId"
    | "natureStock"
    | "usageCommercial"
    | "achatSousTraitance"
    | "typeAchat"
  >,
  comptes: CompteComptable[],
  nature: "charge" | "vente",
) {
  if (nature === "vente" && !produitEstVendable(produit)) return false;
  if (nature === "charge" && !typeAchatEstAttendu(produit)) return false;
  const compte =
    nature === "vente"
      ? compteVenteProduit(produit, comptes)
      : compteChargeProduit(produit, comptes);
  return !compteProduitEstRenseigne(compte);
}

export function produitsSansCompteSurLignes(
  lignes: Array<{ produitId?: string; type?: string }>,
  produits: Produit[],
  comptes: CompteComptable[],
  nature: "charge" | "vente",
) {
  const vus = new Set<string>();
  const out: Produit[] = [];
  for (const l of lignes) {
    if (l.type && l.type !== "produit") continue;
    if (!l.produitId || vus.has(l.produitId)) continue;
    const produit = produits.find((p) => p.id === l.produitId);
    if (!produit) continue;
    if (produitSansComptePourNature(produit, comptes, nature)) {
      vus.add(produit.id);
      out.push(produit);
    }
  }
  return out;
}

export function motifComptesProduitInvalides(
  produit: Pick<
    Produit,
    | "typeAchat"
    | "compteChargeId"
    | "compteVenteId"
    | "compteComptableId"
    | "natureStock"
    | "usageCommercial"
    | "achatSousTraitance"
  >,
  comptes: CompteComptable[],
) {
  const manquants: string[] = [];
  if (typeAchatEstAttendu(produit)) {
    const charge = compteChargeProduit(produit, comptes);
    if (!compteProduitEstRenseigne(charge)) {
      manquants.push("le compte de charge (achat)");
    } else if (classeNumeroCompte(charge!.numero) !== "6") {
      manquants.push("un compte de charge de classe 6");
    }
  }
  if (produitEstVendable(produit)) {
    const vente = compteVenteProduit(produit, comptes);
    if (!compteProduitEstRenseigne(vente)) {
      manquants.push("le compte de vente");
    } else if (classeNumeroCompte(vente!.numero) !== "7") {
      manquants.push("un compte de vente de classe 7");
    }
  }
  if (manquants.length === 0) return null;
  if (manquants.length === 1) {
    return `Compte comptable manquant : ${manquants[0]}.`;
  }
  return `Comptes comptables manquants : ${manquants.join(" et ")}.`;
}

export function produitNecessiteMigrationComptes(
  produit: Produit,
  comptes: CompteComptable[],
) {
  return motifComptesProduitInvalides(produit, comptes) != null;
}

export function produitsAMigrerComptes(
  produits: Produit[],
  comptes: CompteComptable[],
) {
  return produits.filter((p) => produitNecessiteMigrationComptes(p, comptes));
}

export function idsComptesUtilisesEnEcriture(ecritures: EcritureComptable[]) {
  const ids = new Set<string>();
  for (const e of ecritures) {
    for (const l of e.lignes) {
      if (l.compteId) ids.add(l.compteId);
    }
  }
  return ids;
}

export function compteUtiliseEnEcriture(
  compteId: string | undefined,
  ecritures: EcritureComptable[],
) {
  if (!compteId) return false;
  return idsComptesUtilisesEnEcriture(ecritures).has(compteId);
}

export function longueurNumeroCompteEffective(
  parametres: Pick<Parametres, "longueurNumeroCompte">,
): number | undefined {
  const n = parametres.longueurNumeroCompte;
  if (n == null || !Number.isFinite(n)) return undefined;
  const i = Math.round(n);
  if (i < LONGUEUR_COMPTE_MIN || i > LONGUEUR_COMPTE_MAX) return undefined;
  return i;
}

export function chiffresNumeroCompte(raw: string) {
  return String(raw ?? "").replace(/\D/g, "");
}

export function completerNumeroCompte(numero: string, longueur: number) {
  const digits = chiffresNumeroCompte(numero);
  if (digits.length >= longueur) return digits;
  return digits.padEnd(longueur, "0");
}

export function numeroCompteValide(numero: string, longueur: number) {
  const digits = chiffresNumeroCompte(numero);
  return digits.length === longueur;
}

export function motifNumeroCompteInvalide(
  numero: string,
  longueur: number | undefined,
) {
  if (longueur == null) {
    return "Fixez d'abord la longueur des numéros de compte (6 à 9 chiffres).";
  }
  const digits = chiffresNumeroCompte(numero);
  if (!digits) return "Le numéro de compte est obligatoire.";
  if (digits.length !== longueur) {
    return `Le numéro doit comporter exactement ${longueur} chiffres.`;
  }
  return null;
}

/** Saisie manuelle : le numéro peut être plus court, il sera complété par des zéros. */
export function motifNumeroCompteSaisie(
  numero: string,
  longueur: number | undefined,
) {
  if (longueur == null) {
    return "Fixez d'abord la longueur des numéros de compte (6 à 9 chiffres).";
  }
  const digits = chiffresNumeroCompte(numero);
  if (!digits) return "Le numéro de compte est obligatoire.";
  if (digits.length > longueur) {
    return `Le numéro ne peut pas dépasser ${longueur} chiffres.`;
  }
  return null;
}

export type PrefixeCompteTiers =
  | typeof PREFIXE_COMPTE_CLIENT
  | typeof PREFIXE_COMPTE_FOURNISSEUR;

export function estCompteFamilleTiers(
  numero: string,
  prefixe: PrefixeCompteTiers,
) {
  return chiffresNumeroCompte(numero).startsWith(prefixe);
}

export function comptesFamilleTiers(
  comptes: CompteComptable[],
  prefixe: PrefixeCompteTiers,
) {
  return comptes
    .filter((c) => estCompteFamilleTiers(c.numero, prefixe))
    .sort((a, b) => a.numero.localeCompare(b.numero));
}

export function prochainNumeroSousCompteTiers(
  prefixe: PrefixeCompteTiers,
  comptes: CompteComptable[],
  longueur: number,
): string | null {
  const racine = completerNumeroCompte(prefixe, longueur);
  const used = new Set(
    comptes
      .map((c) => chiffresNumeroCompte(c.numero))
      .filter((n) => n.length === longueur && n.startsWith(prefixe)),
  );
  const start = Number(racine) + 1;
  const plafondClasse = Number(prefixe + "9".repeat(longueur - prefixe.length));
  for (let i = start; i <= plafondClasse; i++) {
    const num = String(i).padStart(longueur, "0");
    if (!num.startsWith(prefixe)) break;
    if (!used.has(num)) return num;
  }
  return null;
}

export function libelleCompteTiersAuto(
  prefixe: PrefixeCompteTiers,
  nomTiers: string,
) {
  const role = prefixe === PREFIXE_COMPTE_CLIENT ? "Client" : "Fournisseur";
  const nom = nomTiers.trim() || "Tiers";
  return `${role} — ${nom}`;
}

export function tiersUtilisantCompte(
  compteId: string | undefined,
  tiers: Array<Pick<Tiers, "id" | "nom" | "compteClientId" | "compteFournisseurId">>,
  ignoreId?: string,
) {
  if (!compteId || compteId === VALEUR_COMPTE_TIERS_AUTO) return undefined;
  return tiers.find(
    (t) =>
      t.id !== ignoreId &&
      (t.compteClientId === compteId || t.compteFournisseurId === compteId),
  );
}

export function motifCompteTiersIndisponible(
  compteId: string | undefined,
  prefixe: PrefixeCompteTiers,
  comptes: CompteComptable[],
  tiers: Array<Pick<Tiers, "id" | "nom" | "compteClientId" | "compteFournisseurId">>,
  ignoreId?: string,
) {
  if (!compteId || compteId === VALEUR_COMPTE_TIERS_AUTO) return null;
  const compte = comptes.find((c) => c.id === compteId);
  if (!compte) return "Le compte comptable sélectionné est introuvable.";
  if (!estCompteFamilleTiers(compte.numero, prefixe)) {
    return prefixe === PREFIXE_COMPTE_CLIENT
      ? "Le compte client doit être un compte 411 ou un de ses sous-comptes."
      : "Le compte fournisseur doit être un compte 401 ou un de ses sous-comptes.";
  }
  const autre = tiersUtilisantCompte(compteId, tiers, ignoreId);
  if (autre) {
    return `Le compte ${compte.numero} est déjà rattaché au tiers « ${autre.nom} ». Un compte 401/411 ne peut être associé qu'à un seul tiers.`;
  }
  return null;
}

export function motifComptesTiersInvalides(
  data: Pick<Tiers, "roles" | "compteClientId" | "compteFournisseurId">,
  comptes: CompteComptable[],
  tiers: Array<Pick<Tiers, "id" | "nom" | "compteClientId" | "compteFournisseurId">>,
  ignoreId?: string,
  opts?: { exigerClient?: boolean; exigerFournisseur?: boolean },
) {
  const roles = data.roles ?? [];
  const exigerClient = opts?.exigerClient ?? roles.includes("client");
  const exigerFournisseur =
    opts?.exigerFournisseur ?? roles.includes("fournisseur");
  if (roles.includes("client")) {
    if (exigerClient && !data.compteClientId) {
      return "Le compte comptable 411 (clients) est obligatoire pour le rôle Client.";
    }
    const motif = motifCompteTiersIndisponible(
      data.compteClientId,
      PREFIXE_COMPTE_CLIENT,
      comptes,
      tiers,
      ignoreId,
    );
    if (motif) return motif;
  }
  if (roles.includes("fournisseur")) {
    if (exigerFournisseur && !data.compteFournisseurId) {
      return "Le compte comptable 401 (fournisseurs) est obligatoire pour le rôle Fournisseur.";
    }
    const motif = motifCompteTiersIndisponible(
      data.compteFournisseurId,
      PREFIXE_COMPTE_FOURNISSEUR,
      comptes,
      tiers,
      ignoreId,
    );
    if (motif) return motif;
  }
  return null;
}

export function compteClientDuTiers(
  tiers: Pick<Tiers, "compteClientId"> | undefined,
  comptes: CompteComptable[],
) {
  if (!tiers?.compteClientId) return undefined;
  const compte = comptes.find((c) => c.id === tiers.compteClientId);
  if (!compte || !estCompteFamilleTiers(compte.numero, PREFIXE_COMPTE_CLIENT)) {
    return undefined;
  }
  return compte;
}

export function compteFournisseurDuTiers(
  tiers: Pick<Tiers, "compteFournisseurId"> | undefined,
  comptes: CompteComptable[],
) {
  if (!tiers?.compteFournisseurId) return undefined;
  const compte = comptes.find((c) => c.id === tiers.compteFournisseurId);
  if (
    !compte ||
    !estCompteFamilleTiers(compte.numero, PREFIXE_COMPTE_FOURNISSEUR)
  ) {
    return undefined;
  }
  return compte;
}

export function prefixeComptePourRole(role: RoleTiers): PrefixeCompteTiers {
  return role === "client" ? PREFIXE_COMPTE_CLIENT : PREFIXE_COMPTE_FOURNISSEUR;
}

export function compteParNumero(
  comptes: CompteComptable[],
  numero: string,
  ignoreId?: string,
) {
  const n = chiffresNumeroCompte(numero);
  return comptes.find(
    (c) => chiffresNumeroCompte(c.numero) === n && c.id !== ignoreId,
  );
}

export function compteParRole(
  comptes: CompteComptable[],
  role: RoleCompteComptable,
) {
  return comptes.find((c) => (c.roleCompte ?? "general") === role);
}

/** Compte 471 « Comptes d'attente » (préfixe 471, longueur d'entreprise variable). */
export function compteAttente471(comptes: CompteComptable[]) {
  const matches = comptes.filter((c) =>
    chiffresNumeroCompte(c.numero).startsWith("471"),
  );
  if (matches.length === 0) return undefined;
  return [...matches].sort(
    (a, b) =>
      chiffresNumeroCompte(a.numero).length -
      chiffresNumeroCompte(b.numero).length,
  )[0];
}

export function compteImputationDepenseMission(
  d: {
    natureId?: string;
    nature: string;
    compteReclasseId?: string;
  },
  natures: NatureDepenseMission[],
  comptes: CompteComptable[],
) {
  if (d.compteReclasseId) {
    const reclasse = comptes.find((c) => c.id === d.compteReclasseId);
    if (reclasse) return reclasse;
  }
  const catalogue = natureCatalogueDepense(d, natures);
  if (catalogue?.compteChargeId) {
    const associe = comptes.find((c) => c.id === catalogue.compteChargeId);
    if (associe) return associe;
  }
  return compteAttente471(comptes);
}

export function depenseEnAttenteReclassement(
  d: {
    natureId?: string;
    nature: string;
    compteReclasseId?: string;
  },
  natures: NatureDepenseMission[],
) {
  if (d.compteReclasseId) return false;
  const catalogue = natureCatalogueDepense(d, natures);
  if (catalogue?.compteChargeId) return false;
  return true;
}

export function comptesTvaManquants(
  comptes: CompteComptable[],
  parametres: Pick<Parametres, "assujettiTVA" | "regimeFiscal">,
) {
  if (!appliqueTVA(parametres)) return [];
  const manquants: RoleCompteComptable[] = [];
  if (!compteParRole(comptes, "tva_deductible")) {
    manquants.push("tva_deductible");
  }
  if (!compteParRole(comptes, "tva_collectee")) {
    manquants.push("tva_collectee");
  }
  return manquants;
}

export function appliquerRoleUnique(
  comptes: CompteComptable[],
  id: string,
  role: RoleCompteComptable | undefined,
): CompteComptable[] {
  const nextRole = role && role !== "general" ? role : undefined;
  return comptes.map((c) => {
    if (c.id === id) return { ...c, roleCompte: nextRole };
    if (nextRole && c.roleCompte === nextRole) {
      return { ...c, roleCompte: undefined };
    }
    return c;
  });
}

export function produitEstTaxable(
  produit: Pick<Produit, "taxable" | "tauxTVA"> | undefined,
  assujetti: boolean,
) {
  if (!assujetti) return false;
  if (!produit) return true;
  if (produit.taxable != null) return produit.taxable;
  return (produit.tauxTVA ?? 0) > 0;
}

export type LigneVentilation = {
  produitId?: string;
  designation: string;
  ht: number;
  taxable: boolean;
  compteId?: string;
};

export function ventilerFacture(
  facture: Facture,
  produits: Produit[],
  parametres: Parametres,
): LigneVentilation[] {
  const assujetti = appliqueTVA(parametres);
  const lignes = facture.lignes.filter(isLigneProduit);
  const nets = htNetsLignesProduit(
    lignes,
    facture.remiseGlobale ?? 0,
    facture.remiseGlobaleMode,
  );
  return lignes.map((l, i) => {
    const produit = produits.find((p) => p.id === l.produitId);
    return {
      produitId: l.produitId,
      designation: l.designation || produit?.libelleCourt || "Ligne",
      ht: nets[i] ?? 0,
      taxable: produitEstTaxable(produit, assujetti),
    };
  });
}

export function ventilerAchat(
  lignes: Array<
    Pick<
      AchatLigne,
      | "produitId"
      | "designation"
      | "typeAchat"
      | "compteComptableId"
      | "taxable"
      | "quantite"
      | "prixAchatUnitaire"
    >
  >,
  produits: Produit[],
  parametres: Parametres,
): LigneVentilation[] {
  const assujetti = appliqueTVA(parametres);
  return lignes.map((l) => {
    const produit = l.produitId
      ? produits.find((p) => p.id === l.produitId)
      : undefined;
    return {
      produitId: l.produitId,
      designation:
        l.designation ||
        produit?.libelleCourt ||
        produit?.libelleLong ||
        "Article",
      ht: montantHTLigne(l),
      taxable: produit
        ? produitEstTaxable(produit, assujetti)
        : assujetti && l.taxable !== false,
      compteId: l.compteComptableId,
    };
  });
}

export function motifLignesAchatInvalides(
  lignes: AchatLigne[],
  comptes: CompteComptable[],
): string | null {
  if (lignes.length === 0) return "Ajoutez au moins une ligne.";
  for (const l of lignes) {
    if (!(l.quantite > 0)) return "Chaque ligne doit avoir une quantité positive.";
    if (ligneAchatStockee(l)) continue;
    const type = l.typeAchat;
    if (type === "service_general" || type === "immobilisation") {
      if (!l.designation?.trim()) {
        return "Saisissez la désignation de chaque ligne d'achat libre.";
      }
      if (!l.compteComptableId) {
        return "Sélectionnez un compte pour chaque service général ou immobilisation.";
      }
      const compte = comptes.find((c) => c.id === l.compteComptableId);
      if (!compte) return "Un compte d'achat libre est introuvable.";
      const classe = classeNumeroCompte(compte.numero);
      if (type === "immobilisation" && classe !== "2") {
        return "Une immobilisation doit être imputée à un compte de classe 2.";
      }
      if (type === "service_general" && classe !== "6") {
        return "Un service général doit être imputé à un compte de classe 6.";
      }
      continue;
    }
    if (!l.produitId) return "Sélectionnez un produit pour chaque ligne catalogue.";
  }
  return null;
}

function arrondiAr(n: number) {
  return Math.round(n);
}

function ligneEcriture(
  id: string,
  compte: CompteComptable | undefined,
  fallbackLibelle: string,
  debit: number,
  credit: number,
): LigneEcritureComptable {
  const d = Math.max(0, arrondiAr(debit));
  const c = Math.max(0, arrondiAr(credit));
  return {
    id,
    compteId: compte?.id,
    numero: compte?.numero ?? "",
    libelle: compte?.libelle ?? fallbackLibelle,
    debit: d,
    credit: c,
  };
}

function equilibrer(
  lignes: LigneEcritureComptable[],
  contrepartie: {
    id: string;
    compte: CompteComptable | undefined;
    fallbackLibelle: string;
    debitSiPositif: boolean;
  },
) {
  const debit = lignes.reduce((s, l) => s + l.debit, 0);
  const credit = lignes.reduce((s, l) => s + l.credit, 0);
  const ecart = credit - debit;
  if (ecart === 0) return lignes;
  const montant = Math.abs(ecart);
  const debitLigne =
    (ecart > 0) === contrepartie.debitSiPositif ? montant : 0;
  const creditLigne = debitLigne === 0 ? montant : 0;
  return [
    ...lignes,
    ligneEcriture(
      contrepartie.id,
      contrepartie.compte,
      contrepartie.fallbackLibelle,
      debitLigne,
      creditLigne,
    ),
  ];
}

function tauxUnique(factureOuAchat: { tauxTVA?: number }, parametres: Parametres) {
  return factureOuAchat.tauxTVA ?? parametres.tauxTVA ?? 0;
}

function ventilerVersComptes(opts: {
  prefix: string;
  ventilations: LigneVentilation[];
  produits: Produit[];
  comptes: CompteComptable[];
  tauxTVA: number;
  assujetti: boolean;
  /** Vente : crédit des produits ; achat : débit des produits. */
  produitsAuCredit: boolean;
  /** Indépendant du sens débit/crédit (un avoir inverse le sens, pas le compte). */
  natureCompte: "charge" | "vente";
  compteTva: CompteComptable | undefined;
  libelleTva: string;
}): LigneEcritureComptable[] {
  const lignes: LigneEcritureComptable[] = [];
  let tva = 0;
  opts.ventilations.forEach((v, i) => {
    if (v.ht === 0) return;
    const produit = opts.produits.find((p) => p.id === v.produitId);
    const compte = v.compteId
      ? opts.comptes.find((c) => c.id === v.compteId)
      : produit
        ? opts.natureCompte === "vente"
          ? compteVenteProduit(produit, opts.comptes)
          : compteChargeProduit(produit, opts.comptes)
        : undefined;
    if (!compteProduitEstRenseigne(compte)) return;
    const debit = opts.produitsAuCredit ? 0 : v.ht;
    const credit = opts.produitsAuCredit ? v.ht : 0;
    lignes.push(
      ligneEcriture(`${opts.prefix}-p${i}`, compte, compte.libelle, debit, credit),
    );
    if (opts.assujetti && v.taxable) {
      tva += arrondiAr(v.ht * (opts.tauxTVA / 100));
    }
  });
  if (tva > 0) {
    lignes.push(
      ligneEcriture(
        `${opts.prefix}-tva`,
        opts.compteTva,
        opts.compteTva
          ? opts.compteTva.libelle
          : `${opts.libelleTva} (compte manquant)`,
        opts.produitsAuCredit ? 0 : tva,
        opts.produitsAuCredit ? tva : 0,
      ),
    );
  }
  return lignes;
}

export function ecritureDepuisFactureVente(opts: {
  facture: Facture;
  produits: Produit[];
  comptes: CompteComptable[];
  parametres: Parametres;
  clients: Client[];
  tiers?: Tiers[];
}): EcritureComptable | null {
  const { facture } = opts;
  if (!factureEstFiscale(facture) || facture.statut === "annulee") return null;

  const assujetti = appliqueTVA(opts.parametres);
  const avoir = facture.type === "avoir";
  const client = opts.clients.find((c) => c.id === facture.clientId);
  const ficheTiers = opts.tiers?.find((t) => t.id === facture.clientId);
  const nomClient = client ? libelleClient(client) : "Client";
  const compteClient =
    compteClientDuTiers(ficheTiers, opts.comptes) ??
    compteClientDuTiers(client, opts.comptes);
  const ventilations = ventilerFacture(facture, opts.produits, opts.parametres);
  const prefix = `ecr-fac-${facture.id}`;
  const lignesProduits = ventilerVersComptes({
    prefix,
    ventilations,
    produits: opts.produits,
    comptes: opts.comptes,
    tauxTVA: tauxUnique(facture, opts.parametres),
    assujetti,
    produitsAuCredit: !avoir,
    natureCompte: "vente",
    compteTva: compteParRole(opts.comptes, "tva_collectee"),
    libelleTva: "TVA collectée",
  });
  const lignes = equilibrer(lignesProduits, {
    id: `${prefix}-ctp`,
    compte: compteClient,
    fallbackLibelle: avoir
      ? `Contrepartie clients — ${nomClient}`
      : `Clients — ${nomClient}`,
    debitSiPositif: !avoir,
  });
  if (lignes.every((l) => l.debit === 0 && l.credit === 0)) return null;

  return {
    id: prefix,
    date: facture.dateValidation || facture.date,
    libelle: avoir
      ? `Avoir ${facture.numero} — ${nomClient}`
      : `Vente ${facture.numero} — ${nomClient}`,
    piece: facture.numero,
    journal: "vente",
    sourceType: "facture",
    sourceId: facture.id,
    lignes,
  };
}

export function ecritureDepuisAchat(opts: {
  achat: Achat;
  produits: Produit[];
  comptes: CompteComptable[];
  parametres: Parametres;
  fournisseurs: Fournisseur[];
  tiers?: Tiers[];
}): EcritureComptable | null {
  const { achat } = opts;
  if (achat.statut !== "valide") return null;
  const assujetti = appliqueTVA(opts.parametres);
  const fournisseur = opts.fournisseurs.find((f) => f.id === achat.fournisseurId);
  const ficheTiers = opts.tiers?.find((t) => t.id === achat.fournisseurId);
  const nom = fournisseur?.nom ?? "Fournisseur";
  const compteFournisseur =
    compteFournisseurDuTiers(ficheTiers, opts.comptes) ??
    compteFournisseurDuTiers(fournisseur, opts.comptes);
  const ventilations = ventilerAchat(achat.lignes, opts.produits, opts.parametres);
  const prefix = `ecr-ach-${achat.id}`;
  const lignesProduits = ventilerVersComptes({
    prefix,
    ventilations,
    produits: opts.produits,
    comptes: opts.comptes,
    tauxTVA: tauxUnique(achat, opts.parametres),
    assujetti,
    produitsAuCredit: false,
    natureCompte: "charge",
    compteTva: compteParRole(opts.comptes, "tva_deductible"),
    libelleTva: "TVA déductible",
  });
  const lignes = equilibrer(lignesProduits, {
    id: `${prefix}-ctp`,
    compte: compteFournisseur,
    fallbackLibelle: `Fournisseurs — ${nom}`,
    debitSiPositif: false,
  });
  if (lignes.every((l) => l.debit === 0 && l.credit === 0)) return null;
  return {
    id: prefix,
    date: achat.dateValidation || achat.date,
    libelle: `Achat ${achat.numero} — ${nom}`,
    piece: achat.numero,
    journal: "achat",
    sourceType: "achat",
    sourceId: achat.id,
    lignes,
  };
}

export function ecritureDepuisAvoirAchat(opts: {
  achat: Achat;
  avoir: AvoirAchat;
  produits: Produit[];
  comptes: CompteComptable[];
  parametres: Parametres;
  fournisseurs: Fournisseur[];
  tiers?: Tiers[];
}): EcritureComptable | null {
  const { achat, avoir } = opts;
  if (achat.statut !== "valide" || avoir.statut !== "valide") return null;
  const assujetti = appliqueTVA(opts.parametres);
  const fournisseur = opts.fournisseurs.find((f) => f.id === achat.fournisseurId);
  const ficheTiers = opts.tiers?.find((t) => t.id === achat.fournisseurId);
  const nom = fournisseur?.nom ?? "Fournisseur";
  const compteFournisseur =
    compteFournisseurDuTiers(ficheTiers, opts.comptes) ??
    compteFournisseurDuTiers(fournisseur, opts.comptes);
  const ventilations = ventilerAchat(avoir.lignes, opts.produits, opts.parametres);
  const prefix = `ecr-avr-${avoir.id}`;
  const lignesProduits = ventilerVersComptes({
    prefix,
    ventilations,
    produits: opts.produits,
    comptes: opts.comptes,
    tauxTVA: tauxUnique(achat, opts.parametres),
    assujetti,
    produitsAuCredit: true,
    natureCompte: "charge",
    compteTva: compteParRole(opts.comptes, "tva_deductible"),
    libelleTva: "TVA déductible",
  });
  const lignes = equilibrer(lignesProduits, {
    id: `${prefix}-ctp`,
    compte: compteFournisseur,
    fallbackLibelle: `Fournisseurs — ${nom}`,
    debitSiPositif: true,
  });
  if (lignes.every((l) => l.debit === 0 && l.credit === 0)) return null;
  return {
    id: prefix,
    date: avoir.date,
    libelle: `Avoir ${avoir.numero} — ${nom} (${achat.numero})`,
    piece: avoir.numero,
    journal: "achat",
    sourceType: "avoir_achat",
    sourceId: avoir.id,
    lignes,
  };
}

function ecritureMissionFournisseur(opts: {
  mission: MissionAchat;
  fournisseurId: string;
  lignes: MissionAchat["achatsRealises"];
  produits: Produit[];
  comptes: CompteComptable[];
  parametres: Parametres;
  tiers?: Tiers[];
  contre: boolean;
}): EcritureComptable | null {
  const { mission, fournisseurId, contre } = opts;
  const fiche = opts.tiers?.find((t) => t.id === fournisseurId);
  const nom = fiche?.nom ?? TIERS_DIVERS_MARCHE_NOM;
  const ventilations = ventilerAchat(
    opts.lignes.map((l) => ({
      produitId: l.produitId,
      designation: opts.produits.find((p) => p.id === l.produitId)?.libelleCourt ?? "Article",
      quantite: l.quantite,
      prixAchatUnitaire: l.prixUnitaire,
    })),
    opts.produits,
    { ...opts.parametres, assujettiTVA: false },
  );
  const prefix = contre
    ? `ecr-mis-ann-${mission.id}-${fournisseurId}`
    : `ecr-mis-${mission.id}-${fournisseurId}`;
  const lignesProduits = ventilerVersComptes({
    prefix,
    ventilations,
    produits: opts.produits,
    comptes: opts.comptes,
    tauxTVA: 0,
    assujetti: false,
    produitsAuCredit: contre,
    natureCompte: "charge",
    compteTva: undefined,
    libelleTva: "TVA déductible",
  });
  const lignes = equilibrer(lignesProduits, {
    id: `${prefix}-ctp`,
    compte: compteFournisseurDuTiers(fiche, opts.comptes),
    fallbackLibelle: `Fournisseurs — ${nom}`,
    debitSiPositif: contre,
  });
  if (lignes.every((l) => l.debit === 0 && l.credit === 0)) return null;
  return {
    id: prefix,
    date: contre
      ? (mission.dateAnnulation ?? mission.dateCloture ?? mission.date)
      : (mission.dateCloture ?? mission.date),
    libelle: contre
      ? `Annulation mission ${mission.numero} — ${nom}`
      : `Mission ${mission.numero} — ${nom}`,
    piece: mission.numero,
    journal: "achat",
    sourceType: "mission_achat",
    sourceId: mission.id,
    lignes,
  };
}

export function ecrituresDepuisMission(opts: {
  mission: MissionAchat;
  produits: Produit[];
  comptes: CompteComptable[];
  parametres: Parametres;
  tiers?: Tiers[];
  naturesDepense?: NatureDepenseMission[];
}): EcritureComptable[] {
  const { mission } = opts;
  if (mission.statut !== "cloture" && mission.statut !== "cloture_annule") return [];
  const parFournisseur = new Map<string, MissionAchat["achatsRealises"]>();
  for (const l of mission.achatsRealises) {
    if (l.quantite <= 0 || montantLigneRealisee(l) <= 0) continue;
    const arr = parFournisseur.get(l.fournisseurId) ?? [];
    arr.push(l);
    parFournisseur.set(l.fournisseurId, arr);
  }
  const out: EcritureComptable[] = [];
  for (const [fournisseurId, lignes] of parFournisseur) {
    const e = ecritureMissionFournisseur({
      ...opts,
      fournisseurId,
      lignes,
      contre: false,
    });
    if (e && ecritureEstEquilibree(e)) out.push(e);
    if (mission.statut === "cloture_annule") {
      const ev = ecritureMissionFournisseur({
        ...opts,
        fournisseurId,
        lignes,
        contre: true,
      });
      if (ev && ecritureEstEquilibree(ev)) out.push(ev);
    }
  }
  for (const d of mission.depensesDiverses) {
    if (!(d.montant > 0) || !d.fournisseurId) continue;
    const e = ecritureMissionDepense({
      ...opts,
      depense: d,
      contre: false,
    });
    if (e && ecritureEstEquilibree(e)) out.push(e);
    if (mission.statut === "cloture_annule") {
      const ev = ecritureMissionDepense({
        ...opts,
        depense: d,
        contre: true,
      });
      if (ev && ecritureEstEquilibree(ev)) out.push(ev);
    }
  }
  return out;
}

function ecritureMissionDepense(opts: {
  mission: MissionAchat;
  depense: MissionAchat["depensesDiverses"][number];
  comptes: CompteComptable[];
  tiers?: Tiers[];
  naturesDepense?: NatureDepenseMission[];
  contre: boolean;
}): EcritureComptable | null {
  const { mission, depense, contre } = opts;
  const natures = opts.naturesDepense ?? [];
  const fiche = opts.tiers?.find((t) => t.id === depense.fournisseurId);
  const nom = fiche?.nom ?? TIERS_DIVERS_MARCHE_NOM;
  const compteCharge = compteImputationDepenseMission(
    depense,
    natures,
    opts.comptes,
  );
  const compteFournisseur = compteFournisseurDuTiers(fiche, opts.comptes);
  const prefix = contre
    ? `ecr-mis-dep-ann-${mission.id}-${depense.id}`
    : `ecr-mis-dep-${mission.id}-${depense.id}`;
  const ht = Math.round(depense.montant);
  if (ht <= 0) return null;
  const libNature = libelleNatureDepense(depense, natures) || "Dépense diverse";
  const lignes: LigneEcritureComptable[] = [
    ligneEcriture(
      `${prefix}-ch`,
      compteCharge,
      compteCharge?.libelle ??
        (depenseEnAttenteReclassement(depense, natures)
          ? "Compte d'attente 471"
          : libNature),
      contre ? 0 : ht,
      contre ? ht : 0,
    ),
  ];
  const equilibrees = equilibrer(lignes, {
    id: `${prefix}-ctp`,
    compte: compteFournisseur,
    fallbackLibelle: `Fournisseurs — ${nom}`,
    debitSiPositif: contre,
  });
  if (equilibrees.every((l) => l.debit === 0 && l.credit === 0)) return null;
  return {
    id: prefix,
    date: contre
      ? (mission.dateAnnulation ?? mission.dateCloture ?? mission.date)
      : (mission.dateCloture ?? depense.date ?? mission.date),
    libelle: contre
      ? `Annulation mission ${mission.numero} — ${libNature}`
      : `Mission ${mission.numero} — ${libNature}`,
    piece: mission.numero,
    journal: "achat",
    sourceType: "mission_achat_depense",
    sourceId: depense.id,
    lignes: equilibrees,
  };
}

export const JOURNAL_SYSTEME_LABELS: Record<"vente" | "achat", string> = {
  vente: "Vente",
  achat: "Achat",
};

const JOURNAL_TRESORERIE_FALLBACK_LABELS: Record<string, string> = {
  banque: "Banque",
  caisse: "Caisse",
  mobile_monnaie: "Mobile monnaie",
};

export function libelleJournalEcriture(
  journal: string,
  journaux: JournalTresorerie[] = [],
) {
  if (journal === "vente" || journal === "achat") {
    return JOURNAL_SYSTEME_LABELS[journal];
  }
  const j = journaux.find((x) => x.id === journal);
  if (j) return j.libelle;
  return JOURNAL_TRESORERIE_FALLBACK_LABELS[journal] ?? journal;
}

export function optionsJournauxEcriture(
  journaux: JournalTresorerie[],
  extraIds: string[] = [],
) {
  const out: { id: string; libelle: string }[] = [
    { id: "vente", libelle: JOURNAL_SYSTEME_LABELS.vente },
    { id: "achat", libelle: JOURNAL_SYSTEME_LABELS.achat },
  ];
  const seen = new Set(["vente", "achat"]);
  for (const j of journauxTresorerieTries(journaux)) {
    if (journalTresorerieEstPartage(j) && !extraIds.includes(j.id)) continue;
    seen.add(j.id);
    out.push({ id: j.id, libelle: j.libelle });
  }
  for (const id of extraIds) {
    if (!id || id === "tous" || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, libelle: libelleJournalEcriture(id, journaux) });
  }
  return out;
}

export function journalTresorerieDuType(
  type: TypeCompteTresorerie,
): JournalEcriture {
  return type;
}

export function journalEcritureDuCompteTresorerie(
  compte: CompteTresorerie | undefined,
  journaux: JournalTresorerie[],
): JournalEcriture {
  if (!compte) return "banque";
  const dedie = journaux.find((j) => j.compteTresorerieId === compte.id);
  if (dedie) return dedie.id;
  if (compte.journalTresorerieId) {
    const lie = journaux.find((j) => j.id === compte.journalTresorerieId);
    if (lie && !journalTresorerieEstPartage(lie)) return lie.id;
  }
  return idJournalDedieCompte(compte.id);
}

export function prefixeCompteTresorerie(type: TypeCompteTresorerie) {
  if (type === "caisse") return "53";
  if (type === "mobile_monnaie") return "531";
  return "512";
}

export function compteComptableDuCompteTresorerie(
  compte: CompteTresorerie | undefined,
  comptes: CompteComptable[],
) {
  if (!compte) return undefined;
  if (compte.compteComptableId) {
    const lie = comptes.find((c) => c.id === compte.compteComptableId);
    if (lie && classeNumeroCompte(lie.numero) === "5") return lie;
  }
  const prefix = prefixeCompteTresorerie(compte.type);
  return (
    compteParPrefixe(comptes, prefix) ??
    (compte.type === "mobile_monnaie" ? compteParPrefixe(comptes, "512") : undefined)
  );
}

function compteClientPourId(
  id: string | undefined,
  clients: Client[],
  tiers: Tiers[] | undefined,
  comptes: CompteComptable[],
) {
  if (!id) return compteParPrefixe(comptes, PREFIXE_COMPTE_CLIENT);
  const client = clients.find((c) => c.id === id);
  const fiche = tiers?.find((t) => t.id === id);
  return (
    compteClientDuTiers(fiche, comptes) ??
    compteClientDuTiers(client, comptes) ??
    compteParPrefixe(comptes, PREFIXE_COMPTE_CLIENT)
  );
}

function compteFournisseurPourId(
  id: string | undefined,
  fournisseurs: Fournisseur[],
  tiers: Tiers[] | undefined,
  comptes: CompteComptable[],
) {
  if (!id) return compteParPrefixe(comptes, PREFIXE_COMPTE_FOURNISSEUR);
  const fournisseur = fournisseurs.find((f) => f.id === id);
  const fiche = tiers?.find((t) => t.id === id);
  return (
    compteFournisseurDuTiers(fiche, comptes) ??
    compteFournisseurDuTiers(fournisseur, comptes) ??
    compteParPrefixe(comptes, PREFIXE_COMPTE_FOURNISSEUR)
  );
}

export function ecritureDepuisMouvementTresorerie(opts: {
  mouvement: MouvementTresorerie;
  comptesTresorerie: CompteTresorerie[];
  journauxTresorerie?: JournalTresorerie[];
  comptes: CompteComptable[];
  factures: Facture[];
  achats: Achat[];
  acomptes: Acompte[];
  lots: LotPaiementFournisseur[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  tiers?: Tiers[];
}): EcritureComptable | null {
  const m = opts.mouvement;
  const montant = arrondiAr(Math.abs(m.montant));
  if (montant <= 0) return null;
  const caisse = opts.comptesTresorerie.find((c) => c.id === m.compteTresorerieId);
  const compteTreso = compteComptableDuCompteTresorerie(caisse, opts.comptes);
  if (!compteTreso?.numero) return null;

  let contre: CompteComptable | undefined;
  if (m.source === "facture") {
    const f = opts.factures.find((x) => x.id === m.sourceId);
    if (!f || !factureEstFiscale(f) || f.statut === "annulee") return null;
    contre = compteClientPourId(f.clientId, opts.clients, opts.tiers, opts.comptes);
  } else if (m.source === "acompte") {
    const a = opts.acomptes.find((x) => x.id === m.sourceId);
    if (!a || a.statut === "annule") return null;
    contre = compteClientPourId(a.clientId, opts.clients, opts.tiers, opts.comptes);
  } else if (m.source === "achat") {
    const a = opts.achats.find((x) => x.id === m.sourceId);
    if (!a || a.statut !== "valide") return null;
    contre = compteFournisseurPourId(
      a.fournisseurId,
      opts.fournisseurs,
      opts.tiers,
      opts.comptes,
    );
  } else if (m.source === "avoir_achat") {
    const parent = opts.achats.find((x) =>
      (x.avoirs ?? []).some((av) => av.id === m.sourceId),
    );
    const avoir = parent?.avoirs.find((av) => av.id === m.sourceId);
    if (!parent || parent.statut !== "valide" || avoir?.statut !== "valide") {
      return null;
    }
    contre = compteFournisseurPourId(
      parent.fournisseurId,
      opts.fournisseurs,
      opts.tiers,
      opts.comptes,
    );
  } else if (m.source === "lot_paiement") {
    const lot = opts.lots.find((x) => x.id === m.sourceId);
    if (!lot || lot.statut !== "actif") return null;
    contre = compteFournisseurPourId(
      lot.fournisseurId,
      opts.fournisseurs,
      opts.tiers,
      opts.comptes,
    );
  } else if (m.source === "mission") {
    contre = compteAttente471(opts.comptes);
  }
  if (!contre?.numero) return null;

  const entree = m.sens === "entree";
  const prefix = `ecr-trs-${m.id}`;
  const lignes = [
    ligneEcriture(
      `${prefix}-tr`,
      compteTreso,
      compteTreso.libelle,
      entree ? montant : 0,
      entree ? 0 : montant,
    ),
    ligneEcriture(
      `${prefix}-ctp`,
      contre,
      contre.libelle,
      entree ? 0 : montant,
      entree ? montant : 0,
    ),
  ];
  return {
    id: prefix,
    date: m.date,
    libelle: m.libelle,
    piece: m.reference || m.lignePaiementId,
    journal: journalEcritureDuCompteTresorerie(
      caisse,
      opts.journauxTresorerie ?? [],
    ),
    sourceType: "tresorerie",
    sourceId: m.id,
    lignes,
  };
}

export function totauxEcriture(e: Pick<EcritureComptable, "lignes">) {
  return e.lignes.reduce(
    (acc, l) => ({
      debit: acc.debit + l.debit,
      credit: acc.credit + l.credit,
    }),
    { debit: 0, credit: 0 },
  );
}

export function ecritureEstEquilibree(e: Pick<EcritureComptable, "lignes">) {
  const { debit, credit } = totauxEcriture(e);
  return debit === credit && debit > 0;
}

export function ecritureEstTransferee(e: Pick<EcritureComptable, "transferee">) {
  return Boolean(e.transferee);
}

export function ecritureDepuisSortieAtelier(opts: {
  sortie: SortieAtelier;
  produits: Produit[];
  comptes: CompteComptable[];
}): EcritureComptable | null {
  const { sortie, produits, comptes } = opts;
  const montant = Math.round(Math.abs(sortie.valeur) || 0);
  if (montant <= 0) return null;
  const produit = produits.find((p) => p.id === sortie.produitId);
  const charge =
    (produit ? compteChargeProduit(produit, comptes) : undefined) ??
    compteChargeDefautPourType(produit?.typeAchat ?? "outillage", comptes);
  const contrepartie =
    compteParPrefixe(comptes, "603") ?? compteParPrefixe(comptes, "32");
  if (!compteProduitEstRenseigne(charge) || !compteProduitEstRenseigne(contrepartie)) {
    return null;
  }
  const prefix = `ecr-sat-${sortie.id}`;
  const lignes = [
    ligneEcriture(`${prefix}-ch`, charge, charge.libelle, montant, 0),
    ligneEcriture(`${prefix}-st`, contrepartie, contrepartie.libelle, 0, montant),
  ];
  return {
    id: prefix,
    date: sortie.date,
    libelle: `Sortie atelier — ${sortie.motif}`,
    piece: sortie.id,
    journal: "achat",
    sourceType: "sortie_atelier",
    sourceId: sortie.id,
    lignes,
  };
}

export function regenererEcrituresComptables(opts: {
  factures: Facture[];
  achats: Achat[];
  produits: Produit[];
  comptesComptables: CompteComptable[];
  parametres: Parametres;
  clients: Client[];
  fournisseurs: Fournisseur[];
  tiers?: Tiers[];
  missionsAchat?: MissionAchat[];
  naturesDepenseMission?: NatureDepenseMission[];
  sortiesAtelier?: SortieAtelier[];
  existantes?: EcritureComptable[];
  comptesTresorerie?: CompteTresorerie[];
  journauxTresorerie?: JournalTresorerie[];
  acomptes?: Acompte[];
  lotsPaiementFournisseur?: LotPaiementFournisseur[];
  modesPaiement?: ModePaiementParam[];
}): EcritureComptable[] {
  if (!moduleComptabiliteActif(opts.parametres)) {
    return (opts.existantes ?? []).filter(ecritureEstTransferee);
  }
  const generees: EcritureComptable[] = [];
  for (const facture of opts.factures) {
    const e = ecritureDepuisFactureVente({
      facture,
      produits: opts.produits,
      comptes: opts.comptesComptables,
      parametres: opts.parametres,
      clients: opts.clients,
      tiers: opts.tiers,
    });
    if (e && ecritureEstEquilibree(e)) generees.push(e);
  }
  for (const achat of opts.achats) {
    const e = ecritureDepuisAchat({
      achat,
      produits: opts.produits,
      comptes: opts.comptesComptables,
      parametres: opts.parametres,
      fournisseurs: opts.fournisseurs,
      tiers: opts.tiers,
    });
    if (e && ecritureEstEquilibree(e)) generees.push(e);
    for (const avoir of achat.avoirs ?? []) {
      const ev = ecritureDepuisAvoirAchat({
        achat,
        avoir,
        produits: opts.produits,
        comptes: opts.comptesComptables,
        parametres: opts.parametres,
        fournisseurs: opts.fournisseurs,
        tiers: opts.tiers,
      });
      if (ev && ecritureEstEquilibree(ev)) generees.push(ev);
    }
  }
  for (const mission of opts.missionsAchat ?? []) {
    for (const e of ecrituresDepuisMission({
      mission,
      produits: opts.produits,
      comptes: opts.comptesComptables,
      parametres: opts.parametres,
      tiers: opts.tiers,
      naturesDepense: opts.naturesDepenseMission,
    })) {
      generees.push(e);
    }
  }
  for (const sortie of opts.sortiesAtelier ?? []) {
    const e = ecritureDepuisSortieAtelier({
      sortie,
      produits: opts.produits,
      comptes: opts.comptesComptables,
    });
    if (e && ecritureEstEquilibree(e)) generees.push(e);
  }
  for (const mvt of tousMouvementsTresorerie({
    achats: opts.achats,
    factures: opts.factures,
    acomptes: opts.acomptes ?? [],
    missions: opts.missionsAchat,
    lotsPaiement: opts.lotsPaiementFournisseur,
    modes: opts.modesPaiement ?? [],
  })) {
    const e = ecritureDepuisMouvementTresorerie({
      mouvement: mvt,
      comptesTresorerie: opts.comptesTresorerie ?? [],
      journauxTresorerie: opts.journauxTresorerie ?? [],
      comptes: opts.comptesComptables,
      factures: opts.factures,
      achats: opts.achats,
      acomptes: opts.acomptes ?? [],
      lots: opts.lotsPaiementFournisseur ?? [],
      clients: opts.clients,
      fournisseurs: opts.fournisseurs,
      tiers: opts.tiers,
    });
    if (e && ecritureEstEquilibree(e)) generees.push(e);
  }
  const prevById = new Map((opts.existantes ?? []).map((e) => [e.id, e]));
  const used = new Set<string>();
  const out: EcritureComptable[] = [];
  for (const e of generees) {
    const prev = prevById.get(e.id);
    if (prev && ecritureEstTransferee(prev)) {
      out.push(prev);
    } else {
      out.push({
        ...e,
        transferee: prev?.transferee,
        transfertId: prev?.transfertId,
        transfereeAt: prev?.transfereeAt,
      });
    }
    used.add(e.id);
  }
  for (const prev of opts.existantes ?? []) {
    if (ecritureEstTransferee(prev) && !used.has(prev.id)) out.push(prev);
  }
  return out.sort((a, b) => {
    const da = a.date.localeCompare(b.date);
    if (da !== 0) return da;
    return a.piece.localeCompare(b.piece);
  });
}

export function filtrerEcrituresComptables(
  ecritures: EcritureComptable[],
  filtre: {
    journal?: JournalEcriture | "tous";
    debut?: string;
    fin?: string;
    statut?: "tous" | "transferee" | "en_attente";
  },
) {
  return ecritures.filter((e) => {
    if (filtre.journal && filtre.journal !== "tous" && e.journal !== filtre.journal) {
      return false;
    }
    const d = e.date.slice(0, 10);
    if (filtre.debut && d < filtre.debut) return false;
    if (filtre.fin && d > filtre.fin) return false;
    if (filtre.statut === "transferee" && !ecritureEstTransferee(e)) return false;
    if (filtre.statut === "en_attente" && ecritureEstTransferee(e)) return false;
    return true;
  });
}

export function lignesExportEcritures(
  ecritures: EcritureComptable[],
  journaux: JournalTresorerie[] = [],
) {
  const rows: (string | number)[][] = [
    [
      "Date",
      "Journal",
      "Pièce",
      "Libellé",
      "N° compte",
      "Libellé compte",
      "Débit",
      "Crédit",
    ],
  ];
  for (const e of ecritures) {
    for (const l of e.lignes) {
      rows.push([
        e.date.slice(0, 10),
        libelleJournalEcriture(e.journal, journaux),
        e.piece,
        e.libelle,
        l.numero,
        l.libelle,
        l.debit || "",
        l.credit || "",
      ]);
    }
  }
  return rows;
}

export type LigneCsvPlan = { numero: string; libelle: string };

export function validerImportPlanComptable(
  lignes: LigneCsvPlan[],
  existants: CompteComptable[],
  longueur: number,
  opts?: {
    /** En cas de collision après zéros à droite, garder le numéro source le plus long (11 vs 110). */
    prefererNumeroSourcePlusLong?: boolean;
    /** Numéros déjà présents mais remplaçables (comptes de repli 600000/700000 inutilisés). */
    numerosAbsorbables?: Set<string>;
  },
):
  | { ok: true; comptes: LigneCsvPlan[] }
  | { ok: false; reason: string } {
  if (lignes.length === 0) {
    return { ok: false, reason: "Import annulé : aucun compte à importer." };
  }
  const prepares = new Map<string, { numero: string; libelle: string; sourceLen: number }>();
  const conflits: string[] = [];
  const internes: string[] = [];
  const invalides: string[] = [];
  const absorbables = opts?.numerosAbsorbables ?? new Set<string>();

  for (const row of lignes) {
    const numero = completerNumeroCompte(row.numero, longueur);
    const motif = motifNumeroCompteInvalide(numero, longueur);
    if (motif) {
      invalides.push(`${row.numero} : ${motif}`);
      continue;
    }
    const sourceLen = chiffresNumeroCompte(row.numero).length;
    const deja = prepares.get(numero);
    if (deja) {
      if (
        opts?.prefererNumeroSourcePlusLong &&
        sourceLen !== deja.sourceLen
      ) {
        if (sourceLen > deja.sourceLen) {
          prepares.set(numero, { numero, libelle: row.libelle, sourceLen });
        }
        continue;
      }
      internes.push(numero);
      continue;
    }
    prepares.set(numero, { numero, libelle: row.libelle, sourceLen });
    const existant = compteParNumero(existants, numero);
    if (existant && !absorbables.has(existant.numero) && !absorbables.has(numero)) {
      conflits.push(numero);
    }
  }

  if (invalides.length === 0 && internes.length === 0 && conflits.length === 0) {
    return {
      ok: true,
      comptes: [...prepares.values()].map(({ numero, libelle }) => ({
        numero,
        libelle,
      })),
    };
  }

  const parts: string[] = [
    "Import annulé : aucun compte n'a été créé.",
  ];
  if (conflits.length) {
    const apercu = conflits.slice(0, 25).join(", ");
    const reste =
      conflits.length > 25 ? ` et ${conflits.length - 25} autre(s)` : "";
    parts.push(
      `Numéro(s) déjà présent(s) dans le plan : ${apercu}${reste}.`,
    );
  }
  if (internes.length) {
    parts.push(
      `Doublon(s) dans le fichier : ${[...new Set(internes)].join(", ")}.`,
    );
  }
  if (invalides.length) {
    parts.push(invalides.slice(0, 8).join(" "));
    if (invalides.length > 8) {
      parts.push(`(+ ${invalides.length - 8} autre(s) ligne(s) invalide(s).)`);
    }
  }
  return { ok: false, reason: parts.join(" ") };
}

export function migrerProduitComptes(
  produit: Produit,
  comptes: CompteComptable[],
): Produit {
  const legacy = produit.compteComptableId
    ? comptes.find((c) => c.id === produit.compteComptableId)
    : undefined;
  const classeLegacy = legacy ? classeNumeroCompte(legacy.numero) : "";

  let chargeId = produit.compteChargeId;
  let venteId = produit.compteVenteId;
  if (!chargeId && classeLegacy === "6" && legacy) chargeId = legacy.id;
  if (!venteId && classeLegacy === "7" && legacy) venteId = legacy.id;
  if (!typeAchatEstAttendu(produit)) chargeId = undefined;
  if (!produitEstVendable(produit)) venteId = undefined;
  const typeAchat = typeAchatEstAttendu(produit)
    ? (produit.typeAchat ?? "marchandises")
    : produit.typeAchat;

  if (
    chargeId === produit.compteChargeId &&
    venteId === produit.compteVenteId &&
    typeAchat === produit.typeAchat
  ) {
    return produit;
  }
  return {
    ...produit,
    compteChargeId: chargeId,
    compteVenteId: venteId,
    typeAchat,
  };
}

export function parserCsvPlanComptable(texte: string): {
  lignes: LigneCsvPlan[];
  erreurs: string[];
} {
  const raw = texte.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!raw) return { lignes: [], erreurs: ["Fichier vide."] };
  const first = raw.split("\n")[0] ?? "";
  const sep = first.includes(";") ? ";" : first.includes("\t") ? "\t" : ",";
  const lignes: LigneCsvPlan[] = [];
  const erreurs: string[] = [];
  raw.split("\n").forEach((line, idx) => {
    if (!line.trim()) return;
    const cells = splitCsvLine(line, sep);
    const numero = chiffresNumeroCompte(cells[0] ?? "");
    const libelle = (cells[1] ?? "").trim();
    if (idx === 0 && !numero && /numero|n°|compte/i.test(cells[0] ?? "")) {
      return;
    }
    if (!numero) {
      erreurs.push(`Ligne ${idx + 1} : numéro manquant.`);
      return;
    }
    if (!libelle) {
      erreurs.push(`Ligne ${idx + 1} : libellé manquant.`);
      return;
    }
    lignes.push({ numero, libelle });
  });
  return { lignes, erreurs };
}

function splitCsvLine(line: string, sep: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === sep && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function ecrireCsvPlanModele(longueur = LONGUEUR_COMPTE_MIN) {
  const n = Math.min(
    LONGUEUR_COMPTE_MAX,
    Math.max(LONGUEUR_COMPTE_MIN, longueur),
  );
  const deductible = completerNumeroCompte("445620", n);
  const collectee = completerNumeroCompte("445710", n);
  return `numero;libelle\n${deductible};TVA déductible\n${collectee};TVA collectée\n`;
}
