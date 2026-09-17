"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { PastilleCompteManquant } from "@/components/avertissement-compte-produit";
import { ParametresSectionFrame } from "@/components/parametres-subnav";
import { RowCrudActions } from "@/components/row-crud-actions";
import { useAuthStore } from "@/lib/auth-store";
import { comptesParClasse } from "@/lib/comptabilite";
import {
  nbDepensesParNature,
  naturesDepenseTriees,
} from "@/lib/natures-depense-mission";
import { TYPE_ACHAT_LABELS, TYPES_ACHAT_LIBRES, TYPES_ACHAT_PRODUIT } from "@/lib/type-achat";
import { useStore } from "@/lib/store";
import type { NatureDepenseMission } from "@/lib/types";
import {
  validiteJoursDefautAchats,
  normaliserValiditeJours,
} from "@/lib/validite-document";

export default function ParametresAchatsPage() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const actuel = validiteJoursDefautAchats(parametres);
  const [saisie, setSaisie] = useState(String(actuel));
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const jours = normaliserValiditeJours(saisie);
    updateParametres({ validiteJoursDefautAchats: jours });
    setSaisie(String(jours));
    setMessage(`Validité par défaut enregistrée : ${jours} jour${jours > 1 ? "s" : ""}.`);
  }

  return (
    <ParametresSectionFrame sectionId="achats">
      <section className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">
          Demandes de prix et commandes fournisseurs
        </h2>
        <p className="mt-2 text-sm text-muted">
          Durée de validité proposée à la création d&apos;une demande de prix ou
          d&apos;une commande fournisseur. Chaque pièce peut ensuite être
          ajustée.
        </p>
        <form
          onSubmit={onSubmit}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="text-xs font-semibold text-muted">
            Validité par défaut (jours)
            <input
              type="number"
              min={1}
              max={3650}
              className="input mt-1 w-32"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Enregistrer
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </section>

      <section className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Types d&apos;achat</h2>
        <p className="mt-2 text-sm text-muted">
          Types utilisés sur les fiches articles et les lignes de commande
          fournisseur. Le type d&apos;une ligne catalogue se choisit sur la
          fiche produit ; les types libres (service général, immobilisation) se
          saisissent à la ligne.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Sur fiche produit
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {TYPES_ACHAT_PRODUIT.map((t) => (
                <li key={t}>{TYPE_ACHAT_LABELS[t]}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Lignes libres
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {TYPES_ACHAT_LIBRES.map((t) => (
                <li key={t}>{TYPE_ACHAT_LABELS[t]}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <NaturesDepenseMissionSection />
    </ParametresSectionFrame>
  );
}

function NaturesDepenseMissionSection() {
  const naturesDepenseMission = useStore((s) => s.naturesDepenseMission ?? []);
  const missionsAchat = useStore((s) => s.missionsAchat ?? []);
  const comptesComptables = useStore((s) => s.comptesComptables);
  const addNatureDepenseMission = useStore((s) => s.addNatureDepenseMission);
  const updateNatureDepenseMission = useStore((s) => s.updateNatureDepenseMission);
  const deleteNatureDepenseMission = useStore((s) => s.deleteNatureDepenseMission);
  const peutGerer = useAuthStore((s) => s.hasPermission("parametres.gerer"));
  const charges = useMemo(
    () => comptesParClasse(comptesComptables, "6"),
    [comptesComptables],
  );
  const liste = useMemo(
    () => naturesDepenseTriees(naturesDepenseMission),
    [naturesDepenseMission],
  );
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ libelle: "", compteChargeId: "" });

  function fermer() {
    setOpen(false);
    setEditingId(null);
    setForm({ libelle: "", compteChargeId: "" });
    setError(null);
  }

  function demarrer(n?: NatureDepenseMission) {
    setEditingId(n?.id ?? null);
    setForm({
      libelle: n?.libelle ?? "",
      compteChargeId: n?.compteChargeId ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = editingId
      ? updateNatureDepenseMission(editingId, {
          libelle: form.libelle,
          compteChargeId: form.compteChargeId || undefined,
        })
      : addNatureDepenseMission({
          libelle: form.libelle,
          compteChargeId: form.compteChargeId || undefined,
        });
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    fermer();
  }

  function supprimer(n: NatureDepenseMission) {
    const used = nbDepensesParNature(missionsAchat, n.id);
    if (used > 0) {
      alert(
        `${used} dépense(s) utilisent « ${n.libelle} ». Suppression bloquée.`,
      );
      return;
    }
    if (!confirm(`Supprimer la nature « ${n.libelle} » ?`)) return;
    const res = deleteNatureDepenseMission(n.id);
    if (!res.ok) alert(res.reason);
  }

  return (
    <section className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">
            Natures de dépenses de mission
          </h2>
          <p className="mt-1 text-xs text-muted">
            Liste proposée à la saisie des dépenses diverses. Une nature hors
            liste (saisie libre) est imputée au compte 471 jusqu&apos;au
            reclassement en Comptabilité.
          </p>
        </div>
        {peutGerer && (
          <button type="button" className="btn btn-secondary" onClick={() => demarrer()}>
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        )}
      </div>

      {open && peutGerer && (
        <form
          onSubmit={onSubmit}
          className="mb-4 grid gap-3 rounded-lg border border-sea-200 bg-sea-50/40 p-4 sm:grid-cols-2"
        >
          <label className="text-xs font-semibold text-muted">
            Libellé
            <input
              className="input mt-1"
              value={form.libelle}
              onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              required
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Compte de charge (classe 6)
            <select
              className="select mt-1"
              value={form.compteChargeId}
              onChange={(e) =>
                setForm({ ...form, compteChargeId: e.target.value })
              }
            >
              <option value="">À renseigner (imputation 471)</option>
              {charges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} — {c.libelle}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p className="sm:col-span-2 text-sm text-danger">{error}</p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
            <button type="button" className="btn btn-secondary" onClick={fermer}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {liste.length === 0 ? (
        <p className="text-sm text-muted">Aucune nature. Ajoutez-en une.</p>
      ) : (
        <ul className="space-y-2">
          {liste.map((n) => {
            const compte = comptesComptables.find((c) => c.id === n.compteChargeId);
            return (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"
              >
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {n.libelle}
                    {!compte ? <PastilleCompteManquant /> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {compte
                      ? `${compte.numero} — ${compte.libelle}`
                      : "Compte non renseigné — les dépenses iront au 471 tant que le compte n'est pas associé."}
                  </p>
                </div>
                {peutGerer && (
                  <RowCrudActions
                    onView={() => demarrer(n)}
                    onEdit={() => demarrer(n)}
                    onDelete={() => supprimer(n)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
