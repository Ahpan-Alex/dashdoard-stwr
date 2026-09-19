"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { soldeAchat } from "@/lib/achats";
import {
  libelleCompteTresorerie,
  libelleModePaiement,
  STATUT_CHEQUE_LABELS,
} from "@/lib/tresorerie";
import { useStore } from "@/lib/store";

export default function LotPaiementDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const router = useRouter();
  const lot = useStore((s) =>
    (s.lotsPaiementFournisseur ?? []).find((l) => l.id === id),
  );
  const achats = useStore((s) => s.achats);
  const modes = useStore((s) => s.modesPaiement ?? []);
  const comptes = useStore((s) => s.comptesTresorerie ?? []);
  const annuler = useStore((s) => s.annulerLotPaiementFournisseur);

  if (!lot) {
    return (
      <div>
        <p className="text-sm text-muted">Paiement groupé introuvable.</p>
        <Link href="/achats/lots" className="mt-3 inline-block text-sea-700 underline">
          Retour aux lots
        </Link>
      </div>
    );
  }

  function onAnnuler() {
    if (
      !confirm(
        "Annuler ce paiement groupé ? La ventilation sera retirée de toutes les factures du lot en une seule action.",
      )
    ) {
      return;
    }
    const res = annuler(id);
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/achats/lots"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Lots
      </Link>
      <PageHeader
        title={lot.numero}
        description={`Paiement groupé — ${lot.fournisseurNom ?? "Fournisseur"}. Facilité de saisie : les écritures restent celles de chaque facture.`}
        showPosSelector={false}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`badge ${lot.statut === "actif" ? "badge-success" : "badge-sand"}`}
            >
              {lot.statut === "actif" ? "Actif" : "Annulé"}
            </span>
            <Link href={`/tiers/${lot.fournisseurId}`} className="btn btn-secondary">
              Fiche fournisseur
            </Link>
            {lot.statut === "actif" && (
              <button type="button" className="btn btn-secondary" onClick={onAnnuler}>
                Annuler le lot
              </button>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs text-muted">Date</p>
          <p className="font-semibold">{formatDate(lot.date)}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs text-muted">Montant</p>
          <p className="font-semibold">{formatCurrency(lot.montant)}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs text-muted">Factures couvertes</p>
          <p className="font-semibold">{lot.ventilations.length}</p>
        </div>
      </div>

      <h2 className="mb-2 font-display text-lg font-semibold">Modes de paiement</h2>
      <div className="table-shell mb-8">
        <table className="data">
          <thead>
            <tr>
              <th>Mode</th>
              <th>Compte</th>
              <th>Réf.</th>
              <th>Échéance</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            {lot.lignes.map((p) => (
              <tr key={p.id}>
                <td>
                  {libelleModePaiement(p.modePaiement, modes)}
                  {p.statutCheque
                    ? ` · ${STATUT_CHEQUE_LABELS[p.statutCheque]}`
                    : ""}
                </td>
                <td>{libelleCompteTresorerie(p.compteTresorerieId, comptes)}</td>
                <td>{p.reference ?? "—"}</td>
                <td>{p.dateEffet ? formatDate(p.dateEffet) : "—"}</td>
                <td className="font-semibold">{formatCurrency(p.montant)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 font-display text-lg font-semibold">Ventilation</h2>
      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Facture</th>
              <th>Ventilé</th>
              <th>Solde actuel</th>
            </tr>
          </thead>
          <tbody>
            {lot.ventilations.map((v) => {
              const achat = achats.find((a) => a.id === v.achatId);
              return (
                <tr key={v.achatId}>
                  <td className="font-medium">
                    {achat ? (
                      <Link href={`/achats?id=${v.achatId}`} className="hover:underline">
                        {v.achatNumero}
                      </Link>
                    ) : (
                      v.achatNumero
                    )}
                  </td>
                  <td>{formatCurrency(v.montant)}</td>
                  <td>{achat ? formatCurrency(soldeAchat(achat)) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
