"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModeleDocument } from "./document-templates";
import { createDefaultModeles } from "./document-templates";
import {
  creerEntreeHistorique,
  LEGACY_CATEGORIE_MAP,
  migrateProduitLegacy,
  produitEstReference,
  seedCategoriesProduits,
} from "./produits";
import { creerEntreeJournal } from "./facturation-mg";
import { seedData } from "./seed-data";
import type {
  Acompte,
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

  addCategorieProduit: (cat: Omit<CategorieProduit, "id">) => void;
  updateCategorieProduit: (id: string, data: Partial<CategorieProduit>) => void;

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

  addAcompte: (acompte: Omit<Acompte, "id">) => void;
  updateAcompte: (id: string, data: Partial<Acompte>) => void;
  deleteAcompte: (id: string) => void;

  resetDemo: () => void;
};

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seedData,
      setPointDeVenteActif: (id) => set({ pointDeVenteActifId: id }),
      updateParametres: (data) =>
        set((state) => ({
          parametres: { ...state.parametres, ...data },
        })),
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
        set((state) => ({
          modelesDocuments: state.modelesDocuments.map((m) =>
            m.id === id ? { ...m, ...data } : m,
          ),
        })),
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
        set((state) => ({
          factures: [{ ...facture, id }, ...state.factures],
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
        }));
        return id;
      },
      updateFacture: (id, data, audit) =>
        set((state) => {
          const prev = state.factures.find((f) => f.id === id);
          const journal = [...state.journalAudit];
          if (audit && prev) {
            journal.unshift({
              id: uid("aud"),
              ...creerEntreeJournal({
                action: audit.action,
                entiteId: id,
                numero: data.numero ?? prev.numero,
                detail: audit.detail,
              }),
            });
          }
          return {
            factures: state.factures.map((f) =>
              f.id === id ? { ...f, ...data } : f,
            ),
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

      resetDemo: () => set({ ...seedData }),
    }),
    {
      name: "stwr-poissonnerie-v4",
      skipHydration: true,
      version: 7,
      migrate: (persisted, version) => {
        const state = persisted as Partial<Store>;
        if (version < 1 && state.pointsDeVente) {
          state.pointsDeVente = state.pointsDeVente.map((pdv) => ({
            ...pdv,
            objectifCAMensuel:
              typeof pdv.objectifCAMensuel === "number"
                ? pdv.objectifCAMensuel
                : 0,
          }));
        }
        if (version < 2 && state.modelesDocuments) {
          state.modelesDocuments = state.modelesDocuments.map((m) => {
            if (m.rubriques.includes("logo")) return m;
            const i = m.rubriques.indexOf("entete_entreprise");
            const rubriques = [...m.rubriques];
            rubriques.splice(i >= 0 ? i + 1 : 0, 0, "logo");
            return { ...m, rubriques };
          });
        }
        if (version < 3) {
          if (!state.categoriesProduits?.length) {
            state.categoriesProduits = seedCategoriesProduits();
          }
          if (!state.tarifsClients) state.tarifsClients = [];
          if (!state.historiquesPrix) state.historiquesPrix = [];
          const taux = state.parametres?.tauxTVA ?? 20;
          if (state.produits?.length) {
            state.produits = state.produits.map((p) =>
              migrateProduitLegacy(
                p as unknown as Record<string, unknown>,
                LEGACY_CATEGORIE_MAP,
                taux,
              ),
            );
          }
        }
        if (version < 4) {
          if (!state.journalAudit) state.journalAudit = [];
          if (state.factures?.length) {
            state.factures = state.factures.map((f) => ({
              ...f,
              statut:
                f.statut === "emise"
                  ? ("validee" as const)
                  : f.statut,
            }));
          }
        }
        if (version < 5) {
          if (!state.bonsDeLivraison) state.bonsDeLivraison = [];
          if (
            state.modelesDocuments &&
            !state.modelesDocuments.some((m) => m.type === "bon_de_livraison")
          ) {
            state.modelesDocuments = [
              ...state.modelesDocuments,
              ...createDefaultModeles().filter(
                (m) => m.type === "bon_de_livraison",
              ),
            ];
          }
        }
        if (version < 6 && state.factures?.length) {
          const acomptes = state.acomptes ?? [];
          state.factures = state.factures.map((f) => {
            if (f.acomptesDocument !== undefined) return f;
            if (f.type === "acompte" || f.type === "avoir") {
              return { ...f, acomptesDocument: [] };
            }
            const detail = acomptes
              .filter(
                (a) =>
                  a.statut !== "annule" &&
                  (a.factureId === f.id ||
                    (f.commandeId && a.commandeId === f.commandeId) ||
                    (f.devisId && a.devisId === f.devisId)),
              )
              .map((a) => ({
                numero: a.numero,
                date: a.date,
                montant: a.montantTTC,
                mode: a.modePaiement,
              }));
            return { ...f, acomptesDocument: detail };
          });
        }
        if (version < 7) {
          if (state.parametres) {
            if (state.parametres.seuilMargePalier1Percent == null) {
              state.parametres.seuilMargePalier1Percent = 25;
            }
            if (state.parametres.seuilMargePalier2Percent == null) {
              state.parametres.seuilMargePalier2Percent = 5;
            }
          }
          if (state.charges?.length) {
            state.charges = state.charges.map((c) => ({
              ...c,
              natureEconomique:
                c.natureEconomique ??
                (c.categorie === "emballage" || c.categorie === "transport"
                  ? ("variable_vente" as const)
                  : c.categorie === "interets"
                    ? ("financiere" as const)
                    : c.categorie === "exceptionnel"
                      ? ("exceptionnelle" as const)
                      : c.categorie === "impot_benefice"
                        ? ("impot_benefice" as const)
                        : ("fixe_structure" as const)),
            }));
          }
        }
        return state as Store;
      },
    },
  ),
);
