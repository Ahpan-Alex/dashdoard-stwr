"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ReglagesSubnav } from "@/components/reglages-subnav";
import {
  A4_PORTRAIT_UTILE_MM,
  TABLES_AFFICHAGE,
  largeurColonnesMm,
  normaliserColonnes,
  peutAjouterColonne,
  prefsTableEffectives,
  recadrerPourPdf,
  tableAffichage,
  type TableAffichageId,
  type TypeAffichage,
} from "@/lib/affichage-tableaux";
import { useAuthStore } from "@/lib/auth-store";
import { createId } from "@/lib/id";
import { useStore } from "@/lib/store";

export default function ReglagesAffichagePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Chargement…</p>}>
      <ReglagesAffichageContent />
    </Suspense>
  );
}

function ReglagesAffichageContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("table") as TableAffichageId | null;
  const userId = useAuthStore((s) => s.user?.id);
  const estAdmin = useAuthStore((s) => s.hasPermission("parametres.gerer"));
  const raw = useStore((s) => s.preferencesAffichage);
  const enregistrerTypesAffichage = useStore((s) => s.enregistrerTypesAffichage);

  const [tableId, setTableId] = useState<TableAffichageId>(
    () =>
      TABLES_AFFICHAGE.some((t) => t.id === initial)
        ? (initial as TableAffichageId)
        : "factures",
  );
  const table = tableAffichage(tableId);
  const prefs = useMemo(
    () =>
      prefsTableEffectives(
        table,
        userId ? raw[userId]?.[tableId] : undefined,
      ),
    [table, raw, userId, tableId],
  );

  const [typeId, setTypeId] = useState<string | null>(null);
  const typeCourant =
    prefs.types.find((t) => t.id === (typeId ?? prefs.defautId)) ??
    prefs.types[0];

  function sauver(nextTypes: TypeAffichage[], extra?: { defautId?: string; actifId?: string }) {
    const ids = new Set(nextTypes.map((t) => t.id));
    enregistrerTypesAffichage(tableId, {
      types: nextTypes,
      defautId:
        extra?.defautId ??
        (prefs.defautId && ids.has(prefs.defautId)
          ? prefs.defautId
          : nextTypes[0]?.id ?? null),
      actifId:
        extra?.actifId ??
        (prefs.actifId && ids.has(prefs.actifId)
          ? prefs.actifId
          : nextTypes[0]?.id ?? null),
    });
  }

  function creer() {
    const nouveau: TypeAffichage = {
      id: createId("aff"),
      nom: `Affichage ${prefs.types.length + 1}`,
      colonnes: table.colonnes.filter((c) => c.obligatoire).map((c) => c.id),
      contraintePdf: false,
    };
    sauver([...prefs.types, nouveau]);
    setTypeId(nouveau.id);
  }

  function dupliquer(t: TypeAffichage) {
    const copie: TypeAffichage = {
      ...t,
      id: createId("aff"),
      nom: `${t.nom} (copie)`,
    };
    sauver([...prefs.types, copie]);
    setTypeId(copie.id);
  }

  function supprimer(t: TypeAffichage) {
    if (prefs.types.length <= 1) {
      alert("Conservez au moins un type d'affichage.");
      return;
    }
    if (!confirm(`Supprimer « ${t.nom} » ?`)) return;
    const restants = prefs.types.filter((x) => x.id !== t.id);
    sauver(restants);
    if (typeCourant.id === t.id) setTypeId(restants[0].id);
  }

  function patcherType(patch: Partial<TypeAffichage>) {
    const next = prefs.types.map((t) => {
      if (t.id !== typeCourant.id) return t;
      const merged = { ...t, ...patch };
      merged.colonnes = normaliserColonnes(
        table,
        merged.colonnes,
        merged.contraintePdf,
      );
      return merged;
    });
    sauver(next);
  }

  function toggleColonne(colId: string, checked: boolean) {
    const col = table.colonnes.find((c) => c.id === colId);
    if (col?.obligatoire) return;
    let ids = typeCourant.colonnes;
    if (checked) {
      if (
        typeCourant.contraintePdf &&
        !peutAjouterColonne(table, ids, colId)
      ) {
        return;
      }
      ids = [...ids, colId];
    } else {
      ids = ids.filter((id) => id !== colId);
    }
    patcherType({ colonnes: ids });
  }

  function togglePdf(checked: boolean) {
    if (checked) {
      patcherType({
        contraintePdf: true,
        colonnes: recadrerPourPdf(table, typeCourant.colonnes),
      });
      return;
    }
    patcherType({ contraintePdf: false });
  }

  const largeur = largeurColonnesMm(table, typeCourant.colonnes);

  return (
    <div>
      <PageHeader
        title="Réglages — types d'affichage"
        description="Personnalisez les colonnes de chaque tableau. Les types sont propres à votre compte."
        showPosSelector={false}
      />
      <ReglagesSubnav admin={estAdmin} />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="rounded-[var(--radius)] border border-line bg-card p-3">
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted">
            Tableaux
          </p>
          <ul className="flex flex-col gap-0.5">
            {TABLES_AFFICHAGE.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    t.id === tableId
                      ? "bg-sea-700 text-white"
                      : "text-ink hover:bg-sea-50"
                  }`}
                  onClick={() => {
                    setTableId(t.id);
                    setTypeId(null);
                  }}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">{table.label}</h2>
            <button type="button" className="btn btn-primary" onClick={creer}>
              <Plus className="h-4 w-4" />
              Nouveau type
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {prefs.types.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`btn ${t.id === typeCourant.id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setTypeId(t.id)}
              >
                {t.nom}
                {prefs.defautId === t.id ? " · défaut" : ""}
              </button>
            ))}
          </div>

          <div className="rounded-[var(--radius)] border border-line bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-muted">
                Nom du type
                <input
                  className="input mt-1"
                  value={typeCourant.nom}
                  onChange={(e) => patcherType({ nom: e.target.value })}
                />
              </label>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={prefs.defautId === typeCourant.id}
                    onChange={() =>
                      sauver(prefs.types, { defautId: typeCourant.id })
                    }
                  />
                  Affichage par défaut à l&apos;ouverture
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={typeCourant.contraintePdf}
                    onChange={(e) => togglePdf(e.target.checked)}
                  />
                  Contrainte A4 portrait (export PDF)
                </label>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => dupliquer(typeCourant)}
              >
                <Copy className="h-4 w-4" />
                Dupliquer
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => supprimer(typeCourant)}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </div>

            {typeCourant.contraintePdf && (
              <p className="mt-3 text-xs text-muted">
                Largeur cumulée : {largeur} mm / {A4_PORTRAIT_UTILE_MM} mm
                utiles (A4 portrait). Les colonnes qui dépasseraient sont
                grisées.
              </p>
            )}

            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">
              Colonnes visibles
            </p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {table.colonnes.map((c) => {
                const coche = typeCourant.colonnes.includes(c.id);
                const bloqueLargeur =
                  typeCourant.contraintePdf &&
                  !coche &&
                  !c.obligatoire &&
                  !peutAjouterColonne(table, typeCourant.colonnes, c.id);
                const disabled = Boolean(c.obligatoire) || bloqueLargeur;
                return (
                  <li key={c.id}>
                    <label
                      className={`flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-sm ${
                        disabled && !c.obligatoire
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      }`}
                      title={
                        c.obligatoire
                          ? "Colonne obligatoire"
                          : bloqueLargeur
                            ? "Largeur A4 atteinte"
                            : undefined
                      }
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={coche || Boolean(c.obligatoire)}
                        disabled={disabled}
                        onChange={(e) =>
                          toggleColonne(c.id, e.target.checked)
                        }
                      />
                      <span>
                        <span className="font-medium">{c.label}</span>
                        {c.obligatoire && (
                          <span className="ml-2 text-[11px] text-muted">
                            obligatoire
                          </span>
                        )}
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {c.largeurMm} mm
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
