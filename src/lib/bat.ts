import { differenceInCalendarDays, parseISO } from "date-fns";
import { isRoleId, rolesFromStored, type RoleId } from "./auth/rbac";
import type {
  BatMotifRefus,
  BatOrigine,
  BatStatut,
  BonATirer,
  Commande,
  LigneDocument,
  OrdreFabrication,
  Parametres,
} from "./types";

export const BAT_STATUTS: Record<BatStatut, string> = {
  en_attente: "En attente",
  modifications_demandees: "Modifications demandées",
  valide: "Validé",
};

export const BAT_MOTIFS_REFUS: Record<BatMotifRefus, string> = {
  couleur: "Couleur",
  texte: "Texte",
  dimension: "Dimension",
  autre: "Autre",
};

export const BAT_FICHIER = {
  accept: "image/png,image/jpeg,image/webp,application/pdf",
  maxBytes: 1_500_000,
  maxBytesLabel: "1,5 Mo",
} as const;

/** Rôles habilités à valider un BAT (Paramètres). L'administrateur reste toujours habilité. */
export const ROLES_VALIDER_BAT_DEFAUT: RoleId[] = ["admin_entreprise"];

export function rolesValiderBat(parametres?: Pick<Parametres, "rolesValiderBat"> | null) {
  const raw = parametres?.rolesValiderBat;
  if (!Array.isArray(raw) || raw.length === 0) return [...ROLES_VALIDER_BAT_DEFAUT];
  const ids = raw.filter((r): r is RoleId => typeof r === "string" && isRoleId(r));
  return ids.length ? ids : [...ROLES_VALIDER_BAT_DEFAUT];
}

export function actorPeutValiderBat(
  user: { role: string; roles?: unknown } | null | undefined,
  parametres?: Pick<Parametres, "rolesValiderBat"> | null,
) {
  if (!user) return false;
  const roles = rolesFromStored(user.role, user.roles);
  if (roles.includes("admin_entreprise")) return true;
  const habilites = new Set(rolesValiderBat(parametres));
  return roles.some((r) => habilites.has(r));
}

export function badgeBat(statut: BatStatut) {
  if (statut === "valide") return "badge-success";
  if (statut === "modifications_demandees") return "badge-sand";
  return "badge-sea";
}

export function cycleIdBat(bat: Pick<BonATirer, "id" | "cycleId" | "commandeId">) {
  return bat.cycleId || `legacy-${bat.commandeId}`;
}

export function batsPourCommande(bats: BonATirer[], commandeId: string) {
  return [...bats]
    .filter((b) => b.commandeId === commandeId)
    .sort((a, b) => a.version - b.version || a.dateEnvoi.localeCompare(b.dateEnvoi));
}

export function batsPourCycle(bats: BonATirer[], cycleId: string) {
  return [...bats]
    .filter((b) => cycleIdBat(b) === cycleId)
    .sort((a, b) => a.version - b.version || a.dateEnvoi.localeCompare(b.dateEnvoi));
}

export function batCourantCycle(bats: BonATirer[], cycleId: string) {
  const liste = batsPourCycle(bats, cycleId);
  return liste[liste.length - 1];
}

/** Dernière version de chaque cycle d'une commande (référence OF / badges). */
export function batsCourantsCommande(bats: BonATirer[], commandeId: string) {
  const ids = new Set(
    bats.filter((b) => b.commandeId === commandeId).map((b) => cycleIdBat(b)),
  );
  return [...ids]
    .map((id) => batCourantCycle(bats, id))
    .filter((b): b is BonATirer => Boolean(b));
}

export function batCourant(bats: BonATirer[], commandeId: string) {
  const courants = batsCourantsCommande(bats, commandeId);
  if (courants.length === 0) return undefined;
  const ordre: Record<BatStatut, number> = {
    en_attente: 0,
    modifications_demandees: 1,
    valide: 2,
  };
  return [...courants].sort((a, b) => {
    const d = ordre[a.statut] - ordre[b.statut];
    if (d !== 0) return d;
    return b.dateEnvoi.localeCompare(a.dateEnvoi);
  })[0];
}

