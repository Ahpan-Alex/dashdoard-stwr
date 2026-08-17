"use client";

import { create } from "zustand";
import type { ModeleDocument } from "./document-templates";
import {
  creerEntreeHistorique,
  produitEstReference,
} from "./produits";
import { creerEntreeJournal, factureEstFiscale, nextNumeroDocumentCommercial } from "./facturation-mg";
import { stockDisponible } from "./calculations";
import {
  appliqueTVA,
  fournisseurEstReference,
  motifLienClient,
  motifLienPointDeVente,
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
import type {
  Acompte,
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
  JournalAudit,
  ModePaiement,
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
  bilanInitial: BilanInitial;
  immobilisations: Immobilisation[];
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
  pointDeVenteActifId: string | "tous";

  setPointDeVenteActif: (id: string | "tous") => void;
  updateParametres: (data: Partial<Parametres>) => void;
  updateBilanInitial: (data: Partial<BilanInitial>) => void;

  addModeleDocument: (m: Omit<ModeleDocument, "id">) => void;
  updateModeleDocument: (id: string, data: Partial<ModeleDocument>) => void;
  deleteModeleDocument: (id: string) => void;

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

export const useStore = create<Store>()((set, get) => ({
      ...emptyAppState(),
      setPointDeVenteActif: (id) => set({ pointDeVenteActifId: id }),
      updateParametres: (data) =>
        set((state) => {
          const modele = state.modelesDocuments.find(
            (m) => m.type === "facture" && m.actif,
          );
          // Avant d'appliquer les nouveaux params : figer les factures fiscales
          // encore sans snapshot (état précédent = non impactées par la modif).
          const factures = state.factures.map((f) =>
            avecPresentationSiBesoin(f, state.parametres, modele),
          );
          return {
            parametres: { ...state.parametres, ...data },
            factures,
          };
        }),
      updateBilanInitial: (data) =>
        set((state) => ({
          bilanInitial: { ...state.bilanInitial, ...data },
        })),

      addModeleDocument: (m) =>
        set((state) => ({
          modelesDocuments: [
            ...state.modelesDocuments,
            { ...m, id: uid("modele") },
          ],
        })),
      updateModeleDocument: (id, data) =>
        set((state) => {
          const modeleFacture = state.modelesDocuments.find(
            (m) => m.type === "facture" && m.actif,
          );
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
        set((state) => ({
          modelesDocuments: state.modelesDocuments.filter((m) => m.id !== id),
        })),

      addPointDeVente: (pdv) =>
        set((state) => ({
          pointsDeVente: [
            ...state.pointsDeVente,
            { ...pdv, id: uid("pdv") },
          ],
        })),
      updatePointDeVente: (id, data) =>
        set((state) => ({
          pointsDeVente: state.pointsDeVente.map((p) =>
            p.id === id ? { ...p, ...data } : p,
          ),
        })),
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
        set((state) => ({
          charges: [{ ...charge, id: uid("ch") }, ...state.charges],
        })),
      updateCharge: (id, data) =>
        set((state) => ({
          charges: state.charges.map((c) =>
            c.id === id ? { ...c, ...data } : c,
          ),
        })),
      deleteCharge: (id) =>
        set((state) => ({
          charges: state.charges.filter((c) => c.id !== id),
        })),

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
        set((state) => ({
          produits: [{ ...produit, id: uid("prod") }, ...state.produits],
        })),
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
          };
        }),
      desactiverProduit: (id) =>
        set((state) => ({
          produits: state.produits.map((p) =>
            p.id === id ? { ...p, actif: false } : p,
          ),
        })),
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
        set((s) => ({
          produits: s.produits.filter((p) => p.id !== id),
          tarifsClients: s.tarifsClients.filter((t) => t.produitId !== id),
        }));
        return { ok: true };
      },

      addCategorieProduit: (cat) =>
        set((state) => ({
          categoriesProduits: [
            ...state.categoriesProduits,
            { ...cat, id: uid("cat") },
          ],
        })),
      updateCategorieProduit: (id, data) =>
        set((state) => ({
          categoriesProduits: state.categoriesProduits.map((c) =>
            c.id === id ? { ...c, ...data } : c,
          ),
        })),
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
        set((s) => ({
          categoriesProduits: s.categoriesProduits.filter((c) => c.id !== id),
        }));
        return { ok: true };
      },

      addTarifClient: (tarif) =>
        set((state) => ({
          tarifsClients: [
            { ...tarif, id: uid("tarif") },
            ...state.tarifsClients,
          ],
        })),
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
        set((state) => ({
          tarifsClients: state.tarifsClients.filter((t) => t.id !== id),
        })),

      addImmobilisation: (immo) =>
        set((state) => ({
          immobilisations: [
            { ...immo, id: uid("immo") },
            ...state.immobilisations,
          ],
        })),
      updateImmobilisation: (id, data) =>
        set((state) => ({
          immobilisations: state.immobilisations.map((i) =>
            i.id === id ? { ...i, ...data } : i,
          ),
        })),
      deleteImmobilisation: (id) =>
        set((state) => ({
          immobilisations: state.immobilisations.filter((i) => i.id !== id),
        })),

      addClient: (client) =>
        set((state) => ({
          clients: [...state.clients, { ...client, id: uid("cli") }],
        })),
      updateClient: (id, data) =>
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...data } : c,
          ),
        })),
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
        }));
        return { ok: true };
      },

      addFournisseur: (frn) =>
        set((state) => ({
          fournisseurs: [
            ...state.fournisseurs,
            { ...frn, id: uid("frn") },
          ],
        })),
      updateFournisseur: (id, data) =>
        set((state) => ({
          fournisseurs: state.fournisseurs.map((f) =>
            f.id === id ? { ...f, ...data } : f,
          ),
        })),
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
        }));
        return { ok: true };
      },

      addDevis: (devis) => {
        const id = uid("dev");
        set((state) => ({
          devis: [{ ...devis, id }, ...state.devis],
        }));
        return id;
      },
      updateDevis: (id, data) =>
        set((state) => ({
          devis: state.devis.map((d) => (d.id === id ? { ...d, ...data } : d)),
        })),
      deleteDevis: (id) =>
        set((state) => ({
          devis: state.devis.filter((d) => d.id !== id),
        })),

      addCommande: (cmd) => {
        const id = uid("cmd");
        set((state) => ({
          commandes: [{ ...cmd, id }, ...state.commandes],
        }));
        return id;
      },
      updateCommande: (id, data) =>
        set((state) => ({
          commandes: state.commandes.map((c) =>
            c.id === id ? { ...c, ...data } : c,
          ),
        })),
      deleteCommande: (id) =>
        set((state) => ({
          commandes: state.commandes.filter((c) => c.id !== id),
        })),

      addBonDeLivraison: (bl) =>
        set((state) => ({
          bonsDeLivraison: [{ ...bl, id: uid("bl") }, ...state.bonsDeLivraison],
        })),
      updateBonDeLivraison: (id, data) =>
        set((state) => ({
          bonsDeLivraison: state.bonsDeLivraison.map((b) =>
            b.id === id ? { ...b, ...data } : b,
          ),
        })),
      deleteBonDeLivraison: (id) =>
        set((state) => ({
          bonsDeLivraison: state.bonsDeLivraison.filter((b) => b.id !== id),
        })),

      addFacture: (facture, audit) => {
        const id = uid("fac");
        set((state) => {
          const modele = state.modelesDocuments.find(
            (m) => m.type === "facture" && m.actif,
          );
          const complete = avecPresentationSiBesoin(
            { ...facture, id },
            state.parametres,
            modele,
          );
          const factures = [complete, ...state.factures];
          return {
            factures,
            ventes: rebuildVentesDepuisFactures(factures),
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
            const modele = state.modelesDocuments.find(
              (m) => m.type === "facture" && m.actif,
            );
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
          return {
            factures,
            ventes: rebuildVentesDepuisFactures(factures),
            journalAudit: journal,
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

      addAcompte: (acompte) => {
        const id = uid("aco");
        set((state) => ({
          acomptes: [{ ...acompte, id }, ...state.acomptes],
        }));
        return id;
      },
      updateAcompte: (id, data) =>
        set((state) => ({
          acomptes: state.acomptes.map((a) =>
            a.id === id ? { ...a, ...data } : a,
          ),
        })),
      deleteAcompte: (id) =>
        set((state) => ({
          acomptes: state.acomptes.filter((a) => a.id !== id),
        })),
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
          const modele =
            data.modelesDocuments.find((m) => m.type === "facture" && m.actif) ??
            state.modelesDocuments.find((m) => m.type === "facture" && m.actif);
          const parametres = data.parametres ?? state.parametres;
          const factures = data.factures.map((f) =>
            avecPresentationSiBesoin(f, parametres, modele, {
              legacySansSignature: true,
            }),
          );
          const merged = pickAppState({ ...data, factures });
          return {
            ...merged,
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
