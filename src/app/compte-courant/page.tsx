"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { AlerteCompteCourant } from "@/components/alerte-compte-courant";
import { EmptyState } from "@/components/empty-state";
import { InfoButton } from "@/components/info-button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  SEUIL_ALERTE_COMPTE_COURANT,
  alerteCompteCourant,
  historiqueCompteCourant,
  libellePositionCompteCourant,
  soldeCompteCourant,
  totauxMouvements,
} from "@/lib/compte-courant";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { TypeMouvementCompteCourant } from "@/lib/types";

const AUJOURD_HUI = new Date().toISOString().slice(0, 10);

export default function CompteCourantPage() {
  const {
    bilanInitial,
    mouvementsCompteCourant,
    addMouvementCompteCourant,
    deleteMouvementCompteCourant,
    parametres,
  } = useStore();

  const ouverture = bilanInitial.compteCourantAssocie ?? 0;
  const solde = soldeCompteCourant(ouverture, mouvementsCompteCourant);
  const totaux = totauxMouvements(mouvementsCompteCourant);
  const historique = useMemo(
    () => historiqueCompteCourant(ouverture, mouvementsCompteCourant),
    [ouverture, mouvementsCompteCourant],
  );
  const niveau = alerteCompteCourant(solde);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "apport" as TypeMouvementCompteCourant,
    date: AUJOURD_HUI,
    montant: "",
    libelle: "",
  });

  const montantSaisi = Number(form.montant) || 0;
  const soldeSimule =
    solde + (form.type === "apport" ? montantSaisi : -montantSaisi);
  const alerteSimulee = montantSaisi > 0 ? alerteCompteCourant(soldeSimule) : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (montantSaisi <= 0 || !form.libelle.trim()) return;
    addMouvementCompteCourant({
      type: form.type,
      date: new Date(`${form.date}T12:00:00`).toISOString(),
      montant: montantSaisi,
      libelle: form.libelle.trim(),
    });
    setOpen(false);
    setForm({
      type: "apport",
      date: AUJOURD_HUI,
      montant: "",
      libelle: "",
    });
  }

  return (
    <div>
      <PageHeader
        title="Compte courant d'associé"
        description={`Apports et retraits de fonds du propriétaire — ${parametres.nomEntreprise || "l'entreprise"}.`}
        showPosSelector={false}
        actions={
          <div className="flex flex-wrap gap-2">
            <InfoButton title="Compte courant d'associé / exploitant">
              <p>
                Le compte courant enregistre les fonds que l&apos;associé (ou
                l&apos;exploitant) met à disposition de l&apos;entreprise, et ceux
                qu&apos;il retire.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Apport</strong> : crédit — l&apos;entreprise doit cette
                  somme à l&apos;associé.
                </li>
                <li>
                  <strong>Retrait</strong> : diminue le crédit (ou passe en débit si
                  les retraits dépassent les apports).
                </li>
              </ul>
              <p>
                Une alerte préventive se déclenche dès que le solde créditeur
                atteint {formatCurrency(SEUIL_ALERTE_COMPTE_COURANT)}, afin
                d&apos;anticiper un passage en débit. Le débit n&apos;est{" "}
                <strong>pas bloqué</strong>.
              </p>
            </InfoButton>
            <Link href="/bilan" className="btn btn-secondary">
              <FileSpreadsheet className="h-4 w-4" />
              Voir le bilan
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Mouvement
            </button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Solde actuel"
          value={formatCurrency(solde)}
          hint={libellePositionCompteCourant(solde)}
        />
        <StatCard
          label="Ouverture"
          value={formatCurrency(ouverture)}
          hint="Solde au bilan initial"
        />
        <StatCard
          label="Apports"
          value={formatCurrency(totaux.apports)}
          hint="Cumul des mises à disposition"
        />
        <StatCard
          label="Retraits"
          value={formatCurrency(totaux.retraits)}
          hint="Cumul des prélèvements"
        />
      </div>

      {niveau && (
        <div className="mb-6">
          <AlerteCompteCourant solde={solde} compact />
        </div>
      )}

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 grid gap-4 rounded-[var(--radius)] border border-line bg-card p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="block text-xs font-semibold text-muted">
            Type
            <select
              className="select mt-1"
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as TypeMouvementCompteCourant,
                })
              }
            >
              <option value="apport">Apport (mise à disposition)</option>
              <option value="retrait">Retrait (prélèvement)</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Date
            <input
              type="date"
              className="input mt-1"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Montant (Ar)
            <input
              type="number"
              min="1"
              step="1"
              className="input mt-1"
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted sm:col-span-2 lg:col-span-4">
            Libellé
            <input
              className="input mt-1"
              value={form.libelle}
              onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              placeholder="Ex. Apport de trésorerie, Prélèvement personnel…"
              required
            />
          </label>

          {montantSaisi > 0 && (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-muted">
                Solde après ce mouvement :{" "}
                <strong className="text-ink">{formatCurrency(soldeSimule)}</strong>
                {" — "}
                {libellePositionCompteCourant(soldeSimule)}
              </p>
              {alerteSimulee && (
                <div className="mt-2">
                  <AlerteCompteCourant solde={soldeSimule} compact />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" className="btn btn-primary">
              {form.type === "apport" ? (
                <ArrowDownLeft className="h-4 w-4" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
              Enregistrer {form.type === "apport" ? "l'apport" : "le retrait"}
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

      {historique.length === 0 ? (
        <EmptyState
          icon={<ArrowDownLeft className="h-5 w-5" />}
          title="Aucun mouvement"
          description="Enregistrez un apport ou un retrait pour alimenter le compte courant d'associé. Le solde d'ouverture se paramètre dans le bilan initial."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Libellé</th>
                <th>Montant</th>
                <th>Solde après</th>
                <th>Saisi par</th>
                <th className="text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {historique.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{formatDate(m.date)}</td>
                  <td>
                    <span
                      className={`badge ${
                        m.type === "apport" ? "badge-success" : "badge-sand"
                      }`}
                    >
                      {m.type === "apport" ? "Apport" : "Retrait"}
                    </span>
                  </td>
                  <td className="font-medium">{m.libelle}</td>
                  <td
                    className={
                      m.type === "retrait" ? "text-danger" : "text-success"
                    }
                  >
                    {m.type === "retrait" ? "− " : "+ "}
                    {formatCurrency(m.montant)}
                  </td>
                  <td className="font-semibold">{formatCurrency(m.soldeApres)}</td>
                  <td className="text-muted">{m.userNom ?? "—"}</td>
                  <td>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="btn btn-ghost text-danger"
                        title="Supprimer"
                        onClick={() => {
                          if (confirm(`Supprimer le mouvement « ${m.libelle} » ?`)) {
                            deleteMouvementCompteCourant(m.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ouverture !== 0 && (
                <tr>
                  <td className="text-muted">
                    {formatDate(bilanInitial.date)}
                  </td>
                  <td>
                    <span className="badge badge-muted">Ouverture</span>
                  </td>
                  <td className="text-muted">Solde d&apos;ouverture (bilan initial)</td>
                  <td>{formatCurrency(ouverture)}</td>
                  <td className="font-semibold">{formatCurrency(ouverture)}</td>
                  <td className="text-muted">—</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
