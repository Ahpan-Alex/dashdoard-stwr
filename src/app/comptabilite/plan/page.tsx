"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { ComptabiliteSubnav } from "@/components/comptabilite-subnav";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";
import { appliqueTVA } from "@/lib/commercial";
import {
  comptesTvaManquants,
  ecrireCsvPlanModele,
  LONGUEUR_COMPTE_MAX,
  LONGUEUR_COMPTE_MIN,
  longueurNumeroCompteEffective,
  ROLE_COMPTE_LABELS,
} from "@/lib/comptabilite";
import { useStore } from "@/lib/store";
import type { RoleCompteComptable } from "@/lib/types";

export default function PlanComptablePage() {
  return (
    <RequirePermission permission="comptabilite.lire">
      <PlanComptableContent />
    </RequirePermission>
  );
}

function PlanComptableContent() {
  const {
    parametres,
    comptesComptables,
    definirLongueurNumeroCompte,
    addCompteComptable,
    updateCompteComptable,
    deleteCompteComptable,
    importerComptesComptablesCsv,
  } = useStore();
  const peutGerer = useAuthStore((s) => s.hasPermission("comptabilite.gerer"));
  const assujetti = appliqueTVA(parametres);
  const longueur = longueurNumeroCompteEffective(parametres);
  const manquantsTva = useMemo(
    () => comptesTvaManquants(comptesComptables, parametres),
    [comptesComptables, parametres],
  );

  const [longueurSaisie, setLongueurSaisie] = useState(
    String(longueur ?? LONGUEUR_COMPTE_MIN),
  );
  const [form, setForm] = useState({
    numero: "",
    libelle: "",
    roleCompte: "general" as RoleCompteComptable,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const comptesTries = useMemo(
    () =>
      [...comptesComptables].sort((a, b) => a.numero.localeCompare(b.numero)),
    [comptesComptables],
  );

  function onFixerLongueur(e: FormEvent) {
    e.preventDefault();
    const res = definirLongueurNumeroCompte(Number(longueurSaisie));
    setMessage(res.ok ? "Longueur enregistrée." : res.reason);
  }

  function onSubmitCompte(e: FormEvent) {
    e.preventDefault();
    const payload = {
      numero: form.numero,
      libelle: form.libelle,
      roleCompte: form.roleCompte,
    };
    const res = editingId
      ? updateCompteComptable(editingId, payload)
      : addCompteComptable(payload);
    if (!res.ok) {
      setMessage(res.reason);
      return;
    }
    setForm({ numero: "", libelle: "", roleCompte: "general" });
    setEditingId(null);
    setMessage(editingId ? "Compte mis à jour." : "Compte créé.");
  }

  async function onImport(file: File) {
    const texte = await file.text();
    const res = importerComptesComptablesCsv(texte);
    if (!res.ok) {
      setMessage(res.reason);
      return;
    }
    setMessage(
      `${res.imported} compte(s) importé(s)` +
        (res.skipped ? ` — ${res.skipped} ignoré(s)` : "") +
        (res.errors.length ? ` : ${res.errors.slice(0, 3).join(" ")}` : "."),
    );
  }

  function telechargerModele() {
    const blob = new Blob([ecrireCsvPlanModele(longueur ?? LONGUEUR_COMPTE_MIN)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-plan-comptable.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Plan comptable"
        description="Créez vos comptes à la main ou importez-les. Aucun plan pré-rempli n'est imposé."
        showPosSelector={false}
      />
      <ComptabiliteSubnav />

      <section className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">
          Longueur des numéros de compte
        </h2>
        <p className="mt-2 text-sm text-muted">
          Paramètre unique pour toute l&apos;entreprise (de{" "}
          {LONGUEUR_COMPTE_MIN} à {LONGUEUR_COMPTE_MAX} chiffres). Une fois
          fixé, vous pouvez uniquement l&apos;augmenter, jamais le diminuer. En
          cas d&apos;augmentation, les comptes existants sont complétés
          automatiquement par des zéros à droite.
        </p>
        <form
          onSubmit={onFixerLongueur}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="text-xs font-semibold text-muted">
            Nombre de chiffres
            <select
              className="select mt-1"
              value={longueurSaisie}
              disabled={!peutGerer}
              onChange={(e) => setLongueurSaisie(e.target.value)}
            >
              {Array.from(
                { length: LONGUEUR_COMPTE_MAX - LONGUEUR_COMPTE_MIN + 1 },
                (_, i) => LONGUEUR_COMPTE_MIN + i,
              ).map((n) => (
                <option
                  key={n}
                  value={n}
                  disabled={longueur != null && n < longueur}
                >
                  {n} chiffres
                </option>
              ))}
            </select>
          </label>
          {peutGerer && (
            <button type="submit" className="btn btn-primary">
              {longueur == null ? "Fixer la longueur" : "Augmenter"}
            </button>
          )}
          {longueur != null && (
            <p className="text-xs text-muted">
              Longueur actuelle : {longueur} chiffres.
            </p>
          )}
        </form>
      </section>

      {assujetti && manquantsTva.length > 0 && (
        <p className="mb-4 rounded-[var(--radius)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Entreprise assujettie à la TVA : désignez un compte{" "}
          {manquantsTva.map((r) => ROLE_COMPTE_LABELS[r]).join(" et un compte ")}
          . Aucun autre compte (achats, ventes…) n&apos;est imposé.
        </p>
      )}

      {message && (
        <p className="mb-4 text-sm text-muted">{message}</p>
      )}

      {peutGerer && (
        <section className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="font-display text-lg font-semibold">
            {editingId ? "Modifier le compte" : "Nouveau compte"}
          </h2>
          <form
            onSubmit={onSubmitCompte}
            className="mt-3 grid gap-3 sm:grid-cols-4"
          >
            <label className="text-xs font-semibold text-muted">
              Numéro
              <input
                className="input mt-1 font-mono"
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                placeholder={longueur ? `${longueur} chiffres` : "D’abord fixer la longueur"}
                required
              />
            </label>
            <label className="text-xs font-semibold text-muted sm:col-span-2">
              Libellé
              <input
                className="input mt-1"
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                required
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Rôle
              <select
                className="select mt-1"
                value={form.roleCompte}
                onChange={(e) =>
                  setForm({
                    ...form,
                    roleCompte: e.target.value as RoleCompteComptable,
                  })
                }
              >
                <option value="general">Général</option>
                {assujetti && (
                  <>
                    <option value="tva_deductible">TVA déductible</option>
                    <option value="tva_collectee">TVA collectée</option>
                  </>
                )}
              </select>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-4">
              <button type="submit" className="btn btn-primary" disabled={longueur == null}>
                {editingId ? (
                  <>
                    <Pencil className="h-4 w-4" />
                    Enregistrer
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ numero: "", libelle: "", roleCompte: "general" });
                  }}
                >
                  Annuler
                </button>
              )}
              <label className="btn btn-secondary cursor-pointer">
                <Upload className="h-4 w-4" />
                Importer CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onImport(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={telechargerModele}
              >
                Modèle CSV
              </button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted">
            Import CSV : deux colonnes, numéro et libellé (séparateur ; ou ,).
          </p>
        </section>
      )}

      {comptesTries.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-5 w-5" />}
          title="Aucun compte"
          description="Fixez la longueur des numéros, puis créez vos comptes ou importez un CSV."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Libellé</th>
                <th>Rôle</th>
                {peutGerer && <th />}
              </tr>
            </thead>
            <tbody>
              {comptesTries.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs font-semibold">{c.numero}</td>
                  <td>{c.libelle}</td>
                  <td className="text-xs text-muted">
                    {ROLE_COMPTE_LABELS[c.roleCompte ?? "general"]}
                  </td>
                  {peutGerer && (
                    <td className="text-right">
                      <IconButton
                        label="Modifier"
                        onClick={() => {
                          setEditingId(c.id);
                          setForm({
                            numero: c.numero,
                            libelle: c.libelle,
                            roleCompte: c.roleCompte ?? "general",
                          });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Supprimer"
                        onClick={() => {
                          if (!confirm(`Supprimer ${c.numero} ${c.libelle} ?`)) {
                            return;
                          }
                          const res = deleteCompteComptable(c.id);
                          if (!res.ok) setMessage(res.reason);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </IconButton>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
