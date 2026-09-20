import { nextNumero } from "./commercial";
import { quantiteStockChronologique } from "./cump";
import { createId } from "./id";
import { motifProduitNonAchetable, produitEstAchetable } from "./nature-stock";
import type {
  EntreeStock,
  Facture,
  Inventaire,
  MissionAchat,
  MissionAchatRealise,
  MissionAchatStatut,
  MissionDepenseDiverse,
  MissionJustificatif,
  MissionJustificatifType,
  MissionLignePrevisionnelle,
  MissionMouvementFondsType,
  MissionReglementStatut,
  MissionValidationAction,
  MissionValidationEtape,
  CategorieProduit,
  Produit,
  Tiers,
  TransfertStock,
  Vente,
} from "./types";

export const TIERS_DIVERS_MARCHE_ID = "frn-divers-marche";
export const TIERS_DIVERS_MARCHE_NOM = "Divers / Fournitures";

export const MISSION_STATUT_LABELS: Record<MissionAchatStatut, string> = {
  brouillon: "Brouillon",
  soumise: "Soumise",
  validee: "Validée",
  fonds_remis: "Fonds remis",
  en_cours: "En cours",
  a_regulariser: "À régulariser",
  cloture: "Clôturée",
  rejetee: "Rejetée",
  annule: "Annulée",
  cloture_annule: "Clôturée — Annulée",
};

export const MISSION_JUSTIFICATIF_LABELS: Record<MissionJustificatifType, string> = {
  facture: "Facture",
  recu: "Reçu",
  bon_livraison: "Bon de livraison",
  autre: "Autre",
};

export const MISSION_FONDS_TYPE_LABELS: Record<MissionMouvementFondsType, string> = {
  demande: "Demande",
  validation: "Validation",
  remise: "Remise",
  restitution: "Restitution par l'acheteur",
  remboursement: "Remboursement à l'acheteur",
};

export const MISSION_STATUTS_EXECUTION: MissionAchatStatut[] = [
  "fonds_remis",
  "en_cours",
  "a_regulariser",
];

export const MISSION_STATUTS_OUVERTS: MissionAchatStatut[] = [
  "brouillon",
  "soumise",
  "validee",
  "fonds_remis",
  "en_cours",
  "a_regulariser",
];

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
  return (
    m.statut === "cloture" ||
    m.statut === "cloture_annule" ||
    m.statut === "annule" ||
    m.statut === "rejetee"
  );
}

export function montantLignePrevisionnelle(
  l: Pick<MissionLignePrevisionnelle, "quantiteSouhaitee" | "prixUnitaireEstime">,
) {
  return Math.max(0, l.quantiteSouhaitee) * Math.max(0, l.prixUnitaireEstime ?? 0);
}

export function budgetPrevisionnelMission(
  m: Pick<MissionAchat, "lignesPrevisionnelles">,
) {
  return (m.lignesPrevisionnelles ?? []).reduce(
    (s, l) => s + montantLignePrevisionnelle(l),
    0,
  );
}

export function montantLigneRealisee(l: Pick<MissionAchatRealise, "quantite" | "prixUnitaire">) {
  return Math.max(0, l.quantite) * Math.max(0, l.prixUnitaire);
}

export function totalAchatsRealises(m: Pick<MissionAchat, "achatsRealises">) {
  return (m.achatsRealises ?? []).reduce((s, l) => s + montantLigneRealisee(l), 0);
}

export function totalDepensesDiverses(m: Pick<MissionAchat, "depensesDiverses">) {
  return (m.depensesDiverses ?? []).reduce(
    (s, d) => s + Math.max(0, d.montant),
    0,
  );
}

export function totalDepenseMission(m: Pick<MissionAchat, "achatsRealises" | "depensesDiverses">) {
  return totalAchatsRealises(m) + totalDepensesDiverses(m);
}

export function quantiteReceptionneeLigne(l: MissionAchatRealise) {
  if (typeof l.quantiteReceptionnee === "number" && Number.isFinite(l.quantiteReceptionnee)) {
    return Math.max(0, l.quantiteReceptionnee);
  }
  return Math.max(0, l.quantite);
}

export function quantiteManquanteLigne(l: MissionAchatRealise) {
  return Math.max(0, Math.max(0, l.quantite) - quantiteReceptionneeLigne(l));
}

export function statutReceptionLigne(l: MissionAchatRealise) {
  const achetee = Math.max(0, l.quantite);
  const recu = quantiteReceptionneeLigne(l);
  if (achetee <= 0) return "non_achete" as const;
  if (recu <= 0) return "non_receptionne" as const;
  if (recu + 1e-9 < achetee) return "partiel" as const;
  return "complet" as const;
}