export function prochaineVersionBat(bats: BonATirer[], commandeId: string) {
  const liste = batsPourCommande(bats, commandeId);
  return (liste[liste.length - 1]?.version ?? 0) + 1;
}

export function prochaineVersionCycle(bats: BonATirer[], cycleId: string) {
  const liste = batsPourCycle(bats, cycleId);
  return (liste[liste.length - 1]?.version ?? 0) + 1;
}

export function lignesProduitCommande(commande: Commande): LigneDocument[] {
  return commande.lignes.filter(
    (l) => (l.type ?? "produit") === "produit" && Boolean(l.produitId),
  );
}

export function ligneIdsCouvertes(
  bat: Pick<BonATirer, "ligneIds">,
  commande: Commande,
) {
  if (bat.ligneIds && bat.ligneIds.length > 0) return bat.ligneIds;
  return lignesProduitCommande(commande).map((l) => l.id);
}

export function produitIdsBat(
  bat: Pick<BonATirer, "ligneIds">,
  commande: Commande | undefined,
) {
  if (!commande) return [];
  const ids = new Set(ligneIdsCouvertes(bat, commande));
  return commande.lignes
    .filter((l) => ids.has(l.id) && l.produitId)
    .map((l) => l.produitId as string);
}

export function libelleLignesBat(
  bat: Pick<BonATirer, "ligneIds">,
  commande: Commande | undefined,
) {
  if (!commande) return "—";
  const ids = new Set(ligneIdsCouvertes(bat, commande));
  const lignes = commande.lignes.filter((l) => ids.has(l.id));
  if (lignes.length === 0) return "Toutes les lignes";
  return lignes
    .map((l) => l.designation || l.codeProduit || l.produitId || "Ligne")
    .join(", ");
}

export function courantCouvrantLigne(
  bats: BonATirer[],
  commande: Commande,
  ligneId: string,
) {
  const courants = batsCourantsCommande(bats, commande.id);
  return courants.find((b) => ligneIdsCouvertes(b, commande).includes(ligneId));
}

export function statutBatLigne(
  bats: BonATirer[],
  commande: Commande,
  ligneId: string,
): BatStatut | null {
  return courantCouvrantLigne(bats, commande, ligneId)?.statut ?? null;
}

export function commandeABatValide(bats: BonATirer[], commandeId: string) {
  return batsCourantsCommande(bats, commandeId).some((b) => b.statut === "valide");
}

/** Toutes les lignes produit ont un BAT courant validé. */
export function commandeBatPretProduction(
  bats: BonATirer[],
  commande: Commande,
) {
  const lignes = lignesProduitCommande(commande);
  if (lignes.length === 0) return commandeABatValide(bats, commande.id);
  return lignes.every((l) => statutBatLigne(bats, commande, l.id) === "valide");
}

export function batEstLectureSeule(bat: BonATirer) {
  return bat.statut !== "en_attente";
}

export function batAFichier(bat: Pick<BonATirer, "fichierDataUrl">) {
  return Boolean(bat.fichierDataUrl);
}

export function batEnRetardRelance(
  bat: Pick<BonATirer, "statut" | "dateEnvoi">,
  delaiJours: number,
  aujourdHui = new Date(),
) {
  if (bat.statut !== "en_attente") return false;
  const jours = differenceInCalendarDays(aujourdHui, parseISO(bat.dateEnvoi));
  return Number.isFinite(jours) && jours >= Math.max(0, delaiJours);
}

