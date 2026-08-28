"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FileMinus2, Pencil, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  DocumentSaisieWizard,
  lignesToDraft,
  type DraftLigne,
} from "@/components/document-saisie-wizard";
import { DocumentPreview } from "@/components/document-preview";
import { DocumentPrintActions } from "@/components/document-print-actions";
import { DocumentFiliation } from "@/components/document-filiation";
import { FacturesSubnav } from "@/components/factures-subnav";
import {
  ExportDocumentPdfButton,
} from "@/components/export-documents-pdf";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import {
  ETATS_PAIEMENT_FACTURE,
  etatPaiementFacture,
  FACTURE_STATUTS,
  FACTURE_TYPES,
  appliqueTVA,
  htDepuisTTC,
  libelleClient,
  montantAvoirRestantTTC,
  resteAPayer,
  statutApresAvoir,
  totalAvoirsSurFacture,
  totauxFacture,
  detailAcomptesDocument,
  persisterRemiseGlobale,
  type EtatPaiementFacture,
} from "@/lib/commercial";
import {
  checklistValidationFacture,
  factureEstFiscale,
  nextNumeroDocumentCommercial,
  statutEffectifFacture,
} from "@/lib/facturation-mg";
import { presentationPourFacture } from "@/lib/document-presentation";
import { filterByPos } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useModelePourType } from "@/lib/use-modele";
import type { Facture, FactureStatut, FactureType, LigneDocument, ModeRemise } from "@/lib/types";

type FiltreListe =
  | "tous"
  | EtatPaiementFacture
  | "brouillon"
  | "proforma"
  | "en_retard"
  | "validee"
  | "envoyee"
  | "emise";

/** Filtre par nature du document (indépendant du statut / paiement). */
type FiltreType =
  | "tous"
  | "doit"
  | "acompte"
  | "solde"
  | "avoir"
  | "proforma";

const FILTRES: { id: FiltreListe; label: string }[] = [
  { id: "tous", label: "Toutes" },
  { id: "brouillon", label: "Brouillons" },
  { id: "proforma", label: "Proformas" },
  { id: "validee", label: "Validées" },
  { id: "envoyee", label: "Envoyées" },
  { id: "impayee", label: "Impayées" },
  { id: "en_retard", label: "En retard" },
  { id: "partiellement_payee", label: "Partiellement payées" },
  { id: "payee", label: "Payées" },
  { id: "annulee", label: "Annulées" },
];

const FILTRES_TYPE: { id: FiltreType; label: string }[] = [
  { id: "tous", label: "Tous types" },
  { id: "doit", label: "Facture de doit" },
  { id: "acompte", label: "Facture d'acompte" },
  { id: "solde", label: "Facture de solde" },
  { id: "avoir", label: "Facture d'avoir" },
  { id: "proforma", label: "Proforma" },
];

function filtreDepuisQuery(statut: string | null): FiltreListe {
  if (statut && FILTRES.some((f) => f.id === statut)) {
    return statut as FiltreListe;
  }
  if (statut && statut in FACTURE_STATUTS) {
    return statut as FiltreListe;
  }
  return "tous";
}

function filtreTypeDepuisQuery(type: string | null): FiltreType {
  if (type && FILTRES_TYPE.some((f) => f.id === type)) {
    return type as FiltreType;
  }
  return "tous";
}

function matchFiltreType(type: FactureType, filtre: FiltreType): boolean {
  if (filtre === "tous") return type !== "avoir";
  if (filtre === "doit") return type === "standard";
  if (filtre === "acompte") return type === "acompte";
  if (filtre === "solde") return type === "solde";
  if (filtre === "avoir") return type === "avoir";
  if (filtre === "proforma") return type === "proforma";
  return true;
}

function badgeEtat(etat: EtatPaiementFacture) {
  if (etat === "payee")
    return "badge badge-sand bg-emerald-100 text-emerald-800";
  if (etat === "partiellement_payee")
    return "badge badge-sand bg-amber-100 text-amber-900";
  if (etat === "annulee") return "badge badge-sand bg-slate-200 text-slate-700";
  return "badge badge-sand bg-rose-100 text-rose-800";
}

