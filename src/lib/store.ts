"use client";

import { create } from "zustand";
import {
  modelePourType,
  type ModeleDocument,
  type PreferencesModeles,
  type TypeDocumentCommercial,
} from "./document-templates";
import {
  creerEntreeHistorique,
  produitEstReference,
} from "./produits";
import { creerEntreeJournal, factureEstFiscale, nextNumeroDocumentCommercial } from "./facturation-mg";
import { stockDisponible } from "./calculations";
import { quantiteStockChronologique, snapshotCumpLignesFacture } from "./cump";
import {
  entreesDepuisAchat,
  nextNumeroAchat,
  nextNumeroAvoirAchat,
  nextNumeroLivraison,
  quantiteLivreeProduit,
  quantiteRetourneeProduit,
  reliquatProduit,
  soldeAchat,
  statutLivraisonRecord,
} from "./achats";
import {
  appliqueTVA,
  ensureCodesClients,
  factureImpacteExploitation,
  fournisseurEstReference,
  motifLienClient,
  motifLienPointDeVente,
  nextCodeClient,
  nextNumero,
  rebuildVentesDepuisFactures,
  splitTTC,
} from "./commercial";
import {
  resetBusinessState,
  scheduleBusinessSave,
  setBusinessSyncEnabled,
  installBusinessSaveLifecycle,
} from "./business-api";
import {
  avecPresentationSiBesoin,
  creerSnapshotPresentation,
} from "./document-presentation";
import { emptyAppState, pickAppState } from "./empty-state";
import { createId } from "./id";
import { getActiviteActor } from "./activity-actor";
import { useAuthStore } from "./auth-store";
import {
  creerVerrouTransformation,
  verrouTransformationActif,
} from "./transformation-document";
import type {
  Achat,
  Acompte,
  ActiviteAction,
  ActiviteEntite,
  AppState,
  AvoirAchatLigne,
  BilanInitial,
  BonDeLivraison,
  BonDeLivraisonStatut,
  CategorieProduit,
  Charge,
  CibleTransformation,
  Client,
  Commande,
  CommandeStatut,
  Devis,
  DevisStatut,
  EntreeStock,
  Facture,
  Fournisseur,
  HistoriquePrix,
  IdentiteNavigation,
  Immobilisation,
  Inventaire,
  JournalActivite,
  JournalAudit,
  LivraisonAchatLigne,
  ModePaiement,
  MouvementCompteCourant,
  Parametres,
  PointDeVente,
  Produit,
  RapportFinJournee,
  SourceTransformation,
  TarifClient,
  TransformationCommerciale,
  Vente,
} from "./types";

