import { nextNumero } from "./commercial";
import { quantiteStockChronologique } from "./cump";
import { createId } from "./id";
import { produitEstAchetable } from "./nature-stock";
import type {
  EntreeStock,
  Facture,
  Inventaire,
  MissionAchat,
  MissionAchatRealise,
  MissionAchatStatut,
  MissionDepenseDiverse,
  MissionReglementStatut,
  MissionValidationEtape,
  Produit,
  Tiers,
  TransfertStock,
  Vente,
} from "./types";

export const TIERS_DIVERS_MARCHE_ID = "frn-divers-marche";
export const TIERS_DIVERS_MARCHE_NOM = "Divers / Marché";

export const MISSION_STATUT_LABELS: Record<MissionAchatStatut, string> = {
  en_cours: "En cours",
  cloture: "Clôturé",
  annule: "Annulé",
  cloture_annule: "Clôturé — Annulé",
};

export const MISSION_REGLEMENT_LABELS: Record<MissionReglementStatut, string> = {
  non_regle: "Non réglé",
  regle: "Réglé",
};

export function nextNumeroMission(missions: MissionAchat[]) {
  return nextNumero(
    "MIS",
    missions.map((m) => m.numero),
  );
}

export function missionEstVerrouillee(m: Pick<MissionAchat, "statut">) {
  return m.statut === "cloture" || m.statut === "cloture_annule" || m.statut === "annule";
}

export function montantLigneRealisee(l: Pick<MissionAchatRealise, "quantite" | "prixUnitaire">) {
  return Math.max(0, l.quantite) * Math.max(0, l.prixUnitaire);
}

export function totalAchatsRealises(m: Pick<MissionAchat, "achatsRealises">) {
  return m.achatsRealises.reduce((s, l) => s + montantLigneRealisee(l), 0);
}

export function totalDepensesDiverses(m: Pick<MissionAchat, "depensesDiverses">) {
  return m.depensesDiverses.reduce((s, d) => s + Math.max(0, d.montant), 0);
}

export function totalDepenseMission(m: Pick<MissionAchat, "achatsRealises" | "depensesDiverses">) {
  return totalAchatsRealises(m) + totalDepensesDiverses(m);
}

/** Positif = à rendre par l'acheteur ; négatif = à rembourser par l'entreprise. */
export function soldeMission(m: Pick<MissionAchat, "montantAvance" | "achatsRealises" | "depensesDiverses">) {
  return m.montantAvance - totalDepenseMission(m);
}

export function libelleSoldeMission(solde: number) {
  if (Math.abs(solde) < 0.5) return "Soldé";
  if (solde > 0) return "À rendre par l'acheteur";
  return "À rembourser par l'entreprise";
}

export function ficheTiersDiversMarche(): Tiers {
  return {
    id: TIERS_DIVERS_MARCHE_ID,
    nom: TIERS_DIVERS_MARCHE_NOM,
    actif: true,
    roles: ["fournisseur"],
    systeme: true,
    type: "autre",
    specialite: "Vendeurs informels / marché",
  };
}

export function entreesDepuisMission(
  mission: MissionAchat,
  produits: Produit[],
  tiers: Tiers[],
): EntreeStock[] {
  if (mission.statut === "en_cours" || mission.statut === "annule") return [];
  const date = mission.dateCloture ?? mission.date;
  const dateAnnul = mission.dateAnnulation ?? date;
  const contre = mission.statut === "cloture_annule";

  const out: EntreeStock[] = [];
  for (const l of mission.achatsRealises) {
    if (l.quantite <= 0 || !l.produitId) continue;
    const prod = produits.find((p) => p.id === l.produitId);
    const frn = tiers.find((t) => t.id === l.fournisseurId);
    const base: EntreeStock = {
      id: `ent-miss-${mission.id}-${l.id}`,
      pointDeVenteId: mission.siteDestinataireId,
      produitId: l.produitId,
      quantite: l.quantite,
      prixAchatUnitaire: l.prixUnitaire,
      prixVenteUnitaire: prod?.prixVenteHT ?? 0,
      fournisseur: frn?.nom ?? TIERS_DIVERS_MARCHE_NOM,
      fournisseurId: l.fournisseurId,
      date,
      origine: "mission_achat",
      missionAchatId: mission.id,
      note: mission.numero,
    };
    out.push(base);
    if (contre) {
      out.push({
        ...base,
        id: `ent-miss-ann-${mission.id}-${l.id}`,
        quantite: -l.quantite,
        date: dateAnnul,
        origine: "mission_achat_annulation",
        note: `${mission.numero} — contre-mouvement`,
      });
    }
  }
  return out;
}