export function fondsDemandesMission(m: MissionAchat) {
  const demandes = (m.mouvementsFonds ?? []).filter((x) => x.type === "demande");
  if (demandes.length) return demandes.reduce((s, x) => s + Math.max(0, x.montant), 0);
  return Math.max(0, m.montantAvanceDemandee ?? m.montantAvance ?? 0);
}

export function fondsValidesMission(m: MissionAchat) {
  const vals = (m.mouvementsFonds ?? []).filter((x) => x.type === "validation");
  if (vals.length) return vals.reduce((s, x) => s + Math.max(0, x.montant), 0);
  if (m.montantAvanceValidee != null) return Math.max(0, m.montantAvanceValidee);
  if (m.statut === "brouillon" || m.statut === "soumise" || m.statut === "rejetee") {
    return 0;
  }
  return Math.max(0, m.montantAvance);
}

export function fondsRemisMission(m: MissionAchat) {
  const remises = (m.mouvementsFonds ?? []).filter((x) => x.type === "remise");
  if (remises.length) return remises.reduce((s, x) => s + Math.max(0, x.montant), 0);
  return Math.max(0, m.montantAvance);
}

export function justificatifsMission(m: MissionAchat): MissionJustificatif[] {
  return m.justificatifs ?? [];
}

/** Les missions créées avant le dossier unique n'ont pas le tableau `justificatifs`. */
export function missionSuitJustificatifs(m: MissionAchat) {
  return Array.isArray(m.justificatifs);
}

export function achatEstJustifie(m: MissionAchat, l: MissionAchatRealise) {
  if (montantLigneRealisee(l) <= 0) return true;
  if (!missionSuitJustificatifs(m)) return true;
  if (l.numeroJustificatif?.trim()) return true;
  return justificatifsMission(m).some(
    (j) => j.ligneAchatId === l.id && Boolean(j.numero?.trim() || j.libelle?.trim()),
  );
}

export function depenseEstJustifiee(m: MissionAchat, d: MissionDepenseDiverse) {
  if (Math.max(0, d.montant) <= 0) return true;
  if (!missionSuitJustificatifs(m)) return true;
  if (d.numeroJustificatif?.trim()) return true;
  return justificatifsMission(m).some(
    (j) => j.depenseId === d.id && Boolean(j.numero?.trim() || j.libelle?.trim()),
  );
}

export function depensesJustifieesMission(m: MissionAchat) {
  const achats = (m.achatsRealises ?? []).reduce(
    (s, l) => s + (achatEstJustifie(m, l) ? montantLigneRealisee(l) : 0),
    0,
  );
  const divers = (m.depensesDiverses ?? []).reduce(
    (s, d) => s + (depenseEstJustifiee(m, d) ? Math.max(0, d.montant) : 0),
    0,
  );
  return achats + divers;
}

export function depensesNonJustifieesMission(m: MissionAchat) {
  return Math.max(0, totalDepenseMission(m) - depensesJustifieesMission(m));
}

export function nbJustificatifsManquants(m: MissionAchat) {
  const achats = m.achatsRealises.filter(
    (l) => montantLigneRealisee(l) > 0 && !achatEstJustifie(m, l),
  ).length;
  const divers = m.depensesDiverses.filter(
    (d) => d.montant > 0 && !depenseEstJustifiee(m, d),
  ).length;
  return achats + divers;
}

/** Solde = fonds remis − dépenses justifiées. Positif = à restituer ; négatif = à rembourser. */
export function soldeMission(m: MissionAchat) {
  return fondsRemisMission(m) - depensesJustifieesMission(m);
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
    specialite: "Achats divers atelier",
  };
}

