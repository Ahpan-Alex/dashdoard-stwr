"use client";

import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  AlignLeft,
  FileText,
  GripVertical,
  MessageSquare,
  Minus,
  Plus,
  Sigma,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DocumentPreview } from "@/components/document-preview";
import { FacturesSubnav } from "@/components/factures-subnav";
import {
  appliqueTVA,
  calculerTotaux,
  creerSnapshotAcomptesDocument,
  isLigneProduit,
  montantLigneHT,
  recalculerSousTotaux as recalculerSousTotauxBase,
} from "@/lib/commercial";
import {
  checklistValidationFacture,
  nextNumeroDocumentCommercial,
} from "@/lib/facturation-mg";
import {
  designationFacture,
  produitsActifs,
  resolvePrixVenteHT,
} from "@/lib/produits";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  stockDisponible,
  stockRestantPourSaisie,
} from "@/lib/calculations";
import { useStore } from "@/lib/store";
import { createId } from "@/lib/id";
import type { FactureStatut, LigneDocument, TypeLigneDocument } from "@/lib/types";

type Etape = "saisie" | "prevalidation";

type DraftLigne = Omit<LigneDocument, "id"> & { key: string };

function uidLocal() {
  return createId("tmp");
}

function recalculerSousTotaux(lignes: DraftLigne[]): DraftLigne[] {
  return recalculerSousTotauxBase(
    lignes.map((l) => ({ ...l, id: l.key })),
  ).map(({ id, ...rest }) => ({ ...rest, key: id }));
}

