"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { ParametresSectionFrame } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency } from "@/lib/format";
import {
  TYPE_COMPTE_TRESORERIE_LABELS,
  comptesTresorerieTries,
  fenetreChequesProchesJours,
  modesPaiementTries,
  soldeCompteTresorerie,
  tousMouvementsTresorerie,
} from "@/lib/tresorerie";
import { useStore } from "@/lib/store";
import type { ModePaiementParam, TypeCompteTresorerie } from "@/lib/types";

const COMPTE_VIDE = {
  libelle: "",
  type: "caisse" as TypeCompteTresorerie,
  siteId: "",
};

export default function ParametresTresoreriePage() {
  return (
    <RequirePermission permission="parametres.gerer">
      <ParametresSectionFrame sectionId="tresorerie">
        <FenetreChequesSection />
        <ComptesSection />
        <ModesSection />
      </ParametresSectionFrame>
    </RequirePermission>
  );
}

function FenetreChequesSection() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const actuel = fenetreChequesProchesJours(parametres);
  const [saisie, setSaisie] = useState(String(actuel));
  const [ok, setOk] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Math.max(0, Math.floor(Number(saisie) || 0));
    updateParametres({ fenetreChequesProchesJours: n || 15 });
    setSaisie(String(n || 15));
    setOk(true);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5"
    >
      <h2 className="font-display text-lg font-semibold">
        Chèques différés à échéance proche
      </h2>
      <p className="mt-1 text-sm text-muted">
        Fenêtre de la vue dédiée (distincte de l&apos;échéancier complet).
      </p>
      <label className="mt-3 block max-w-xs text-xs font-semibold text-muted">
        Jours (ex. 15)
        <input
          type="number"
          min={0}
          className="input mt-1"
          value={saisie}
          onChange={(e) => {
            setSaisie(e.target.value);
            setOk(false);
          }}
        />
      </label>
      <button type="submit" className="btn btn-primary mt-3">
        Enregistrer
      </button>
      {ok && <p className="mt-2 text-sm text-emerald-800">Fenêtre enregistrée.</p>}
    </form>
  );
}

function ComptesSection() {
  const {
    comptesTresorerie,
    pointsDeVente,
    achats,
    factures,
    acomptes,
    missionsAchat,
    lotsPaiementFournisseur,
    modesPaiement,
    addCompteTresorerie,
    updateCompteTresorerie,
    deleteCompteTresorerie,
  } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(COMPTE_VIDE);
  const liste = useMemo(
    () => comptesTresorerieTries(comptesTresorerie ?? []),
    [comptesTresorerie],
  );
  const mouvements = useMemo(
    () =>
      tousMouvementsTresorerie({
        achats,
        factures,
        acomptes,
        missions: missionsAchat,
        lotsPaiement: lotsPaiementFournisseur,
        modes: modesPaiement ?? [],
      }),
    [achats, factures, acomptes, missionsAchat, lotsPaiementFournisseur, modesPaiement],
  );

  function fermer() {
    setOpen(false);
    setEditingId(null);
    setForm(COMPTE_VIDE);
    setError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      libelle: form.libelle,
      type: form.type,
      siteId: form.siteId || undefined,
    };
    const res = editingId
      ? updateCompteTresorerie(editingId, payload)
      : addCompteTresorerie(payload);
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    fermer();
  }

  return (
    <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Comptes de trésorerie</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditingId(null);
            setForm(COMPTE_VIDE);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nouveau compte
        </button>
      </div>
      {open && (
        <form onSubmit={onSubmit} className="mb-4 grid gap-3 sm:grid-cols-3">
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
            Type
            <select
              className="select mt-1"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as TypeCompteTresorerie })
              }
            >
              {(Object.keys(TYPE_COMPTE_TRESORERIE_LABELS) as TypeCompteTresorerie[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {TYPE_COMPTE_TRESORERIE_LABELS[t]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Site (vide = global)
            <select
              className="select mt-1"
              value={form.siteId}
              onChange={(e) => setForm({ ...form, siteId: e.target.value })}
            >
              <option value="">Compte global</option>
              {pointsDeVente.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="sm:col-span-3 text-sm text-danger">{error}</p>}
          <div className="sm:col-span-3 flex gap-2">
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
            <button type="button" className="btn btn-secondary" onClick={fermer}>
              Annuler
            </button>
          </div>
        </form>
      )}
      <table className="data">
        <thead>
          <tr>
            <th>Compte</th>
            <th>Type</th>
            <th>Site</th>
            <th>Solde</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {liste.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-sm text-muted">
                Aucun compte. Un point de vente en exigera au moins un.
              </td>
            </tr>
          ) : (
            liste.map((c) => (
              <tr key={c.id} className={c.actif ? "" : "opacity-50"}>
                <td>{c.libelle}</td>
                <td>{TYPE_COMPTE_TRESORERIE_LABELS[c.type]}</td>
                <td>
                  {c.siteId
                    ? pointsDeVente.find((s) => s.id === c.siteId)?.nom ?? c.siteId
                    : "Global"}
                </td>
                <td className="font-semibold">
                  {formatCurrency(soldeCompteTresorerie(c.id, mouvements))}
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingId(c.id);
                        setForm({
                          libelle: c.libelle,
                          type: c.type,
                          siteId: c.siteId ?? "",
                        });
                        setOpen(true);
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => updateCompteTresorerie(c.id, { actif: !c.actif })}
                    >
                      {c.actif ? "Désactiver" : "Activer"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const res = deleteCompteTresorerie(c.id);
                        if (!res.ok) alert(res.reason);
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

function ModesSection() {
  const { modesPaiement, addModePaiement, updateModePaiement, deleteModePaiement } =
    useStore();
  const [libelle, setLibelle] = useState("");
  const [echeance, setEcheance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liste = useMemo(
    () => modesPaiementTries(modesPaiement ?? []),
    [modesPaiement],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = addModePaiement({ libelle, necessiteEcheance: echeance });
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    setLibelle("");
    setEcheance(false);
    setError(null);
  }

  return (
    <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
      <h2 className="mb-3 font-display text-lg font-semibold">Modes de paiement</h2>
      <form onSubmit={onSubmit} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-muted">
          Libellé
          <input
            className="input mt-1"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Ex. Chèque visé"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          <input
            type="checkbox"
            checked={echeance}
            onChange={(e) => setEcheance(e.target.checked)}
          />
          Nécessite une date d&apos;échéance
        </label>
        <button type="submit" className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
      <table className="data">
        <thead>
          <tr>
            <th>Mode</th>
            <th>Échéance</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {liste.map((m: ModePaiementParam) => (
            <tr key={m.id} className={m.actif ? "" : "opacity-50"}>
              <td>{m.libelle}</td>
              <td>{m.necessiteEcheance ? "Oui" : "Non"}</td>
              <td>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => updateModePaiement(m.id, { actif: !m.actif })}
                  >
                    {m.actif ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const res = deleteModePaiement(m.id);
                      if (!res.ok) alert(res.reason);
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
