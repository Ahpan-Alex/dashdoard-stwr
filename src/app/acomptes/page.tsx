"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ACOMPTE_STATUTS, MODES_PAIEMENT } from "@/lib/commercial";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ModePaiement } from "@/lib/types";

type FiltreAcompte = "tous" | "enregistre" | "impute" | "annule";

const FILTRES: { id: FiltreAcompte; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "enregistre", label: "Enregistrés" },
  { id: "impute", label: "Imputés" },
  { id: "annule", label: "Annulés" },
];

function filtreDepuisQuery(statut: string | null): FiltreAcompte {
  if (statut && FILTRES.some((f) => f.id === statut)) {
    return statut as FiltreAcompte;
  }
  return "tous";
}

export default function AcomptesPage() {
  const searchParams = useSearchParams();
  const {
    acomptes,
    clients,
    devis,
    commandes,
    factures,
    pointsDeVente,
    updateAcompte,
    deleteAcompte,
    encaisserAcompte,
  } = useStore();

  const [filtre, setFiltre] = useState<FiltreAcompte>(() =>
    filtreDepuisQuery(searchParams.get("statut")),
  );

  useEffect(() => {
    setFiltre(filtreDepuisQuery(searchParams.get("statut")));
  }, [searchParams]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    montantTTC: "",
    modePaiement: "virement" as ModePaiement,
    devisId: "",
    commandeId: "",
    genererFacture: true,
    note: "",
  });

  const acomptesFiltres = useMemo(() => {
    return [...acomptes]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((a) => (filtre === "tous" ? true : a.statut === filtre));
  }, [acomptes, filtre]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const montantTTC = Number(form.montantTTC);
    if (!form.clientId || montantTTC <= 0) return;

    const cmd = commandes.find((c) => c.id === form.commandeId);
    const refDoc =
      cmd?.numero ||
      devis.find((d) => d.id === form.devisId)?.numero ||
      "commande";
    const pdvId = cmd?.pointDeVenteId ?? pointsDeVente[0]?.id ?? "";

    const res = encaisserAcompte({
      clientId: form.clientId,
      pointDeVenteId: pdvId,
      date: new Date(`${form.date}T12:00:00`).toISOString(),
      montantTTC,
      modePaiement: form.modePaiement,
      devisId: form.devisId || undefined,
      commandeId: form.commandeId || undefined,
      refDocument: refDoc,
      genererFactureAcompte: form.genererFacture,
      note: form.note || undefined,
    });
    if (!res.ok) {
      alert(res.reason);
      return;
    }

    setOpen(false);
    setForm((f) => ({ ...f, montantTTC: "", note: "" }));
  }

  return (
    <div>
      <PageHeader
        title="Acomptes"
        description="Enregistrement des acomptes avec émission automatique de facture d'acompte (législation MG)."
        actions={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvel acompte
          </button>
        }
      />

      <div className="mb-4 rounded-[var(--radius)] border border-line bg-sea-100/50 px-4 py-3 text-sm">
        Total acomptes enregistrés :{" "}
        <strong>
          {formatCurrency(
            acomptes
              .filter((a) => a.statut !== "annule")
              .reduce((s, a) => s + a.montantTTC, 0),
          )}
        </strong>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 grid gap-4 rounded-[var(--radius)] border border-sea-200 bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="block text-xs font-semibold text-muted">
            Client
            <select
              className="select mt-1"
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
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
            Date d&apos;encaissement
            <input
              type="date"
              className="input mt-1"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Montant TTC (Ar)
            <input
              type="number"
              min="0"
              step="100"
              className="input mt-1"
              value={form.montantTTC}
              onChange={(e) =>
                setForm({ ...form, montantTTC: e.target.value })
              }
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Mode de paiement
            <select
              className="select mt-1"
              value={form.modePaiement}
              onChange={(e) =>
                setForm({
                  ...form,
                  modePaiement: e.target.value as ModePaiement,
                })
              }
            >
              {Object.entries(MODES_PAIEMENT).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Lié au devis
            <select
              className="select mt-1"
              value={form.devisId}
              onChange={(e) => setForm({ ...form, devisId: e.target.value })}
            >
              <option value="">—</option>
              {devis.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.numero}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Lié à la commande
            <select
              className="select mt-1"
              value={form.commandeId}
              onChange={(e) => {
                const cmd = commandes.find((c) => c.id === e.target.value);
                setForm({
                  ...form,
                  commandeId: e.target.value,
                  clientId: cmd?.clientId ?? form.clientId,
                  devisId: cmd?.devisId ?? form.devisId,
                });
              }}
            >
              <option value="">—</option>
              {commandes
                .filter((c) => c.statut !== "annulee")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              checked={form.genererFacture}
              onChange={(e) =>
                setForm({ ...form, genererFacture: e.target.checked })
              }
            />
            Générer automatiquement la facture d&apos;acompte (recommandé —
            législation MG)
          </label>
          <label className="block text-xs font-semibold text-muted sm:col-span-2 lg:col-span-3">
            Note
            <input
              className="input mt-1"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" className="btn btn-primary">
              Enregistrer l&apos;acompte
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setOpen(false)}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
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

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>N°</th>
              <th>Date</th>
              <th>Client</th>
              <th>Montant TTC</th>
              <th>Mode</th>
              <th>Liens</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {acomptesFiltres.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted">
                  Aucun acompte pour ce filtre.
                </td>
              </tr>
            ) : (
              acomptesFiltres.map((a) => {
                const client = clients.find((c) => c.id === a.clientId);
                const fac = factures.find(
                  (f) => f.id === a.factureAcompteId || f.id === a.factureId,
                );
                return (
                  <tr key={a.id}>
                    <td className="font-medium">{a.numero}</td>
                    <td>{formatDate(a.date)}</td>
                    <td>{client?.nom}</td>
                    <td className="font-semibold">
                      {formatCurrency(a.montantTTC)}
                    </td>
                    <td>{MODES_PAIEMENT[a.modePaiement]}</td>
                    <td className="text-xs">
                      {commandes.find((c) => c.id === a.commandeId)?.numero ||
                        devis.find((d) => d.id === a.devisId)?.numero ||
                        "—"}
                      {fac && (
                        <span className="mt-0.5 block text-sea-700">
                          {fac.numero}
                        </span>
                      )}
                    </td>
                    <td>
                      <select
                        className="select max-w-[130px]"
                        value={a.statut}
                        onChange={(e) =>
                          updateAcompte(a.id, {
                            statut: e.target.value as typeof a.statut,
                          })
                        }
                      >
                        {Object.entries(ACOMPTE_STATUTS).map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          if (confirm(`Supprimer ${a.numero} ?`)) {
                            deleteAcompte(a.id);
                          }
                        }}
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
    </div>
  );
}