export function regenererEntreesMission(
  entrees: EntreeStock[],
  mission: MissionAchat,
  produits: Produit[],
  tiers: Tiers[],
): EntreeStock[] {
  const hors = entrees.filter((e) => e.missionAchatId !== mission.id);
  return [...hors, ...entreesDepuisMission(mission, produits, tiers)];
}

export type MouvementBloquantMission = {
  type: "vente" | "transfert" | "of" | "stock";
  libelle: string;
  date: string;
  quantite: number;
};

export function upsertTiersDiversMarche(tiers: Tiers[]): Tiers[] {
  if (tiers.some((t) => t.id === TIERS_DIVERS_MARCHE_ID)) {
    return tiers.map((t) =>
      t.id === TIERS_DIVERS_MARCHE_ID
        ? { ...ficheTiersDiversMarche(), ...t, systeme: true, roles: ["fournisseur"] }
        : t,
    );
  }
  return [ficheTiersDiversMarche(), ...tiers];
}

export function missionsVisiblesPour(
  missions: MissionAchat[],
  opts: { userId?: string; gerer: boolean; lectureSeule: boolean },
) {
  if (opts.gerer || opts.lectureSeule) return missions;
  return missions.filter((m) => m.acheteurUserId === opts.userId);
}

export function peutSaisirMission(
  mission: Pick<MissionAchat, "acheteurUserId" | "statut">,
  opts: { userId?: string; gerer: boolean },
) {
  if (mission.statut !== "en_cours") return false;
  if (opts.gerer) return true;
  return Boolean(opts.userId && opts.userId === mission.acheteurUserId);
}

export function listerMouvementsBloquantAnnulationMission(
  mission: MissionAchat,
  ctx: {
    entrees: EntreeStock[];
    ventes: Vente[];
    inventaires: Inventaire[];
    factures: Facture[];
    transfertsStock: TransfertStock[];
    ordresFabrication?: {
      atelierId: string;
      sorties?: { composantId: string; siteSourceId: string; date: string; quantite: number }[];
    }[];
    produits: Produit[];
    tiers: Tiers[];
  },
): MouvementBloquantMission[] {
  const simulee: MissionAchat = {
    ...mission,
    statut: "cloture_annule",
    dateAnnulation: mission.dateAnnulation ?? new Date().toISOString(),
  };
  const entreesSimulees = regenererEntreesMission(
    ctx.entrees,
    simulee,
    ctx.produits,
    ctx.tiers,
  );
  const produitIds = [
    ...new Set(
      mission.achatsRealises.filter((l) => l.quantite > 0).map((l) => l.produitId),
    ),
  ];
  let negatif = false;
  for (const produitId of produitIds) {
    const q = quantiteStockChronologique({
      produitId,
      pointDeVenteId: mission.siteDestinataireId,
      entrees: entreesSimulees,
      ventes: ctx.ventes,
      inventaires: ctx.inventaires,
    });
    if (q < -1e-9) negatif = true;
  }
  if (!negatif) return [];

  const dateMin = mission.dateCloture ?? mission.date;
  const bloquants: MouvementBloquantMission[] = [];
  for (const produitId of produitIds) {
    for (const v of ctx.ventes) {
      if (v.produitId !== produitId || v.pointDeVenteId !== mission.siteDestinataireId) continue;
      if (v.quantite <= 0 || v.date < dateMin) continue;
      const fac = ctx.factures.find((f) => f.id === v.factureId);
      bloquants.push({
        type: "vente",
        libelle: fac ? `Vente ${fac.numero}` : "Vente du stock de la mission",
        date: v.date,
        quantite: v.quantite,
      });
    }
    for (const t of ctx.transfertsStock) {
      if (t.statut === "annule" || t.statut === "demande") continue;
      if (t.siteSourceId !== mission.siteDestinataireId) continue;
      const ligne = t.lignes.find((l) => l.produitId === produitId && l.quantite > 0);
      if (!ligne) continue;
      const d = t.dateExpedition ?? t.dateDemande;
      if (d < dateMin) continue;
      bloquants.push({
        type: "transfert",
        libelle: `Transfert ${t.numero}`,
        date: d,
        quantite: ligne.quantite,
      });
    }
    for (const ofr of ctx.ordresFabrication ?? []) {
      for (const s of ofr.sorties ?? []) {
        if (s.composantId !== produitId || s.siteSourceId !== mission.siteDestinataireId) continue;
        if (s.quantite <= 0 || s.date < dateMin) continue;
        bloquants.push({
          type: "of",
          libelle: "Consommation OF sur le stock de la mission",
          date: s.date,
          quantite: s.quantite,
        });
      }
    }
  }
  if (bloquants.length === 0) {
    bloquants.push({
      type: "stock",
      libelle: "Le stock du site destinataire serait négatif après contre-mouvement.",
      date: dateMin,
      quantite: 0,
    });
  }
  return bloquants;
}

