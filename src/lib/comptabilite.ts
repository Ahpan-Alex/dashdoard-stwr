import {
  isLigneProduit,
  htNetsLignesProduit,
  appliqueTVA,
  libelleClient,
} from "./commercial";
import { montantHTLigne } from "./achats";
import { factureEstFiscale } from "./facturation-mg";
import type {
  Achat,
  AvoirAchat,
  Client,
  CompteComptable,
  EcritureComptable,
  Facture,
  Fournisseur,
  LigneEcritureComptable,
  Parametres,
  Produit,
  RoleCompteComptable,
} from "./types";

export const LONGUEUR_COMPTE_MIN = 6;
export const LONGUEUR_COMPTE_MAX = 9;

export const ROLE_COMPTE_LABELS: Record<RoleCompteComptable, string> = {
  general: "Général",
  tva_deductible: "TVA déductible",
  tva_collectee: "TVA collectée",
};

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
  lignes: { produitId: string; quantite: number; prixAchatUnitaire: number }[],
  produits: Produit[],
  parametres: Parametres,
): LigneVentilation[] {
  const assujetti = appliqueTVA(parametres);
  return lignes.map((l) => {
    const produit = produits.find((p) => p.id === l.produitId);
    return {
      produitId: l.produitId,
      designation: produit?.libelleCourt || produit?.libelleLong || "Article",
      ht: montantHTLigne(l),
      taxable: produitEstTaxable(produit, assujetti),
    };
  });
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
  compteTva: CompteComptable | undefined;
  libelleTva: string;
}): LigneEcritureComptable[] {
  const lignes: LigneEcritureComptable[] = [];
  let tva = 0;
  opts.ventilations.forEach((v, i) => {
    if (v.ht === 0) return;
    const produit = opts.produits.find((p) => p.id === v.produitId);
    const compte = opts.comptes.find((c) => c.id === produit?.compteComptableId);
    const libelle = compte
      ? compte.libelle
      : `${v.designation} (sans compte)`;
    const debit = opts.produitsAuCredit ? 0 : v.ht;
    const credit = opts.produitsAuCredit ? v.ht : 0;
    lignes.push(
      ligneEcriture(`${opts.prefix}-p${i}`, compte, libelle, debit, credit),
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
}): EcritureComptable | null {
  const { facture } = opts;
  if (!factureEstFiscale(facture) || facture.statut === "annulee") return null;

  const assujetti = appliqueTVA(opts.parametres);
  const avoir = facture.type === "avoir";
  const client = opts.clients.find((c) => c.id === facture.clientId);
  const nomClient = client ? libelleClient(client) : "Client";
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
    compteTva: compteParRole(opts.comptes, "tva_collectee"),
    libelleTva: "TVA collectée",
  });
  const lignes = equilibrer(lignesProduits, {
    id: `${prefix}-ctp`,
    compte: undefined,
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
}): EcritureComptable | null {
  const { achat } = opts;
  if (achat.statut !== "valide") return null;
  const assujetti = appliqueTVA(opts.parametres);
  const fournisseur = opts.fournisseurs.find((f) => f.id === achat.fournisseurId);
  const nom = fournisseur?.nom ?? "Fournisseur";
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
    compteTva: compteParRole(opts.comptes, "tva_deductible"),
    libelleTva: "TVA déductible",
  });
  const lignes = equilibrer(lignesProduits, {
    id: `${prefix}-ctp`,
    compte: undefined,
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
}): EcritureComptable | null {
  const { achat, avoir } = opts;
  if (achat.statut !== "valide" || avoir.statut !== "valide") return null;
  const assujetti = appliqueTVA(opts.parametres);
  const fournisseur = opts.fournisseurs.find((f) => f.id === achat.fournisseurId);
  const nom = fournisseur?.nom ?? "Fournisseur";
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
    compteTva: compteParRole(opts.comptes, "tva_deductible"),
    libelleTva: "TVA déductible",
  });
  const lignes = equilibrer(lignesProduits, {
    id: `${prefix}-ctp`,
    compte: undefined,
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

export function regenererEcrituresComptables(opts: {
  factures: Facture[];
  achats: Achat[];
  produits: Produit[];
  comptesComptables: CompteComptable[];
  parametres: Parametres;
  clients: Client[];
  fournisseurs: Fournisseur[];
}): EcritureComptable[] {
  const out: EcritureComptable[] = [];
  for (const facture of opts.factures) {
    const e = ecritureDepuisFactureVente({
      facture,
      produits: opts.produits,
      comptes: opts.comptesComptables,
      parametres: opts.parametres,
      clients: opts.clients,
    });
    if (e) out.push(e);
  }
  for (const achat of opts.achats) {
    const e = ecritureDepuisAchat({
      achat,
      produits: opts.produits,
      comptes: opts.comptesComptables,
      parametres: opts.parametres,
      fournisseurs: opts.fournisseurs,
    });
    if (e) out.push(e);
    for (const avoir of achat.avoirs ?? []) {
      const ev = ecritureDepuisAvoirAchat({
        achat,
        avoir,
        produits: opts.produits,
        comptes: opts.comptesComptables,
        parametres: opts.parametres,
        fournisseurs: opts.fournisseurs,
      });
      if (ev) out.push(ev);
    }
  }
  return out.sort((a, b) => {
    const da = a.date.localeCompare(b.date);
    if (da !== 0) return da;
    return a.piece.localeCompare(b.piece);
  });
}

export function totauxEcriture(e: EcritureComptable) {
  return e.lignes.reduce(
    (acc, l) => ({
      debit: acc.debit + l.debit,
      credit: acc.credit + l.credit,
    }),
    { debit: 0, credit: 0 },
  );
}

export function lignesExportEcritures(ecritures: EcritureComptable[]) {
  const rows: (string | number)[][] = [
    ["Date", "Pièce", "Libellé", "N° compte", "Libellé compte", "Débit", "Crédit"],
  ];
  for (const e of ecritures) {
    for (const l of e.lignes) {
      rows.push([
        e.date.slice(0, 10),
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
