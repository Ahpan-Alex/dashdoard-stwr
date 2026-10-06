import { appliqueTVA } from "./commercial";
import type {
  CompteBancaireTiers,
  DossierStockageTiers,
  FichierStockageTiers,
  NoteEchangeTiers,
  Parametres,
  Tiers,
  TypeNoteTiers,
} from "./types";

export const DEVISE_TIERS_DEFAUT = "Ariary";

export const TYPES_NOTE_TIERS: { id: TypeNoteTiers; label: string }[] = [
  { id: "appel", label: "Appel" },
  { id: "relance", label: "Relance" },
  { id: "visite", label: "Visite" },
  { id: "mail", label: "Mail" },
  { id: "autre", label: "Autre" },
];

export const DOSSIERS_STOCKAGE_DEFAUT: DossierStockageTiers[] = [
  { id: "stk-contrats", nom: "Contrats" },
  { id: "stk-immatriculation", nom: "Immatriculation (NIF/STAT/RCS)" },
  { id: "stk-correspondance", nom: "Correspondance" },
  { id: "stk-autres", nom: "Autres" },
];

const EXTENSIONS_FICHIER_TIERS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
];

export const TAILLE_MAX_FICHIER_TIERS_DEFAUT_OCTETS = 5 * 1024 * 1024;

export function tailleMaxFichierTiersOctets(
  parametres?: Pick<Parametres, "tailleMaxFichierTiersMo"> | null,
): number {
  const mo = parametres?.tailleMaxFichierTiersMo;
  if (mo == null || !Number.isFinite(mo)) return TAILLE_MAX_FICHIER_TIERS_DEFAUT_OCTETS;
  return Math.round(Math.min(15, Math.max(1, mo)) * 1024 * 1024);
}

/** Absent = assujetti. Une exonération échue ne s'applique plus. */
export function tiersSoumisATva(
  tiers?: Pick<Tiers, "assujettiTVA" | "exonerationTVA"> | null,
  aLaDate: Date = new Date(),
): boolean {
  if (!tiers) return true;
  if (tiers.assujettiTVA === false) return false;
  const exo = tiers.exonerationTVA;
  if (!exo?.actif) return true;
  const fin = (exo.dateFin ?? "").slice(0, 10);
  if (!fin) return false;
  const jour = aLaDate.toISOString().slice(0, 10);
  return fin < jour;
}

/**
 * Taux proposé sur un nouveau document.
 * Un taux déjà porté par le document source (devis, commande) est repris tel quel.
 */
export function tauxTvaPourNouveauDocument(opts: {
  parametres: Pick<Parametres, "assujettiTVA" | "regimeFiscal" | "tauxTVA">;
  tiers?: Pick<Tiers, "assujettiTVA" | "exonerationTVA"> | null;
  tauxSource?: number | null;
  date?: Date;
}): number {
  if (opts.tauxSource != null && Number.isFinite(opts.tauxSource)) {
    return opts.tauxSource;
  }
  if (!appliqueTVA(opts.parametres)) return opts.parametres.tauxTVA;
  if (!tiersSoumisATva(opts.tiers, opts.date)) return 0;
  return opts.parametres.tauxTVA;
}

/** Achats : même formule qu'avant, sauf fournisseur non assujetti ou exonéré. */
export function tauxTvaAchatPropose(
  parametres: Pick<Parametres, "assujettiTVA" | "tauxTVA">,
  tiers?: Pick<Tiers, "assujettiTVA" | "exonerationTVA"> | null,
  date?: Date,
): number {
  if (!parametres.assujettiTVA) return 0;
  if (tiers && !tiersSoumisATva(tiers, date)) return 0;
  return parametres.tauxTVA;
}

export function assujettiPourNouveauDocument(opts: {
  parametres: Pick<Parametres, "assujettiTVA" | "regimeFiscal" | "tauxTVA">;
  tiers?: Pick<Tiers, "assujettiTVA" | "exonerationTVA"> | null;
  tauxSource?: number | null;
  date?: Date;
}): boolean {
  if (!appliqueTVA(opts.parametres)) return false;
  if (opts.tauxSource != null && Number.isFinite(opts.tauxSource)) {
    return opts.tauxSource > 0;
  }
  return tiersSoumisATva(opts.tiers, opts.date);
}

export function masquerCoordonneeBancaire(valeur?: string | null): string {
  const v = (valeur ?? "").replace(/\s/g, "");
  if (!v) return "";
  const visibles = v.slice(-4);
  const masque = "•".repeat(Math.max(4, v.length - visibles.length));
  return `${masque}${visibles}`;
}

export function normaliserComptesBancaires(
  liste: CompteBancaireTiers[] | undefined,
): CompteBancaireTiers[] {
  const clean = (liste ?? [])
    .map((c) => ({
      id: c.id,
      banque: c.banque.trim(),
      rib: c.rib?.trim() || undefined,
      iban: c.iban?.trim() || undefined,
      parDefaut: Boolean(c.parDefaut),
    }))
    .filter((c) => c.banque);
  if (clean.length === 0) return [];
  const idx = clean.findIndex((c) => c.parDefaut);
  const def = idx >= 0 ? idx : 0;
  return clean.map((c, i) => ({ ...c, parDefaut: i === def }));
}

function signatureBanques(liste?: CompteBancaireTiers[]) {
  return JSON.stringify(normaliserComptesBancaires(liste));
}

