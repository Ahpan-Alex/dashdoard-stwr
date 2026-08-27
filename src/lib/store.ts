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
import {
  appliqueTVA,
  ensureCodesClients,
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
import type {
  Acompte,
  ActiviteAction,
  ActiviteEntite,
  AppState,
  BilanInitial,
  BonDeLivraison,
  CategorieProduit,
  Charge,
  Client,
  Commande,
  Devis,
  EntreeStock,
  Facture,
  Fournisseur,
  HistoriquePrix,
  Immobilisation,
  Inventaire,
  JournalActivite,
  JournalAudit,
  ModePaiement,
  MouvementCompteCourant,
  Parametres,
  PointDeVente,
  Produit,
  RapportFinJournee,
  TarifClient,
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
  pointDeVenteActifId: string | "tous";

  setPointDeVenteActif: (id: string | "tous") => void;
  updateParametres: (data: Partial<Parametres>) => void;
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

  addBonDeLivraison: (bl: Omit<BonDeLivraison, "id">) => void;
  updateBonDeLivraison: (id: string, data: Partial<BonDeLivraison>) => void;
  deleteBonDeLivraison: (id: string) => void;

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
        if (fournisseurEstReference(id, frn.nom, state.entrees)) {
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

      addBonDeLivraison: (bl) =>
        set((state) => {
          const id = uid("bl");
          return {
            bonsDeLivraison: [{ ...bl, id }, ...state.bonsDeLivraison],
            journalActivites: [
              entreeActivite("creation", "bon_de_livraison", {
                entiteId: id,
                libelle: bl.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateBonDeLivraison: (id, data) =>
        set((state) => {
          const prev = state.bonsDeLivraison.find((b) => b.id === id);
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

      addFacture: (facture, audit) => {
        const id = uid("fac");
        set((state) => {
          const modele = modeleCourant(state, "facture");
          const complete = avecPresentationSiBesoin(
            { ...facture, id },
            state.parametres,
            modele,
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
            if (remiseGlobale !== undefined) patch.remiseGlobale = remiseGlobale;
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
            f.id === id ? { ...f, ...patch } : f,
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

      applyBusinessData: (data) =>
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
        }),
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