export default function FacturesPage() {
  const {
    factures,
    clients,
    produits,
    categoriesProduits,
    pointsDeVente,
    parametres,
    acomptes,
    modelesDocuments,
    commandes,
    devis,
    tarifsClients,
    entrees,
    ventes,
    addFacture,
  } = useStore();

  const avecTVA = appliqueTVA(parametres);
  const produitsDispo = produitsActifs(produits);
  const categoriesActives = useMemo(
    () =>
      [...categoriesProduits]
        .filter((c) => c.actif)
        .sort((a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle)),
    [categoriesProduits],
  );

  const [open, setOpen] = useState(true);
  const [etape, setEtape] = useState<Etape>("saisie");
  const [previewDraft, setPreviewDraft] = useState(false);
  const [filtreFamille, setFiltreFamille] = useState("");
  const [rechercheProduit, setRechercheProduit] = useState("");
  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? "",
    pointDeVenteId: pointsDeVente[0]?.id ?? "",
    commandeId: "",
    devisId: "",
    date: new Date().toISOString().slice(0, 10),
    echeance: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    remiseGlobale: "0",
    note: "",
    commentaireLibre: "",
    acomptePaye: "0",
  });
  const [lignes, setLignes] = useState<DraftLigne[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  const modele = modelesDocuments.find((m) => m.type === "facture" && m.actif);

  const acomptesLies = useMemo(() => {
    return acomptes.filter(
      (a) =>
        a.statut !== "annule" &&
        a.clientId === form.clientId &&
        ((form.commandeId && a.commandeId === form.commandeId) ||
          (form.devisId && a.devisId === form.devisId)),
    );
  }, [acomptes, form.clientId, form.commandeId, form.devisId]);

  const acomptesTTC = acomptesLies.reduce((s, a) => s + a.montantTTC, 0);

  useEffect(() => {
    setForm((f) => ({ ...f, acomptePaye: String(acomptesTTC) }));
  }, [acomptesTTC]);

  const totauxDraft = useMemo(() => {
    const lignesDoc = lignes.map((l) => ({ ...l, id: l.key }));
    return calculerTotaux(
      lignesDoc,
      parametres.tauxTVA,
      0,
      avecTVA,
      Number(form.remiseGlobale) || 0,
    );
  }, [lignes, parametres.tauxTVA, avecTVA, form.remiseGlobale]);

  const acomptePayeNum = Math.max(0, Number(form.acomptePaye) || 0);
  const resteAPayerDraft = Math.max(0, totauxDraft.totalTTC - acomptePayeNum);

  function resetForm() {
    setEtape("saisie");
    setPreviewDraft(false);
    setLignes([]);
    setFiltreFamille("");
    setRechercheProduit("");
    setStockError(null);
    setForm((f) => ({
      ...f,
      commandeId: "",
      devisId: "",
      remiseGlobale: "0",
      note: "",
      commentaireLibre: "",
      acomptePaye: "0",
    }));
  }

  const numeroProvisoire = nextNumeroDocumentCommercial({
    prefix: "FAC",
    pointDeVenteId: form.pointDeVenteId,
    pointsDeVente,
    existing: factures.map((f) => f.numero),
    date: new Date(`${form.date}T12:00:00`),
  });

  const produitsSelectionnesIds = useMemo(() => {
    const ids = new Set<string>();
    for (const l of lignes) {
      if (isLigneProduit(l) && l.produitId) ids.add(l.produitId);
    }
    return ids;
  }, [lignes]);

  const catalogueFiltre = useMemo(() => {
    const q = rechercheProduit.trim().toLowerCase();
    return produitsDispo
      .filter((p) => {
        if (filtreFamille) {
          if (p.categorieId === filtreFamille) return true;
          const cat = categoriesProduits.find((c) => c.id === p.categorieId);
          if (cat?.parentId !== filtreFamille) return false;
        }
        return true;
      })
      .filter((p) => {
        if (!q) return true;
        return (
          p.code.toLowerCase().includes(q) ||
          p.libelleCourt.toLowerCase().includes(q) ||
          p.libelleLong.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [
    produitsDispo,
    filtreFamille,
    rechercheProduit,
    categoriesProduits,
  ]);

  function libelleFamille(categorieId: string) {
    return (
      categoriesProduits.find((c) => c.id === categorieId)?.libelle ?? "—"
    );
  }

  const lignesDraftDoc: LigneDocument[] = lignes.map((l, i) => ({
    id: `draft-${i}`,
    type: l.type ?? "produit",
    produitId: l.produitId,
    codeProduit: l.codeProduit,
    designation: l.designation,
    quantite: l.quantite,
    prixUnitaire: l.prixUnitaire,
    unite: l.unite,
    tauxTVA: l.tauxTVA,
    remisePercent: l.remisePercent,
    commentaire: l.commentaire,
  }));

  function toggleProduitSurFacture(produitId: string, checked: boolean) {
    const prod = produitsDispo.find((p) => p.id === produitId);
    if (!prod) return;
    setStockError(null);
    if (!checked) {
      setLignes((prev) =>
        recalculerSousTotaux(
          prev.filter((l) => !(isLigneProduit(l) && l.produitId === produitId)),
        ),
      );
      return;
    }
    if (produitsSelectionnesIds.has(produitId)) return;
    if (!form.pointDeVenteId) {
      setStockError("Sélectionnez un point de vente avant d'ajouter un produit.");
      return;
    }
    const dispo = stockRestantPourSaisie(
      produitId,
      form.pointDeVenteId,
      entrees,
      ventes,
      lignes,
    );
    if (dispo <= 0) {
      setStockError(
        `Stock insuffisant pour « ${prod.libelleCourt} » (disponible : 0 ${prod.unite}).`,
      );
      return;
    }
    const assujetti = avecTVA;
    const prix = resolvePrixVenteHT(prod, {
      clientId: form.clientId,
      quantite: 1,
      tarifsClients,
    });
    setLignes((prev) =>
      recalculerSousTotaux([
        ...prev,
        {
          key: uidLocal(),
          type: "produit",
          produitId: prod.id,
          codeProduit: prod.code,
          designation: designationFacture(prod),
          quantite: 1,
          prixUnitaire: prix,
          unite: prod.unite,
          tauxTVA: assujetti ? prod.tauxTVA : 0,
        },
      ]),
    );
  }

  function addLigneSpeciale(type: TypeLigneDocument) {
    if (type === "sous_total") {
      setLignes((prev) =>
        recalculerSousTotaux([
          ...prev,
          {
            key: uidLocal(),
            type: "sous_total",
            designation: "Sous-total",
            quantite: 0,
            prixUnitaire: 0,
            unite: "",
          },
        ]),
      );
      return;
    }
    if (type === "blanche") {
      setLignes((prev) => [
        ...prev,
        {
          key: uidLocal(),
          type: "blanche",
          designation: "",
          quantite: 0,
          prixUnitaire: 0,
          unite: "",
        },
      ]);
      return;
    }
    if (type === "commentaire") {
      const texte = form.commentaireLibre.trim();
      if (!texte) return;
      setLignes((prev) => [
        ...prev,
        {
          key: uidLocal(),
          type: "commentaire",
          designation: texte,
          quantite: 0,
          prixUnitaire: 0,
          unite: "",
        },
      ]);
      setForm((f) => ({ ...f, commentaireLibre: "" }));
    }
  }

  function updateLigne(key: string, patch: Partial<DraftLigne>) {
    setStockError(null);
    setLignes((prev) => {
      const next = prev.map((l) => {
        if (l.key !== key) return l;
        const merged = { ...l, ...patch };
        if (
          isLigneProduit(merged) &&
          merged.produitId &&
          patch.quantite !== undefined
        ) {
          const max = stockRestantPourSaisie(
            merged.produitId,
            form.pointDeVenteId,
            entrees,
            ventes,
            prev,
            key,
          );
          merged.quantite = Math.min(Math.max(0, Number(patch.quantite) || 0), max);
        }
        return merged;
      });
      return recalculerSousTotaux(next);
    });
  }

  function validerStocksLignes(): string | null {
    if (!form.pointDeVenteId) {
      return "Sélectionnez un point de vente avant de continuer.";
    }
    for (const l of lignes) {
      if (!isLigneProduit(l) || !l.produitId) continue;
      const max = stockRestantPourSaisie(
        l.produitId,
        form.pointDeVenteId,
        entrees,
        ventes,
        lignes,
        l.key,
      );
      if (l.quantite <= 0) {
        return `Quantité invalide pour « ${l.designation} ».`;
      }
      if (l.quantite > max) {
        return `Stock insuffisant pour « ${l.designation} » (disponible : ${formatNumber(max)} ${l.unite}).`;
      }
    }
    return null;
  }

  function removeLigne(key: string) {
    setLignes((prev) => recalculerSousTotaux(prev.filter((l) => l.key !== key)));
  }

  function deplacerLigne(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    setLignes((prev) => {
      const from = prev.findIndex((l) => l.key === fromKey);
      const to = prev.findIndex((l) => l.key === toKey);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return recalculerSousTotaux(next);
    });
  }

  function onDragStart(e: DragEvent, key: string) {
    setDragKey(key);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  }

  function onDragOver(e: DragEvent, key: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragKey && dragKey !== key) setDropKey(key);
  }

  function onDrop(key: string) {
    if (dragKey) deplacerLigne(dragKey, key);
    setDragKey(null);
    setDropKey(null);
  }

  function onDragEnd() {
    setDragKey(null);
    setDropKey(null);
  }

  function allerPrevalidation() {
    if (!form.clientId || !lignes.some((l) => isLigneProduit(l))) return;
    const err = validerStocksLignes();
    if (err) {
      setStockError(err);
      return;
    }
    setStockError(null);
    setLignes((prev) => recalculerSousTotaux(prev));
    setEtape("prevalidation");
  }

  function enregistrerDocument(mode: "brouillon" | "proforma" | "validee") {
    if (!form.clientId || !lignes.some((l) => isLigneProduit(l))) return;
    const client = clients.find((c) => c.id === form.clientId);
    const errs = checklistValidationFacture({
      parametres,
      client,
      lignesProduits: lignes.filter((l) => isLigneProduit(l)).length,
      date: form.date,
      echeance: form.echeance,
    });
    if (mode === "validee" && errs.length > 0) {
      alert(
        "Mentions / champs obligatoires manquants :\n- " + errs.join("\n- "),
      );
      return;
    }

    const remiseGlobale = Number(form.remiseGlobale) || 0;
    const paye =
      mode === "validee"
        ? Math.min(totauxDraft.totalTTC, acomptePayeNum)
        : 0;
    let statut: FactureStatut;
    if (mode === "brouillon") statut = "brouillon";
    else if (mode === "proforma") statut = "proforma";
    else if (paye >= totauxDraft.totalTTC - 1) statut = "payee";
    else if (paye > 0) statut = "partiellement_payee";
    else statut = "validee";

    const prefix = mode === "proforma" ? ("PRO" as const) : ("FAC" as const);
    const numero =
      mode === "brouillon"
        ? `BRO-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`
        : nextNumeroDocumentCommercial({
            prefix,
            pointDeVenteId: form.pointDeVenteId,
            pointsDeVente,
            existing: factures.map((f) => f.numero),
            date: new Date(`${form.date}T12:00:00`),
          });

    const detailAcomptesEmission = [
      ...acomptesLies.map((a) => ({
        numero: a.numero,
        date: a.date,
        montant: a.montantTTC,
        mode: a.modePaiement as string | undefined,
      })),
      ...(acomptePayeNum > acomptesTTC
        ? [
            {
              numero: "Acompte à l'émission",
              date: new Date(`${form.date}T12:00:00`).toISOString(),
              montant: acomptePayeNum - acomptesTTC,
            },
          ]
        : []),
    ];
    const acomptesDocument =
      mode === "brouillon"
        ? undefined
        : creerSnapshotAcomptesDocument(
            acomptePayeNum > 0 && detailAcomptesEmission.length === 0
              ? [
                  {
                    numero: "Acompte à l'émission",
                    date: new Date(`${form.date}T12:00:00`).toISOString(),
                    montant: acomptePayeNum,
                  },
                ]
              : detailAcomptesEmission,
          );

    addFacture(
      {
        numero,
        type:
          mode === "proforma"
            ? "proforma"
            : acomptePayeNum > 0
              ? "solde"
              : "standard",
        clientId: form.clientId,
        pointDeVenteId: form.pointDeVenteId,
        date: new Date(`${form.date}T12:00:00`).toISOString(),
        echeance: new Date(`${form.echeance}T12:00:00`).toISOString(),
        statut,
        montantPaye: paye,
        tauxTVA: parametres.tauxTVA,
        conditionsPaiement: parametres.conditionsPaiementDefaut,
        note: form.note.trim() || undefined,
        remiseGlobale: remiseGlobale > 0 ? remiseGlobale : undefined,
        commandeId: form.commandeId || undefined,
        devisId: form.devisId || undefined,
        dateValidation:
          mode === "validee" ? new Date().toISOString() : undefined,
        acomptesDocument,
        lignes: lignes.map((l, i) => ({
          id: `nl-${i}`,
          type: l.type ?? "produit",
          produitId: l.produitId,
          codeProduit: l.codeProduit,
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          unite: l.unite,
          tauxTVA: l.tauxTVA,
          remisePercent: l.remisePercent,
          commentaire: l.commentaire,
        })),
      },
      {
        action:
          mode === "proforma"
            ? "facture_proforma"
            : mode === "brouillon"
              ? "facture_brouillon"
              : "facture_validee",
        detail: `Mode ${mode}`,
      },
    );
    resetForm();
    setOpen(true);
    if (mode === "validee") {
      alert(`Facture ${numero} validée (série fiscale).`);
    } else if (mode === "proforma") {
      alert(`Proforma ${numero} enregistrée (hors série fiscale).`);
    }
  }

  function confirmerEmission(e: FormEvent) {
    e.preventDefault();
    enregistrerDocument("validee");
  }

  const commandesClient = commandes.filter(
    (c) => c.clientId === form.clientId && c.statut !== "annulee",
  );
  const devisClient = devis.filter(
    (d) => d.clientId === form.clientId && d.statut !== "refuse",
  );

  const totauxAvecAcompte = {
    ...totauxDraft,
    acomptesTTC: Math.min(acomptePayeNum, totauxDraft.totalTTC),
    netAPayer: resteAPayerDraft,
  };

  return (
    <div>
      <PageHeader
        title="Nouvelle facture"
        description="Saisie, prévalidation, brouillon / proforma / validation fiscale — numérotation FAC-AAAA-PDV-SEQ et mentions NIF/STAT/TVA (MG)."
        actions={
          !open ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nouvelle facture
            </button>
          ) : undefined
        }
      />

      <FacturesSubnav />

      {open && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">
              Nouvelle facture
            </h2>
            <div className="flex gap-2 text-xs">
              <span
                className={`badge ${etape === "saisie" ? "badge-sea" : "badge-sand"}`}
              >
                1. Saisie
              </span>
              <span
                className={`badge ${etape === "prevalidation" ? "badge-sea" : "badge-sand"}`}
              >
                2. Prévalidation
              </span>
            </div>
          </div>

          {etape === "saisie" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-xs font-semibold text-muted">
                  Client
                  <select
                    className="select mt-1"
                    value={form.clientId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        clientId: e.target.value,
                        commandeId: "",
                        devisId: "",
                      })
                    }
                    required
                  >
                    {clients
                      .filter((c) => c.actif)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Point de vente
                  <select
                    className="select mt-1"
                    value={form.pointDeVenteId}
                    onChange={(e) =>
                      setForm({ ...form, pointDeVenteId: e.target.value })
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
                  Commande liée (acomptes)
                  <select
                    className="select mt-1"
                    value={form.commandeId}
                    onChange={(e) =>
                      setForm({ ...form, commandeId: e.target.value })
                    }
                  >
                    <option value="">— Aucune —</option>
                    {commandesClient.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numero}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Devis lié
                  <select
                    className="select mt-1"
                    value={form.devisId}
                    onChange={(e) =>
                      setForm({ ...form, devisId: e.target.value })
                    }
                  >
                    <option value="">— Aucun —</option>
                    {devisClient.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.numero}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Date
                  <input
                    type="date"
                    className="input mt-1"
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Échéance
                  <input
                    type="date"
                    className="input mt-1"
                    value={form.echeance}
                    onChange={(e) =>
                      setForm({ ...form, echeance: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="rounded-lg border border-line p-3">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-sea-700">
                      Catalogue produits
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Cochez les articles à facturer — ils apparaissent dans la
                      liste ci-dessous pour saisir quantité, remise, etc.
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    {produitsSelectionnesIds.size} sélectionné
                    {produitsSelectionnesIds.size > 1 ? "s" : ""} ·{" "}
                    {catalogueFiltre.length} affiché
                    {catalogueFiltre.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`btn ${filtreFamille === "" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setFiltreFamille("")}
                  >
                    Toutes les familles
                  </button>
                  {categoriesActives.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`btn ${filtreFamille === c.id ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setFiltreFamille(c.id)}
                    >
                      {c.libelle}
                    </button>
                  ))}
                </div>

                <label className="mb-3 block text-xs font-semibold text-muted">
                  Recherche
                  <input
                    className="input mt-1"
                    placeholder="Code, libellé…"
                    value={rechercheProduit}
                    onChange={(e) => setRechercheProduit(e.target.value)}
                  />
                </label>

                <div className="table-shell max-h-[320px] overflow-auto">
                  <table className="data">
                    <thead className="sticky top-0 z-10 bg-card">
                      <tr>
                        <th className="w-10">
                          <span className="sr-only">Sélection</span>
                        </th>
                        <th>Code</th>
                        <th>Désignation</th>
                        <th>Famille</th>
                        <th>Stock</th>
                        <th>Unité</th>
                        <th>P.U. HT</th>
                        {avecTVA && <th>TVA</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {catalogueFiltre.length === 0 ? (
                        <tr>
                          <td colSpan={avecTVA ? 8 : 7} className="text-muted">
                            Aucun produit pour ce filtre.
                          </td>
                        </tr>
                      ) : (
                        catalogueFiltre.map((p) => {
                          const checked = produitsSelectionnesIds.has(p.id);
                          const stock = stockDisponible(
                            p.id,
                            form.pointDeVenteId,
                            entrees,
                            ventes,
                          );
                          const restant = stockRestantPourSaisie(
                            p.id,
                            form.pointDeVenteId,
                            entrees,
                            ventes,
                            lignes,
                          );
                          const indispo = !checked && restant <= 0;
                          const prix = resolvePrixVenteHT(p, {
                            clientId: form.clientId,
                            quantite: 1,
                            tarifsClients,
                          });
                          return (
                            <tr
                              key={p.id}
                              className={
                                checked
                                  ? "bg-sea-50/60"
                                  : indispo
                                    ? "opacity-55"
                                    : undefined
                              }
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-sea-700"
                                  checked={checked}
                                  disabled={indispo}
                                  onChange={(e) =>
                                    toggleProduitSurFacture(
                                      p.id,
                                      e.target.checked,
                                    )
                                  }
                                  aria-label={`Sélectionner ${p.libelleCourt}`}
                                  title={
                                    indispo
                                      ? "Produit indisponible en stock"
                                      : undefined
                                  }
                                />
                              </td>
                              <td className="font-mono text-xs">{p.code}</td>
                              <td>
                                <p className="font-medium">{p.libelleCourt}</p>
                                {p.libelleLong &&
                                  p.libelleLong !== p.libelleCourt && (
                                    <p className="text-xs text-muted">
                                      {p.libelleLong}
                                    </p>
                                  )}
                                {indispo && (
                                  <p className="text-xs font-medium text-danger">
                                    Rupture de stock
                                  </p>
                                )}
                              </td>
                              <td className="text-sm">
                                {libelleFamille(p.categorieId)}
                              </td>
                              <td
                                className={`font-semibold tabular-nums ${
                                  stock <= 0 ? "text-danger" : ""
                                }`}
                              >
                                {formatNumber(stock)}
                              </td>
                              <td>{p.unite}</td>
                              <td className="font-semibold">
                                {formatCurrency(prix)}
                              </td>
                              {avecTVA && (
                                <td className="text-sm text-muted">
                                  {`${formatNumber(p.tauxTVA)} %`}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {stockError && (
                  <p className="mt-2 text-xs font-medium text-danger">
                    {stockError}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => addLigneSpeciale("sous_total")}
                  >
                    <Sigma className="h-4 w-4" />
                    Sous-total
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => addLigneSpeciale("blanche")}
                  >
                    <Minus className="h-4 w-4" />
                    Ligne blanche
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    className="input min-w-[220px] flex-1"
                    placeholder="Commentaire sur les lignes…"
                    value={form.commentaireLibre}
                    onChange={(e) =>
                      setForm({ ...form, commentaireLibre: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => addLigneSpeciale("commentaire")}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Insérer commentaire
                  </button>
                </div>
              </div>

              <div className="table-shell">
                <p className="border-b border-line px-4 py-2 text-xs text-muted">
                  Lignes de la facture — ajustez quantité, prix, remise.
                  Glissez-déposez (poignée{" "}
                  <GripVertical className="inline h-3 w-3" />) pour réordonner.
                </p>
                <table className="data">
                  <thead>
                    <tr>
                      <th className="w-8" />
                      <th>Ligne</th>
                      <th>Qté</th>
                      <th>P.U. HT</th>
                      <th>Remise</th>
                      <th>Montant HT</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-muted">
                          Aucune ligne. Cochez des produits dans le catalogue
                          ci-dessus.
                        </td>
                      </tr>
                    ) : (
                      lignes.map((l) => {
                        const type = l.type ?? "produit";
                        const rowClass = [
                          "transition-colors",
                          dragKey === l.key ? "opacity-50" : "",
                          dropKey === l.key
                            ? "outline outline-2 outline-sea-500 outline-offset-[-2px]"
                            : "",
                          type === "blanche" ? "bg-slate-50" : "",
                          type === "sous_total" ? "bg-sea-50/70 font-semibold" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        const handle = (
                          <td className="w-8 !px-1">
                            <button
                              type="button"
                              draggable
                              onDragStart={(e) => onDragStart(e, l.key)}
                              onDragEnd={onDragEnd}
                              className="cursor-grab touch-none rounded p-1 text-muted hover:bg-sea-100 active:cursor-grabbing"
                              title="Glisser pour déplacer"
                              aria-label="Déplacer la ligne"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          </td>
                        );

                        const dropProps = {
                          onDragOver: (e: DragEvent) => onDragOver(e, l.key),
                          onDrop: () => onDrop(l.key),
                        };

                        if (type === "blanche") {
                          return (
                            <tr key={l.key} className={rowClass} {...dropProps}>
                              {handle}
                              <td colSpan={5} className="text-xs italic text-muted">
                                — Ligne blanche —
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => removeLigne(l.key)}
                                >
                                  <Trash2 className="h-4 w-4 text-danger" />
                                </button>
                              </td>
                            </tr>
                          );
                        }
                        if (type === "commentaire") {
                          return (
                            <tr key={l.key} className={rowClass} {...dropProps}>
                              {handle}
                              <td colSpan={5}>
                                <input
                                  className="input italic"
                                  value={l.designation}
                                  onChange={(e) =>
                                    updateLigne(l.key, {
                                      designation: e.target.value,
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => removeLigne(l.key)}
                                >
                                  <Trash2 className="h-4 w-4 text-danger" />
                                </button>
                              </td>
                            </tr>
                          );
                        }
                        if (type === "sous_total") {
                          return (
                            <tr key={l.key} className={rowClass} {...dropProps}>
                              {handle}
                              <td colSpan={4}>{l.designation}</td>
                              <td>{formatCurrency(l.prixUnitaire)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => removeLigne(l.key)}
                                >
                                  <Trash2 className="h-4 w-4 text-danger" />
                                </button>
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={l.key} className={rowClass} {...dropProps}>
                            {handle}
                            <td>
                              {l.codeProduit && (
                                <p className="font-mono text-[11px] text-muted">
                                  {l.codeProduit}
                                </p>
                              )}
                              <p className="font-medium">{l.designation}</p>
                              <p className="text-xs text-muted">
                                Unité : {l.unite || "—"}
                                {l.produitId && (
                                  <>
                                    {" "}
                                    · Stock :{" "}
                                    {formatNumber(
                                      stockDisponible(
                                        l.produitId,
                                        form.pointDeVenteId,
                                        entrees,
                                        ventes,
                                      ),
                                    )}{" "}
                                    {l.unite}
                                  </>
                                )}
                              </p>
                              <input
                                className="input mt-1 text-xs"
                                placeholder="Commentaire ligne"
                                value={l.commentaire ?? ""}
                                onChange={(e) =>
                                  updateLigne(l.key, {
                                    commentaire: e.target.value || undefined,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="input w-20"
                                min={0}
                                max={
                                  l.produitId
                                    ? stockRestantPourSaisie(
                                        l.produitId,
                                        form.pointDeVenteId,
                                        entrees,
                                        ventes,
                                        lignes,
                                        l.key,
                                      )
                                    : undefined
                                }
                                value={l.quantite}
                                onChange={(e) =>
                                  updateLigne(l.key, {
                                    quantite: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="input w-28"
                                value={l.prixUnitaire}
                                onChange={(e) =>
                                  updateLigne(l.key, {
                                    prixUnitaire: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="input w-16"
                                value={l.remisePercent ?? 0}
                                onChange={(e) =>
                                  updateLigne(l.key, {
                                    remisePercent:
                                      Number(e.target.value) || undefined,
                                  })
                                }
                              />
                              <span className="ml-1 text-xs text-muted">%</span>
                            </td>
                            <td className="font-semibold">
                              {formatCurrency(
                                montantLigneHT({ ...l, id: l.key }),
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => removeLigne(l.key)}
                              >
                                <Trash2 className="h-4 w-4 text-danger" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-muted">
                  Remise globale HT (Ar)
                  <input
                    type="number"
                    min={0}
                    className="input mt-1"
                    value={form.remiseGlobale}
                    onChange={(e) =>
                      setForm({ ...form, remiseGlobale: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Commentaire général
                  <input
                    className="input mt-1"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Mention libre sur la facture"
                  />
                </label>
              </div>

              <div className="rounded-lg border border-line bg-sea-50/40 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-sea-700">
                  Paiement à l&apos;émission
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-muted">
                    Acompte / montant payé (Ar)
                    <input
                      type="number"
                      min={0}
                      className="input mt-1"
                      value={form.acomptePaye}
                      onChange={(e) =>
                        setForm({ ...form, acomptePaye: e.target.value })
                      }
                    />
                    {acomptesLies.length > 0 && (
                      <span className="mt-1 block text-[11px] text-muted">
                        Acomptes liés :{" "}
                        {formatCurrency(acomptesTTC)} (
                        {acomptesLies.map((a) => a.numero).join(", ")})
                      </span>
                    )}
                  </label>
                  <div className="rounded-lg bg-card px-3 py-2">
                    <p className="text-[11px] text-muted">Reste à payer</p>
                    <p
                      className={`font-display text-lg font-semibold ${
                        resteAPayerDraft > 0 ? "text-coral" : "text-success"
                      }`}
                    >
                      {formatCurrency(resteAPayerDraft)}
                    </p>
                    <p className="text-[11px] text-muted">
                      Total TTC {formatCurrency(totauxDraft.totalTTC)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={allerPrevalidation}
                  disabled={!lignes.some((l) => isLigneProduit(l))}
                >
                  Prévalider
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={confirmerEmission} className="grid gap-5">
              <div className="rounded-lg border border-sea-200 bg-sea-50/50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-sea-700">
                  Synthèse avant émission
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg bg-card px-3 py-2">
                    <p className="text-[11px] text-muted">
                      {avecTVA ? "Montant HT" : "Montant"}
                    </p>
                    <p className="font-display text-lg font-semibold">
                      {formatCurrency(totauxDraft.totalHT)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-card px-3 py-2">
                    <p className="text-[11px] text-muted">Total remise</p>
                    <p className="font-display text-lg font-semibold">
                      {formatCurrency(totauxDraft.totalRemise)}
                    </p>
                  </div>
                  {avecTVA && (
                    <div className="rounded-lg bg-card px-3 py-2">
                      <p className="text-[11px] text-muted">Total TVA</p>
                      <p className="font-display text-lg font-semibold">
                        {formatCurrency(totauxDraft.montantTVA)}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg bg-card px-3 py-2">
                    <p className="text-[11px] text-muted">Acompte(s) payé(s)</p>
                    <input
                      type="number"
                      min={0}
                      className="input mt-1"
                      value={form.acomptePaye}
                      onChange={(e) =>
                        setForm({ ...form, acomptePaye: e.target.value })
                      }
                    />
                    {acomptesLies.length > 0 && (
                      <p className="mt-1 text-[11px] text-muted">
                        Liés : {acomptesLies.map((a) => a.numero).join(", ")}
                      </p>
                    )}
                  </div>
                  {avecTVA && (
                    <div className="rounded-lg bg-card px-3 py-2">
                      <p className="text-[11px] text-muted">Total TTC</p>
                      <p className="font-display text-lg font-semibold">
                        {formatCurrency(totauxDraft.totalTTC)}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg bg-sea-800 px-3 py-2 text-white">
                    <p className="text-[11px] text-sea-200">Reste à payer</p>
                    <p className="font-display text-lg font-semibold">
                      {formatCurrency(resteAPayerDraft)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
                  Détail des lignes
                </p>
                <div className="table-shell">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Désignation</th>
                        <th>Qté</th>
                        <th>P.U. HT</th>
                        <th>Remise</th>
                        <th>Montant HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((l) => {
                        const type = l.type ?? "produit";
                        if (type === "blanche") {
                          return (
                            <tr key={l.key}>
                              <td colSpan={5} className="h-5" />
                            </tr>
                          );
                        }
                        if (type === "commentaire") {
                          return (
                            <tr key={l.key}>
                              <td colSpan={5} className="italic text-muted">
                                {l.designation}
                              </td>
                            </tr>
                          );
                        }
                        if (type === "sous_total") {
                          return (
                            <tr key={l.key} className="bg-sea-50/70 font-semibold">
                              <td colSpan={4}>{l.designation}</td>
                              <td>{formatCurrency(l.prixUnitaire)}</td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={l.key}>
                            <td>
                              <span className="font-medium">{l.designation}</span>
                              {l.commentaire && (
                                <span className="mt-0.5 block text-xs italic text-muted">
                                  {l.commentaire}
                                </span>
                              )}
                            </td>
                            <td>
                              {formatNumber(l.quantite)} {l.unite}
                            </td>
                            <td>{formatCurrency(l.prixUnitaire)}</td>
                            <td>
                              {l.remisePercent
                                ? `${l.remisePercent} %`
                                : "—"}
                            </td>
                            <td className="font-semibold">
                              {formatCurrency(
                                montantLigneHT({ ...l, id: l.key }),
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {form.note && (
                <p className="rounded-lg border border-line bg-card px-3 py-2 text-sm">
                  <AlignLeft className="mr-1 inline h-3.5 w-3.5" />
                  <strong>Commentaire général :</strong> {form.note}
                </p>
              )}

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-sea-700">
                    Prévisualisation PDF (obligatoire avant enregistrement)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => window.print()}
                    >
                      <FileText className="h-4 w-4" />
                      Imprimer / PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPreviewDraft(true)}
                    >
                      Plein écran
                    </button>
                  </div>
                </div>
                <p className="mb-3 text-xs text-muted">
                  Aperçu provisoire — non enregistré ({numeroProvisoire})
                </p>
                <DocumentPreview
                  type="facture"
                  factureType={acomptePayeNum > 0 ? "solde" : "standard"}
                  numero={numeroProvisoire}
                  date={new Date(`${form.date}T12:00:00`).toISOString()}
                  echeance={new Date(`${form.echeance}T12:00:00`).toISOString()}
                  client={clients.find((c) => c.id === form.clientId)}
                  pdv={pointsDeVente.find((p) => p.id === form.pointDeVenteId)}
                  parametres={parametres}
                  modele={modele}
                  lignes={lignesDraftDoc}
                  totaux={totauxAvecAcompte}
                  conditionsPaiement={parametres.conditionsPaiementDefaut}
                  note={form.note.trim() || undefined}
                  referenceDevis={
                    devis.find((d) => d.id === form.devisId)?.numero
                  }
                  referenceCommande={
                    commandes.find((c) => c.id === form.commandeId)?.numero
                  }
                  acomptesDetail={
                    acomptePayeNum > 0
                      ? [
                          ...acomptesLies.map((a) => ({
                            numero: a.numero,
                            date: a.date,
                            montant: a.montantTTC,
                            mode: a.modePaiement,
                          })),
                          ...(acomptePayeNum > acomptesTTC
                            ? [
                                {
                                  numero: "À l'émission",
                                  date: new Date(
                                    `${form.date}T12:00:00`,
                                  ).toISOString(),
                                  montant: acomptePayeNum - acomptesTTC,
                                },
                              ]
                            : []),
                        ]
                      : []
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary">
                  Valider &amp; émettre (série FAC)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => enregistrerDocument("proforma")}
                >
                  Enregistrer proforma
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => enregistrerDocument("brouillon")}
                >
                  Sauver brouillon
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEtape("saisie")}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!open && (
        <p className="mb-4 text-sm text-muted">
          Consultez le suivi des paiements dans{" "}
          <Link
            href="/factures/liste"
            className="font-semibold text-sea-700 underline"
          >
            Liste des factures
          </Link>
          .
        </p>
      )}

      {previewDraft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
          <div className="my-6 w-full max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-white/90">
                Aperçu provisoire — non enregistré ({numeroProvisoire})
              </p>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => window.print()}
                >
                  Imprimer / PDF
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPreviewDraft(false)}
                >
                  Fermer
                </button>
              </div>
            </div>
            <DocumentPreview
              type="facture"
              factureType={acomptePayeNum > 0 ? "solde" : "standard"}
              numero={numeroProvisoire}
              date={new Date(`${form.date}T12:00:00`).toISOString()}
              echeance={new Date(`${form.echeance}T12:00:00`).toISOString()}
              client={clients.find((c) => c.id === form.clientId)}
              pdv={pointsDeVente.find((p) => p.id === form.pointDeVenteId)}
              parametres={parametres}
              modele={modele}
              lignes={lignesDraftDoc}
              totaux={totauxAvecAcompte}
              conditionsPaiement={parametres.conditionsPaiementDefaut}
              note={form.note.trim() || undefined}
              referenceDevis={
                devis.find((d) => d.id === form.devisId)?.numero
              }
              referenceCommande={
                commandes.find((c) => c.id === form.commandeId)?.numero
              }
              acomptesDetail={
                acomptePayeNum > 0
                  ? [
                      ...acomptesLies.map((a) => ({
                        numero: a.numero,
                        date: a.date,
                        montant: a.montantTTC,
                        mode: a.modePaiement,
                      })),
                      ...(acomptePayeNum > acomptesTTC
                        ? [
                            {
                              numero: "À l'émission",
                              date: new Date(
                                `${form.date}T12:00:00`,
                              ).toISOString(),
                              montant: acomptePayeNum - acomptesTTC,
                            },
                          ]
                        : []),
                    ]
                  : []
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