function noteContenuChange(a: NoteEchangeTiers, b: NoteEchangeTiers) {
  return (
    a.date.slice(0, 10) !== b.date.slice(0, 10) ||
    a.type !== b.type ||
    a.commentaire !== b.commentaire
  );
}

export function dossiersStockageTiers(
  tiers: Pick<Tiers, "dossiersStockage">,
): Array<DossierStockageTiers & { systeme: boolean }> {
  const custom = (tiers.dossiersStockage ?? []).filter(
    (d) =>
      d.nom.trim() &&
      !DOSSIERS_STOCKAGE_DEFAUT.some((x) => x.id === d.id),
  );
  return [
    ...DOSSIERS_STOCKAGE_DEFAUT.map((d) => ({ ...d, systeme: true })),
    ...custom.map((d) => ({ id: d.id, nom: d.nom.trim(), systeme: false })),
  ];
}

export function motifFichierStockageTiers(
  fichier: { nom: string; taille: number },
  maxOctets: number,
): string | undefined {
  const nom = fichier.nom.trim().toLowerCase();
  const ok = EXTENSIONS_FICHIER_TIERS.some((ext) => nom.endsWith(ext));
  if (!ok) {
    return "Formats acceptés : PDF, images, Word et Excel.";
  }
  if (fichier.taille <= 0) return "Fichier vide.";
  if (fichier.taille > maxOctets) {
    const mo = Math.round((maxOctets / (1024 * 1024)) * 10) / 10;
    return `Fichier trop volumineux (maximum ${mo} Mo).`;
  }
  return undefined;
}

export function apercuFichierPossible(nom: string, mime: string): "image" | "pdf" | null {
  const n = nom.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(n)) return "image";
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  return null;
}

type Actor = { id?: string; nom?: string };

/**
 * Contrôle les blocs sensibles d'un patch de fiche.
 * Les autres champs passent tels quels : une sauvegarde d'adresse ne touche pas les banques.
 */
export function controlerPatchTiersFiche(opts: {
  prev: Tiers;
  data: Partial<Tiers>;
  actor: Actor;
  peutModifierNotesAutrui: boolean;
  peutModifierBanques: boolean;
}): { ok: true; data: Partial<Tiers>; detail?: string } | { ok: false; reason: string } {
  const data: Partial<Tiers> = { ...opts.data };
  const details: string[] = [];

  if (data.comptesBancaires !== undefined) {
    const next = normaliserComptesBancaires(data.comptesBancaires);
    const change = signatureBanques(opts.prev.comptesBancaires) !== JSON.stringify(next);
    if (change && !opts.peutModifierBanques) {
      return {
        ok: false,
        reason: "Les coordonnées bancaires sont réservées aux rôles habilités.",
      };
    }
    data.comptesBancaires = next;
    if (change) details.push("Coordonnées bancaires");
  }

  if (data.notesEchanges !== undefined) {
    const prev = opts.prev.notesEchanges ?? [];
    const prevById = new Map(prev.map((n) => [n.id, n]));
    const nextIds = new Set(data.notesEchanges.map((n) => n.id));
    for (const n of prev) {
      if (nextIds.has(n.id)) continue;
      if (n.userId && n.userId !== opts.actor.id && !opts.peutModifierNotesAutrui) {
        return {
          ok: false,
          reason: "Seuls l'auteur et les rôles habilités peuvent supprimer cette note.",
        };
      }
      details.push("Suppression d'une note interne");
    }
    const notes: NoteEchangeTiers[] = [];
    for (const n of data.notesEchanges) {
      const avant = prevById.get(n.id);
      if (!avant) {
        notes.push({
          ...n,
          userId: n.userId || opts.actor.id,
          userNom: n.userNom || opts.actor.nom,
        });
        details.push("Note interne");
        continue;
      }
      if (noteContenuChange(avant, n)) {
        if (avant.userId && avant.userId !== opts.actor.id && !opts.peutModifierNotesAutrui) {
          return {
            ok: false,
            reason: "Seuls l'auteur et les rôles habilités peuvent modifier cette note.",
          };
        }
        notes.push({
          ...avant,
          ...n,
          userId: avant.userId,
          userNom: avant.userNom,
          modifieLe: new Date().toISOString(),
          modifieParId: opts.actor.id,
          modifieParNom: opts.actor.nom,
        });
        details.push("Modification d'une note interne");
        continue;
      }
      notes.push(avant);
    }
    data.notesEchanges = notes;
  }

  if (data.fichiersStockage !== undefined) {
    const avant = opts.prev.fichiersStockage ?? [];
    const connus = new Map(avant.map((f) => [f.id, f]));
    data.fichiersStockage = data.fichiersStockage.map((f) => {
      const prev = connus.get(f.id);
      if (prev) return { ...prev, nom: f.nom, dossierId: f.dossierId, commentaire: f.commentaire };
      return {
        ...f,
        userId: f.userId || opts.actor.id,
        userNom: f.userNom || opts.actor.nom,
      };
    });
    if (JSON.stringify(idsFichiers(avant)) !== JSON.stringify(idsFichiers(data.fichiersStockage))) {
      details.push("Stockage");
    }
  }

  return {
    ok: true,
    data,
    detail: details.length ? [...new Set(details)].join(" · ") : undefined,
  };
}

function idsFichiers(liste: FichierStockageTiers[]) {
  return liste.map((f) => `${f.id}:${f.nom}:${f.dossierId}:${f.commentaire ?? ""}`);
}
