"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BookOpen, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { LongueurNumeroCompteForm } from "@/components/longueur-numero-compte-form";
import { ComptabiliteSubnav } from "@/components/comptabilite-subnav";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";
import { appliqueTVA } from "@/lib/commercial";
import {
  completerNumeroCompte,
  compteUtiliseEnEcriture,
  comptesTvaManquants,
  ecrireCsvPlanModele,
  LONGUEUR_COMPTE_MIN,
  longueurNumeroCompteEffective,
  MSG_COMPTE_VERROUILLE,
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
    ecrituresComptables,
    addCompteComptable,
    updateCompteComptable,
    deleteCompteComptable,
    importerComptesComptablesCsv,
    importerPlanComptableDefaut,
  } = useStore();
  const peutGerer = useAuthStore((s) => s.hasPermission("comptabilite.gerer"));
  const assujetti = appliqueTVA(parametres);
  const longueur = longueurNumeroCompteEffective(parametres);
  const manquantsTva = useMemo(
    () => comptesTvaManquants(comptesComptables, parametres),
    [comptesComptables, parametres],
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
  const editionVerrouillee = compteUtiliseEnEcriture(
    editingId ?? undefined,
    ecrituresComptables,
  );

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
    setMessage(`${res.imported} compte(s) importé(s).`);
  }

  function onImportDefaut() {
    if (
      !confirm(
        `Importer le plan comptable PCG 2005 (classes 1 à 8, hors TVA 445x) ?\n\n` +
          `Les numéros seront complétés à ${longueur ?? LONGUEUR_COMPTE_MIN} chiffres. ` +
          `Si un numéro existe déjà, aucun compte ne sera créé.`,
      )
    ) {
      return;
    }
    const res = importerPlanComptableDefaut();
    setMessage(res.ok ? `${res.imported} compte(s) importé(s) (PCG 2005).` : res.reason);
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
        description="Saisissez vos comptes, importez le PCG 2005 ou un CSV personnalisé. Les comptes de TVA 445x restent à créer à la main."
        showPosSelector={false}
      />
      <ComptabiliteSubnav />

      <LongueurNumeroCompteForm />

      {assujetti && manquantsTva.length > 0 && (
        <p className="mb-4 rounded-[var(--radius)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Entreprise assujettie à la TVA : désignez un compte{" "}
          {manquantsTva.map((r) => ROLE_COMPTE_LABELS[r]).join(" et un compte ")}
          . Aucun autre compte (achats, ventes…) n&apos;est imposé.
        </p>
      )}

      {message && (
        <p
          className={`mb-4 rounded-[var(--radius)] px-4 py-3 text-sm ${
            message.startsWith("Import annulé")
              ? "border border-amber-300 bg-amber-50 text-amber-900"
              : "text-muted"
          }`}
        >
          {message}
        </p>
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
                disabled={editionVerrouillee}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                placeholder={
                  longueur
                    ? `Ex. 401, 4111… (${longueur} chiffres)`
                    : "D’abord fixer la longueur"
                }
                required
              />
            </label>
            <label className="text-xs font-semibold text-muted sm:col-span-2">
              Libellé
              <input
                className="input mt-1"
                value={form.libelle}
                disabled={editionVerrouillee}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                required
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Rôle
              <select
                className="select mt-1"
                value={form.roleCompte}
                disabled={editionVerrouillee}
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
            {longueur != null && form.numero.replace(/\D/g, "") && (
              <p className="sm:col-span-4 text-xs text-muted">
                Enregistré comme{" "}
                <span className="font-mono font-semibold">
                  {completerNumeroCompte(form.numero, longueur)}
                </span>{" "}
                (zéros à droite). Les comptes 401 (fournisseurs) et 411
                (clients) et leurs sous-comptes (4011, 4112…) sont autorisés.
              </p>
            )}
            <div className="flex flex-wrap gap-2 sm:col-span-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={longueur == null || editionVerrouillee}
              >
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
            </div>
          </form>
          {editionVerrouillee && (
            <p className="mt-3 text-sm text-amber-800">{MSG_COMPTE_VERROUILLE}</p>
          )}
        </section>
      )}

      {peutGerer && (
        <section className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="font-display text-lg font-semibold">
            Importer un plan comptable
          </h2>
          <p className="mt-2 text-sm text-muted">
            Deux points de départ, utilisables l&apos;un après l&apos;autre :
            le référentiel PCG 2005 fourni par Steward, ou votre propre fichier
            CSV. Dans les deux cas, un second import échoue intégralement si un
            numéro existe déjà. Vous pouvez ensuite ajouter des comptes à la
            main. Les comptes de TVA (445x) ne sont pas inclus dans le plan par
            défaut.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={longueur == null}
              onClick={onImportDefaut}
            >
              <BookOpen className="h-4 w-4" />
              Importer le plan comptable par défaut
            </button>
            <label className="btn btn-secondary cursor-pointer">
              <Upload className="h-4 w-4" />
              Importer mon propre plan comptable
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={longueur == null}
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
          <p className="mt-3 text-xs text-muted">
            CSV : deux colonnes, numéro et libellé (séparateur ; ou ,). Si la
            longueur paramétrée est plus grande que le numéro source, des zéros
            sont ajoutés à droite (607 →{" "}
            {completerNumeroCompte("607", longueur ?? LONGUEUR_COMPTE_MIN)}). Import
            transactionnel : un seul conflit annule tout le fichier.
          </p>
        </section>
      )}

      {comptesTries.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-5 w-5" />}
          title="Aucun compte"
          description="Fixez la longueur des numéros, puis créez vos comptes, importez le PCG 2005 ou un CSV."
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
              {comptesTries.map((c) => {
                const verrouille = compteUtiliseEnEcriture(
                  c.id,
                  ecrituresComptables,
                );
                return (
                <tr key={c.id} className={verrouille ? "opacity-70" : undefined}>
                  <td className="font-mono text-xs font-semibold">{c.numero}</td>
                  <td>
                    {c.libelle}
                    {verrouille && (
                      <p className="mt-1 text-xs text-amber-800">
                        {MSG_COMPTE_VERROUILLE}
                      </p>
                    )}
                  </td>
                  <td className="text-xs text-muted">
                    {ROLE_COMPTE_LABELS[c.roleCompte ?? "general"]}
                  </td>
                  {peutGerer && (
                    <td className="text-right">
                      <IconButton
                        label={verrouille ? MSG_COMPTE_VERROUILLE : "Modifier"}
                        disabled={verrouille}
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
                        label={verrouille ? MSG_COMPTE_VERROUILLE : "Supprimer"}
                        disabled={verrouille}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