export function motifCreationBatImpossible(
  bats: BonATirer[],
  commande: Commande,
  ligneIds: string[],
) {
  const cibles =
    ligneIds.length > 0
      ? ligneIds
      : lignesProduitCommande(commande).map((l) => l.id);
  if (cibles.length === 0) {
    return "Sélectionnez au moins une ligne produit de la commande.";
  }
  for (const ligneId of cibles) {
    const courant = courantCouvrantLigne(bats, commande, ligneId);
    if (!courant) continue;
    if (courant.statut === "valide") {
      return "Une ou plusieurs lignes ont déjà un BAT validé. Dupliquez un BAT validé pour une autre commande, ou choisissez des lignes encore libres.";
    }
    if (courant.statut === "en_attente") {
      if (!batAFichier(courant)) {
        return "Joignez d'abord le fichier de la version en attente sur ces lignes.";
      }
      return "Enregistrez le retour client (validé ou modifications demandées) avant de créer une nouvelle version sur ces lignes.";
    }
  }
  return null;
}

/**
 * Blocage OF : les lignes de commande correspondant au produit de l'OF
 * doivent être couvertes par un BAT dont la dernière version est validée.
 */
export function motifBatOfManquant(
  of: Pick<OrdreFabrication, "commandeId" | "produitId" | "derogationBat">,
  bats: BonATirer[],
  commandes?: Commande[],
): string | null {
  if (!of.commandeId) return null;
  if (of.derogationBat) return null;
  const cmd = commandes?.find((c) => c.id === of.commandeId);
  if (!cmd) {
    if (commandeABatValide(bats, of.commandeId)) return null;
    return "Impossible de démarrer la production : aucun BAT validé n'est lié à cette commande. Faites valider un Bon à Tirer, ou demandez une dérogation (administrateur / comptable).";
  }
  const lignesOf = lignesProduitCommande(cmd).filter(
    (l) => l.produitId === of.produitId,
  );
  const cibles = lignesOf.length > 0 ? lignesOf : lignesProduitCommande(cmd);
  if (cibles.length === 0) {
    if (commandeABatValide(bats, of.commandeId)) return null;
    return "Impossible de démarrer la production : aucun BAT validé n'est lié à cette commande. Faites valider un Bon à Tirer, ou demandez une dérogation (administrateur / comptable).";
  }
  const manquantes = cibles.filter((l) => {
    const st = statutBatLigne(bats, cmd, l.id);
    return st !== "valide";
  });
  if (manquantes.length === 0) return null;
  const enAttente = manquantes.some(
    (l) => statutBatLigne(bats, cmd, l.id) === "en_attente",
  );
  const mods = manquantes.some(
    (l) => statutBatLigne(bats, cmd, l.id) === "modifications_demandees",
  );
  const detail = enAttente
    ? "la dernière version est encore en attente de validation"
    : mods
      ? "des modifications client sont demandées"
      : "aucun BAT ne couvre encore ces lignes";
  return `Impossible de démarrer la production : BAT non validé sur les lignes concernées (${detail}). Faites valider le Bon à Tirer, ou demandez une dérogation (administrateur / comptable).`;
}

export function batsValidesMemeClientProduit(
  bats: BonATirer[],
  commandes: Commande[],
  clientId: string,
  produitId: string,
  horsCommandeId?: string,
) {
  const cmdParId = new Map(commandes.map((c) => [c.id, c]));
  const courants = new Map<string, BonATirer>();
  for (const b of bats) {
    const cmd = cmdParId.get(b.commandeId);
    if (!cmd || cmd.clientId !== clientId) continue;
    if (horsCommandeId && b.commandeId === horsCommandeId) continue;
    const cid = cycleIdBat(b);
    const prev = courants.get(cid);
    if (!prev || b.version > prev.version) courants.set(cid, b);
  }
  return [...courants.values()].filter((b) => {
    if (b.statut !== "valide" || !batAFichier(b)) return false;
    const cmd = cmdParId.get(b.commandeId);
    return cmd ? produitIdsBat(b, cmd).includes(produitId) : false;
  });
}

