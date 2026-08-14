"use client";

import { create } from "zustand";
import type { ModeleDocument } from "./document-templates";
import {
  creerEntreeHistorique,
  produitEstReference,
} from "./produits";
import { creerEntreeJournal } from "./facturation-mg";
import {
  resetBusinessState,
  scheduleBusinessSave,
  setBusinessSyncEnabled,
} from "./business-api";
import { rebuildVentesDepuisFactures } from "./commercial";
import {
  avecPresentationSiBesoin,
  creerSnapshotPresentation,
} from "./document-presentation";
import { emptyAppState, pickAppState } from "./empty-state";
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

  addEntree: (entree: Omit<EntreeStock, "id">) => void;
  deleteEntree: (id: string) => void;
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
  deleteClient: (id: string) => void;

  addFournisseur: (frn: Omit<Fournisseur, "id">) => void;
  updateFournisseur: (id: string, data: Partial<Fournisseur>) => void;
  deleteFournisseur: (id: string) => void;

  addDevis: (devis: Omit<Devis, "id">) => void;
  updateDevis: (id: string, data: Partial<Devis>) => void;
  deleteDevis: (id: string) => void;

  addCommande: (cmd: Omit<Commande, "id">) => void;
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
  deleteFacture: (id: string) => void;
  addJournalAudit: (entry: Omit<JournalAudit, "id">) => void;
  /** Purge les entrées journal métier plus anciennes que N jours. Retourne le nombre supprimé. */
  purgeJournalAuditOlderThan: (days: number) => number;

  addAcompte: (acompte: Omit<Acompte, "id">) => void;
  updateAcompte: (id: string, data: Partial<Acompte>) => void;
  deleteAcompte: (id: string) => void;

  /** Remplace l'état métier (hydratation API). */
  applyBusinessData: (data: AppState) => void;
  clearBusinessData: () => void;
  /** Remet l'état démo via API (admin). */
  resetDemo: () => Promise<void>;
};

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
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

      addEntree: (entree) =>
        set((state) => ({
          entrees: [{ ...entree, id: uid("ent") }, ...state.entrees],
        })),
      deleteEntree: (id) =>
        set((state) => ({
          entrees: state.entrees.filter((e) => e.id !== id),
        })),
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
      deleteClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
        })),

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
      deleteFournisseur: (id) =>
        set((state) => ({
          fournisseurs: state.fournisseurs.filter((f) => f.id !== id),
        })),

      addDevis: (devis) =>
        set((state) => ({
          devis: [{ ...devis, id: uid("dev") }, ...state.devis],
        })),
      updateDevis: (id, data) =>
        set((state) => ({
          devis: state.devis.map((d) => (d.id === id ? { ...d, ...data } : d)),
        })),
      deleteDevis: (id) =>
        set((state) => ({
          devis: state.devis.filter((d) => d.id !== id),
        })),

      addCommande: (cmd) =>
        set((state) => ({
          commandes: [{ ...cmd, id: uid("cmd") }, ...state.commandes],
        })),
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

          /** Contenu figé dès création : seuls suivi paiement / statut / validation sont autorisés. */
          const {
            lignes: _lignes,
            clientId: _clientId,
            pointDeVenteId: _pointDeVenteId,
            date: _date,
            echeance: _echeance,
            tauxTVA: _tauxTVA,
            conditionsPaiement: _conditionsPaiement,
            note: _note,
            remiseGlobale: _remiseGlobale,
            devisId: _devisId,
            commandeId: _commandeId,
            bonDeLivraisonId: _bonDeLivraisonId,
            factureParenteId: _factureParenteId,
            acomptesDocument: acomptesDocumentPatch,
            presentation: presentationPatch,
            ...suiviAutorise
          } = data;

          const patch: Partial<typeof prev> = { ...suiviAutorise };

          // Validation brouillon/proforma → fiscale : numéro / type / acomptes / présentation figés
          const estConversionFiscale =
            (prev.statut === "brouillon" ||
              prev.statut === "proforma" ||
              prev.type === "proforma") &&
            (data.statut === "validee" ||
              data.statut === "envoyee" ||
              data.statut === "payee" ||
              data.statut === "partiellement_payee");
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
      deleteFacture: (_id) => {
        // Les factures ne peuvent pas être supprimées : utiliser une facture d'avoir.
        return;
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

      addAcompte: (acompte) =>
        set((state) => ({
          acomptes: [{ ...acompte, id: uid("aco") }, ...state.acomptes],
        })),
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
      resetDemo: async () => {
        setBusinessSyncEnabled(false);
        try {
          const res = await resetBusinessState("demo");
          set({
            ...pickAppState(res.data),
            ventes: rebuildVentesDepuisFactures(res.data.factures),
          });
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
  // Purge de l'ancien cache localStorage (seed front).
  try {
    localStorage.removeItem("stwr-poissonnerie-v4");
  } catch {
    /* ignore */
  }
}