function badgeStatut(statut: FactureStatut) {
  if (statut === "en_retard")
    return "badge badge-sand bg-rose-100 text-rose-800";
  if (statut === "proforma" || statut === "brouillon")
    return "badge badge-sand bg-amber-100 text-amber-900";
  if (statut === "payee")
    return "badge badge-sand bg-emerald-100 text-emerald-800";
  return "badge badge-sea";
}

export default function ListeFacturesPage() {
  const searchParams = useSearchParams();
  const {
    factures,
    clients,
    produits,
    categoriesProduits,
    pointsDeVente,
    parametres,
    acomptes,
    pointDeVenteActifId,
    commandes,
    devis,
    tarifsClients,
    entrees,
    ventes,
    updateFacture,
    addFacture,
    deleteFacture,
  } = useStore();

  const [filtre, setFiltre] = useState<FiltreListe>(() =>
    filtreDepuisQuery(searchParams.get("statut")),
  );
  const [filtreType, setFiltreType] = useState<FiltreType>(() =>
    filtreTypeDepuisQuery(searchParams.get("type")),
  );

  useEffect(() => {
    setFiltre(filtreDepuisQuery(searchParams.get("statut")));
    setFiltreType(filtreTypeDepuisQuery(searchParams.get("type")));
  }, [searchParams]);

  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewSheetRef = useRef<HTMLDivElement>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const [seed, setSeed] = useState<{
    lignes: DraftLigne[];
    remiseGlobale: number;
    remiseGlobaleMode: ModeRemise;
    note: string;
  }>({ lignes: [], remiseGlobale: 0, remiseGlobaleMode: "montant", note: "" });
  const [meta, setMeta] = useState({
    clientId: "",
    pointDeVenteId: "",
    date: new Date().toISOString().slice(0, 10),
    echeance: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });
  const [avoirFactureId, setAvoirFactureId] = useState<string | null>(null);
  const [modeAvoir, setModeAvoir] = useState<"total" | "partiel">("total");
  const [montantAvoirTTC, setMontantAvoirTTC] = useState("");
  const [motifAvoir, setMotifAvoir] = useState("");

  const modele = useModelePourType("facture");
  const assujetti = appliqueTVA(parametres);
  const editDoc = factures.find((f) => f.id === editId);

  const factureAvoir = factures.find((f) => f.id === avoirFactureId);
  const maxAvoirTTC = factureAvoir
    ? montantAvoirRestantTTC(factureAvoir, factures, parametres, acomptes)
    : 0;

  const lignes = useMemo(() => {
    return [...filterByPos(factures, pointDeVenteActifId)]
      .filter((f) => matchFiltreType(f.type, filtreType))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((f) => {
        const t = totauxFacture(f, parametres, acomptes);
        const avoirs = totalAvoirsSurFacture(f.id, factures, parametres);
        const reste = resteAPayer(f, parametres, acomptes, factures);
        const netTTC = Math.max(0, t.totalTTC - avoirs);
        const paye = Math.min(f.montantPaye, netTTC);
        const etat = etatPaiementFacture(f, parametres, acomptes, factures);
        const statutAffiche = statutEffectifFacture(
          f,
          parametres,
          acomptes,
          factures,
        );
        return { f, t, reste, paye, etat, avoirs, netTTC, statutAffiche };
      })
      .filter((row) => {
        if (filtre === "tous") return true;
        if (filtre === "brouillon") return row.statutAffiche === "brouillon";
        if (filtre === "proforma")
          return (
            row.statutAffiche === "proforma" || row.f.type === "proforma"
          );
        if (filtre === "en_retard") return row.statutAffiche === "en_retard";
        if (
          filtre === "validee" ||
          filtre === "envoyee" ||
          filtre === "emise"
        ) {
          return row.f.statut === filtre || row.statutAffiche === filtre;
        }
        if (filtre in ETATS_PAIEMENT_FACTURE) {
          return row.etat === filtre;
        }
        return row.f.statut === filtre || row.statutAffiche === filtre;
      });
  }, [factures, parametres, acomptes, filtre, filtreType, pointDeVenteActifId]);

  const resume = useMemo(() => {
    const base = filterByPos(factures, pointDeVenteActifId).filter(
      (f) => f.type !== "avoir",
    );
    let payees = 0;
    let partielles = 0;
    let impayees = 0;
    let annulees = 0;
    let enRetard = 0;
    let creances = 0;
    for (const f of base) {
      if (f.type === "proforma" || f.statut === "brouillon") continue;
      const etat = etatPaiementFacture(f, parametres, acomptes, factures);
      const reste = resteAPayer(f, parametres, acomptes, factures);
      const statut = statutEffectifFacture(f, parametres, acomptes, factures);
      creances += reste;
      if (statut === "en_retard") enRetard += 1;
      if (etat === "payee") payees += 1;
      else if (etat === "partiellement_payee") partielles += 1;
      else if (etat === "annulee") annulees += 1;
      else impayees += 1;
    }
    return { payees, partielles, impayees, annulees, creances, enRetard };
  }, [factures, parametres, acomptes, pointDeVenteActifId]);

  function ouvrirEdition(f: Facture) {
    if (factureEstFiscale(f)) return;
    setEditId(f.id);
    setPreviewId(null);
    setMeta({
      clientId: f.clientId,
      pointDeVenteId: f.pointDeVenteId,
      date: f.date.slice(0, 10),
      echeance: f.echeance.slice(0, 10),
    });
    setSeed({
      lignes: lignesToDraft(f.lignes),
      remiseGlobale: f.remiseGlobale ?? 0,
      remiseGlobaleMode: f.remiseGlobaleMode ?? "montant",
      note: f.note ?? "",
    });
    setWizardKey((k) => k + 1);
  }

  function supprimerProforma(f: Facture) {
    if (factureEstFiscale(f)) return;
    const libelle =
      f.type === "proforma" || f.statut === "proforma"
        ? "la proforma"
        : "le brouillon";
    if (!confirm(`Supprimer ${libelle} ${f.numero} ?`)) return;
    const res = deleteFacture(f.id);
    if (!res.ok && res.reason) {
      alert(res.reason);
      return;
    }
    if (editId === f.id) setEditId(null);
    if (previewId === f.id) setPreviewId(null);
  }

  function ouvrirAvoir(f: Facture) {
    if (f.type === "proforma" || f.statut === "brouillon") {
      alert("Les avoirs ne s'appliquent qu'aux factures fiscales validées.");
      return;
    }
    const max = montantAvoirRestantTTC(f, factures, parametres, acomptes);
    if (max <= 0) {
      alert("Cette facture est déjà entièrement annulée par avoir.");
      return;
    }
    setAvoirFactureId(f.id);
    setModeAvoir("total");
    setMontantAvoirTTC(String(max));
    setMotifAvoir("");
  }

  function confirmerAvoir() {
    if (!factureAvoir) return;
    const max = montantAvoirRestantTTC(
      factureAvoir,
      factures,
      parametres,
      acomptes,
    );
    if (max <= 0) return;

    const montantTTC =
      modeAvoir === "total" ? max : Math.min(max, Number(montantAvoirTTC) || 0);
    if (montantTTC <= 0) {
      alert("Indiquez un montant d'avoir valide.");
      return;
    }

    const taux = factureAvoir.tauxTVA ?? parametres.tauxTVA;
    const avoirsExistants = totalAvoirsSurFacture(
      factureAvoir.id,
      factures,
      parametres,
    );
    let lignesAvoir: LigneDocument[];

    if (
      modeAvoir === "total" &&
      montantTTC >= max - 1 &&
      avoirsExistants <= 0
    ) {
      lignesAvoir = factureAvoir.lignes.map((l, i) => ({
        ...l,
        id: `av-${i}`,
      }));
    } else {
      const ht = htDepuisTTC(montantTTC, taux, assujetti);
      lignesAvoir = [
        {
          id: "av-1",
          type: "produit",
          designation:
            motifAvoir.trim() ||
            `Avoir ${modeAvoir === "total" ? "total" : "partiel"} sur ${factureAvoir.numero}`,
          quantite: 1,
          prixUnitaire: ht,
          unite: "u",
        },
      ];
    }

    const numero = nextNumeroDocumentCommercial({
      prefix: "AVO",
      pointDeVenteId: factureAvoir.pointDeVenteId,
      pointsDeVente,
      existing: factures.map((f) => f.numero),
    });

    addFacture(
      {
        numero,
        type: "avoir",
        clientId: factureAvoir.clientId,
        pointDeVenteId: factureAvoir.pointDeVenteId,
        date: new Date().toISOString(),
        echeance: new Date().toISOString(),
        statut: "validee",
        montantPaye: 0,
        tauxTVA: taux,
        conditionsPaiement: factureAvoir.conditionsPaiement,
        note:
          motifAvoir.trim() ||
          `Avoir ${modeAvoir === "total" ? "total" : "partiel"} — annulation de ${factureAvoir.numero}`,
        factureParenteId: factureAvoir.id,
        devisId: factureAvoir.devisId,
        commandeId: factureAvoir.commandeId,
        dateValidation: new Date().toISOString(),
        acomptesDocument: [],
        remiseGlobale:
          modeAvoir === "total" && montantTTC >= max - 1
            ? factureAvoir.remiseGlobale
            : undefined,
        remiseGlobaleMode:
          modeAvoir === "total" && montantTTC >= max - 1
            ? factureAvoir.remiseGlobaleMode
            : undefined,
        lignes: lignesAvoir,
      },
      {
        action: "facture_avoir",
        detail: `Avoir sur ${factureAvoir.numero}`,
      },
    );

    const fictifAvoir: Facture = {
      ...factureAvoir,
      id: "tmp-avoir",
      type: "avoir",
      factureParenteId: factureAvoir.id,
      lignes: lignesAvoir,
      montantPaye: 0,
      statut: "validee",
      numero,
      remiseGlobale:
        modeAvoir === "total" && montantTTC >= max - 1
          ? factureAvoir.remiseGlobale
          : undefined,
      remiseGlobaleMode:
        modeAvoir === "total" && montantTTC >= max - 1
          ? factureAvoir.remiseGlobaleMode
          : undefined,
    };
    const avecAvoir = [fictifAvoir, ...factures];
    const nouveauStatut = statutApresAvoir(
      factureAvoir,
      parametres,
      acomptes,
      avecAvoir,
    );
    updateFacture(factureAvoir.id, { statut: nouveauStatut });

    setAvoirFactureId(null);
    alert(`Facture d'avoir ${numero} créée.`);
  }

  function enregistrerPaiement(id: string) {
    const f = factures.find((x) => x.id === id);
    if (!f) return;
    if (f.type === "proforma" || f.statut === "brouillon") {
      alert("Encaissement réservé aux factures fiscales.");
      return;
    }
    const reste = resteAPayer(f, parametres, acomptes, factures);
    const saisie = prompt(
      `Montant encaissé (reste ${formatCurrency(reste)}) :`,
      String(reste),
    );
    if (saisie === null) return;
    const montant = Number(saisie);
    if (Number.isNaN(montant) || montant <= 0) return;
    const avoirs = totalAvoirsSurFacture(f.id, factures, parametres);
    const t = totauxFacture(f, parametres, acomptes);
    const netTTC = Math.max(0, t.totalTTC - avoirs);
    const paye = Math.min(netTTC, f.montantPaye + montant);
    const statut: FactureStatut =
      paye >= netTTC - 1
        ? "payee"
        : paye > 0
          ? "partiellement_payee"
          : f.statut;
    updateFacture(
      id,
      { montantPaye: paye, statut },
      { action: "facture_paiement", detail: `+${montant} Ar` },
    );
  }

  function marquerEnvoyee(f: Facture) {
    if (f.statut === "brouillon" || f.type === "proforma") {
      alert("Validez d'abord la facture fiscale avant l'envoi.");
      return;
    }
    updateFacture(
      f.id,
      {
        statut: f.statut === "payee" ? "payee" : "envoyee",
        dateEnvoi: new Date().toISOString(),
      },
      { action: "facture_envoyee" },
    );
  }

  function convertirEnFactureFiscale(f: Facture) {
    if (f.type !== "proforma" && f.statut !== "brouillon") return;
    const client = clients.find((c) => c.id === f.clientId);
    const errs = checklistValidationFacture({
      parametres,
      client,
      lignesProduits: f.lignes.filter((l) => (l.type ?? "produit") === "produit")
        .length,
      date: f.date.slice(0, 10),
      echeance: f.echeance.slice(0, 10),
    });
    if (errs.length > 0) {
      alert(
        "Mentions / champs obligatoires manquants :\n- " + errs.join("\n- "),
      );
      return;
    }

    const numero = nextNumeroDocumentCommercial({
      prefix: "FAC",
      pointDeVenteId: f.pointDeVenteId,
      pointsDeVente,
      existing: factures.map((x) => x.numero),
      date: new Date(f.date),
    });

    if (f.statut === "brouillon" && f.type !== "proforma") {
      updateFacture(
        f.id,
        {
          numero,
          statut: "validee",
          type: "standard",
          dateValidation: new Date().toISOString(),
          acomptesDocument: f.acomptesDocument ?? [],
        },
        {
          action: "facture_validee",
          detail: `Brouillon → ${numero}`,
        },
      );
      alert(`Brouillon validé : ${numero}`);
      return;
    }

    addFacture(
      {
        numero,
        type: "standard",
        clientId: f.clientId,
        pointDeVenteId: f.pointDeVenteId,
        date: f.date,
        echeance: f.echeance,
        statut: "validee",
        montantPaye: 0,
        tauxTVA: f.tauxTVA,
        conditionsPaiement: f.conditionsPaiement,
        note: f.note,
        remiseGlobale: f.remiseGlobale,
        remiseGlobaleMode: f.remiseGlobaleMode,
        commandeId: f.commandeId,
        devisId: f.devisId,
        factureParenteId: f.id,
        dateValidation: new Date().toISOString(),
        acomptesDocument: [],
        lignes: f.lignes.map((l, i) => ({ ...l, id: `conv-${i}` })),
      },
      {
        action: "facture_validee",
        detail: `Proforma ${f.numero} → ${numero}`,
      },
    );
    alert(`Facture fiscale ${numero} créée depuis la proforma.`);
  }

  const preview = factures.find((f) => f.id === previewId);
  const previewParent = preview?.factureParenteId
    ? factures.find((f) => f.id === preview.factureParenteId)
    : undefined;
  const previewPresentation = preview
    ? presentationPourFacture(preview, parametres, modele)
    : null;

  return (
    <div>
      <PageHeader
        title="Liste des factures"
        description="Proformas et brouillons restent modifiables ou suppressibles. Les factures fiscales sont figées à la validation (avoir uniquement)."
      />

      <FacturesSubnav />

      {editId && editDoc && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <DocumentSaisieWizard
            key={wizardKey}
            titre={`Modifier ${editDoc.numero}`}
            produits={produits}
            categoriesProduits={categoriesProduits}
            clientId={meta.clientId}
            tarifsClients={tarifsClients}
            pointDeVenteId={meta.pointDeVenteId}
            entrees={entrees}
            ventes={ventes}
            tauxTVA={parametres.tauxTVA}
            assujettiTVA={assujetti}
            initialLignes={seed.lignes}
            initialRemiseGlobale={seed.remiseGlobale}
            initialRemiseGlobaleMode={seed.remiseGlobaleMode}
            initialNote={seed.note}
            previewMeta={{
              type: "facture",
              numero: editDoc.numero,
              date: new Date(`${meta.date}T12:00:00`).toISOString(),
              echeance: new Date(`${meta.echeance}T12:00:00`).toISOString(),
              client: clients.find((c) => c.id === meta.clientId),
              pdv: pointsDeVente.find((p) => p.id === meta.pointDeVenteId),
              parametres,
              modele,
              conditionsPaiement:
                editDoc.conditionsPaiement ||
                parametres.conditionsPaiementDefaut,
              factureType: editDoc.type,
              estProforma:
                editDoc.type === "proforma" || editDoc.statut === "proforma",
            }}
            confirmLabel="Enregistrer les modifications"
            onCancel={() => setEditId(null)}
            onConfirm={({ lignes, remiseGlobale, remiseGlobaleMode, note }) => {
              if (!meta.clientId) return;
              updateFacture(
                editId,
                {
                  clientId: meta.clientId,
                  pointDeVenteId: meta.pointDeVenteId,
                  date: new Date(`${meta.date}T12:00:00`).toISOString(),
                  echeance: new Date(`${meta.echeance}T12:00:00`).toISOString(),
                  lignes,
                  ...persisterRemiseGlobale(remiseGlobale, remiseGlobaleMode),
                  note,
                },
                { action: "facture_modifiee", detail: editDoc.numero },
              );
              setEditId(null);
            }}
            headerFields={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-xs font-semibold text-muted">
                  Client
                  <select
                    className="select mt-1"
                    value={meta.clientId}
                    onChange={(e) =>
                      setMeta({ ...meta, clientId: e.target.value })
                    }
                    required
                  >
                    {clients
                      .filter((c) => c.actif || c.id === meta.clientId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {libelleClient(c)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Point de vente
                  <select
                    className="select mt-1"
                    value={meta.pointDeVenteId}
                    onChange={(e) =>
                      setMeta({ ...meta, pointDeVenteId: e.target.value })
                    }
                  >
                    {pointsDeVente.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Date
                  <input
                    type="date"
                    className="input mt-1"
                    value={meta.date}
                    onChange={(e) =>
                      setMeta({ ...meta, date: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Échéance
                  <input
                    type="date"
                    className="input mt-1"
                    value={meta.echeance}
                    onChange={(e) =>
                      setMeta({ ...meta, echeance: e.target.value })
                    }
                  />
                </label>
              </div>
            }
          />
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">Créances en attente</p>
          <p className="font-display text-lg font-semibold text-coral">
            {formatCurrency(resume.creances)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">Impayées</p>
          <p className="font-display text-lg font-semibold">{resume.impayees}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">En retard</p>
          <p className="font-display text-lg font-semibold text-coral">
            {resume.enRetard}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">Partiellement payées</p>
          <p className="font-display text-lg font-semibold">{resume.partielles}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">Payées</p>
          <p className="font-display text-lg font-semibold">{resume.payees}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">Annulées (avoir)</p>
          <p className="font-display text-lg font-semibold">{resume.annulees}</p>
        </div>
      </div>

      <div className="mb-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
          Type de facture
        </p>
        <div className="flex flex-wrap gap-2">
          {FILTRES_TYPE.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`btn ${filtreType === f.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFiltreType(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
          Statut / paiement
        </p>
        <div className="flex flex-wrap gap-2">
          {FILTRES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`btn ${filtre === f.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFiltre(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>N°</th>
              <th>Date</th>
              <th>Client</th>
              <th>Total TTC</th>
              <th>Avoirs</th>
              <th>Payé</th>
              <th>Reste à payer</th>
              <th>État</th>
              <th>Statut doc.</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-muted">
                  Aucune facture pour ce filtre.
                </td>
              </tr>
            ) : (
              lignes.map(({ f, t, reste, paye, etat, avoirs, statutAffiche }) => {
                const client = clients.find((c) => c.id === f.clientId);
                const estNonFiscal = !factureEstFiscale(f);
                const peutAvoir =
                  !estNonFiscal &&
                  f.type !== "avoir" &&
                  etat !== "annulee" &&
                  montantAvoirRestantTTC(f, factures, parametres, acomptes) > 0;
                return (
                  <tr key={f.id}>
                    <td>
                      <p className="font-medium">{f.numero}</p>
                      <span className="badge badge-sea mt-1">
                        {FACTURE_TYPES[f.type] ?? f.type}
                      </span>
                    </td>
                    <td>
                      {formatDate(f.date)}
                      <span className="mt-0.5 block text-xs text-muted">
                        Éch. {formatDate(f.echeance)}
                      </span>
                    </td>
                    <td>{client?.nom ?? "—"}</td>
                    <td className="font-semibold">
                      {formatCurrency(t.totalTTC)}
                    </td>
                    <td>
                      {avoirs > 0 ? (
                        <span className="text-coral">
                          −{formatCurrency(avoirs)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{formatCurrency(paye)}</td>
                    <td
                      className={
                        reste > 0 ? "font-semibold text-coral" : "text-success"
                      }
                    >
                      {formatCurrency(reste)}
                    </td>
                    <td>
                      <span className={badgeEtat(etat)}>
                        {ETATS_PAIEMENT_FACTURE[etat]}
                      </span>
                    </td>
                    <td>
                      <span className={badgeStatut(statutAffiche)}>
                        {FACTURE_STATUTS[statutAffiche] ?? statutAffiche}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <IconButton
                          label="Aperçu de la facture"
                          onClick={() => setPreviewId(f.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </IconButton>
                        <ExportDocumentPdfButton
                          label={`Exporter PDF ${f.numero}`}
                        >
                          {(() => {
                            const pres = presentationPourFacture(
                              f,
                              parametres,
                              modele,
                            );
                            return (
                              <DocumentPreview
                                type="facture"
                                factureType={f.type}
                                estProforma={
                                  f.type === "proforma" ||
                                  f.statut === "proforma"
                                }
                                numero={f.numero}
                                date={f.date}
                                echeance={f.echeance}
                                client={clients.find((c) => c.id === f.clientId)}
                                pdv={pointsDeVente.find(
                                  (p) => p.id === f.pointDeVenteId,
                                )}
                                parametres={pres.parametres}
                                modele={pres.modele}
                                lignes={f.lignes}
                                totaux={totauxFacture(f, parametres, acomptes)}
                                conditionsPaiement={f.conditionsPaiement}
                                note={f.note}
                                referenceFacture={
                                  f.factureParenteId
                                    ? factures.find(
                                        (x) => x.id === f.factureParenteId,
                                      )?.numero
                                    : undefined
                                }
                                referenceDevis={
                                  devis.find((d) => d.id === f.devisId)?.numero
                                }
                                referenceCommande={
                                  commandes.find((c) => c.id === f.commandeId)
                                    ?.numero
                                }
                                acomptesDetail={detailAcomptesDocument(
                                  f,
                                  acomptes,
                                )}
                              />
                            );
                          })()}
                        </ExportDocumentPdfButton>
                        {estNonFiscal && (
                          <>
                            <IconButton
                              label="Modifier le document"
                              onClick={() => ouvrirEdition(f)}
                            >
                              <Pencil className="h-4 w-4" />
                            </IconButton>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => supprimerProforma(f)}
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                              Supprimer
                            </button>
                            <button
                              className="btn btn-primary"
                              onClick={() => convertirEnFactureFiscale(f)}
                            >
                              Valider fiscale
                            </button>
                          </>
                        )}
                        {!estNonFiscal && !f.dateEnvoi && etat !== "annulee" && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => marquerEnvoyee(f)}
                          >
                            Marquer envoyée
                          </button>
                        )}
                        {reste > 0 && etat !== "annulee" && !estNonFiscal && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => enregistrerPaiement(f.id)}
                          >
                            Encaisser
                          </button>
                        )}
                        {peutAvoir && (
                          <button
                            className="btn btn-secondary"
                            title="Émettre un avoir"
                            onClick={() => ouvrirAvoir(f)}
                          >
                            <FileMinus2 className="h-4 w-4" />
                            Avoir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {factureAvoir && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
          <div className="my-8 w-full max-w-lg rounded-[var(--radius)] border border-line bg-card p-5 shadow-lg">
            <h2 className="font-display text-lg font-semibold">
              Facture d&apos;avoir — {factureAvoir.numero}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Annulation partielle ou totale. La facture d&apos;origine est
              conservée (suppression impossible).
            </p>
            <p className="mt-3 text-sm">
              Montant encore annulable :{" "}
              <strong>{formatCurrency(maxAvoirTTC)}</strong>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn ${modeAvoir === "total" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => {
                  setModeAvoir("total");
                  setMontantAvoirTTC(String(maxAvoirTTC));
                }}
              >
                Annulation totale
              </button>
              <button
                type="button"
                className={`btn ${modeAvoir === "partiel" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setModeAvoir("partiel")}
              >
                Annulation partielle
              </button>
            </div>

            {modeAvoir === "partiel" && (
              <label className="mt-4 block text-xs font-semibold text-muted">
                Montant TTC de l&apos;avoir (Ar)
                <input
                  type="number"
                  min={1}
                  max={maxAvoirTTC}
                  className="input mt-1"
                  value={montantAvoirTTC}
                  onChange={(e) => setMontantAvoirTTC(e.target.value)}
                />
              </label>
            )}

            <label className="mt-4 block text-xs font-semibold text-muted">
              Motif (optionnel)
              <input
                className="input mt-1"
                value={motifAvoir}
                onChange={(e) => setMotifAvoir(e.target.value)}
                placeholder="Ex. retour marchandise, erreur de facturation…"
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmerAvoir}
              >
                Émettre l&apos;avoir
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAvoirFactureId(null)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
          <div className="my-6 w-full max-w-[220mm]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                Document commercial figé à l&apos;émission — le règlement
                ultérieur ne modifie pas le PDF (seul le statut change).
              </p>
              <div className="flex flex-wrap gap-2">
                {!factureEstFiscale(preview) && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => supprimerProforma(preview)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                    Supprimer
                  </button>
                )}
                <DocumentPrintActions
                  sheetRef={previewSheetRef}
                  filename={`Facture ${preview.numero}`}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => setPreviewId(null)}
                >
                  Fermer
                </button>
              </div>
            </div>
            {preview.statut === "payee" ||
            preview.statut === "partiellement_payee" ? (
              <p className="mb-3 rounded-lg border border-line bg-card px-3 py-2 text-sm no-print">
                État de paiement (hors document) :{" "}
                <strong>
                  {FACTURE_STATUTS[preview.statut] ?? preview.statut}
                </strong>
                {" · "}
                Encaissé : {formatCurrency(preview.montantPaye)} — le net à
                payer imprimé reste celui de l&apos;émission.
              </p>
            ) : null}
            <DocumentPreview
              ref={previewSheetRef}
              type="facture"
              factureType={preview.type}
              estProforma={
                preview.type === "proforma" || preview.statut === "proforma"
              }
              numero={preview.numero}
              date={preview.date}
              echeance={preview.echeance}
              client={clients.find((c) => c.id === preview.clientId)}
              pdv={pointsDeVente.find((p) => p.id === preview.pointDeVenteId)}
              parametres={previewPresentation!.parametres}
              modele={previewPresentation!.modele}
              lignes={preview.lignes}
              totaux={totauxFacture(preview, parametres, acomptes)}
              conditionsPaiement={preview.conditionsPaiement}
              note={preview.note}
              referenceFacture={previewParent?.numero}
              referenceDevis={
                devis.find((d) => d.id === preview.devisId)?.numero
              }
              referenceCommande={
                commandes.find((c) => c.id === preview.commandeId)?.numero
              }
              acomptesDetail={detailAcomptesDocument(preview, acomptes)}
            />
            <DocumentFiliation documentId={preview.id} />
          </div>
        </div>
      )}
    </div>
  );
}