type Store = {
  parametres: Parametres;
  modelesDocuments: ModeleDocument[];
  preferencesModeles: PreferencesModeles;
  bilanInitial: BilanInitial;
  immobilisations: Immobilisation[];
  mouvementsCompteCourant: MouvementCompteCourant[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  devis: Devis[];
  commandes: Commande[];
  bonsDeLivraison: BonDeLivraison[];
  factures: Facture[];
  acomptes: Acompte[];
  transformations: TransformationCommerciale[];
  achats: Achat[];
  pointsDeVente: PointDeVente[];
  categoriesProduits: CategorieProduit[];
  produits: Produit[];
  tarifsClients: TarifClient[];
  historiquesPrix: HistoriquePrix[];
  journalAudit: JournalAudit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  charges: Charge[];
  rapportsFinJournee: RapportFinJournee[];
  inventaires: Inventaire[];
  journalActivites: JournalActivite[];
  identiteNavigation: IdentiteNavigation;
  pointDeVenteActifId: string | "tous";

  setPointDeVenteActif: (id: string | "tous") => void;
  updateParametres: (data: Partial<Parametres>) => void;
  updateIdentiteNavigation: (
    data: Partial<IdentiteNavigation>,
  ) => { ok: true } | { ok: false; reason: string };
  updateBilanInitial: (data: Partial<BilanInitial>) => void;

  addModeleDocument: (m: Omit<ModeleDocument, "id">) => string;
  updateModeleDocument: (id: string, data: Partial<ModeleDocument>) => void;
  deleteModeleDocument: (id: string) => void;
  /** Définit le modèle préféré d'un utilisateur pour un type de document. */
  setModelePreference: (
    userId: string,
    type: TypeDocumentCommercial,
    modeleId: string | null,
  ) => void;

  addPointDeVente: (pdv: Omit<PointDeVente, "id">) => void;
  updatePointDeVente: (id: string, data: Partial<PointDeVente>) => void;
  deletePointDeVente: (id: string) => { ok: boolean; reason?: string };

  addEntree: (entree: Omit<EntreeStock, "id">) => void;
  updateEntree: (id: string, data: Partial<EntreeStock>) => {
    ok: boolean;
    reason?: string;
  };
  deleteEntree: (id: string) => { ok: boolean; reason?: string };

  addAchat: (
    achat: Omit<Achat, "id" | "livraisons" | "paiements" | "avoirs"> & {
      livraisons?: Achat["livraisons"];
      paiements?: Achat["paiements"];
      avoirs?: Achat["avoirs"];
    },
  ) => string;
  updateAchat: (
    id: string,
    data: Partial<Pick<Achat, "fournisseurId" | "pointDeVenteId" | "date" | "echeance" | "tauxTVA" | "lignes" | "note">>,
  ) => { ok: boolean; reason?: string };
  validerAchat: (id: string) => { ok: boolean; reason?: string };
  annulerAchat: (id: string) => { ok: boolean; reason?: string };
  deleteAchat: (id: string) => { ok: boolean; reason?: string };
  ajouterLivraisonAchat: (
    achatId: string,
    data: {
      date: string;
      lignes: LivraisonAchatLigne[];
      note?: string;
      confirmer?: boolean;
    },
  ) => { ok: boolean; reason?: string; id?: string };
  confirmerLivraisonAchat: (
    achatId: string,
    livraisonId: string,
    lignes?: LivraisonAchatLigne[],
  ) => { ok: boolean; reason?: string };
  annulerLivraisonAchat: (
    achatId: string,
    livraisonId: string,
  ) => { ok: boolean; reason?: string };
  ajouterPaiementAchat: (
    achatId: string,
    data: { date: string; montant: number; modePaiement: ModePaiement; note?: string },
  ) => { ok: boolean; reason?: string };
  supprimerPaiementAchat: (
    achatId: string,
    paiementId: string,
  ) => { ok: boolean; reason?: string };
  ajouterAvoirAchat: (
    achatId: string,
    data: { date: string; lignes: AvoirAchatLigne[]; note?: string },
  ) => { ok: boolean; reason?: string; id?: string };
  validerAvoirAchat: (achatId: string, avoirId: string) => {
    ok: boolean;
    reason?: string;
  };
  supprimerAvoirAchat: (achatId: string, avoirId: string) => {
    ok: boolean;
    reason?: string;
  };

  addVente: (vente: Omit<Vente, "id">) => void;
  deleteVente: (id: string) => void;

  addCharge: (charge: Omit<Charge, "id">) => void;
  updateCharge: (id: string, data: Partial<Charge>) => void;
  deleteCharge: (id: string) => void;

  /** Crée ou met à jour la clôture du jour pour un PDV. */
  upsertRapportFinJournee: (
    data: Omit<RapportFinJournee, "id" | "updatedAt"> & { id?: string },
  ) => void;
  deleteRapportFinJournee: (id: string) => void;

  addCategorieProduit: (cat: Omit<CategorieProduit, "id">) => void;
  updateCategorieProduit: (id: string, data: Partial<CategorieProduit>) => void;
  deleteCategorieProduit: (id: string) => { ok: boolean; reason?: string };

  addProduit: (produit: Omit<Produit, "id">) => void;
  updateProduit: (
    id: string,
    data: Partial<Produit>,
    opts?: { motifPrix?: string },
  ) => void;
  /** Désactive le produit ; suppression physique refusée si référencé. */
  desactiverProduit: (id: string) => void;
  deleteProduit: (id: string) => { ok: boolean; reason?: string };

  addTarifClient: (tarif: Omit<TarifClient, "id">) => void;
  updateTarifClient: (id: string, data: Partial<TarifClient>) => void;
  deleteTarifClient: (id: string) => void;

  addImmobilisation: (immo: Omit<Immobilisation, "id">) => void;
  updateImmobilisation: (id: string, data: Partial<Immobilisation>) => void;
  deleteImmobilisation: (id: string) => void;

  addMouvementCompteCourant: (
    m: Omit<MouvementCompteCourant, "id" | "userId" | "userNom">,
  ) => string;
  updateMouvementCompteCourant: (
    id: string,
    data: Partial<Omit<MouvementCompteCourant, "id" | "userId" | "userNom">>,
  ) => void;
  deleteMouvementCompteCourant: (id: string) => void;

  addClient: (client: Omit<Client, "id">) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => { ok: boolean; reason?: string };

  addFournisseur: (frn: Omit<Fournisseur, "id">) => void;
  updateFournisseur: (id: string, data: Partial<Fournisseur>) => void;
  deleteFournisseur: (id: string) => { ok: boolean; reason?: string };

  addDevis: (devis: Omit<Devis, "id">) => string;
  updateDevis: (id: string, data: Partial<Devis>) => void;
  deleteDevis: (id: string) => void;

  addCommande: (cmd: Omit<Commande, "id">) => string;
  updateCommande: (id: string, data: Partial<Commande>) => void;
  deleteCommande: (id: string) => void;

  addBonDeLivraison: (bl: Omit<BonDeLivraison, "id">) => string;
  updateBonDeLivraison: (id: string, data: Partial<BonDeLivraison>) => void;
  deleteBonDeLivraison: (id: string) => void;

  verrouillerTransformation: (
    kind: SourceTransformation,
    id: string,
    cible: CibleTransformation,
  ) => { ok: boolean; reason?: string };
  annulerTransformation: (kind: SourceTransformation, id: string) => void;
  libererVerrousExpires: () => void;
  finaliserTransformation: (payload: {
    sourceType: SourceTransformation;
    sourceId: string;
    cibleType: CibleTransformation;
    cibleId: string;
    cibleNumero: string;
    statutSource: string;
  }) => { ok: true } | { ok: false; reason: string };

  addFacture: (
    facture: Omit<Facture, "id">,
    audit?: { action: JournalAudit["action"]; detail?: string },
  ) => string;
  updateFacture: (
    id: string,
    data: Partial<Facture>,
    audit?: { action: JournalAudit["action"]; detail?: string },
  ) => void;
  deleteFacture: (id: string) => { ok: boolean; reason?: string };
  addJournalAudit: (entry: Omit<JournalAudit, "id">) => void;
  /** Purge les entrées journal métier plus anciennes que N jours. Retourne le nombre supprimé. */
  purgeJournalAuditOlderThan: (days: number) => number;

  /** Journalise une action significative dans l'historique (traçabilité). */
  logActivite: (
    action: ActiviteAction,
    entite: ActiviteEntite,
    opts?: { entiteId?: string; libelle?: string; detail?: string },
  ) => void;
  /** Purge l'historique des actions plus ancien que N jours. Retourne le nombre supprimé. */
  purgeJournalActivitesOlderThan: (days: number) => number;

  addInventaire: (inventaire: Omit<Inventaire, "id">) => string;
  updateInventaire: (id: string, data: Partial<Inventaire>) => void;
  deleteInventaire: (id: string) => void;
  /** Clôture un inventaire (statut validé) et le trace dans l'historique. */
  validerInventaire: (id: string) => void;

  addAcompte: (acompte: Omit<Acompte, "id">) => string;
  updateAcompte: (id: string, data: Partial<Acompte>) => void;
  deleteAcompte: (id: string) => void;
  /**
   * Enregistre un acompte encaissé (devis / commande / facture) et,
   * par défaut, émet la facture d'acompte (MG).
   */
  encaisserAcompte: (data: {
    clientId: string;
    pointDeVenteId: string;
    date: string;
    montantTTC: number;
    modePaiement: ModePaiement;
    devisId?: string;
    commandeId?: string;
    factureId?: string;
    refDocument: string;
    genererFactureAcompte?: boolean;
    note?: string;
  }) => { ok: true; acompteId: string; numero: string; factureAcompteId?: string } | { ok: false; reason: string };

  /** Remplace l'état métier (hydratation API). */
  applyBusinessData: (data: AppState) => void;
  clearBusinessData: () => void;
  /** Remet l'état métier à vide via API (admin). Mot de passe du compte requis. */
  resetBusinessData: (
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

function uid(prefix: string) {
  return createId(prefix);
}

function nomFournisseur(state: { fournisseurs: Fournisseur[] }, id: string) {
  return state.fournisseurs.find((f) => f.id === id)?.nom ?? "Fournisseur";
}

function regenererEntreesAchat(
  entrees: EntreeStock[],
  achat: Achat,
  produits: Produit[],
  fournisseurNom: string,
): EntreeStock[] {
  const hors = entrees.filter((e) => e.achatId !== achat.id);
  const gen = entreesDepuisAchat(achat, produits, fournisseurNom).map((e) => ({
    ...e,
    id: e.livraisonId
      ? `ent-liv-${e.livraisonId}-${e.produitId}`
      : `ent-avr-${e.avoirAchatId}-${e.produitId}`,
  }));
  return [...gen, ...hors];
}

function stockDevientNegatif(
  entrees: EntreeStock[],
  ventes: Vente[],
  inventaires: Inventaire[],
  pointDeVenteId: string,
  produitIds: string[],
) {
  for (const produitId of produitIds) {
    const q = quantiteStockChronologique({
      produitId,
      pointDeVenteId,
      entrees,
      ventes,
      inventaires,
    });
    if (q < -1e-9) return true;
  }
  return false;
}

function figerCumpSiCloture(
  facture: Facture,
  ctx: {
    entrees: EntreeStock[];
    ventes: Vente[];
    inventaires: Inventaire[];
    produits: Produit[];
  },
): Facture {
  if (!factureImpacteExploitation(facture)) return facture;
  if (facture.lignes.some((l) => l.cumpFigee != null)) return facture;
  return {
    ...facture,
    lignes: snapshotCumpLignesFacture(facture, {
      entrees: ctx.entrees,
      ventes: ctx.ventes.filter((v) => v.factureId !== facture.id),
      inventaires: ctx.inventaires,
      produits: ctx.produits,
    }),
  };
}

function modeleCourant(
  state: { modelesDocuments: ModeleDocument[]; preferencesModeles: PreferencesModeles },
  type: TypeDocumentCommercial,
) {
  return modelePourType(state.modelesDocuments, type, {
    preferences: state.preferencesModeles,
    userId: getActiviteActor().id,
  });
}

/** Construit une entrée de journal d'historique attribuée à l'utilisateur courant. */
function entreeActivite(
  action: ActiviteAction,
  entite: ActiviteEntite,
  opts?: { entiteId?: string; libelle?: string; detail?: string },
): JournalActivite {
  const actor = getActiviteActor();
  return {
    id: createId("act"),
    date: new Date().toISOString(),
    userId: actor.id,
    userNom: actor.nom,
    action,
    entite,
    entiteId: opts?.entiteId,
    libelle: opts?.libelle,
    detail: opts?.detail,
  };
}

type DocSource = Devis | Commande | BonDeLivraison;

function trouverSource(
  state: Pick<Store, "devis" | "commandes" | "bonsDeLivraison">,
  kind: SourceTransformation,
  id: string,
): DocSource | undefined {
  if (kind === "devis") return state.devis.find((d) => d.id === id);
  if (kind === "commande") return state.commandes.find((c) => c.id === id);
  return state.bonsDeLivraison.find((b) => b.id === id);
}

function patcherSource(
  state: Pick<Store, "devis" | "commandes" | "bonsDeLivraison">,
  kind: SourceTransformation,
  id: string,
  patch: Record<string, unknown>,
): Partial<Pick<Store, "devis" | "commandes" | "bonsDeLivraison">> {
  if (kind === "devis") {
    return {
      devis: state.devis.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    };
  }
  if (kind === "commande") {
    return {
      commandes: state.commandes.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    };
  }
  return {
    bonsDeLivraison: state.bonsDeLivraison.map((b) =>
      b.id === id ? { ...b, ...patch } : b,
    ),
  };
}

function entiteSource(kind: SourceTransformation): ActiviteEntite {
  if (kind === "devis") return "devis";
  if (kind === "commande") return "commande";
  return "bon_de_livraison";
}

function libererSiExpire<T extends DocSource>(doc: T): T {
  const v = doc.verrouTransformation;
  if (!v) return doc;
  if (verrouTransformationActif(v)) return doc;
  if (doc.statut === "transforme") {
    return { ...doc, verrouTransformation: null };
  }
  return {
    ...doc,
    statut: v.statutPrecedent as T["statut"],
    verrouTransformation: null,
  };
}

export const useStore = create<Store>()((set, get) => ({
      ...emptyAppState(),
      setPointDeVenteActif: (id) => set({ pointDeVenteActifId: id }),
      updateParametres: (data) =>
        set((state) => {
          const modele = modeleCourant(state, "facture");
          // Avant d'appliquer les nouveaux params : figer les factures fiscales
          // encore sans snapshot (état précédent = non impactées par la modif).
          const factures = state.factures.map((f) =>
            avecPresentationSiBesoin(f, state.parametres, modele),
          );
          return {
            parametres: { ...state.parametres, ...data },
            factures,
            journalActivites: [
              entreeActivite("modification", "parametres", {
                libelle: "Paramètres entreprise",
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateIdentiteNavigation: (data) => {
        const auth = useAuthStore.getState();
        if (!auth.hasPermission("navigation.identite")) {
          return {
            ok: false as const,
            reason:
              "Seul l'administrateur peut modifier le nom et le logo du menu.",
          };
        }
        set((state) => ({
          identiteNavigation: {
            nom: state.identiteNavigation?.nom ?? "",
            logoDataUrl: state.identiteNavigation?.logoDataUrl,
            ...data,
          },
          journalActivites: [
            entreeActivite("modification", "parametres", {
              libelle: "Identité du menu",
              detail: "Nom et logo de la colonne de navigation",
            }),
            ...state.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      updateBilanInitial: (data) =>
        set((state) => ({
          bilanInitial: { ...state.bilanInitial, ...data },
        })),

      addModeleDocument: (m) => {
        const id = uid("modele");
        set((state) => ({
          modelesDocuments: [...state.modelesDocuments, { ...m, id }],
        }));
        return id;
      },
      updateModeleDocument: (id, data) =>
        set((state) => {
          const modeleFacture = modeleCourant(state, "facture");
          const factures = state.factures.map((f) =>
            avecPresentationSiBesoin(f, state.parametres, modeleFacture),
          );
          return {
            factures,
            modelesDocuments: state.modelesDocuments.map((m) =>
              m.id === id ? { ...m, ...data } : m,
            ),
          };
        }),
      deleteModeleDocument: (id) =>
        set((state) => {
          // Nettoie les préférences pointant vers le modèle supprimé.
          const prefs: PreferencesModeles = {};
          for (const [uid, map] of Object.entries(state.preferencesModeles)) {
            const clean = { ...map };
            for (const t of Object.keys(clean) as TypeDocumentCommercial[]) {
              if (clean[t] === id) delete clean[t];
            }
            prefs[uid] = clean;
          }
          return {
            modelesDocuments: state.modelesDocuments.filter((m) => m.id !== id),
            preferencesModeles: prefs,
          };
        }),
      setModelePreference: (userId, type, modeleId) =>
        set((state) => {
          const current = state.preferencesModeles[userId] ?? {};
          const next = { ...current };
          if (modeleId) next[type] = modeleId;
          else delete next[type];
          return {
            preferencesModeles: {
              ...state.preferencesModeles,
              [userId]: next,
            },
          };
        }),

      addPointDeVente: (pdv) =>
        set((state) => {
          const nouveau = { ...pdv, id: uid("pdv") };
          return {
            pointsDeVente: [...state.pointsDeVente, nouveau],
            journalActivites: [
              entreeActivite("creation", "point_de_vente", {
                entiteId: nouveau.id,
                libelle: nouveau.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updatePointDeVente: (id, data) =>
        set((state) => {
          const prev = state.pointsDeVente.find((p) => p.id === id);
          return {
            pointsDeVente: state.pointsDeVente.map((p) =>
              p.id === id ? { ...p, ...data } : p,
            ),
            journalActivites: [
              entreeActivite("modification", "point_de_vente", {
                entiteId: id,
                libelle: prev?.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deletePointDeVente: (id) => {
        const state = get();
        const pdv = state.pointsDeVente.find((p) => p.id === id);
        if (!pdv) return { ok: false, reason: "Point de vente introuvable." };
        const motif = motifLienPointDeVente(id, {
          factures: state.factures,
          devis: state.devis,
          commandes: state.commandes,
          bonsDeLivraison: state.bonsDeLivraison,
          entrees: state.entrees,
          ventes: state.ventes,
          charges: state.charges,
          immobilisations: state.immobilisations,
          rapportsFinJournee: state.rapportsFinJournee,
          achats: state.achats,
        });
        if (motif) return { ok: false, reason: motif };
        set((s) => ({
          pointsDeVente: s.pointsDeVente.filter((p) => p.id !== id),
          pointDeVenteActifId:
            s.pointDeVenteActifId === id ? "tous" : s.pointDeVenteActifId,
          journalActivites: [
            entreeActivite("suppression", "point_de_vente", {
              entiteId: id,
              libelle: pdv.nom,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addEntree: (entree) =>
        set((state) => ({
          entrees: [{ ...entree, id: uid("ent") }, ...state.entrees],
        })),
      updateEntree: (id, data) => {
        const state = get();
        const prev = state.entrees.find((e) => e.id === id);
        if (!prev) return { ok: false, reason: "Entrée introuvable." };
        const next = { ...prev, ...data };
        const retireQty =
          prev.produitId !== next.produitId ||
          prev.pointDeVenteId !== next.pointDeVenteId
            ? prev.quantite
            : Math.max(0, prev.quantite - next.quantite);
        const dispo = stockDisponible(
          prev.produitId,
          prev.pointDeVenteId,
          state.entrees,
          state.ventes,
          state.inventaires,
        );
        if (retireQty > 0 && dispo + 1e-9 < retireQty) {
          return {
            ok: false,
            reason:
              "Stock insuffisant : cette entrée a déjà été consommée par des ventes.",
          };
        }
        set((s) => ({
          entrees: s.entrees.map((e) => (e.id === id ? next : e)),
        }));
        return { ok: true };
      },
      deleteEntree: (id) => {
        const state = get();
        const prev = state.entrees.find((e) => e.id === id);
        if (!prev) return { ok: false, reason: "Entrée introuvable." };
        const dispo = stockDisponible(
          prev.produitId,
          prev.pointDeVenteId,
          state.entrees,
          state.ventes,
          state.inventaires,
        );
        if (dispo + 1e-9 < prev.quantite) {
          return {
            ok: false,
            reason:
              "Stock insuffisant : cette entrée a déjà été consommée par des ventes.",
          };
        }
        set((s) => ({
          entrees: s.entrees.filter((e) => e.id !== id),
        }));
        return { ok: true };
      },

      addAchat: (achat) => {
        const id = uid("ach");
        const numero = achat.numero || nextNumeroAchat(get().achats);
        set((state) => ({
          achats: [
            {
              ...achat,
              id,
              numero,
              livraisons: achat.livraisons ?? [],
              paiements: achat.paiements ?? [],
              avoirs: achat.avoirs ?? [],
            },
            ...state.achats,
          ],
          journalActivites: [
            entreeActivite("creation", "achat", {
              entiteId: id,
              libelle: numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateAchat: (id, data) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === id);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut !== "brouillon") {
          if (data.lignes || data.fournisseurId || data.pointDeVenteId) {
            return {
              ok: false,
              reason: "La commande validée ne peut plus être modifiée. Seuls l'échéance et la note restent éditables.",
            };
          }
        }
        if (data.lignes && prev.livraisons.some((l) => l.statut !== "annulee")) {
          return {
            ok: false,
            reason: "Des livraisons existent déjà : les lignes de commande ne peuvent plus être modifiées.",
          };
        }
        set((s) => ({
          achats: s.achats.map((a) => (a.id === id ? { ...a, ...data } : a)),
          journalActivites: [
            entreeActivite("modification", "achat", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      validerAchat: (id) => {
        const prev = get().achats.find((a) => a.id === id);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut === "annule") {
          return { ok: false, reason: "Cet achat est annulé." };
        }
        if (prev.lignes.length === 0) {
          return { ok: false, reason: "Ajoutez au moins un article." };
        }
        set((s) => ({
          achats: s.achats.map((a) =>
            a.id === id
              ? {
                  ...a,
                  statut: "valide" as const,
                  dateValidation: new Date().toISOString(),
                }
              : a,
          ),
          journalActivites: [
            entreeActivite("validation", "achat", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      annulerAchat: (id) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === id);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (quantiteLivreeProduit(prev, prev.lignes[0]?.produitId ?? "") > 0 ||
            prev.livraisons.some((l) => l.statut !== "annulee" && l.lignes.some((x) => x.quantiteLivree > 0))) {
          return {
            ok: false,
            reason: "Annulez d'abord les livraisons déjà réceptionnées.",
          };
        }
        if (prev.paiements.length > 0) {
          return {
            ok: false,
            reason: "Des paiements sont enregistrés. Supprimez-les avant d'annuler.",
          };
        }
        const next: Achat = {
          ...prev,
          statut: "annule",
          livraisons: prev.livraisons.map((l) => ({ ...l, statut: "annulee" as const })),
        };
        set((s) => ({
          achats: s.achats.map((a) => (a.id === id ? next : a)),
          entrees: regenererEntreesAchat(
            s.entrees,
            next,
            s.produits,
            nomFournisseur(s, next.fournisseurId),
          ),
          journalActivites: [
            entreeActivite("annulation", "achat", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      deleteAchat: (id) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === id);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut === "valide") {
          return {
            ok: false,
            reason: "Un achat validé ne peut pas être supprimé. Annulez-le.",
          };
        }
        if (prev.livraisons.some((l) => l.statut !== "annulee" && l.lignes.some((x) => x.quantiteLivree > 0))) {
          return { ok: false, reason: "Des réceptions existent encore." };
        }
        set((s) => ({
          achats: s.achats.filter((a) => a.id !== id),
          entrees: s.entrees.filter((e) => e.achatId !== id),
          journalActivites: [
            entreeActivite("suppression", "achat", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      ajouterLivraisonAchat: (achatId, data) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut !== "valide") {
          return { ok: false, reason: "Validez la commande avant d'enregistrer une livraison." };
        }
        for (const l of data.lignes) {
          const reliquat = reliquatProduit(prev, l.produitId);
          const q = data.confirmer === false ? 0 : l.quantiteLivree;
          if (q - reliquat > 1e-9) {
            return {
              ok: false,
              reason: "Quantité livrée supérieure au reliquat commandé.",
            };
          }
        }
        const id = uid("liv");
        const draft = {
          id,
          numero: nextNumeroLivraison(state.achats),
          date: data.date,
          statut: "en_attente" as const,
          lignes: data.lignes,
          note: data.note,
        };
        const confirmer = data.confirmer !== false;
        const liv = {
          ...draft,
          statut: confirmer
            ? statutLivraisonRecord({ ...draft, statut: "livree" })
            : ("en_attente" as const),
        };
        const next: Achat = { ...prev, livraisons: [liv, ...prev.livraisons] };
        const entrees = regenererEntreesAchat(
          state.entrees,
          next,
          state.produits,
          nomFournisseur(state, next.fournisseurId),
        );
        set((s) => ({
          achats: s.achats.map((a) => (a.id === achatId ? next : a)),
          entrees,
          journalActivites: [
            entreeActivite("creation", "achat", {
              entiteId: achatId,
              libelle: `${prev.numero} · ${liv.numero}`,
              detail: "Livraison",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, id };
      },
      confirmerLivraisonAchat: (achatId, livraisonId, lignes) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const livPrev = prev.livraisons.find((l) => l.id === livraisonId);
        if (!livPrev) return { ok: false, reason: "Livraison introuvable." };
        if (livPrev.statut === "annulee") {
          return { ok: false, reason: "Cette livraison est annulée." };
        }
        const livLignes = lignes ?? livPrev.lignes;
        const horsCette = {
          ...prev,
          livraisons: prev.livraisons.filter((l) => l.id !== livraisonId),
        };
        for (const l of livLignes) {
          if (l.quantiteLivree - reliquatProduit(horsCette, l.produitId) > 1e-9) {
            return {
              ok: false,
              reason: "Quantité livrée supérieure au reliquat commandé.",
            };
          }
        }
        const liv = {
          ...livPrev,
          lignes: livLignes,
          statut: statutLivraisonRecord({ ...livPrev, lignes: livLignes, statut: "livree" }),
        };
        const next: Achat = {
          ...prev,
          livraisons: prev.livraisons.map((l) => (l.id === livraisonId ? liv : l)),
        };
        const entrees = regenererEntreesAchat(
          state.entrees,
          next,
          state.produits,
          nomFournisseur(state, next.fournisseurId),
        );
        set((s) => ({
          achats: s.achats.map((a) => (a.id === achatId ? next : a)),
          entrees,
          journalActivites: [
            entreeActivite("validation", "achat", {
              entiteId: achatId,
              libelle: `${prev.numero} · ${liv.numero}`,
              detail: "Confirmation de livraison",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      annulerLivraisonAchat: (achatId, livraisonId) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const next: Achat = {
          ...prev,
          livraisons: prev.livraisons.map((l) =>
            l.id === livraisonId ? { ...l, statut: "annulee" as const } : l,
          ),
        };
        const entrees = regenererEntreesAchat(
          state.entrees,
          next,
          state.produits,
          nomFournisseur(state, next.fournisseurId),
        );
        const produitIds = [...new Set(prev.lignes.map((l) => l.produitId))];
        if (
          stockDevientNegatif(
            entrees,
            state.ventes,
            state.inventaires,
            prev.pointDeVenteId,
            produitIds,
          )
        ) {
          return {
            ok: false,
            reason:
              "Stock insuffisant : cette réception a déjà été consommée par des ventes.",
          };
        }
        set((s) => ({
          achats: s.achats.map((a) => (a.id === achatId ? next : a)),
          entrees,
          journalActivites: [
            entreeActivite("annulation", "achat", {
              entiteId: achatId,
              libelle: prev.numero,
              detail: "Livraison annulée",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      ajouterPaiementAchat: (achatId, data) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut !== "valide") {
          return { ok: false, reason: "Validez la commande avant d'enregistrer un paiement." };
        }
        if (data.montant <= 0) {
          return { ok: false, reason: "Montant de paiement invalide." };
        }
        const solde = soldeAchat(prev);
        if (data.montant - solde > 0.5) {
          return {
            ok: false,
            reason: `Le paiement dépasse le solde restant (${Math.round(solde)} Ar).`,
          };
        }
        const paiement = { ...data, id: uid("pay") };
        set((s) => ({
          achats: s.achats.map((a) =>
            a.id === achatId
              ? { ...a, paiements: [paiement, ...a.paiements] }
              : a,
          ),
          journalActivites: [
            entreeActivite("creation", "achat", {
              entiteId: achatId,
              libelle: prev.numero,
              detail: "Paiement fournisseur",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      supprimerPaiementAchat: (achatId, paiementId) => {
        const prev = get().achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        set((s) => ({
          achats: s.achats.map((a) =>
            a.id === achatId
              ? { ...a, paiements: a.paiements.filter((p) => p.id !== paiementId) }
              : a,
          ),
          journalActivites: [
            entreeActivite("suppression", "achat", {
              entiteId: achatId,
              libelle: prev.numero,
              detail: "Paiement fournisseur",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      ajouterAvoirAchat: (achatId, data) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut !== "valide") {
          return { ok: false, reason: "Validez la commande avant un retour." };
        }
        for (const l of data.lignes) {
          const dispo =
            quantiteLivreeProduit(prev, l.produitId) -
            quantiteRetourneeProduit(prev, l.produitId);
          if (l.quantite - dispo > 1e-9) {
            return {
              ok: false,
              reason: "Quantité retournée supérieure à la quantité encore en stock sur cet achat.",
            };
          }
        }
        const id = uid("avr");
        const avoir = {
          id,
          numero: nextNumeroAvoirAchat(state.achats),
          date: data.date,
          statut: "brouillon" as const,
          lignes: data.lignes,
          note: data.note,
        };
        set((s) => ({
          achats: s.achats.map((a) =>
            a.id === achatId ? { ...a, avoirs: [avoir, ...a.avoirs] } : a,
          ),
          journalActivites: [
            entreeActivite("creation", "achat", {
              entiteId: achatId,
              libelle: `${prev.numero} · ${avoir.numero}`,
              detail: "Avoir fournisseur",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, id };
      },
      validerAvoirAchat: (achatId, avoirId) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const avPrev = prev.avoirs.find((a) => a.id === avoirId);
        if (!avPrev) return { ok: false, reason: "Avoir introuvable." };
        const next: Achat = {
          ...prev,
          avoirs: prev.avoirs.map((a) =>
            a.id === avoirId ? { ...a, statut: "valide" as const } : a,
          ),
        };
        const entrees = regenererEntreesAchat(
          state.entrees,
          next,
          state.produits,
          nomFournisseur(state, next.fournisseurId),
        );
        const produitIds = avPrev.lignes.map((l) => l.produitId);
        if (
          stockDevientNegatif(
            entrees,
            state.ventes,
            state.inventaires,
            prev.pointDeVenteId,
            produitIds,
          )
        ) {
          return {
            ok: false,
            reason: "Stock insuffisant pour ce retour fournisseur.",
          };
        }
        set((s) => ({
          achats: s.achats.map((a) => (a.id === achatId ? next : a)),
          entrees,
          journalActivites: [
            entreeActivite("validation", "achat", {
              entiteId: achatId,
              libelle: `${prev.numero} · ${avPrev.numero}`,
              detail: "Avoir fournisseur validé",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      supprimerAvoirAchat: (achatId, avoirId) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const avPrev = prev.avoirs.find((a) => a.id === avoirId);
        if (!avPrev) return { ok: false, reason: "Avoir introuvable." };
        const next: Achat = {
          ...prev,
          avoirs: prev.avoirs.filter((a) => a.id !== avoirId),
        };
        const entrees = regenererEntreesAchat(
          state.entrees,
          next,
          state.produits,
          nomFournisseur(state, next.fournisseurId),
        );
        if (avPrev.statut === "valide") {
          const produitIds = avPrev.lignes.map((l) => l.produitId);
          // Removing a return adds stock back — should not go negative.
          if (
            stockDevientNegatif(
              entrees,
              state.ventes,
              state.inventaires,
              prev.pointDeVenteId,
              produitIds,
            )
          ) {
            return { ok: false, reason: "Impossible de supprimer cet avoir." };
          }
        }
        set((s) => ({
          achats: s.achats.map((a) => (a.id === achatId ? next : a)),
          entrees,
          journalActivites: [
            entreeActivite("suppression", "achat", {
              entiteId: achatId,
              libelle: `${prev.numero} · ${avPrev.numero}`,
              detail: "Avoir fournisseur",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addVente: (vente) =>
        set((state) => ({
          ventes: [{ ...vente, id: uid("v") }, ...state.ventes],
        })),
      deleteVente: (id) =>
        set((state) => ({
          ventes: state.ventes.filter((v) => v.id !== id),
        })),

      addCharge: (charge) =>
        set((state) => {
          const nouvelle = { ...charge, id: uid("ch") };
          return {
            charges: [nouvelle, ...state.charges],
            journalActivites: [
              entreeActivite("creation", "charge", {
                entiteId: nouvelle.id,
                libelle: nouvelle.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateCharge: (id, data) =>
        set((state) => {
          const prev = state.charges.find((c) => c.id === id);
          return {
            charges: state.charges.map((c) =>
              c.id === id ? { ...c, ...data } : c,
            ),
            journalActivites: [
              entreeActivite("modification", "charge", {
                entiteId: id,
                libelle: prev?.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteCharge: (id) =>
        set((state) => {
          const prev = state.charges.find((c) => c.id === id);
          return {
            charges: state.charges.filter((c) => c.id !== id),
            journalActivites: [
              entreeActivite("suppression", "charge", {
                entiteId: id,
                libelle: prev?.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      upsertRapportFinJournee: (data) =>
        set((state) => {
          const updatedAt = new Date().toISOString();
          const existing =
            (data.id
              ? state.rapportsFinJournee.find((r) => r.id === data.id)
              : undefined) ??
            state.rapportsFinJournee.find(
              (r) =>
                r.dateJour === data.dateJour &&
                r.pointDeVenteId === data.pointDeVenteId,
            );
          if (existing) {
            return {
              rapportsFinJournee: state.rapportsFinJournee.map((r) =>
                r.id === existing.id
                  ? {
                      ...r,
                      ...data,
                      id: existing.id,
                      updatedAt,
                    }
                  : r,
              ),
            };
          }
          return {
            rapportsFinJournee: [
              {
                ...data,
                id: uid("rfj"),
                updatedAt,
              },
              ...state.rapportsFinJournee,
            ],
          };
        }),
      deleteRapportFinJournee: (id) =>
        set((state) => ({
          rapportsFinJournee: state.rapportsFinJournee.filter(
            (r) => r.id !== id,
          ),
        })),

      addProduit: (produit) =>
        set((state) => {
          const nouveau = { ...produit, id: uid("prod") };
          return {
            produits: [nouveau, ...state.produits],
            journalActivites: [
              entreeActivite("creation", "produit", {
                entiteId: nouveau.id,
                libelle: nouveau.libelleCourt || nouveau.libelleLong,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateProduit: (id, data, opts) =>
        set((state) => {
          const prev = state.produits.find((p) => p.id === id);
          if (!prev) return state;
          const next = { ...prev, ...data };
          const hist: HistoriquePrix[] = [];
          const push = (
            champ: HistoriquePrix["champ"],
            ancien: number,
            nouveau: number,
          ) => {
            if (ancien === nouveau) return;
            hist.push({
              id: uid("hprix"),
              ...creerEntreeHistorique({
                produitId: id,
                champ,
                ancienMontant: ancien,
                nouveauMontant: nouveau,
                motif: opts?.motifPrix,
              }),
            });
          };
          if (data.prixAchat != null) {
            push("achat", prev.prixAchat, next.prixAchat);
          }
          if (data.prixVenteHT != null) {
            push("vente_ht", prev.prixVenteHT, next.prixVenteHT);
          }
          if (data.prixVenteGrosHT != null) {
            push(
              "gros_ht",
              prev.prixVenteGrosHT ?? 0,
              next.prixVenteGrosHT ?? 0,
            );
          }
          return {
            produits: state.produits.map((p) => (p.id === id ? next : p)),
            historiquesPrix: [...hist, ...state.historiquesPrix],
            journalActivites: [
              entreeActivite("modification", "produit", {
                entiteId: id,
                libelle: next.libelleCourt || next.libelleLong,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      desactiverProduit: (id) =>
        set((state) => {
          const prev = state.produits.find((p) => p.id === id);
          return {
            produits: state.produits.map((p) =>
              p.id === id ? { ...p, actif: false } : p,
            ),
            journalActivites: [
              entreeActivite("desactivation", "produit", {
                entiteId: id,
                libelle: prev?.libelleCourt || prev?.libelleLong,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteProduit: (id) => {
        const state = get();
        if (
          produitEstReference(id, {
            entrees: state.entrees,
            ventes: state.ventes,
            devis: state.devis,
            commandes: state.commandes,
            bonsDeLivraison: state.bonsDeLivraison,
            factures: state.factures,
            achats: state.achats,
          })
        ) {
          return {
            ok: false,
            reason:
              "Produit déjà utilisé (stocks, ventes ou documents). Désactivez-le pour préserver l'historique.",
          };
        }
        const prod = state.produits.find((p) => p.id === id);
        set((s) => ({
          produits: s.produits.filter((p) => p.id !== id),
          tarifsClients: s.tarifsClients.filter((t) => t.produitId !== id),
          journalActivites: [
            entreeActivite("suppression", "produit", {
              entiteId: id,
              libelle: prod?.libelleCourt || prod?.libelleLong,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addCategorieProduit: (cat) =>
        set((state) => {
          const id = uid("cat");
          return {
            categoriesProduits: [
              ...state.categoriesProduits,
              { ...cat, id },
            ],
            journalActivites: [
              entreeActivite("creation", "categorie", {
                entiteId: id,
                libelle: cat.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateCategorieProduit: (id, data) =>
        set((state) => {
          const prev = state.categoriesProduits.find((c) => c.id === id);
          return {
            categoriesProduits: state.categoriesProduits.map((c) =>
              c.id === id ? { ...c, ...data } : c,
            ),
            journalActivites: [
              entreeActivite("modification", "categorie", {
                entiteId: id,
                libelle: prev?.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteCategorieProduit: (id) => {
        const state = get();
        const enfants = state.categoriesProduits.filter(
          (c) => c.parentId === id,
        );
        if (enfants.length > 0) {
          return {
            ok: false,
            reason: `Cette famille a ${enfants.length} sous-famille(s). Supprimez-les d'abord.`,
          };
        }
        const nbProduits = state.produits.filter(
          (p) => p.categorieId === id,
        ).length;
        if (nbProduits > 0) {
          return {
            ok: false,
            reason: `${nbProduits} produit(s) y sont rattachés. Réassignez-les avant de supprimer.`,
          };
        }
        const cat = state.categoriesProduits.find((c) => c.id === id);
        set((s) => ({
          categoriesProduits: s.categoriesProduits.filter((c) => c.id !== id),
          journalActivites: [
            entreeActivite("suppression", "categorie", {
              entiteId: id,
              libelle: cat?.libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addTarifClient: (tarif) =>
        set((state) => {
          const id = uid("tarif");
          const cli = state.clients.find((c) => c.id === tarif.clientId);
          return {
            tarifsClients: [{ ...tarif, id }, ...state.tarifsClients],
            journalActivites: [
              entreeActivite("creation", "tarif_client", {
                entiteId: id,
                libelle: cli?.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateTarifClient: (id, data) =>
        set((state) => {
          const prev = state.tarifsClients.find((t) => t.id === id);
          const hist: HistoriquePrix[] = [];
          if (prev && data.prixHT != null && data.prixHT !== prev.prixHT) {
            hist.push({
              id: uid("hprix"),
              ...creerEntreeHistorique({
                produitId: prev.produitId,
                champ: "tarif_client",
                ancienMontant: prev.prixHT,
                nouveauMontant: data.prixHT,
                clientId: prev.clientId,
              }),
            });
          }
          return {
            tarifsClients: state.tarifsClients.map((t) =>
              t.id === id ? { ...t, ...data } : t,
            ),
            historiquesPrix: [...hist, ...state.historiquesPrix],
          };
        }),
      deleteTarifClient: (id) =>
        set((state) => {
          const prev = state.tarifsClients.find((t) => t.id === id);
          const cli = state.clients.find((c) => c.id === prev?.clientId);
          return {
            tarifsClients: state.tarifsClients.filter((t) => t.id !== id),
            journalActivites: [
              entreeActivite("suppression", "tarif_client", {
                entiteId: id,
                libelle: cli?.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addImmobilisation: (immo) =>
        set((state) => {
          const id = uid("immo");
          return {
            immobilisations: [{ ...immo, id }, ...state.immobilisations],
            journalActivites: [
              entreeActivite("creation", "immobilisation", {
                entiteId: id,
                libelle: immo.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateImmobilisation: (id, data) =>
        set((state) => {
          const prev = state.immobilisations.find((i) => i.id === id);
          return {
            immobilisations: state.immobilisations.map((i) =>
              i.id === id ? { ...i, ...data } : i,
            ),
            journalActivites: [
              entreeActivite("modification", "immobilisation", {
                entiteId: id,
                libelle: prev?.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteImmobilisation: (id) =>
        set((state) => {
          const prev = state.immobilisations.find((i) => i.id === id);
          return {
            immobilisations: state.immobilisations.filter((i) => i.id !== id),
            journalActivites: [
              entreeActivite("suppression", "immobilisation", {
                entiteId: id,
                libelle: prev?.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addMouvementCompteCourant: (m) => {
        const actor = getActiviteActor();
        const id = uid("cca");
        set((state) => ({
          mouvementsCompteCourant: [
            {
              ...m,
              id,
              userId: actor.id,
              userNom: actor.nom,
            },
            ...state.mouvementsCompteCourant,
          ],
          journalActivites: [
            entreeActivite("creation", "compte_courant", {
              entiteId: id,
              libelle: m.libelle,
              detail: `${m.type === "apport" ? "Apport" : "Retrait"} de ${m.montant} Ar`,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateMouvementCompteCourant: (id, data) =>
        set((state) => {
          const prev = state.mouvementsCompteCourant.find((x) => x.id === id);
          return {
            mouvementsCompteCourant: state.mouvementsCompteCourant.map((x) =>
              x.id === id ? { ...x, ...data } : x,
            ),
            journalActivites: [
              entreeActivite("modification", "compte_courant", {
                entiteId: id,
                libelle: data.libelle ?? prev?.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteMouvementCompteCourant: (id) =>
        set((state) => {
          const prev = state.mouvementsCompteCourant.find((x) => x.id === id);
          return {
            mouvementsCompteCourant: state.mouvementsCompteCourant.filter(
              (x) => x.id !== id,
            ),
            journalActivites: [
              entreeActivite("suppression", "compte_courant", {
                entiteId: id,
                libelle: prev?.libelle,
                detail: prev
                  ? `${prev.type === "apport" ? "Apport" : "Retrait"} de ${prev.montant} Ar`
                  : undefined,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addClient: (client) =>
        set((state) => {
          const nouveau = {
            ...client,
            code:
              client.code && client.code.trim()
                ? client.code.trim()
                : nextCodeClient(state.clients),
            id: uid("cli"),
          };
          return {
            clients: [...state.clients, nouveau],
            journalActivites: [
              entreeActivite("creation", "client", {
                entiteId: nouveau.id,
                libelle: nouveau.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateClient: (id, data) =>
        set((state) => {
          const prev = state.clients.find((c) => c.id === id);
          const detail =
            "actif" in data && Object.keys(data).length === 1
              ? data.actif
                ? "Réactivation"
                : "Désactivation"
              : undefined;
          return {
            clients: state.clients.map((c) =>
              c.id === id ? { ...c, ...data } : c,
            ),
            journalActivites: [
              entreeActivite("modification", "client", {
                entiteId: id,
                libelle: prev?.nom,
                detail,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteClient: (id) => {
        const state = get();
        const client = state.clients.find((c) => c.id === id);
        if (!client) return { ok: false, reason: "Client introuvable." };
        const motif = motifLienClient(id, {
          factures: state.factures,
          devis: state.devis,
          commandes: state.commandes,
          bonsDeLivraison: state.bonsDeLivraison,
          acomptes: state.acomptes,
          tarifsClients: state.tarifsClients,
        });
        if (motif) {
          return { ok: false, reason: motif };
        }
        set((s) => ({
          clients: s.clients.filter((c) => c.id !== id),
          journalActivites: [
            entreeActivite("suppression", "client", {
              entiteId: id,
              libelle: client.nom,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addFournisseur: (frn) =>
        set((state) => {
          const nouveau = { ...frn, id: uid("frn") };
          return {
            fournisseurs: [...state.fournisseurs, nouveau],
            journalActivites: [
              entreeActivite("creation", "fournisseur", {
                entiteId: nouveau.id,
                libelle: nouveau.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateFournisseur: (id, data) =>
        set((state) => {
          const prev = state.fournisseurs.find((f) => f.id === id);
          return {
            fournisseurs: state.fournisseurs.map((f) =>
              f.id === id ? { ...f, ...data } : f,
            ),
            journalActivites: [
              entreeActivite("modification", "fournisseur", {
                entiteId: id,
                libelle: prev?.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteFournisseur: (id) => {
        const state = get();
        const frn = state.fournisseurs.find((f) => f.id === id);
        if (!frn) return { ok: false, reason: "Fournisseur introuvable." };
        if (fournisseurEstReference(id, frn.nom, state.entrees, state.achats)) {
          return {
            ok: false,
            reason:
              "Fournisseur déjà utilisé sur des entrées de stock. Désactivez-le pour préserver l'historique.",
          };
        }
        set((s) => ({
          fournisseurs: s.fournisseurs.filter((f) => f.id !== id),
          journalActivites: [
            entreeActivite("suppression", "fournisseur", {
              entiteId: id,
              libelle: frn.nom,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addDevis: (devis) => {
        const id = uid("dev");
        set((state) => ({
          devis: [{ ...devis, id }, ...state.devis],
          journalActivites: [
            entreeActivite("creation", "devis", {
              entiteId: id,
              libelle: devis.numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateDevis: (id, data) =>
        set((state) => {
          const prev = state.devis.find((d) => d.id === id);
          if (prev && verrouTransformationActif(prev.verrouTransformation)) {
            return state;
          }
          const annulation = data.statut === "refuse" || data.statut === "expire";
          return {
            devis: state.devis.map((d) =>
              d.id === id ? { ...d, ...data } : d,
            ),
            journalActivites: [
              entreeActivite(
                annulation ? "annulation" : "modification",
                "devis",
                { entiteId: id, libelle: prev?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        }),
      deleteDevis: (id) =>
        set((state) => {
          const prev = state.devis.find((d) => d.id === id);
          return {
            devis: state.devis.filter((d) => d.id !== id),
            journalActivites: [
              entreeActivite("suppression", "devis", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addCommande: (cmd) => {
        const id = uid("cmd");
        set((state) => ({
          commandes: [{ ...cmd, id }, ...state.commandes],
          journalActivites: [
            entreeActivite("creation", "commande", {
              entiteId: id,
              libelle: cmd.numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateCommande: (id, data) =>
        set((state) => {
          const prev = state.commandes.find((c) => c.id === id);
          if (prev && verrouTransformationActif(prev.verrouTransformation)) {
            return state;
          }
          return {
            commandes: state.commandes.map((c) =>
              c.id === id ? { ...c, ...data } : c,
            ),
            journalActivites: [
              entreeActivite(
                data.statut === "annulee" ? "annulation" : "modification",
                "commande",
                { entiteId: id, libelle: prev?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        }),
      deleteCommande: (id) =>
        set((state) => {
          const prev = state.commandes.find((c) => c.id === id);
          return {
            commandes: state.commandes.filter((c) => c.id !== id),
            journalActivites: [
              entreeActivite("suppression", "commande", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addBonDeLivraison: (bl) => {
        const id = uid("bl");
        set((state) => ({
          bonsDeLivraison: [{ ...bl, id }, ...state.bonsDeLivraison],
          journalActivites: [
            entreeActivite("creation", "bon_de_livraison", {
              entiteId: id,
              libelle: bl.numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateBonDeLivraison: (id, data) =>
        set((state) => {
          const prev = state.bonsDeLivraison.find((b) => b.id === id);
          if (prev && verrouTransformationActif(prev.verrouTransformation)) {
            return state;
          }
          return {
            bonsDeLivraison: state.bonsDeLivraison.map((b) =>
              b.id === id ? { ...b, ...data } : b,
            ),
            journalActivites: [
              entreeActivite(
                data.statut === "annule" ? "annulation" : "modification",
                "bon_de_livraison",
                { entiteId: id, libelle: prev?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        }),
      deleteBonDeLivraison: (id) =>
        set((state) => {
          const prev = state.bonsDeLivraison.find((b) => b.id === id);
          return {
            bonsDeLivraison: state.bonsDeLivraison.filter((b) => b.id !== id),
            journalActivites: [
              entreeActivite("suppression", "bon_de_livraison", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      verrouillerTransformation: (kind, id, cible) => {
        get().libererVerrousExpires();
        const state = get();
        const doc = trouverSource(state, kind, id);
        if (!doc) return { ok: false, reason: "Document introuvable." };
        if (kind === "devis" && doc.statut === "transforme") {
          return {
            ok: false,
            reason: "Ce devis a déjà été transformé.",
          };
        }
        if (verrouTransformationActif(doc.verrouTransformation)) {
          const v = doc.verrouTransformation!;
          const actor = getActiviteActor();
          if (
            v.cible === cible &&
            v.userId &&
            actor.id &&
            v.userId === actor.id
          ) {
            return { ok: true };
          }
          return {
            ok: false,
            reason: `Document verrouillé par ${v.userNom || "un autre utilisateur"} (transformation en cours).`,
          };
        }
        const statutPrecedent =
          doc.statut === "en_transformation"
            ? (doc.verrouTransformation?.statutPrecedent ?? "brouillon")
            : doc.statut;
        const verrou = creerVerrouTransformation(cible, statutPrecedent);
        const statutVerrou =
          kind === "devis"
            ? ("en_transformation" as DevisStatut)
            : kind === "commande"
              ? ("en_transformation" as CommandeStatut)
              : ("en_transformation" as BonDeLivraisonStatut);
        set((s) => ({
          ...patcherSource(s, kind, id, {
            statut: statutVerrou,
            verrouTransformation: verrou,
          }),
        }));
        return { ok: true };
      },

      annulerTransformation: (kind, id) => {
        const doc = trouverSource(get(), kind, id);
        if (!doc?.verrouTransformation) return;
        const precedent = doc.verrouTransformation.statutPrecedent;
        set((s) => ({
          ...patcherSource(s, kind, id, {
            statut: precedent,
            verrouTransformation: null,
          }),
        }));
      },

      libererVerrousExpires: () =>
        set((state) => ({
          devis: state.devis.map(libererSiExpire),
          commandes: state.commandes.map(libererSiExpire),
          bonsDeLivraison: state.bonsDeLivraison.map(libererSiExpire),
        })),

      finaliserTransformation: (payload) => {
        const state = get();
        const doc = trouverSource(state, payload.sourceType, payload.sourceId);
        if (!doc) return { ok: false, reason: "Document source introuvable." };
        if (!verrouTransformationActif(doc.verrouTransformation)) {
          get().libererVerrousExpires();
          return {
            ok: false,
            reason:
              "Le délai de validation (10 min) est dépassé, ou le document n'est plus verrouillé.",
          };
        }
        const actor = getActiviteActor();
        const transformation: TransformationCommerciale = {
          id: uid("trf"),
          date: new Date().toISOString(),
          userId: actor.id,
          userNom: actor.nom,
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
          sourceNumero: doc.numero,
          cibleType: payload.cibleType,
          cibleId: payload.cibleId,
          cibleNumero: payload.cibleNumero,
        };
        set((s) => ({
          ...patcherSource(s, payload.sourceType, payload.sourceId, {
            statut: payload.statutSource,
            verrouTransformation: null,
          }),
          transformations: [transformation, ...(s.transformations ?? [])],
          journalActivites: [
            entreeActivite("validation", entiteSource(payload.sourceType), {
              entiteId: payload.sourceId,
              libelle: doc.numero,
              detail: `${doc.numero} → ${payload.cibleNumero}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addFacture: (facture, audit) => {
        const id = uid("fac");
        set((state) => {
          const modele = modeleCourant(state, "facture");
          const complete = figerCumpSiCloture(
            avecPresentationSiBesoin(
              { ...facture, id },
              state.parametres,
              modele,
            ),
            state,
          );
          const factures = [complete, ...state.factures];
          return {
            factures,
            ventes: rebuildVentesDepuisFactures(factures),
            journalActivites: [
              entreeActivite("creation", "facture", {
                entiteId: id,
                libelle: facture.numero,
                detail: audit?.detail,
              }),
              ...state.journalActivites,
            ],
            journalAudit: [
              {
                id: uid("aud"),
                ...creerEntreeJournal({
                  action:
                    audit?.action ??
                    (facture.statut === "proforma"
                      ? "facture_proforma"
                      : facture.statut === "brouillon"
                        ? "facture_brouillon"
                        : "facture_validee"),
                  entiteId: id,
                  numero: facture.numero,
                  detail: audit?.detail,
                }),
              },
              ...state.journalAudit,
            ],
          };
        });
        return id;
      },
      updateFacture: (id, data, audit) =>
        set((state) => {
          const prev = state.factures.find((f) => f.id === id);
          if (!prev) return state;

          const {
            lignes,
            clientId,
            pointDeVenteId,
            date,
            echeance,
            tauxTVA,
            conditionsPaiement,
            note,
            remiseGlobale,
            remiseGlobaleMode,
            devisId,
            commandeId,
            bonDeLivraisonId,
            factureParenteId: _factureParenteId,
            acomptesDocument: acomptesDocumentPatch,
            presentation: presentationPatch,
            ...suiviAutorise
          } = data;

          const patch: Partial<typeof prev> = { ...suiviAutorise };

          const estConversionFiscale =
            (prev.statut === "brouillon" ||
              prev.statut === "proforma" ||
              prev.type === "proforma") &&
            (data.statut === "validee" ||
              data.statut === "envoyee" ||
              data.statut === "payee" ||
              data.statut === "partiellement_payee");

          /** Brouillons / proformas : contenu encore modifiable. Factures fiscales : figées. */
          if (!factureEstFiscale(prev) && !estConversionFiscale) {
            if (lignes !== undefined) patch.lignes = lignes;
            if (clientId !== undefined) patch.clientId = clientId;
            if (pointDeVenteId !== undefined) patch.pointDeVenteId = pointDeVenteId;
            if (date !== undefined) patch.date = date;
            if (echeance !== undefined) patch.echeance = echeance;
            if (tauxTVA !== undefined) patch.tauxTVA = tauxTVA;
            if (conditionsPaiement !== undefined)
              patch.conditionsPaiement = conditionsPaiement;
            if (note !== undefined) patch.note = note;
            if ("remiseGlobale" in data) patch.remiseGlobale = remiseGlobale;
            if ("remiseGlobaleMode" in data)
              patch.remiseGlobaleMode = remiseGlobaleMode;
            if (devisId !== undefined) patch.devisId = devisId;
            if (commandeId !== undefined) patch.commandeId = commandeId;
            if (bonDeLivraisonId !== undefined)
              patch.bonDeLivraisonId = bonDeLivraisonId;
            if (acomptesDocumentPatch !== undefined)
              patch.acomptesDocument = acomptesDocumentPatch;
            delete patch.numero;
            delete patch.type;
            delete patch.dateValidation;
            delete patch.presentation;
          }

          if (estConversionFiscale) {
            if (data.numero !== undefined) patch.numero = data.numero;
            if (data.type !== undefined) patch.type = data.type;
            if (data.dateValidation !== undefined)
              patch.dateValidation = data.dateValidation;
            if (acomptesDocumentPatch !== undefined)
              patch.acomptesDocument = acomptesDocumentPatch;
            const modele = modeleCourant(state, "facture");
            patch.presentation =
              presentationPatch ??
              prev.presentation ??
              creerSnapshotPresentation(state.parametres, modele);
          }

          const journal = [...state.journalAudit];
          if (audit) {
            journal.unshift({
              id: uid("aud"),
              ...creerEntreeJournal({
                action: audit.action,
                entiteId: id,
                numero: patch.numero ?? prev.numero,
                detail: audit.detail,
              }),
            });
          }
          const factures = state.factures.map((f) =>
            f.id === id
              ? figerCumpSiCloture({ ...f, ...patch }, state)
              : f,
          );
          const estAnnulation = data.statut === "annulee";
          return {
            factures,
            ventes: rebuildVentesDepuisFactures(factures),
            journalAudit: journal,
            journalActivites: [
              entreeActivite(
                estAnnulation ? "annulation" : "modification",
                "facture",
                {
                  entiteId: id,
                  libelle: patch.numero ?? prev.numero,
                  detail: audit?.detail,
                },
              ),
              ...state.journalActivites,
            ],
          };
        }),
      deleteFacture: (id) => {
        const state = get();
        const prev = state.factures.find((f) => f.id === id);
        if (!prev) return { ok: false, reason: "Document introuvable." };
        if (factureEstFiscale(prev)) {
          return {
            ok: false,
            reason:
              "Les factures fiscales ne peuvent pas être supprimées : utilisez une facture d'avoir.",
          };
        }
        set((s) => {
          const factures = s.factures
            .filter((f) => f.id !== id)
            .map((f) =>
              f.factureParenteId === id
                ? { ...f, factureParenteId: undefined }
                : f,
            );
          return {
            factures,
            ventes: rebuildVentesDepuisFactures(factures),
            journalActivites: [
              entreeActivite("suppression", "facture", {
                entiteId: id,
                libelle: prev.numero,
              }),
              ...s.journalActivites,
            ],
            journalAudit: [
              {
                id: uid("aud"),
                ...creerEntreeJournal({
                  action: "facture_supprimee",
                  entiteId: id,
                  numero: prev.numero,
                  detail:
                    prev.type === "proforma" || prev.statut === "proforma"
                      ? "Suppression proforma"
                      : "Suppression brouillon",
                }),
              },
              ...s.journalAudit,
            ],
          };
        });
        return { ok: true };
      },
      addJournalAudit: (entry) =>
        set((state) => ({
          journalAudit: [{ ...entry, id: uid("aud") }, ...state.journalAudit],
        })),
      purgeJournalAuditOlderThan: (days) => {
        const cutoff = Date.now() - days * 86_400_000;
        const before = get().journalAudit;
        const kept = before.filter(
          (e) => new Date(e.date).getTime() >= cutoff,
        );
        set({ journalAudit: kept });
        return before.length - kept.length;
      },

      logActivite: (action, entite, opts) =>
        set((state) => ({
          journalActivites: [
            entreeActivite(action, entite, opts),
            ...state.journalActivites,
          ],
        })),
      purgeJournalActivitesOlderThan: (days) => {
        const cutoff = Date.now() - days * 86_400_000;
        const before = get().journalActivites;
        const kept = before.filter(
          (e) => new Date(e.date).getTime() >= cutoff,
        );
        set({ journalActivites: kept });
        return before.length - kept.length;
      },

      addInventaire: (inventaire) => {
        const id = uid("inv");
        set((state) => ({
          inventaires: [{ ...inventaire, id }, ...state.inventaires],
          journalActivites: [
            entreeActivite("creation", "inventaire", {
              entiteId: id,
              libelle: inventaire.numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateInventaire: (id, data) =>
        set((state) => {
          const prev = state.inventaires.find((i) => i.id === id);
          return {
            inventaires: state.inventaires.map((i) =>
              i.id === id ? { ...i, ...data } : i,
            ),
            journalActivites: [
              entreeActivite("modification", "inventaire", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteInventaire: (id) =>
        set((state) => {
          const prev = state.inventaires.find((i) => i.id === id);
          return {
            inventaires: state.inventaires.filter((i) => i.id !== id),
            journalActivites: [
              entreeActivite("suppression", "inventaire", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      validerInventaire: (id) =>
        set((state) => {
          const prev = state.inventaires.find((i) => i.id === id);
          return {
            inventaires: state.inventaires.map((i) =>
              i.id === id
                ? {
                    ...i,
                    statut: "valide",
                    dateValidation: new Date().toISOString(),
                  }
                : i,
            ),
            journalActivites: [
              entreeActivite("validation", "inventaire", {
                entiteId: id,
                libelle: prev?.numero,
                detail: "Clôture d'inventaire",
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addAcompte: (acompte) => {
        const id = uid("aco");
        set((state) => ({
          acomptes: [{ ...acompte, id }, ...state.acomptes],
          journalActivites: [
            entreeActivite("creation", "acompte", {
              entiteId: id,
              libelle: acompte.numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateAcompte: (id, data) =>
        set((state) => {
          const prev = state.acomptes.find((a) => a.id === id);
          return {
            acomptes: state.acomptes.map((a) =>
              a.id === id ? { ...a, ...data } : a,
            ),
            journalActivites: [
              entreeActivite(
                data.statut === "annule" ? "annulation" : "modification",
                "acompte",
                { entiteId: id, libelle: prev?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        }),
      deleteAcompte: (id) =>
        set((state) => {
          const prev = state.acomptes.find((a) => a.id === id);
          return {
            acomptes: state.acomptes.filter((a) => a.id !== id),
            journalActivites: [
              entreeActivite("suppression", "acompte", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      encaisserAcompte: (data) => {
        const montantTTC = Math.round(Number(data.montantTTC) || 0);
        if (!data.clientId || montantTTC <= 0) {
          return { ok: false, reason: "Montant d'acompte invalide." };
        }
        const state = get();
        const assujetti = appliqueTVA(state.parametres);
        const { ht } = splitTTC(
          montantTTC,
          state.parametres.tauxTVA,
          assujetti,
        );
        const numeroAco = nextNumero(
          "ACO",
          state.acomptes.map((a) => a.numero),
        );
        const generer = data.genererFactureAcompte !== false;
        let factureAcompteId: string | undefined;
        if (generer) {
          const pdvId =
            data.pointDeVenteId || state.pointsDeVente[0]?.id || "";
          const numeroFac = nextNumeroDocumentCommercial({
            prefix: "FACACO",
            pointDeVenteId: pdvId,
            pointsDeVente: state.pointsDeVente,
            existing: state.factures.map((f) => f.numero),
            date: new Date(data.date),
          });
          factureAcompteId = get().addFacture({
            numero: numeroFac,
            type: "acompte",
            clientId: data.clientId,
            pointDeVenteId: pdvId,
            date: data.date,
            echeance: data.date,
            statut: "payee",
            montantPaye: montantTTC,
            devisId: data.devisId,
            commandeId: data.commandeId,
            factureParenteId: data.factureId,
            tauxTVA: state.parametres.tauxTVA,
            dateValidation: new Date().toISOString(),
            note: `Facture d'acompte — ${numeroAco}`,
            acomptesDocument: [],
            lignes: [
              {
                id: "aco-ligne-1",
                designation: `Acompte sur ${data.refDocument}`,
                quantite: 1,
                prixUnitaire: ht,
                unite: "forfait",
              },
            ],
          });
        }
        const acompteId = get().addAcompte({
          numero: numeroAco,
          date: data.date,
          clientId: data.clientId,
          montantTTC,
          tauxTVA: state.parametres.tauxTVA,
          modePaiement: data.modePaiement,
          devisId: data.devisId,
          commandeId: data.commandeId,
          factureId: data.factureId || factureAcompteId,
          factureAcompteId,
          statut: data.factureId || factureAcompteId ? "impute" : "enregistre",
          note: data.note,
        });
        return {
          ok: true,
          acompteId,
          numero: numeroAco,
          factureAcompteId,
        };
      },

      applyBusinessData: (data) => {
        set((state) => {
          const modele = modelePourType(
            data.modelesDocuments,
            "facture",
            {
              preferences: data.preferencesModeles ?? state.preferencesModeles,
              userId: getActiviteActor().id,
            },
          );
          const parametres = data.parametres ?? state.parametres;
          const factures = data.factures.map((f) =>
            avecPresentationSiBesoin(f, parametres, modele, {
              legacySansSignature: true,
            }),
          );
          const merged = pickAppState({ ...data, factures });
          return {
            ...merged,
            clients: ensureCodesClients(merged.clients),
            ventes: rebuildVentesDepuisFactures(factures),
          };
        });
        get().libererVerrousExpires();
      },
      clearBusinessData: () => set({ ...emptyAppState() }),
      resetBusinessData: async (password) => {
        setBusinessSyncEnabled(false);
        try {
          const res = await resetBusinessState(password);
          set({
            ...pickAppState(res.data),
            ventes: rebuildVentesDepuisFactures(res.data.factures),
          });
          return { ok: true as const };
        } catch (err) {
          return {
            ok: false as const,
            error:
              err instanceof Error
                ? err.message
                : "Reset impossible.",
          };
        } finally {
          setBusinessSyncEnabled(true);
        }
      },
}));

/** Sync automatique vers l'API après chaque mutation métier. */
if (typeof window !== "undefined") {
  useStore.subscribe((state) => {
    scheduleBusinessSave(pickAppState(state));
  });
  installBusinessSaveLifecycle();
  try {
    localStorage.removeItem("stwr-poissonnerie-v4");
  } catch {
    /* ignore */
  }
}
