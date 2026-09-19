/**
 * Journal d'audit transverse — actions sensibles uniquement.
 * Extensible : toute nouvelle action sensible s'ajoute à ACTIONS_JOURNAL_AUDIT
 * et appelle `enregistrerJournalAudit` depuis le store / l'API.
 * Les entrées sont immuables (API append-only, pas de PUT/DELETE).
 */
import { apiFetch } from "./api";
import { downloadCsv } from "./csv";

export const CATEGORIES_JOURNAL_AUDIT = [
  "suppression",
  "prix",
  "comptabilite",
  "rbac",
  "statut_critique",
] as const;

export const MODULES_JOURNAL_AUDIT = [
  "tiers",
  "produits",
  "commercial",
  "comptabilite",
  "rbac",
  "fabrication",
  "tresorerie",
] as const;

export const ACTIONS_JOURNAL_AUDIT = [
  "suppression_tiers",
  "suppression_produit",
  "suppression_commande",
  "suppression_ecriture",
  "suppression_compte_comptable",
  "modification_prix_vente",
  "remise_exceptionnelle",
  "modification_compte_charge",
  "modification_compte_vente",
  "modification_compte_comptable",
  "changement_role_utilisateur",
  "creation_utilisateur",
  "desactivation_utilisateur",
  "annulation_of_cloture",
  "rejet_cheque_differe",
  "deblocage_plafond_credit",
  "creation_lot_paiement",
  "annulation_lot_paiement",
] as const;

export type CategorieJournalAudit = (typeof CATEGORIES_JOURNAL_AUDIT)[number];
export type ModuleJournalAudit = (typeof MODULES_JOURNAL_AUDIT)[number];
export type ActionJournalAudit = (typeof ACTIONS_JOURNAL_AUDIT)[number];

export const CATEGORIE_JOURNAL_LABELS: Record<CategorieJournalAudit, string> = {
  suppression: "Suppression",
  prix: "Prix / remise",
  comptabilite: "Comptabilité",
  rbac: "Droits utilisateur",
  statut_critique: "Statut critique",
};

export const MODULE_JOURNAL_LABELS: Record<ModuleJournalAudit, string> = {
  tiers: "Tiers",
  produits: "Produits",
  commercial: "Commercial",
  comptabilite: "Comptabilité",
  rbac: "Sécurité / RBAC",
  fabrication: "Fabrication",
  tresorerie: "Trésorerie",
};

export const ACTION_JOURNAL_LABELS: Record<ActionJournalAudit, string> = {
  suppression_tiers: "Suppression d'un tiers",
  suppression_produit: "Suppression d'un produit",
  suppression_commande: "Suppression d'une commande",
  suppression_ecriture: "Suppression d'une écriture comptable",
  suppression_compte_comptable: "Suppression d'un compte du plan",
  modification_prix_vente: "Modification du prix de vente catalogue",
  remise_exceptionnelle: "Remise exceptionnelle sur un document",
  modification_compte_charge: "Modification du compte de charge (classe 6)",
  modification_compte_vente: "Modification du compte de vente (classe 7)",
  modification_compte_comptable: "Modification d'un compte du plan",
  changement_role_utilisateur: "Changement de rôle / droits",
  creation_utilisateur: "Création d'un compte utilisateur",
  desactivation_utilisateur: "Désactivation d'un compte utilisateur",
  annulation_of_cloture: "Annulation d'un OF clôturé",
  rejet_cheque_differe: "Rejet manuel d'un chèque différé",
  deblocage_plafond_credit: "Déblocage manuel d'un dépassement de plafond",
  creation_lot_paiement: "Création d'un paiement groupé fournisseur",
  annulation_lot_paiement: "Annulation d'un paiement groupé fournisseur",
};

export type AuditRetention = {
  suppressionsAnnees?: number | null;
  prixAnnees?: number | null;
  statutsCritiquesAnnees?: number | null;
};

export type JournalAuditPayload = {
  categorie: CategorieJournalAudit;
  action: ActionJournalAudit;
  module: ModuleJournalAudit;
  objetType: string;
  objetId?: string;
  objetLibelle?: string;
  objetHref?: string;
  champ?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  detail?: string;
  siteId?: string;
  siteLibelle?: string;
};

export type EntreeJournalAudit = JournalAuditPayload & {
  id: string;
  date: string;
  userId: string | null;
  userNom: string;
};

export type ListeJournalAudit = {
  total: number;
  page: number;
  pageSize: number;
  items: EntreeJournalAudit[];
};

export type FiltresJournalAudit = {
  userId?: string;
  categorie?: CategorieJournalAudit | "";
  action?: ActionJournalAudit | "";
  module?: ModuleJournalAudit | "";
  siteId?: string;
  objet?: string;
  debut?: string;
  fin?: string;
  page?: number;
  pageSize?: number;
  export?: boolean;
};

/** Catégories jamais purgées, même si une rétention est configurée ailleurs. */
export const CATEGORIES_RETENTION_ILLIMITEE: CategorieJournalAudit[] = [
  "comptabilite",
  "rbac",
];

export function enregistrerJournalAudit(payload: JournalAuditPayload) {
  void apiFetch<{ ok: boolean }>("/business/audit", {
    method: "POST",
    body: JSON.stringify(payload),
  }).catch(() => {
    /* L'action métier a déjà réussi ; l'audit ne doit pas la bloquer. */
  });
}

