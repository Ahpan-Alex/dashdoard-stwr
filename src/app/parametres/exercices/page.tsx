"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RowCrudActions } from "@/components/row-crud-actions";
import {
  bornesExerciceCalendaire,
  exercicesTries,
  jourIso,
  libelleExercice,
} from "@/lib/exercices";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ExerciceComptable } from "@/lib/types";

export default function ParametresExercicesPage() {
  const {
    exercicesComptables,
    addExerciceComptable,
    updateExerciceComptable,
    cloturerExerciceComptable,
    deleteExerciceComptable,
  } = useStore();

  const anneeCourante = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendaire, setCalendaire] = useState(true);
  const [annee, setAnnee] = useState(String(anneeCourante));
  const [dateDebut, setDateDebut] = useState(`${anneeCourante}-01-01`);
  const [dateFin, setDateFin] = useState(`${anneeCourante}-12-31`);
  const [libelle, setLibelle] = useState("");
  const [actif, setActif] = useState(true);

  const liste = useMemo(
    () => exercicesTries(exercicesComptables ?? []),
    [exercicesComptables],
  );

  function fermer() {
    setOpen(false);
    setEditingId(null);
    setError(null);
    setCalendaire(true);
    setAnnee(String(anneeCourante));
    setDateDebut(`${anneeCourante}-01-01`);
    setDateFin(`${anneeCourante}-12-31`);
    setLibelle("");
    setActif(true);
  }

  function ouvrirCreation() {
    fermer();
    setOpen(true);
  }

  function demarrerEdition(ex: ExerciceComptable) {
    setEditingId(ex.id);
    setCalendaire(ex.calendaire);
    setAnnee(jourIso(ex.dateDebut).slice(0, 4) || String(anneeCourante));
    setDateDebut(jourIso(ex.dateDebut));
    setDateFin(jourIso(ex.dateFin));
    setLibelle(ex.libelle);
    setActif(ex.actif);
    setError(null);
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = calendaire
      ? {
          calendaire: true as const,
          annee: Number(annee),
          libelle: libelle.trim() || undefined,
          actif,
        }
      : {
          calendaire: false as const,
          dateDebut,
          dateFin,
          libelle: libelle.trim() || undefined,
          actif,
        };
    const res = editingId
      ? updateExerciceComptable(editingId, {
          calendaire,
          dateDebut: calendaire
            ? bornesExerciceCalendaire(Number(annee)).dateDebut
            : dateDebut,
          dateFin: calendaire
            ? bornesExerciceCalendaire(Number(annee)).dateFin
            : dateFin,
          libelle: libelle.trim() || undefined,
          actif,
        })
      : addExerciceComptable(payload);
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    fermer();
  }

  return (
    <div>
      <ParametresSubnav />
      <PageHeader
        title="Exercices comptables"
        description="Année civile ou exercice à cheval sur deux années. Les numéros de documents (DP, commandes, devis, factures…) reprennent à 1 à chaque nouvel exercice."
        actions={
          <button type="button" className="btn btn-primary" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" />
            Nouvel exercice
          </button>
        }
      />

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5"
        >
          <h2 className="mb-4 font-display text-lg font-semibold">
            {editingId ? "Modifier l’exercice" : "Nouvel exercice"}
          </h2>
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn ${calendaire ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setCalendaire(true)}
            >
              Année civile
            </button>
            <button
              type="button"
              className={`btn ${!calendaire ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setCalendaire(false)}
            >
              À cheval sur 2 années
            </button>
          </div>
          {calendaire ? (
            <label className="mb-4 block max-w-xs text-xs font-semibold text-muted">
              Année
              <input
                type="number"
                min={1990}
                max={2200}
                className="input mt-1"
                value={annee}
                onChange={(e) => setAnnee(e.target.value)}
              />
            </label>
          ) : (
            <div className="mb-4 grid gap-3 sm:grid-cols-2 max-w-xl">
              <label className="block text-xs font-semibold text-muted">
                Début
                <input
                  type="date"
                  className="input mt-1"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Fin
                <input
                  type="date"
                  className="input mt-1"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                />
              </label>
            </div>
          )}
          <label className="mb-4 block max-w-md text-xs font-semibold text-muted">
            Libellé (optionnel)
            <input
              className="input mt-1"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder={
                calendaire
                  ? `Exercice ${annee}`
                  : "Ex. Exercice 2025-2026"
              }
            />
          </label>
          <label className="mb-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={actif}
              onChange={(e) => setActif(e.target.checked)}
            />
            Exercice actif
          </label>
          <div className="flex gap-2">
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
        <p className="text-sm text-muted">
          Aucun exercice. Tant qu’aucun n’est créé, les numéros suivent l’année
          civile (2026, 2027…).
        </p>
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Libellé</th>
                <th>Période</th>
                <th>Type</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((ex) => (
                <tr key={ex.id}>
                  <td className="font-semibold">{ex.code}</td>
                  <td>{libelleExercice(ex)}</td>
                  <td>
                    {formatDate(ex.dateDebut)} → {formatDate(ex.dateFin)}
                  </td>
                  <td>{ex.calendaire ? "Année civile" : "À cheval"}</td>
                  <td>
                    {ex.cloture ? (
                      <span className="badge badge-sand">Clôturé</span>
                    ) : ex.actif ? (
                      <span className="badge badge-success">Actif</span>
                    ) : (
                      <span className="badge badge-sea">Ouvert</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {!ex.cloture && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            if (
                              !confirm(
                                `Clôturer ${libelleExercice(ex)} ? Les numéros de cette période restent figés.`,
                              )
                            ) {
                              return;
                            }
                            const res = cloturerExerciceComptable(ex.id);
                            if (!res.ok) alert(res.reason);
                          }}
                        >
                          Clôturer
                        </button>
                      )}
                      <RowCrudActions
                        onView={() => demarrerEdition(ex)}
                        onEdit={() => demarrerEdition(ex)}
                        onDelete={() => {
                          if (!confirm(`Supprimer ${libelleExercice(ex)} ?`)) return;
                          const res = deleteExerciceComptable(ex.id);
                          if (!res.ok) alert(res.reason);
                        }}
                      />
                    </div>
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
