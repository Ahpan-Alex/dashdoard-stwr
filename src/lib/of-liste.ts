import { quantiteProduite, quantiteTheoriqueComposantOf } from "./fabrication";
import { jourLocalISO } from "./inventaire";
import type { OrdreFabrication, OrdreFabricationStatut } from "./types";

export type VerrouEditionOf = NonNullable<OrdreFabrication["verrouEdition"]>;

export type SignalOf = {
  retard: boolean;
  matiereManquante: boolean;
  batBloquant: boolean;
  ofEnfant: boolean;
};

export type FiltresListeOf = {
  statut: "" | OrdreFabricationStatut;
  atelierId: string;
  /** mto = lié à une commande client, mts = réappro stock. */
  type: "" | "mto" | "mts";
  retard: boolean;
  matiereManquante: boolean;
  batNonValide: boolean;
  siteId: string;
  /** Période sur la date de création (AAAA-MM-JJ). */
  periodeDebut: string;
  periodeFin: string;
};

export const FILTRES_LISTE_OF_VIDE: FiltresListeOf = {
  statut: "",
  atelierId: "",
  type: "",
  retard: false,
  matiereManquante: false,
  batNonValide: false,
  siteId: "",
  periodeDebut: "",
  periodeFin: "",
};

export type ActionMenuOf =
  | "sortie"
  | "mod"
  | "cloturer"
  | "demande_achat"
  | "dupliquer"
  | "imprimer";

export const ACTION_MENU_OF_LABELS: Record<ActionMenuOf, string> = {
  sortie: "Sortie matière",
  mod: "Saisie MOD",
  cloturer: "Clôturer",
  demande_achat: "Créer une demande d'achat",
  dupliquer: "Dupliquer",
  imprimer: "Imprimer la fiche de fabrication",
};

/** Modifier est masqué pour les OF clos ou annulés : la fiche ne peut plus être éditée. */
export function modifierOfVisible(
  of: Pick<OrdreFabrication, "statut">,
): boolean {
  return of.statut !== "cloture" && of.statut !== "cloture_annule" && of.statut !== "annule";
}

export function ofEstMto(of: Pick<OrdreFabrication, "commandeId">) {
  return Boolean(of.commandeId);
}

export function ofAUneSortie(of: Pick<OrdreFabrication, "sorties">) {
  return (of.sorties ?? []).some((s) => (Number(s.quantite) || 0) > 0);
}

export function ofEnRetard(
  of: Pick<OrdreFabrication, "statut" | "dateCloturePrevue">,
  aujourdHui = jourLocalISO(),
) {
  if (of.statut !== "brouillon" && of.statut !== "en_cours") return false;
  const echeance = (of.dateCloturePrevue ?? "").slice(0, 10);
  return Boolean(echeance) && echeance < aujourdHui.slice(0, 10);
}

export function ofAUnEnfantLie(
  ofId: string,
  ofs: Pick<OrdreFabrication, "ofParentId" | "statut">[],
) {
  return ofs.some(
    (o) =>
      o.ofParentId === ofId &&
      o.statut !== "annule" &&
      o.statut !== "cloture_annule",
  );
}

export function manquesMatiereOf(
  of: Pick<OrdreFabrication, "nomenclatureLignes" | "quantitePrevue" | "sorties">,
  dispo: (composantId: string) => number,
) {
  const out: { composantId: string; manquant: number }[] = [];
  const vus = new Set<string>();
  for (const l of of.nomenclatureLignes ?? []) {
    if (!l.composantId || vus.has(l.composantId)) continue;
    vus.add(l.composantId);
    const besoin = quantiteTheoriqueComposantOf(of, l.composantId);
    const sorti = (of.sorties ?? [])
      .filter((s) => s.composantId === l.composantId)
      .reduce((s, x) => s + (Number(x.quantite) || 0), 0);
    const manquant = Math.max(0, besoin - sorti);
    if (manquant <= 1e-9) continue;
    if (dispo(l.composantId) + 1e-9 < manquant) {
      out.push({ composantId: l.composantId, manquant });
    }
  }
  return out;
}

export function texteAvancementOf(
  of: Pick<OrdreFabrication, "quantitePrevue" | "entreesProduction" | "sorties">,
) {
  const produit = quantiteProduite(of);
  const sorties = (of.sorties ?? []).length;
  const entrees = (of.entreesProduction ?? []).length;
  return `${produit} / ${of.quantitePrevue} · ${sorties} sorties · ${entrees} entrées`;
}