export function messageAnnulationMissionRefusee(mouvements: MouvementBloquantMission[]) {
  if (mouvements.length === 0) return null;
  const lignes = mouvements.map((m) => {
    const q = m.quantite > 0 ? ` (${m.quantite} u.)` : "";
    return `• ${m.libelle}${q}`;
  });
  return `Annulation impossible : le stock issu de cette mission a déjà été utilisé.\nTraitez d'abord ces mouvements :\n${lignes.join("\n")}`;
}

export function motifLigneMissionInvalide(
  ligne: MissionAchatRealise,
  produits: Produit[],
) {
  const p = produits.find((x) => x.id === ligne.produitId);
  if (!p) return "Article introuvable.";
  if (!produitEstAchetable(p)) {
    return `« ${p.libelleCourt || p.code} » n'est pas un article achetable.`;
  }
  if (ligne.quantite < 0) return "La quantité ne peut pas être négative.";
  if (ligne.quantite > 0 && ligne.prixUnitaire < 0) {
    return "Le prix unitaire ne peut pas être négatif.";
  }
  return null;
}

export function etapeValidationMission(
  action: MissionValidationEtape["action"],
  actor: { id?: string; nom?: string },
  detail?: string,
): MissionValidationEtape {
  return {
    id: createId("misval"),
    date: new Date().toISOString(),
    userId: actor.id,
    userNom: actor.nom,
    action,
    detail,
  };
}

export type SyntheseAvancesAcheteur = {
  acheteurUserId: string;
  acheteurNom: string;
  nbEnCours: number;
  nbClotureesNonReglees: number;
  totalAvancesEnCours: number;
  totalSoldesNonRegles: number;
};

export function syntheseAvancesParAcheteur(missions: MissionAchat[]): SyntheseAvancesAcheteur[] {
  const map = new Map<string, SyntheseAvancesAcheteur>();
  for (const m of missions) {
    if (m.statut === "annule" || m.statut === "cloture_annule") continue;
    let row = map.get(m.acheteurUserId);
    if (!row) {
      row = {
        acheteurUserId: m.acheteurUserId,
        acheteurNom: m.acheteurNom,
        nbEnCours: 0,
        nbClotureesNonReglees: 0,
        totalAvancesEnCours: 0,
        totalSoldesNonRegles: 0,
      };
      map.set(m.acheteurUserId, row);
    }
    if (m.statut === "en_cours") {
      row.nbEnCours += 1;
      row.totalAvancesEnCours += m.montantAvance;
    }
    if (m.statut === "cloture" && m.statutReglement === "non_regle") {
      row.nbClotureesNonReglees += 1;
      row.totalSoldesNonRegles += soldeMission(m);
    }
  }
  return [...map.values()].sort((a, b) => a.acheteurNom.localeCompare(b.acheteurNom, "fr"));
}

export function missionsFiltrees(
  missions: MissionAchat[],
  opts: {
    acheteurUserId?: string;
    debut?: string;
    fin?: string;
    statut?: MissionAchatStatut | "tous";
    reglement?: MissionReglementStatut | "tous";
  },
) {
  return missions.filter((m) => {
    if (opts.acheteurUserId && m.acheteurUserId !== opts.acheteurUserId) return false;
    if (opts.statut && opts.statut !== "tous" && m.statut !== opts.statut) return false;
    if (opts.reglement && opts.reglement !== "tous" && m.statutReglement !== opts.reglement) {
      return false;
    }
    if (opts.debut && m.date.slice(0, 10) < opts.debut) return false;
    if (opts.fin && m.date.slice(0, 10) > opts.fin) return false;
    return true;
  });
}

export function triMissionsSuivi(missions: MissionAchat[]) {
  return [...missions].sort((a, b) => {
    const ra = a.statutReglement === "non_regle" && a.statut === "cloture" ? 0 : 1;
    const rb = b.statutReglement === "non_regle" && b.statut === "cloture" ? 0 : 1;
    if (ra !== rb) return ra - rb;
    const na = a.statut === "en_cours" ? 0 : 1;
    const nb = b.statut === "en_cours" ? 0 : 1;
    if (na !== nb) return na - nb;
    return b.date.localeCompare(a.date);
  });
}

export function depensesValides(lignes: MissionDepenseDiverse[]) {
  return lignes.filter((d) => d.nature.trim() && d.montant > 0);
}