export function entreesDepuisMission(
  mission: MissionAchat,
  produits: Produit[],
  tiers: Tiers[],
): EntreeStock[] {
  if (mission.statut !== "cloture" && mission.statut !== "cloture_annule") {
    return [];
  }
  const date = mission.dateCloture ?? mission.date;
  const dateAnnul = mission.dateAnnulation ?? date;
  const contre = mission.statut === "cloture_annule";

  const out: EntreeStock[] = [];
  for (const l of mission.achatsRealises) {
    const qte = quantiteReceptionneeLigne(l);
    if (qte <= 0 || !l.produitId) continue;
    const prod = produits.find((p) => p.id === l.produitId);
    const frn = tiers.find((t) => t.id === l.fournisseurId);
    const base: EntreeStock = {
      id: `ent-miss-${mission.id}-${l.id}`,
      pointDeVenteId: mission.siteDestinataireId,
      produitId: l.produitId,
      quantite: qte,
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
        quantite: -qte,
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
  if (missionEstVerrouillee(mission)) return false;
  if (opts.gerer) return true;
  if (!MISSION_STATUTS_EXECUTION.includes(mission.statut)) return false;
  return Boolean(opts.userId && opts.userId === mission.acheteurUserId);
}

export function peutModifierDossierMission(
  mission: Pick<MissionAchat, "statut">,
) {
  return !missionEstVerrouillee(mission);
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
      mission.achatsRealises
        .filter((l) => quantiteReceptionneeLigne(l) > 0)
        .map((l) => l.produitId),
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
  categories?: CategorieProduit[],
) {
  const p = produits.find((x) => x.id === ligne.produitId);
  if (!p) return "Article introuvable.";
  if (!produitEstAchetable(p, categories)) {
    return motifProduitNonAchetable(p);
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

export function evenementsSaisieMission(
  prev: MissionAchat,
  next: MissionAchat,
): { action: MissionValidationAction; detail: string }[] {
  const out: { action: MissionValidationAction; detail: string }[] = [];
  if (next.achatsRealises.length > prev.achatsRealises.length) {
    out.push({ action: "ajouter_achat", detail: "Ajout d'un achat" });
  }
  const justifieAvant = (id: string, kind: "achat" | "depense") => {
    if (kind === "achat") {
      const l = prev.achatsRealises.find((x) => x.id === id);
      return Boolean(l?.numeroJustificatif?.trim());
    }
    const d = prev.depensesDiverses.find((x) => x.id === id);
    return Boolean(d?.numeroJustificatif?.trim());
  };
  for (const l of next.achatsRealises) {
    if (l.numeroJustificatif?.trim() && !justifieAvant(l.id, "achat")) {
      out.push({
        action: "ajouter_justificatif",
        detail: `Justificatif achat ${l.numeroJustificatif.trim()}`,
      });
    }
  }
  for (const d of next.depensesDiverses) {
    if (d.numeroJustificatif?.trim() && !justifieAvant(d.id, "depense")) {
      out.push({
        action: "ajouter_justificatif",
        detail: `Justificatif dépense ${d.numeroJustificatif.trim()}`,
      });
    }
  }
  if ((next.justificatifs ?? []).length > (prev.justificatifs ?? []).length) {
    out.push({ action: "ajouter_justificatif", detail: "Justificatif de mission" });
  }
  const recuNouveau = next.achatsRealises.some((l) => {
    const avant = prev.achatsRealises.find((x) => x.id === l.id);
    return (
      typeof l.quantiteReceptionnee === "number" &&
      typeof avant?.quantiteReceptionnee !== "number"
    );
  });
  if (recuNouveau) {
    out.push({ action: "reception", detail: "Réception des articles" });
  }
  return out;
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
    if (MISSION_STATUTS_OUVERTS.includes(m.statut)) {
      row.nbEnCours += 1;
      row.totalAvancesEnCours += fondsRemisMission(m);
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
    const prio = (m: MissionAchat) => {
      if (m.statut === "a_regulariser") return 0;
      if (m.statutReglement === "non_regle" && m.statut === "cloture") return 1;
      if (m.statut === "en_cours" || m.statut === "fonds_remis") return 2;
      return 3;
    };
    const d = prio(a) - prio(b);
    if (d !== 0) return d;
    return b.date.localeCompare(a.date);
  });
}

export function depensesValides(lignes: MissionDepenseDiverse[]) {
  return lignes.filter(
    (d) => d.nature.trim() && d.montant > 0 && Boolean(d.fournisseurId?.trim()),
  );
}

export function motifDepenseDiverseInvalide(d: MissionDepenseDiverse) {
  if (!(d.montant > 0) && !d.nature.trim()) return null;
  if (!d.fournisseurId?.trim()) {
    return "Chaque dépense diverse doit avoir un fournisseur (fiche Tiers ou Divers / Fournitures).";
  }
  if (d.montant > 0 && !d.nature.trim()) {
    return "Indiquez la nature de la dépense diverse.";
  }
  return null;
}

export type AnomalieMission = {
  gravite: "warning" | "danger";
  code: string;
  libelle: string;
};

export function totauxArticlesMission(m: MissionAchat) {
  const prevu = (m.lignesPrevisionnelles ?? []).reduce(
    (s, l) => s + Math.max(0, l.quantiteSouhaitee),
    0,
  );
  const achete = (m.achatsRealises ?? []).reduce(
    (s, l) => s + Math.max(0, l.quantite),
    0,
  );
  const recu = (m.achatsRealises ?? []).reduce(
    (s, l) => s + quantiteReceptionneeLigne(l),
    0,
  );
  return { prevu, achete, recu };
}

export function fondsNonRegularises(m: MissionAchat) {
  return Math.abs(soldeMission(m)) >= 0.5 && m.statutReglement !== "regle";
}

export function anomaliesMission(m: MissionAchat): AnomalieMission[] {
  const out: AnomalieMission[] = [];
  const budget = budgetPrevisionnelMission(m);
  const depense = totalDepenseMission(m);
  const fondsValides = fondsValidesMission(m);
  if (budget > 0 && depense > budget + 0.5) {
    out.push({
      gravite: "danger",
      code: "depassement_budget",
      libelle: "Dépassement du budget prévisionnel",
    });
  }
  if (fondsValides > 0 && depense > fondsValides + 0.5) {
    out.push({
      gravite: "danger",
      code: "depense_superieure_autorisee",
      libelle: "Dépense supérieure au montant autorisé",
    });
  }
  const prevuIds = new Set((m.lignesPrevisionnelles ?? []).map((l) => l.produitId));
  for (const l of m.achatsRealises ?? []) {
    if (l.quantite <= 0) continue;
    if (!l.previsionId && !prevuIds.has(l.produitId)) {
      out.push({
        gravite: "warning",
        code: "article_imprevu",
        libelle: "Article acheté non prévu à la mission",
      });
      break;
    }
  }
  for (const l of m.achatsRealises ?? []) {
    if (!l.previsionId) continue;
    const prev = (m.lignesPrevisionnelles ?? []).find((p) => p.id === l.previsionId);
    if (prev && l.quantite > prev.quantiteSouhaitee + 1e-9) {
      out.push({
        gravite: "warning",
        code: "quantite_superieure",
        libelle: "Quantité achetée supérieure à la quantité autorisée",
      });
      break;
    }
  }
  const nJust = nbJustificatifsManquants(m);
  if (nJust > 0) {
    out.push({
      gravite: "danger",
      code: "sans_justificatif",
      libelle: `${nJust} dépense(s) sans justificatif`,
    });
  }
  if ((m.achatsRealises ?? []).some((l) => l.quantite > 0 && statutReceptionLigne(l) !== "complet")) {
    out.push({
      gravite: "warning",
      code: "non_receptionne",
      libelle: "Article acheté non entièrement réceptionné",
    });
  }
  if (fondsNonRegularises(m) && MISSION_STATUTS_EXECUTION.includes(m.statut)) {
    out.push({
      gravite: "warning",
      code: "fonds_non_regularises",
      libelle:
        soldeMission(m) > 0
          ? "Solde à restituer par l'acheteur"
          : "Montant supplémentaire à rembourser à l'acheteur",
    });
  }
  return out;
}

export function indicateurMission(
  m: MissionAchat,
): "conforme" | "ecart" | "probleme" {
  const ano = anomaliesMission(m);
  if (ano.some((a) => a.gravite === "danger")) return "probleme";
  if (ano.length > 0) return "ecart";
  return "conforme";
}

export function motifClotureImpossible(
  m: MissionAchat,
  opts?: { exceptionJustificatifs?: boolean },
) {
  if (
    m.statut !== "en_cours" &&
    m.statut !== "fonds_remis" &&
    m.statut !== "a_regulariser"
  ) {
    return "Seule une mission en cours, fonds remis ou à régulariser peut être clôturée.";
  }
  if (fondsNonRegularises(m)) {
    return "Clôture impossible : les fonds ne sont pas régularisés (restitution ou remboursement).";
  }
  if (
    nbJustificatifsManquants(m) > 0 &&
    !opts?.exceptionJustificatifs &&
    !m.clotureExceptionJustificatifs
  ) {
    return "Clôture impossible : des dépenses n'ont pas de justificatif. Un responsable peut autoriser une exception.";
  }
  for (const d of m.depensesDiverses) {
    if (d.montant > 0 || d.nature.trim()) {
      const motif = motifDepenseDiverseInvalide(d);
      if (motif) return motif;
    }
  }
  return null;
}

export function syntheseFinanciereMission(m: MissionAchat) {
  const solde = soldeMission(m);
  return {
    fondsDemandes: fondsDemandesMission(m),
    fondsValides: fondsValidesMission(m),
    fondsRemis: fondsRemisMission(m),
    budget: budgetPrevisionnelMission(m),
    totalDepenses: totalDepenseMission(m),
    depensesJustifiees: depensesJustifieesMission(m),
    depensesNonJustifiees: depensesNonJustifieesMission(m),
    solde,
    aRestituer: solde > 0.5 ? solde : 0,
    aRembourser: solde < -0.5 ? -solde : 0,
  };
}
