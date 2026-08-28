"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  ClipboardCheck,
  Info,
  PackagePlus,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
  Undo2,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { InfoButton } from "@/components/info-button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  MODES_PAIEMENT_ACHAT,
  STATUT_ACHAT_LABELS,
  STATUT_LIVRAISON_LABELS,
  STATUT_PAIEMENT_LABELS,
  nextNumeroAchat,
  quantiteLivreeProduit,
  quantiteRetourneeProduit,
  reliquatProduit,
  reliquatTotal,
  soldeAchat,
  statutLivraisonAchat,
  statutLivraisonRecord,
  statutPaiementAchat,
  totalPaye,
  totauxAchat,
  totauxAvoir,
  ttcAvoirsValides,
} from "@/lib/achats";
import { MODES_PAIEMENT } from "@/lib/commercial";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import { createId } from "@/lib/id";
import { libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";
import type {
  Achat,
  AchatLigne,
  AvoirAchatLigne,
  LivraisonAchatLigne,
  ModePaiement,
} from "@/lib/types";

const AUJOURD_HUI = jourLocalISO();

type Onglet = "commande" | "livraisons" | "paiements" | "retours";

function badgeLivraison(statut: string) {
  if (statut === "livree") return "badge-success";
  if (statut === "partielle") return "badge-sand";
  if (statut === "annulee") return "badge-danger";
  return "badge-sea";
}

function badgePaiement(statut: string) {
  if (statut === "paye") return "badge-success";
  if (statut === "partiel") return "badge-sand";
  return "badge-danger";
}

export default function AchatsPage() {
  const {
    achats,
    fournisseurs,
    produits,
    pointsDeVente,
    pointDeVenteActifId,
    parametres,
    addAchat,
  } = useStore();

  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [creer, setCreer] = useState(false);
  const [filtreFrn, setFiltreFrn] = useState("");
  const [filtreProduit, setFiltreProduit] = useState("");
  const [form, setForm] = useState({
    fournisseurId: "",
    pointDeVenteId: "",
    date: AUJOURD_HUI,
    echeance: "",
  });

  const achatSelectionne = achats.find((a) => a.id === selectionId);

  const nomPdv = (id: string) =>
    pointsDeVente.find((p) => p.id === id)?.nom ?? "Point de vente";
  const nomFrn = (id: string) =>
    fournisseurs.find((f) => f.id === id)?.nom ?? "Fournisseur";

  const visibles = useMemo(() => {
    return [...achats]
      .filter(
        (a) =>
          pointDeVenteActifId === "tous" ||
          a.pointDeVenteId === pointDeVenteActifId,
      )
      .filter((a) => !filtreFrn || a.fournisseurId === filtreFrn)
      .filter(
        (a) =>
          !filtreProduit || a.lignes.some((l) => l.produitId === filtreProduit),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [achats, pointDeVenteActifId, filtreFrn, filtreProduit]);

  const stats = useMemo(() => {
    const valides = visibles.filter((a) => a.statut === "valide");
    const ht = valides.reduce((s, a) => s + totauxAchat(a).ht, 0);
    const solde = valides.reduce((s, a) => s + soldeAchat(a), 0);
    const reliquat = valides.reduce((s, a) => s + reliquatTotal(a), 0);
    return { n: visibles.length, ht, solde, reliquat };
  }, [visibles]);

  const lancerCreation = () => {
    const pdv =
      form.pointDeVenteId ||
      (pointDeVenteActifId !== "tous" ? pointDeVenteActifId : "");
    if (!form.fournisseurId || !pdv) {
      alert("Choisissez un fournisseur et un point de vente.");
      return;
    }
    const id = addAchat({
      numero: nextNumeroAchat(achats),
      fournisseurId: form.fournisseurId,
      pointDeVenteId: pdv,
      date: isoMidiDepuisJour(form.date),
      echeance: form.echeance
        ? isoMidiDepuisJour(form.echeance)
        : undefined,
      statut: "brouillon",
      tauxTVA: parametres.assujettiTVA ? parametres.tauxTVA : 0,
      lignes: [],
      note: undefined,
    });
    setCreer(false);
    setSelectionId(id);
  };

  if (achatSelectionne) {
    return (
      <AchatEditor
        key={achatSelectionne.id}
        achat={achatSelectionne}
        nomPdv={nomPdv(achatSelectionne.pointDeVenteId)}
        nomFrn={nomFrn(achatSelectionne.fournisseurId)}
        onBack={() => setSelectionId(null)}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Achats"
        description="Commandes fournisseurs, livraisons (entrées de stock), paiements et retours."
        actions={
          <div className="flex items-center gap-2">
            <InfoButton title="Cycle achats fournisseurs">
              <p>
                Les <strong>entrées de stock</strong> ne se saisissent plus
                séparément : elles sont générées par chaque{" "}
                <strong>livraison</strong> d&apos;un achat validé, avec
                recalcul immédiat du CUMP.
              </p>
              <p>
                Les ventes déjà <strong>validées / clôturées</strong> conservent
                leur coût d&apos;origine. Seul le stock restant et les ventes
                non clôturées sont recalculés.
              </p>
              <p>
                Un achat validé alimente le poste{" "}
                <strong>Achats de marchandises</strong> (PCG 2005) pour le
                montant <strong>HT net des avoirs</strong>.
              </p>
            </InfoButton>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  pointDeVenteId:
                    pointDeVenteActifId !== "tous" ? pointDeVenteActifId : f.pointDeVenteId,
                  fournisseurId: f.fournisseurId || fournisseurs.find((x) => x.actif)?.id || "",
                }));
                setCreer(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nouvel achat
            </button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Achats affichés" value={String(stats.n)} />
        <StatCard
          label="Montant HT (validés)"
          value={formatCurrency(stats.ht)}
        />
        <StatCard
          label="Solde dû fournisseurs"
          value={formatCurrency(stats.solde)}
        />
        <StatCard
          label="Reliquat à livrer"
          value={formatNumber(stats.reliquat)}
        />
      </div>

      {creer && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">
            Nouvelle commande fournisseur
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-semibold text-muted">
              Fournisseur
              <select
                className="select mt-1"
                value={form.fournisseurId}
                onChange={(e) =>
                  setForm({ ...form, fournisseurId: e.target.value })
                }
              >
                <option value="">— Choisir —</option>
                {fournisseurs
                  .filter((f) => f.actif)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom}
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
                <option value="">— Choisir —</option>
                {pointsDeVente.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Date de commande
              <input
                type="date"
                className="input mt-1"
                max={AUJOURD_HUI}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Échéance de paiement
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
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn btn-primary" onClick={lancerCreation}>
              Créer le brouillon
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreer(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-xs font-semibold text-muted">
          Fournisseur
          <select
            className="select mt-1 min-w-[12rem]"
            value={filtreFrn}
            onChange={(e) => setFiltreFrn(e.target.value)}
          >
            <option value="">Tous</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Article
          <select
            className="select mt-1 min-w-[12rem]"
            value={filtreProduit}
            onChange={(e) => setFiltreProduit(e.target.value)}
          >
            <option value="">Tous</option>
            {produits.map((p) => (
              <option key={p.id} value={p.id}>
                {libelleProduit(p)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-5 w-5" />}
          title="Aucun achat"
          description="Créez une commande fournisseur, puis enregistrez les livraisons, paiements et retours."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Date</th>
                <th>Fournisseur</th>
                <th>Point de vente</th>
                <th>HT</th>
                <th>Livraison</th>
                <th>Paiement</th>
                <th>Solde</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.map((a) => {
                const tot = totauxAchat(a);
                const liv = statutLivraisonAchat(a);
                const pay = statutPaiementAchat(a);
                return (
                  <tr key={a.id}>
                    <td className="font-medium">{a.numero}</td>
                    <td>{formatDate(a.date)}</td>
                    <td>{nomFrn(a.fournisseurId)}</td>
                    <td>{nomPdv(a.pointDeVenteId)}</td>
                    <td>{formatCurrency(tot.ht)}</td>
                    <td>
                      <span className={`badge ${badgeLivraison(liv)}`}>
                        {STATUT_LIVRAISON_LABELS[liv]}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${badgePaiement(pay)}`}>
                        {STATUT_PAIEMENT_LABELS[pay]}
                      </span>
                    </td>
                    <td className="font-semibold">
                      {formatCurrency(soldeAchat(a))}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setSelectionId(a.id)}
                      >
                        Ouvrir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AchatEditor({
  achat,
  nomPdv,
  nomFrn,
  onBack,
}: {
  achat: Achat;
  nomPdv: string;
  nomFrn: string;
  onBack: () => void;
}) {
  const {
    produits,
    updateAchat,
    validerAchat,
    annulerAchat,
    deleteAchat,
    ajouterLivraisonAchat,
    confirmerLivraisonAchat,
    annulerLivraisonAchat,
    ajouterPaiementAchat,
    supprimerPaiementAchat,
    ajouterAvoirAchat,
    validerAvoirAchat,
    supprimerAvoirAchat,
  } = useStore();

  const [onglet, setOnglet] = useState<Onglet>("commande");
  const [lignes, setLignes] = useState<AchatLigne[]>(achat.lignes);
  const [note, setNote] = useState(achat.note ?? "");
  const [echeance, setEcheance] = useState(
    achat.echeance ? achat.echeance.slice(0, 10) : "",
  );
  const brouillon = achat.statut === "brouillon";
  const tot = totauxAchat({ ...achat, lignes });
  const solde = soldeAchat(achat);
  const paye = totalPaye(achat);
  const livGlobale = statutLivraisonAchat(achat);
  const payGlobale = statutPaiementAchat(achat);

  const nomProduit = (id: string) => {
    const p = produits.find((x) => x.id === id);
    return p ? libelleProduit(p) : "Produit";
  };
  const unite = (id: string) =>
    produits.find((x) => x.id === id)?.unite ?? "";

  const enregistrerCommande = () => {
    const res = updateAchat(
      achat.id,
      brouillon
        ? {
            lignes,
            note: note.trim() || undefined,
            echeance: echeance ? isoMidiDepuisJour(echeance) : undefined,
          }
        : {
            note: note.trim() || undefined,
            echeance: echeance ? isoMidiDepuisJour(echeance) : undefined,
          },
    );
    if (!res.ok) alert(res.reason);
  };

  const valider = () => {
    const save = updateAchat(achat.id, {
      lignes,
      note: note.trim() || undefined,
      echeance: echeance ? isoMidiDepuisJour(echeance) : undefined,
    });
    if (!save.ok) {
      alert(save.reason);
      return;
    }
    const res = validerAchat(achat.id);
    if (!res.ok) alert(res.reason);
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux achats
      </button>

      <PageHeader
        title={achat.numero}
        description={`${nomFrn} — ${nomPdv}`}
        showPosSelector={false}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`badge ${
                achat.statut === "valide"
                  ? "badge-success"
                  : achat.statut === "annule"
                    ? "badge-danger"
                    : "badge-sand"
              }`}
            >
              {STATUT_ACHAT_LABELS[achat.statut]}
            </span>
            {brouillon && (
              <>
                <button type="button" className="btn btn-secondary" onClick={enregistrerCommande}>
                  Enregistrer
                </button>
                <button type="button" className="btn btn-primary" onClick={valider}>
                  <ClipboardCheck className="h-4 w-4" />
                  Valider la commande
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!confirm("Supprimer ce brouillon ?")) return;
                    const res = deleteAchat(achat.id);
                    if (!res.ok) alert(res.reason);
                    else onBack();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            {achat.statut === "valide" && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (!confirm("Annuler cet achat ?")) return;
                  const res = annulerAchat(achat.id);
                  if (!res.ok) alert(res.reason);
                }}
              >
                Annuler l&apos;achat
              </button>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total HT" value={formatCurrency(tot.ht)} hint={`TTC ${formatCurrency(tot.ttc)}`} />
        <StatCard
          label="Livraison"
          value={STATUT_LIVRAISON_LABELS[livGlobale]}
          hint={`Reliquat ${formatNumber(reliquatTotal(achat))}`}
        />
        <StatCard
          label="Payé"
          value={formatCurrency(paye)}
          hint={STATUT_PAIEMENT_LABELS[payGlobale]}
        />
        <StatCard label="Solde restant" value={formatCurrency(solde)} />
      </div>

      <nav className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["commande", "Commande", ShoppingCart],
            ["livraisons", "Livraisons", Truck],
            ["paiements", "Paiements", Banknote],
            ["retours", "Avoirs / retours", Undo2],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={`btn ${onglet === id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setOnglet(id)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {onglet === "commande" && (
        <CommandePanel
          achat={achat}
          lignes={lignes}
          setLignes={setLignes}
          note={note}
          setNote={setNote}
          echeance={echeance}
          setEcheance={setEcheance}
          brouillon={brouillon}
          nomProduit={nomProduit}
          unite={unite}
          tot={tot}
          onSave={enregistrerCommande}
        />
      )}
      {onglet === "livraisons" && (
        <LivraisonsPanel
          achat={achat}
          nomProduit={nomProduit}
          unite={unite}
          onAjouter={(payload) => {
            const res = ajouterLivraisonAchat(achat.id, payload);
            if (!res.ok) alert(res.reason);
          }}
          onConfirmer={(livId, lignesLiv) => {
            const res = confirmerLivraisonAchat(achat.id, livId, lignesLiv);
            if (!res.ok) alert(res.reason);
          }}
          onAnnuler={(livId) => {
            if (!confirm("Annuler cette livraison ? Le stock sera retiré.")) return;
            const res = annulerLivraisonAchat(achat.id, livId);
            if (!res.ok) alert(res.reason);
          }}
        />
      )}
      {onglet === "paiements" && (
        <PaiementsPanel
          achat={achat}
          onAjouter={(payload) => {
            const res = ajouterPaiementAchat(achat.id, payload);
            if (!res.ok) alert(res.reason);
          }}
          onSupprimer={(pid) => {
            if (!confirm("Supprimer ce paiement ?")) return;
            const res = supprimerPaiementAchat(achat.id, pid);
            if (!res.ok) alert(res.reason);
          }}
        />
      )}
      {onglet === "retours" && (
        <RetoursPanel
          achat={achat}
          nomProduit={nomProduit}
          unite={unite}
          onAjouter={(payload) => {
            const res = ajouterAvoirAchat(achat.id, payload);
            if (!res.ok) alert(res.reason);
          }}
          onValider={(id) => {
            const res = validerAvoirAchat(achat.id, id);
            if (!res.ok) alert(res.reason);
          }}
          onSupprimer={(id) => {
            if (!confirm("Supprimer cet avoir ?")) return;
            const res = supprimerAvoirAchat(achat.id, id);
            if (!res.ok) alert(res.reason);
          }}
        />
      )}
    </div>
  );
}

function CommandePanel({
  achat,
  lignes,
  setLignes,
  note,
  setNote,
  echeance,
  setEcheance,
  brouillon,
  nomProduit,
  unite,
  tot,
  onSave,
}: {
  achat: Achat;
  lignes: AchatLigne[];
  setLignes: (l: AchatLigne[]) => void;
  note: string;
  setNote: (n: string) => void;
  echeance: string;
  setEcheance: (e: string) => void;
  brouillon: boolean;
  nomProduit: (id: string) => string;
  unite: (id: string) => string;
  tot: { ht: number; tva: number; ttc: number };
  onSave: () => void;
}) {
  const produits = useStore((s) => s.produits);
  const [produitId, setProduitId] = useState(produits[0]?.id ?? "");

  const ajouterLigne = () => {
    if (!produitId) return;
    if (lignes.some((l) => l.produitId === produitId)) {
      alert("Cet article est déjà sur la commande.");
      return;
    }
    const p = produits.find((x) => x.id === produitId);
    setLignes([
      ...lignes,
      {
        id: createId("al"),
        produitId,
        quantite: 1,
        prixAchatUnitaire: p?.prixAchat ?? 0,
      },
    ]);
  };

  return (
    <div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <p className="text-sm text-muted">
          Commande du <strong className="text-ink">{formatDate(achat.date)}</strong>
          {achat.tauxTVA > 0 ? ` · TVA ${achat.tauxTVA} %` : " · HT (sans TVA)"}
        </p>
        <label className="block text-xs font-semibold text-muted">
          Échéance
          <input
            type="date"
            className="input mt-1"
            value={echeance}
            onChange={(e) => setEcheance(e.target.value)}
            disabled={achat.statut === "annule"}
          />
        </label>
      </div>

      {brouillon && (
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="block text-xs font-semibold text-muted">
            Ajouter un article
            <select
              className="select mt-1 min-w-[16rem]"
              value={produitId}
              onChange={(e) => setProduitId(e.target.value)}
            >
              {produits
                .filter((p) => p.actif)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {libelleProduit(p)}
                  </option>
                ))}
            </select>
          </label>
          <button type="button" className="btn btn-secondary" onClick={ajouterLigne}>
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      )}

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Article</th>
              <th>Qté commandée</th>
              <th>PU HT</th>
              <th>Montant HT</th>
              <th>Livré</th>
              <th>Reliquat</th>
              {brouillon && <th />}
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted">
                  Aucun article.
                </td>
              </tr>
            ) : (
              lignes.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">{nomProduit(l.produitId)}</td>
                  <td>
                    {brouillon ? (
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="input w-24"
                        value={l.quantite}
                        onChange={(e) =>
                          setLignes(
                            lignes.map((x) =>
                              x.id === l.id
                                ? { ...x, quantite: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    ) : (
                      `${formatNumber(l.quantite)} ${unite(l.produitId)}`
                    )}
                  </td>
                  <td>
                    {brouillon ? (
                      <input
                        type="number"
                        min="0"
                        step="100"
                        className="input w-32"
                        value={l.prixAchatUnitaire}
                        onChange={(e) =>
                          setLignes(
                            lignes.map((x) =>
                              x.id === l.id
                                ? { ...x, prixAchatUnitaire: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    ) : (
                      formatCurrency(l.prixAchatUnitaire)
                    )}
                  </td>
                  <td>{formatCurrency(l.quantite * l.prixAchatUnitaire)}</td>
                  <td>{formatNumber(quantiteLivreeProduit(achat, l.produitId))}</td>
                  <td>{formatNumber(reliquatProduit({ ...achat, lignes }, l.produitId))}</td>
                  {brouillon && (
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setLignes(lignes.filter((x) => x.id !== l.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-6 text-sm">
        <span>HT {formatCurrency(tot.ht)}</span>
        <span>TVA {formatCurrency(tot.tva)}</span>
        <span className="font-semibold">TTC {formatCurrency(tot.ttc)}</span>
      </div>

      <label className="mt-4 block text-xs font-semibold text-muted">
        Note
        <textarea
          className="input mt-1 min-h-[4rem]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={achat.statut === "annule"}
        />
      </label>

      {achat.statut !== "annule" && (
        <button type="button" className="btn btn-secondary mt-3" onClick={onSave}>
          Enregistrer
        </button>
      )}
    </div>
  );
}

function LivraisonsPanel({
  achat,
  nomProduit,
  unite,
  onAjouter,
  onConfirmer,
  onAnnuler,
}: {
  achat: Achat;
  nomProduit: (id: string) => string;
  unite: (id: string) => string;
  onAjouter: (data: {
    date: string;
    lignes: LivraisonAchatLigne[];
    note?: string;
    confirmer?: boolean;
  }) => void;
  onConfirmer: (id: string, lignes: LivraisonAchatLigne[]) => void;
  onAnnuler: (id: string) => void;
}) {
  const [date, setDate] = useState(AUJOURD_HUI);
  const [confirmer, setConfirmer] = useState(true);
  const [qtys, setQtys] = useState<Record<string, string>>({});

  const lignesForm: LivraisonAchatLigne[] = achat.lignes
    .map((l) => {
      const rel = reliquatProduit(achat, l.produitId);
      const saisie = Number(qtys[l.produitId] ?? String(rel));
      return {
        produitId: l.produitId,
        quantitePrevue: rel,
        quantiteLivree: confirmer ? Math.min(rel, Math.max(0, saisie)) : 0,
      };
    })
    .filter((l) => l.quantitePrevue > 0 || Number(qtys[l.produitId] ?? 0) > 0);

  if (achat.statut !== "valide") {
    return (
      <div className="flex items-start gap-2 rounded-[var(--radius)] border border-line bg-card p-4 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Validez la commande pour enregistrer des livraisons (entrées de stock + CUMP).
      </div>
    );
  }

  return (
    <div>
      {reliquatTotal(achat) > 0 && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <h3 className="mb-3 font-display font-semibold">Nouvelle livraison</h3>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted">
              Date
              <input
                type="date"
                className="input mt-1"
                max={AUJOURD_HUI}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={confirmer}
                onChange={(e) => setConfirmer(e.target.checked)}
              />
              Réceptionner maintenant (entrée de stock)
            </label>
          </div>
          <div className="table-shell">
            <table className="data">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Reliquat</th>
                  <th>Qté cette livraison</th>
                </tr>
              </thead>
              <tbody>
                {achat.lignes.map((l) => {
                  const rel = reliquatProduit(achat, l.produitId);
                  if (rel <= 0) return null;
                  return (
                    <tr key={l.produitId}>
                      <td>{nomProduit(l.produitId)}</td>
                      <td>
                        {formatNumber(rel)} {unite(l.produitId)}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          max={rel}
                          className="input w-28"
                          value={qtys[l.produitId] ?? String(rel)}
                          onChange={(e) =>
                            setQtys({ ...qtys, [l.produitId]: e.target.value })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn btn-primary mt-3"
            onClick={() => {
              if (lignesForm.length === 0) return;
              if (confirmer && !lignesForm.some((l) => l.quantiteLivree > 0)) {
                alert("Saisissez une quantité à réceptionner.");
                return;
              }
              onAjouter({
                date: isoMidiDepuisJour(date),
                lignes: lignesForm,
                confirmer,
              });
              setQtys({});
            }}
          >
            <PackagePlus className="h-4 w-4" />
            {confirmer ? "Enregistrer la réception" : "Planifier la livraison"}
          </button>
        </div>
      )}

      {achat.livraisons.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-5 w-5" />}
          title="Aucune livraison"
          description="Chaque réception partielle est indépendante et génère son entrée de stock."
        />
      ) : (
        <div className="space-y-4">
          {achat.livraisons.map((liv) => {
            const st = statutLivraisonRecord(liv);
            return (
              <div
                key={liv.id}
                className="rounded-[var(--radius)] border border-line bg-card p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {liv.numero} · {formatDate(liv.date)}
                    </p>
                    <span className={`badge ${badgeLivraison(st)}`}>
                      {STATUT_LIVRAISON_LABELS[st]}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {st === "en_attente" && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onConfirmer(liv.id, liv.lignes.map((l) => ({
                          ...l,
                          quantiteLivree: l.quantitePrevue,
                        })))}
                      >
                        Confirmer
                      </button>
                    )}
                    {st !== "annulee" && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onAnnuler(liv.id)}
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Prévu</th>
                      <th>Livré</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liv.lignes.map((l) => (
                      <tr key={l.produitId}>
                        <td>{nomProduit(l.produitId)}</td>
                        <td>{formatNumber(l.quantitePrevue)}</td>
                        <td>{formatNumber(l.quantiteLivree)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaiementsPanel({
  achat,
  onAjouter,
  onSupprimer,
}: {
  achat: Achat;
  onAjouter: (data: {
    date: string;
    montant: number;
    modePaiement: ModePaiement;
    note?: string;
  }) => void;
  onSupprimer: (id: string) => void;
}) {
  const tot = totauxAchat(achat);
  const paye = totalPaye(achat);
  const solde = soldeAchat(achat);
  const [date, setDate] = useState(AUJOURD_HUI);
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState<ModePaiement>("virement");

  if (achat.statut !== "valide") {
    return (
      <div className="flex items-start gap-2 rounded-[var(--radius)] border border-line bg-card p-4 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Validez la commande pour enregistrer des paiements (indépendants des livraisons).
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Montant total TTC</th>
              <th>Payé (cumulé)</th>
              <th>Avoirs TTC</th>
              <th>Solde restant</th>
              <th>Statut</th>
              <th>Échéance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-semibold">{formatCurrency(tot.ttc)}</td>
              <td>{formatCurrency(paye)}</td>
              <td>{formatCurrency(ttcAvoirsValides(achat))}</td>
              <td className="font-semibold">{formatCurrency(solde)}</td>
              <td>
                <span className={`badge ${badgePaiement(statutPaiementAchat(achat))}`}>
                  {STATUT_PAIEMENT_LABELS[statutPaiementAchat(achat)]}
                </span>
              </td>
              <td>{achat.echeance ? formatDate(achat.echeance) : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {solde > 0.5 && (
        <div className="mb-6 grid gap-3 rounded-[var(--radius)] border border-sea-200 bg-card p-5 sm:grid-cols-4">
          <label className="text-xs font-semibold text-muted">
            Date
            <input
              type="date"
              className="input mt-1"
              max={AUJOURD_HUI}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Montant (Ar TTC)
            <input
              type="number"
              min="0"
              className="input mt-1"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Mode
            <select
              className="select mt-1"
              value={mode}
              onChange={(e) => setMode(e.target.value as ModePaiement)}
            >
              {MODES_PAIEMENT_ACHAT.map((m) => (
                <option key={m} value={m}>
                  {MODES_PAIEMENT[m]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const n = Number(montant);
                if (!(n > 0)) return;
                onAjouter({
                  date: isoMidiDepuisJour(date),
                  montant: n,
                  modePaiement: mode,
                });
                setMontant("");
              }}
            >
              Enregistrer le paiement
            </button>
          </div>
        </div>
      )}

      <h3 className="mb-2 font-display font-semibold">Historique des paiements</h3>
      {achat.paiements.length === 0 ? (
        <p className="text-sm text-muted">Aucun paiement.</p>
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Montant</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...achat.paiements]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td>{MODES_PAIEMENT[p.modePaiement] ?? p.modePaiement}</td>
                    <td className="font-semibold">{formatCurrency(p.montant)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onSupprimer(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RetoursPanel({
  achat,
  nomProduit,
  unite,
  onAjouter,
  onValider,
  onSupprimer,
}: {
  achat: Achat;
  nomProduit: (id: string) => string;
  unite: (id: string) => string;
  onAjouter: (data: {
    date: string;
    lignes: AvoirAchatLigne[];
    note?: string;
  }) => void;
  onValider: (id: string) => void;
  onSupprimer: (id: string) => void;
}) {
  const [date, setDate] = useState(AUJOURD_HUI);
  const [qtys, setQtys] = useState<Record<string, string>>({});

  if (achat.statut !== "valide") {
    return (
      <div className="flex items-start gap-2 rounded-[var(--radius)] border border-line bg-card p-4 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Les retours génèrent un avoir déduit du solde dû (pas de remboursement séparé), une sortie de stock et un ajustement du CUMP.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
        <h3 className="mb-2 font-display font-semibold">Nouveau retour</h3>
        <p className="mb-3 text-xs text-muted">
          L&apos;avoir réduit le solde restant à payer. Validation = sortie de
          stock + CUMP.
        </p>
        <label className="mb-3 block text-xs font-semibold text-muted">
          Date
          <input
            type="date"
            className="input mt-1 max-w-xs"
            max={AUJOURD_HUI}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Article</th>
                <th>Encore retournable</th>
                <th>Qté retournée</th>
              </tr>
            </thead>
            <tbody>
              {achat.lignes.map((l) => {
                const dispo =
                  quantiteLivreeProduit(achat, l.produitId) -
                  quantiteRetourneeProduit(achat, l.produitId);
                if (dispo <= 0) return null;
                return (
                  <tr key={l.produitId}>
                    <td>{nomProduit(l.produitId)}</td>
                    <td>
                      {formatNumber(dispo)} {unite(l.produitId)}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        max={dispo}
                        className="input w-28"
                        value={qtys[l.produitId] ?? ""}
                        onChange={(e) =>
                          setQtys({ ...qtys, [l.produitId]: e.target.value })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="btn btn-primary mt-3"
          onClick={() => {
            const lignes: AvoirAchatLigne[] = achat.lignes
              .map((l) => ({
                produitId: l.produitId,
                quantite: Number(qtys[l.produitId] ?? 0),
                prixAchatUnitaire: l.prixAchatUnitaire,
              }))
              .filter((l) => l.quantite > 0);
            if (lignes.length === 0) return;
            onAjouter({ date: isoMidiDepuisJour(date), lignes });
            setQtys({});
          }}
        >
          Créer l&apos;avoir (brouillon)
        </button>
      </div>

      {achat.avoirs.length === 0 ? (
        <p className="text-sm text-muted">Aucun avoir.</p>
      ) : (
        <div className="space-y-4">
          {achat.avoirs.map((av) => {
            const t = totauxAvoir(av, achat.tauxTVA);
            return (
              <div
                key={av.id}
                className="rounded-[var(--radius)] border border-line bg-card p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {av.numero} · {formatDate(av.date)} · HT{" "}
                    {formatCurrency(t.ht)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`badge ${
                        av.statut === "valide" ? "badge-success" : "badge-sand"
                      }`}
                    >
                      {av.statut === "valide" ? "Validé" : "Brouillon"}
                    </span>
                    {av.statut === "brouillon" && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onValider(av.id)}
                      >
                        Valider l&apos;avoir
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onSupprimer(av.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <ul className="text-sm text-muted">
                  {av.lignes.map((l) => (
                    <li key={l.produitId}>
                      {nomProduit(l.produitId)} · {formatNumber(l.quantite)}{" "}
                      {unite(l.produitId)} · {formatCurrency(l.prixAchatUnitaire)} HT
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