export function batsGabaritPourProduit(
  bats: BonATirer[],
  commandes: Commande[],
  produitId: string,
) {
  const cmdParId = new Map(commandes.map((c) => [c.id, c]));
  const courants = new Map<string, BonATirer>();
  for (const b of bats) {
    const cid = cycleIdBat(b);
    const prev = courants.get(cid);
    if (!prev || b.version > prev.version) courants.set(cid, b);
  }
  return [...courants.values()].filter((b) => {
    if (!b.gabarit || b.statut !== "valide" || !batAFichier(b)) return false;
    const cmd = cmdParId.get(b.commandeId);
    return cmd ? produitIdsBat(b, cmd).includes(produitId) : false;
  });
}

export function datePremiereVersionCycle(bats: BonATirer[], cycleId: string) {
  return batsPourCycle(bats, cycleId)[0]?.dateEnvoi;
}

export type IndicateursBat = {
  nbCyclesValides: number;
  versionsMoyennes: number | null;
  delaiMoyenJours: number | null;
  tauxDupliques: number | null;
  nbDupliques: number;
  nbFromScratch: number;
  nbEnRetard: number;
};

function origineCycle(courant: BonATirer): BatOrigine {
  return courant.origine ?? "scratch";
}

export function indicateursBat(
  bats: BonATirer[],
  opts?: { delaiRelanceJours?: number; clientId?: string; commandes?: Commande[] },
): IndicateursBat {
  const filtrés =
    opts?.clientId && opts.commandes
      ? bats.filter((b) => {
          const cmd = opts.commandes!.find((c) => c.id === b.commandeId);
          return cmd?.clientId === opts.clientId;
        })
      : bats;
  const cycleIds = [...new Set(filtrés.map((b) => cycleIdBat(b)))];
  const courants = cycleIds
    .map((id) => batCourantCycle(filtrés, id))
    .filter((b): b is BonATirer => Boolean(b));
  const valides = courants.filter((b) => b.statut === "valide");
  const versions = valides.map((b) => b.version);
  const delais = valides
    .map((b) => {
      const debut = datePremiereVersionCycle(filtrés, cycleIdBat(b));
      if (!debut || !b.dateValidation) return null;
      const n = differenceInCalendarDays(parseISO(b.dateValidation), parseISO(debut));
      return Number.isFinite(n) && n >= 0 ? n : null;
    })
    .filter((n): n is number => n != null);
  const dupliques = courants.filter((b) => origineCycle(b) === "duplication").length;
  const gabarits = courants.filter((b) => origineCycle(b) === "gabarit").length;
  const scratch = courants.filter((b) => origineCycle(b) === "scratch").length;
  const delai = opts?.delaiRelanceJours ?? 7;
  const nbEnRetard = courants.filter((b) => batEnRetardRelance(b, delai)).length;
  const crees = courants.length;
  return {
    nbCyclesValides: valides.length,
    versionsMoyennes:
      versions.length > 0
        ? versions.reduce((s, n) => s + n, 0) / versions.length
        : null,
    delaiMoyenJours:
      delais.length > 0 ? delais.reduce((s, n) => s + n, 0) / delais.length : null,
    tauxDupliques: crees > 0 ? (dupliques / crees) * 100 : null,
    nbDupliques: dupliques,
    nbFromScratch: scratch + gabarits,
    nbEnRetard,
  };
}

export function fileToBatDataUrl(file: File): Promise<{
  nom: string;
  mime: string;
  dataUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const mime = (file.type || "").toLowerCase();
    const ok =
      mime === "application/pdf" ||
      mime === "image/png" ||
      mime === "image/jpeg" ||
      mime === "image/jpg" ||
      mime === "image/webp";
    if (!ok) {
      reject(new Error("Fichier BAT : PNG, JPG, WebP ou PDF uniquement."));
      return;
    }
    if (file.size > BAT_FICHIER.maxBytes) {
      reject(
        new Error(
          `Fichier trop lourd (max. ${BAT_FICHIER.maxBytesLabel}). Compressez l'image ou le PDF.`,
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      resolve({
        nom: file.name || "bat",
        mime: mime === "image/jpg" ? "image/jpeg" : mime,
        dataUrl: String(reader.result),
      });
    };
    reader.readAsDataURL(file);
  });
}
