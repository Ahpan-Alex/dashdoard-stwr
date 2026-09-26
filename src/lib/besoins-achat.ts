import { quantiteLivreeProduit, quantiteRetourneeProduit } from "./achats";
import { nextNumero } from "./commercial";
import type { OptsNumeroDocument } from "./exercices";
import { motifRepartitionOfInvalide, sommeRepartitionsOf } from "./repartition-achat-of";
import type {
  Achat,
  AchatRepartitionOf,
  BesoinAchat,
  BesoinAchatStatut,
} from "./types";

const EPS = 1e-6;

export const BESOIN_ACHAT_STATUT_LABELS: Record<BesoinAchatStatut, string> = {
  ouvert: "Ouvert",
  partiel: "Partiellement couvert",
  couvert: "Couvert",
  annule: "Annulé",
};

export function nextNumeroBesoinAchat(
  liste: BesoinAchat[],
  opts?: OptsNumeroDocument,
) {
  return nextNumero(
    "BA",
    liste.map((b) => b.numero),
    opts,
  );
}

export function motifBesoinAchatInvalide(
  data: Pick<BesoinAchat, "produitId" | "quantiteNecessaire" | "repartitionsOf">,
): string | null {
  if (!data.produitId) return "Choisissez un article.";
  if (!(data.quantiteNecessaire > 0)) {
    return "La quantité nécessaire doit être positive.";
  }
  return motifRepartitionOfInvalide([
    {
      id: "besoin",
      quantite: data.quantiteNecessaire,
      prixAchatUnitaire: 0,
      repartitionsOf: data.repartitionsOf,
    },
  ]);
}

export function achatCouvreBesoin(achat: Achat, besoinId: string) {
  if (achat.statut === "annule") return false;
  if (achat.besoinAchatId === besoinId) return true;
  return achat.lignes.some((l) => l.besoinAchatId === besoinId);
}

export function achatsDuBesoin(besoinId: string, achats: Achat[]) {
  return achats.filter((a) => achatCouvreBesoin(a, besoinId));
}

export function lignesDuBesoin(besoin: BesoinAchat, achats: Achat[]) {
  const out: { achat: Achat; ligne: Achat["lignes"][number] }[] = [];
  for (const a of achatsDuBesoin(besoin.id, achats)) {
    for (const l of a.lignes) {
      if (l.produitId !== besoin.produitId) continue;
      if (l.besoinAchatId === besoin.id || a.besoinAchatId === besoin.id) {
        out.push({ achat: a, ligne: l });
      }
    }
  }
  return out;
}

export function couvertureBesoin(besoin: BesoinAchat, achats: Achat[]) {
  const lignes = lignesDuBesoin(besoin, achats);
  let commandee = 0;
  let livree = 0;
  const fournisseurIds = new Set<string>();
  for (const { achat, ligne } of lignes) {
    commandee += Number(ligne.quantite) || 0;
    fournisseurIds.add(achat.fournisseurId);
    if (!ligne.produitId) continue;
    livree += Math.max(
      0,
      quantiteLivreeProduit(achat, ligne.produitId) -
        quantiteRetourneeProduit(achat, ligne.produitId),
    );
  }
  const necessaire = besoin.quantiteNecessaire;
  const reliquat = Math.max(0, necessaire - commandee);
  return {
    commandee,
    livree: Math.min(livree, commandee),
    necessaire,
    reliquat,
    nbFournisseurs: fournisseurIds.size,
    pct: necessaire > 0 ? Math.min(100, (commandee / necessaire) * 100) : 0,
  };
}

export function statutBesoinAchat(
  besoin: BesoinAchat,
  achats: Achat[],
): BesoinAchatStatut {
  if (besoin.annule) return "annule";
  const { commandee, necessaire } = couvertureBesoin(besoin, achats);
  if (commandee <= EPS) return "ouvert";
  if (commandee + EPS >= necessaire) return "couvert";
  return "partiel";
}

export function badgeClasseBesoin(statut: BesoinAchatStatut) {
  if (statut === "couvert") return "badge-success";
  if (statut === "partiel") return "badge-sand";
  if (statut === "annule") return "badge-danger";
  return "badge-sea";
}