function queryAudit(filtres: FiltresJournalAudit) {
  const q = new URLSearchParams();
  if (filtres.userId) q.set("userId", filtres.userId);
  if (filtres.categorie) q.set("categorie", filtres.categorie);
  if (filtres.action) q.set("action", filtres.action);
  if (filtres.module) q.set("module", filtres.module);
  if (filtres.siteId) q.set("siteId", filtres.siteId);
  if (filtres.objet?.trim()) q.set("objet", filtres.objet.trim());
  if (filtres.debut) q.set("debut", filtres.debut);
  if (filtres.fin) q.set("fin", filtres.fin);
  if (filtres.page) q.set("page", String(filtres.page));
  if (filtres.pageSize) q.set("pageSize", String(filtres.pageSize));
  if (filtres.export) q.set("export", "1");
  const qs = q.toString();
  return qs ? `/business/audit?${qs}` : "/business/audit";
}

export function listerJournalAudit(filtres: FiltresJournalAudit = {}) {
  return apiFetch<ListeJournalAudit>(queryAudit(filtres));
}

export function libelleActionAudit(action: string) {
  return ACTION_JOURNAL_LABELS[action as ActionJournalAudit] ?? action;
}

export function libelleCategorieAudit(categorie: string) {
  return CATEGORIE_JOURNAL_LABELS[categorie as CategorieJournalAudit] ?? categorie;
}

export function libelleModuleAudit(module: string) {
  return MODULE_JOURNAL_LABELS[module as ModuleJournalAudit] ?? module;
}

export function texteAvantApres(e: Pick<EntreeJournalAudit, "ancienneValeur" | "nouvelleValeur" | "champ">) {
  if (!e.ancienneValeur && !e.nouvelleValeur) return "—";
  const champ = e.champ ? `${e.champ} : ` : "";
  return `${champ}${e.ancienneValeur || "—"} → ${e.nouvelleValeur || "—"}`;
}

export function resumeRemisesDocument(doc: {
  remiseGlobale?: number;
  remiseGlobaleMode?: string;
  lignes?: Array<{
    designation?: string;
    remisePercent?: number;
    remiseMontant?: number;
  }>;
}) {
  const parts: string[] = [];
  const g = Number(doc.remiseGlobale) || 0;
  if (g > 0) {
    parts.push(
      doc.remiseGlobaleMode === "montant"
        ? `Globale ${g} Ar`
        : `Globale ${g} %`,
    );
  }
  for (const l of doc.lignes ?? []) {
    const pct = Number(l.remisePercent) || 0;
    const mt = Number(l.remiseMontant) || 0;
    if (pct > 0) parts.push(`${l.designation || "Ligne"} : ${pct} %`);
    else if (mt > 0) parts.push(`${l.designation || "Ligne"} : ${mt} Ar`);
  }
  return parts.join(" · ");
}

export function telechargerCsvJournalAudit(lignes: EntreeJournalAudit[]) {
  downloadCsv("journal-audit.csv", [
    [
      "Date",
      "Utilisateur",
      "Catégorie",
      "Action",
      "Module",
      "Objet",
      "Avant",
      "Après",
      "Site",
      "Détail",
    ],
    ...lignes.map((e) => [
      e.date,
      e.userNom,
      libelleCategorieAudit(e.categorie),
      libelleActionAudit(e.action),
      libelleModuleAudit(e.module),
      e.objetLibelle || e.objetId || "",
      e.ancienneValeur || "",
      e.nouvelleValeur || "",
      e.siteLibelle || "",
      e.detail || "",
    ]),
  ]);
}

export async function imprimerPdfJournalAudit(lignes: EntreeJournalAudit[]) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:0;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    iframe.remove();
    throw new Error("Impossible d'ouvrir l'impression.");
  }
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const rows = lignes
    .map(
      (e) => `<tr>
        <td>${esc(new Date(e.date).toLocaleString("fr-FR"))}</td>
        <td>${esc(e.userNom)}</td>
        <td>${esc(libelleActionAudit(e.action))}</td>
        <td>${esc(e.objetLibelle || "—")}</td>
        <td>${esc(texteAvantApres(e))}</td>
        <td>${esc(e.siteLibelle || "—")}</td>
      </tr>`,
    )
    .join("");
  idoc.open();
  idoc.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Journal d'audit</title>
<style>
body{font-family:system-ui,sans-serif;font-size:9pt;color:#0c1f28;margin:0}
h1{font-size:13pt;margin:0 0 8px}
table{width:100%;border-collapse:collapse}
th,td{border:0.4pt solid #c5d0d4;padding:3px 5px;text-align:left;vertical-align:top}
th{background:#eef4f6}
@page{size:A4 landscape;margin:10mm}
</style></head><body>
<h1>Journal d'audit</h1>
<p>${lignes.length} entrée(s) — document non modifiable</p>
<table><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Objet</th><th>Avant → après</th><th>Site</th></tr></thead>
<tbody>${rows || `<tr><td colspan="6">Aucune entrée.</td></tr>`}</tbody></table>
</body></html>`);
  idoc.close();
  try {
    await new Promise((r) => window.setTimeout(r, 80));
    iwin.focus();
    iwin.print();
  } finally {
    const cleanup = () => iframe.remove();
    iwin.addEventListener("afterprint", cleanup);
    window.setTimeout(cleanup, 90_000);
  }
}
