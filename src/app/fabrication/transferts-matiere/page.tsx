"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftRight, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { OF_STATUT_LABELS } from "@/lib/fabrication";
import { formatDate, formatNumber } from "@/lib/format";
import { libelleProduit } from "@/lib/produits";
import {
  matieresReserveesPourOf,
  quantiteReserveeOf,
  TMOF_STATUT_LABELS,
} from "@/lib/repartition-achat-of";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";
import type { TransfertMatiereOfStatut } from "@/lib/types";

function badgeTmof(statut: TransfertMatiereOfStatut) {
  if (statut === "effectue") return "badge-success";
  if (statut === "valide_source") return "badge-sand";
  if (statut === "annule") return "badge-danger";
  return "badge-sea";
}

function TransfertsMatiereOfContent() {
  const searchParams = useSearchParams();
  const ofPreselect = searchParams.get("of") ?? "";
  const {
    transfertsMatiereOf,
    ordresFabrication,
    produits,
    pointsDeVente,
    demanderTransfertMatiereOf,
    validerTransfertMatiereOfSource,
    validerTransfertMatiereOfDestinataire,
    annulerTransfertMatiereOf,
  } = useStore();
  const { rattache, actif } = useSitesVisibles();
  const [creer, setCreer] = useState(Boolean(ofPreselect));

  const nomOf = (id: string) => {
    const of_ = ordresFabrication.find((o) => o.id === id);
    if (!of_) return "OF";
    const p = produits.find((x) => x.id === of_.produitId);
    return `${of_.numero} — ${p ? libelleProduit(p) : of_.produitId}`;
  };
  const nomSite = (id: string) =>
    pointsDeVente.find((s) => s.id === id)?.nom ?? "Site";
  const nomProduit = (id: string) => {
    const p = produits.find((x) => x.id === id);
    return p ? `${p.code} — ${libelleProduit(p)}` : id;
  };

  const liste = useMemo(
    () =>
      [...(transfertsMatiereOf ?? [])]
        .filter((t) => {
          const src = ordresFabrication.find((o) => o.id === t.ofSourceId);
          const dest = ordresFabrication.find((o) => o.id === t.ofDestinataireId);
          const visible =
            (src && rattache(src.atelierId)) ||
            (dest && rattache(dest.atelierId));
          if (!visible) return false;
          if (actif === "tous") return true;
          return src?.atelierId === actif || dest?.atelierId === actif;
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transfertsMatiereOf, ordresFabrication, rattache, actif],
  );

  return (
    <div>
      <PageHeader
        title="Transferts de matière réservée"
        description="Déplacer une quantité réservée d'un OF vers un autre, sans mouvement physique de stock. Effectif seulement après validation de l'OF source puis de l'OF destinataire."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreer(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </button>
        }
      />

      {creer && (
        <FormulaireTransfertMatiereOf
          ofPreselect={ofPreselect}
          onClose={() => setCreer(false)}
          onSubmit={(payload) => {
            const res = demanderTransfertMatiereOf(payload);
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            setCreer(false);
          }}
        />
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Demandes"
          value={String(liste.filter((t) => t.statut === "demande").length)}
        />
        <StatCard
          label="Validés source"
          value={String(liste.filter((t) => t.statut === "valide_source").length)}
        />
        <StatCard
          label="Effectués"
          value={String(liste.filter((t) => t.statut === "effectue").length)}
        />
      </div>

      {liste.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="Aucun transfert matière"
          description="Une quantité réservée à un OF ne peut passer à un autre OF qu'après les deux validations."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>N°</th>
                <th>Date</th>
                <th>Article</th>
                <th>Site</th>
                <th>OF source</th>
                <th>OF destinataire</th>
                <th>Qté</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {liste.map((t) => {
                const src = ordresFabrication.find((o) => o.id === t.ofSourceId);
                const dest = ordresFabrication.find((o) => o.id === t.ofDestinataireId);
                const peutSource = src ? rattache(src.atelierId) : false;
                const peutDest = dest ? rattache(dest.atelierId) : false;
                return (
                  <tr key={t.id}>
                    <td className="font-medium">{t.numero}</td>
                    <td>{formatDate(t.date)}</td>
                    <td>{nomProduit(t.produitId)}</td>
                    <td>{nomSite(t.pointDeVenteId)}</td>
                    <td>
                      <Link href={`/fabrication/${t.ofSourceId}`} className="text-sea-800 hover:underline">
                        {nomOf(t.ofSourceId)}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/fabrication/${t.ofDestinataireId}`}
                        className="text-sea-800 hover:underline"
                      >
                        {nomOf(t.ofDestinataireId)}
                      </Link>
                    </td>
                    <td>{formatNumber(t.quantite)}</td>
                    <td>
                      <span className={`badge ${badgeTmof(t.statut)}`}>
                        {TMOF_STATUT_LABELS[t.statut]}
                      </span>
                      {t.validateurSourceNom && (
                        <p className="mt-1 text-[11px] text-muted">
                          Source : {t.validateurSourceNom}
                        </p>
                      )}
                      {t.validateurDestNom && (
                        <p className="text-[11px] text-muted">
                          Dest. : {t.validateurDestNom}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {t.statut === "demande" && peutSource && (
                        <button
                          type="button"
                          className="btn btn-secondary mr-1"
                          onClick={() => {
                            const res = validerTransfertMatiereOfSource(t.id);
                            if (!res.ok) alert(res.reason);
                          }}
                        >
                          Valider source
                        </button>
                      )}
                      {t.statut === "valide_source" && peutDest && (
                        <button
                          type="button"
                          className="btn btn-primary mr-1"
                          onClick={() => {
                            const res = validerTransfertMatiereOfDestinataire(t.id);
                            if (!res.ok) alert(res.reason);
                          }}
                        >
                          Valider destinataire
                        </button>
                      )}
                      {(t.statut === "demande" || t.statut === "valide_source") &&
                        (peutSource || peutDest) && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => {
                              if (!confirm("Annuler cette demande ?")) return;
                              const res = annulerTransfertMatiereOf(t.id);
                              if (!res.ok) alert(res.reason);
                            }}
                          >
                            Annuler
                          </button>
                        )}
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

function FormulaireTransfertMatiereOf({
  ofPreselect,
  onClose,
  onSubmit,
}: {
  ofPreselect: string;
  onClose: () => void;
  onSubmit: (data: {
    produitId: string;
    pointDeVenteId: string;
    ofSourceId: string;
    ofDestinataireId: string;
    quantite: number;
    note?: string;
  }) => void;
}) {
  const ofs = useStore((s) => s.ordresFabrication);
  const produits = useStore((s) => s.produits);
  const achats = useStore((s) => s.achats);
  const transferts = useStore((s) => s.transfertsMatiereOf ?? []);
  const sites = useStore((s) => s.pointsDeVente);
  const { rattache } = useSitesVisibles();

  const ofsSource = ofs.filter(
    (o) => o.statut !== "annule" && o.statut !== "cloture_annule" && rattache(o.atelierId),
  );
  const ofsDest = ofs.filter((o) => o.statut !== "annule" && o.statut !== "cloture_annule");

  const [ofSourceId, setOfSourceId] = useState(
    ofPreselect && ofsSource.some((o) => o.id === ofPreselect)
      ? ofPreselect
      : (ofsSource[0]?.id ?? ""),
  );
  const [ofDestinataireId, setOfDestinataireId] = useState("");
  const [produitId, setProduitId] = useState("");
  const [pointDeVenteId, setPointDeVenteId] = useState("");
  const [quantite, setQuantite] = useState("");
  const [note, setNote] = useState("");

  const ctxReservation = {
    achats,
    ordresFabrication: ofs,
    transfertsMatiereOf: transferts,
  };
  const reservees = ofSourceId
    ? matieresReserveesPourOf(ofSourceId, ctxReservation)
    : [];

  const ligneChoisie =
    reservees.find(
      (r) => r.produitId === produitId && r.pointDeVenteId === pointDeVenteId,
    ) ?? reservees.find((r) => r.produitId === produitId);

  const reserveMax = ligneChoisie
    ? quantiteReserveeOf(
        ligneChoisie.produitId,
        ligneChoisie.pointDeVenteId,
        ofSourceId,
        ctxReservation,
      )
    : 0;

  function changerSource(id: string) {
    setOfSourceId(id);
    setProduitId("");
    setPointDeVenteId("");
    setQuantite("");
    if (ofDestinataireId === id)     setOfDestinataireId("");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const siteId = ligneChoisie?.pointDeVenteId || pointDeVenteId;
    if (!ofSourceId || !ofDestinataireId || !produitId || !siteId) return;
    onSubmit({
      produitId,
      pointDeVenteId: siteId,
      ofSourceId,
      ofDestinataireId,
      quantite: Number(quantite) || 0,
      note: note.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5"
    >
      <h2 className="mb-3 font-display text-lg font-semibold">Nouvelle demande</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted">
          OF source
          <select
            className="select mt-1"
            value={ofSourceId}
            onChange={(e) => changerSource(e.target.value)}
            required
          >
            <option value="">Choisir…</option>
            {ofsSource.map((o) => {
              const p = produits.find((x) => x.id === o.produitId);
              return (
                <option key={o.id} value={o.id}>
                  {o.numero} — {p ? libelleProduit(p) : o.produitId} (
                  {OF_STATUT_LABELS[o.statut]})
                </option>
              );
            })}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          OF destinataire
          <select
            className="select mt-1"
            value={ofDestinataireId}
            onChange={(e) => setOfDestinataireId(e.target.value)}
            required
          >
            <option value="">Choisir…</option>
            {ofsDest
              .filter((o) => o.id !== ofSourceId)
              .map((o) => {
                const p = produits.find((x) => x.id === o.produitId);
                return (
                  <option key={o.id} value={o.id}>
                    {o.numero} — {p ? libelleProduit(p) : o.produitId} (
                    {OF_STATUT_LABELS[o.statut]})
                  </option>
                );
              })}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Matière réservée
          <select
            className="select mt-1"
            value={produitId && pointDeVenteId ? `${produitId}|${pointDeVenteId}` : produitId}
            onChange={(e) => {
              const [pid, site] = e.target.value.split("|");
              setProduitId(pid);
              setPointDeVenteId(site ?? "");
              const row = reservees.find(
                (r) => r.produitId === pid && r.pointDeVenteId === (site ?? r.pointDeVenteId),
              );
              setQuantite(row ? String(row.quantite) : "");
            }}
            required
            disabled={!ofSourceId || reservees.length === 0}
          >
            <option value="">
              {reservees.length === 0
                ? "Aucune matière réservée sur cet OF"
                : "Choisir…"}
            </option>
            {reservees.map((r) => {
              const p = produits.find((x) => x.id === r.produitId);
              return (
                <option
                  key={`${r.produitId}|${r.pointDeVenteId}`}
                  value={`${r.produitId}|${r.pointDeVenteId}`}
                >
                  {p ? `${p.code} — ${libelleProduit(p)}` : r.produitId} ·{" "}
                  {sites.find((s) => s.id === r.pointDeVenteId)?.nom ?? "Site"} ·{" "}
                  {formatNumber(r.quantite)}
                </option>
              );
            })}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Quantité (max {formatNumber(reserveMax)})
          <input
            type="number"
            min={0}
            max={reserveMax || undefined}
            step="any"
            className="input mt-1"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            required
          />
        </label>
        <label className="text-xs font-semibold text-muted sm:col-span-2">
          Note
          <input
            className="input mt-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optionnel"
          />
        </label>
      </div>
      <p className="mt-3 text-xs text-muted">
        Circuit : demande → validation responsable OF source → validation responsable OF
        destinataire. Le stock physique ne bouge pas.
      </p>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={!reserveMax}>
          Enregistrer la demande
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}

export default function TransfertsMatiereOfPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Chargement…</p>}>
      <TransfertsMatiereOfContent />
    </Suspense>
  );
}