/** Recopie au prorata les répartitions OF d'un besoin vers une commande. */
export function prorataRepartitionsOf(
  reps: AchatRepartitionOf[] | undefined,
  quantiteSource: number,
  quantiteCible: number,
): Omit<AchatRepartitionOf, "id">[] {
  if (!reps?.length || !(quantiteSource > 0) || !(quantiteCible > 0)) return [];
  const frac = Math.min(1, quantiteCible / quantiteSource);
  const cibleOf = Math.min(
    quantiteCible,
    sommeRepartitionsOf({ repartitionsOf: reps }) * frac,
  );
  const out: Omit<AchatRepartitionOf, "id">[] = [];
  let alloue = 0;
  for (let i = 0; i < reps.length; i++) {
    const r = reps[i];
    const dernier = i === reps.length - 1;
    const q = dernier
      ? Math.max(0, cibleOf - alloue)
      : r.quantite * frac;
    if (q <= EPS) continue;
    alloue += q;
    out.push({
      ofId: r.ofId,
      quantite: q,
      pointDeVenteId: r.pointDeVenteId,
    });
  }
  return out;
}

export function besoinsPourOf(besoins: BesoinAchat[], ofId: string) {
  return besoins.filter((b) =>
    (b.repartitionsOf ?? []).some((r) => r.ofId === ofId),
  );
}

export function modePaiementAchatVisible(achat: Achat) {
  return achat.modePaiement || achat.paiements[0]?.modePaiement;
}

export const MENTION_COMMANDE_CLIENT_ORIGINE_SUPPRIMEE =
  "Commande client d'origine supprimée";

function achatVientDeLaDemande(achat: Achat, besoinIds: Set<string>, commandeId: string) {
  if (achat.alerteMatiereCommandeId === commandeId) return true;
  if (achat.besoinAchatId && besoinIds.has(achat.besoinAchatId)) return true;
  return (achat.lignes ?? []).some(
    (l) => l.besoinAchatId != null && besoinIds.has(l.besoinAchatId),
  );
}

function achatFerme(achat: Achat) {
  return achat.statut !== "annule";
}

/**
 * Suppression d'une commande client : les DA nées de son alerte matière
 * disparaissent tant qu'elles n'ont pas de commande fournisseur.
 * Dès qu'une commande fournisseur non annulée existe, elle reste et son lien
 * vers la commande client est marqué rompu. Les achats créés hors de ce flux
 * ne sont pas modifiés.
 */
export function cascadeDemandeAchatSuppressionCommande(opts: {
  commandeId: string;
  besoins: BesoinAchat[];
  achats: Achat[];
}): {
  besoins: BesoinAchat[];
  achats: Achat[];
  besoinsSupprimes: BesoinAchat[];
  achatsOrphelins: Achat[];
} {
  const lies = (opts.besoins ?? []).filter(
    (b) =>
      b.origine === "alerte_matiere_commande" && b.commandeId === opts.commandeId,
  );
  const ids = new Set(lies.map((b) => b.id));
  const concerne = (a: Achat) => achatVientDeLaDemande(a, ids, opts.commandeId);
  const achatsConcernes = (opts.achats ?? []).filter(concerne);

  const supprimer = new Set<string>();
  for (const besoin of lies) {
    const fermes = achatsConcernes.filter(
      (a) => achatFerme(a) && achatCouvreBesoin(a, besoin.id),
    );
    if (fermes.length === 0) supprimer.add(besoin.id);
  }

  const achats = (opts.achats ?? []).map((achat) => {
    if (!concerne(achat)) return achat;
    if (achat.commandeId && achat.commandeId !== opts.commandeId) return achat;
    if (achat.commandeClientOrigineSupprimee && achat.commandeId === opts.commandeId) {
      return achat;
    }
    return {
      ...achat,
      commandeId: achat.commandeId ?? opts.commandeId,
      commandeClientOrigineSupprimee: true,
    };
  });

  const achatsOrphelins = achats.filter(
    (achat, index) =>
      achat !== (opts.achats ?? [])[index] &&
      achat.commandeClientOrigineSupprimee === true &&
      achatFerme(achat),
  );

  const besoins = (opts.besoins ?? []).flatMap((besoin) => {
    if (!ids.has(besoin.id)) return [besoin];
    if (supprimer.has(besoin.id)) return [];
    return [{ ...besoin, commandeClientOrigineSupprimee: true }];
  });

  return {
    besoins,
    achats,
    besoinsSupprimes: lies.filter((b) => supprimer.has(b.id)),
    achatsOrphelins,
  };
}