export function filtrerListeOf<T extends OrdreFabrication>(
  ofs: T[],
  filtres: FiltresListeOf,
  ctx: {
    signal: (of: T) => SignalOf;
    siteId: (of: T) => string;
  },
): T[] {
  return ofs.filter((of) => {
    if (filtres.statut && of.statut !== filtres.statut) return false;
    if (filtres.atelierId && of.atelierId !== filtres.atelierId) return false;
    if (filtres.type === "mto" && !ofEstMto(of)) return false;
    if (filtres.type === "mts" && ofEstMto(of)) return false;
    const signal = ctx.signal(of);
    if (filtres.retard && !signal.retard) return false;
    if (filtres.matiereManquante && !signal.matiereManquante) return false;
    if (filtres.batNonValide && !signal.batBloquant) return false;
    if (filtres.siteId && ctx.siteId(of) !== filtres.siteId) return false;
    const jour = (of.dateCreation ?? "").slice(0, 10);
    if (filtres.periodeDebut && jour < filtres.periodeDebut) return false;
    if (filtres.periodeFin && jour > filtres.periodeFin) return false;
    return true;
  });
}

export function actionsMenuOf(opts: {
  of: Pick<OrdreFabrication, "statut">;
  peutModifier: boolean;
  peutAcheter: boolean;
  matiereManquanteAchat: boolean;
  verrouAutre: boolean;
}): ActionMenuOf[] {
  const out: ActionMenuOf[] = [];
  const ouvert = opts.of.statut === "en_cours" && opts.peutModifier && !opts.verrouAutre;
  if (ouvert) {
    out.push("sortie", "mod", "cloturer");
  }
  if (
    opts.matiereManquanteAchat &&
    opts.peutAcheter &&
    !opts.verrouAutre &&
    (opts.of.statut === "brouillon" || opts.of.statut === "en_cours")
  ) {
    out.push("demande_achat");
  }
  if (opts.peutModifier) out.push("dupliquer");
  out.push("imprimer");
  return out;
}

export function verrouEditionActif(
  v?: VerrouEditionOf | null,
  now = Date.now(),
) {
  if (!v?.jusquA) return false;
  const t = Date.parse(v.jusquA);
  return Number.isFinite(t) && t > now;
}

/** Message si un autre utilisateur tient le verrou. Vide si libre ou si c'est nous. */
export function messageVerrouEdition(
  v: VerrouEditionOf | null | undefined,
  userId: string | undefined,
  now = Date.now(),
): string | null {
  if (!verrouEditionActif(v, now)) return null;
  if (!v?.userId || !userId || v.userId === userId) return null;
  const nom = v.userNom?.trim() || "un autre utilisateur";
  return `En cours d'édition par ${nom}`;
}

export function motifModificationVerrouilleeApresSortie(
  prev: Pick<
    OrdreFabrication,
    | "sorties"
    | "produitId"
    | "nomenclatureSource"
    | "nomenclatureLignes"
    | "commandeId"
  >,
  patch: Partial<
    Pick<
      OrdreFabrication,
      "produitId" | "nomenclatureSource" | "nomenclatureLignes" | "commandeId"
    >
  >,
): string | null {
  if (!ofAUneSortie(prev)) return null;
  const bloque =
    (patch.produitId != null && patch.produitId !== prev.produitId) ||
    (patch.nomenclatureSource != null &&
      patch.nomenclatureSource !== prev.nomenclatureSource) ||
    (patch.nomenclatureLignes != null &&
      JSON.stringify(patch.nomenclatureLignes) !==
        JSON.stringify(prev.nomenclatureLignes ?? [])) ||
    (patch.commandeId !== undefined && patch.commandeId !== prev.commandeId);
  if (!bloque) return null;
  return "Après la première sortie de matière, le produit fini, la nomenclature et le lien commande sont verrouillés. La quantité, les dates et la note restent modifiables.";
}

export function detailModificationOf(
  prev: OrdreFabrication,
  next: OrdreFabrication,
): string | null {
  const parts: string[] = [];
  if (prev.quantitePrevue !== next.quantitePrevue) {
    parts.push(`Quantité prévue : ${prev.quantitePrevue} → ${next.quantitePrevue}`);
  }
  if ((prev.dateCloturePrevue ?? "") !== (next.dateCloturePrevue ?? "")) {
    parts.push("Date d'échéance modifiée");
  }
  if ((prev.note ?? "") !== (next.note ?? "")) parts.push("Note modifiée");
  if (prev.produitId !== next.produitId) parts.push("Produit fini modifié");
  if ((prev.commandeId ?? "") !== (next.commandeId ?? "")) {
    parts.push("Lien commande modifié");
  }
  if (
    prev.nomenclatureSource !== next.nomenclatureSource ||
    prev.nomenclatureNom !== next.nomenclatureNom
  ) {
    parts.push("Nomenclature de référence modifiée");
  }
  if (
    JSON.stringify(prev.nomenclatureLignes ?? []) !==
    JSON.stringify(next.nomenclatureLignes ?? [])
  ) {
    parts.push("Lignes de nomenclature modifiées");
  }
  if (
    (prev.dimensionLargeur ?? null) !== (next.dimensionLargeur ?? null) ||
    (prev.dimensionHauteur ?? null) !== (next.dimensionHauteur ?? null)
  ) {
    parts.push("Dimension modifiée");
  }
  if (prev.atelierId !== next.atelierId) parts.push("Atelier modifié");
  return parts.length ? parts.join(" · ") : null;
}
