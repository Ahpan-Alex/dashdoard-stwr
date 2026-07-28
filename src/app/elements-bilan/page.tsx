"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FileSpreadsheet, Plus, Settings, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  totalImmobilisations,
  valeurNetteImmobilisation,
} from "@/lib/calculations";
import { IMMO_CATEGORIES } from "@/lib/commercial";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ImmobilisationCategorie } from "@/lib/types";

export default function ElementsBilanPage() {
  const {
    immobilisations,
    pointsDeVente,
    addImmobilisation,
    deleteImmobilisation,
    parametres,
  } = useStore();

  const [openImmo, setOpenImmo] = useState(false);
  const [immoForm, setImmoForm] = useState({
    libelle: "",
    categorie: "materiel" as ImmobilisationCategorie,
    dateAcquisition: new Date().toISOString().slice(0, 10),
    valeurAcquisition: "",
    dureeAmortissementAns: "5",
    pointDeVenteId: "tous",
    note: "",
  });

  const totauxImmo = totalImmobilisations(immobilisations);

  function onAddImmo(e: FormEvent) {
    e.preventDefault();
    const valeur = Number(immoForm.valeurAcquisition);
    const duree = Number(immoForm.dureeAmortissementAns);
    if (!immoForm.libelle.trim() || valeur <= 0 || duree <= 0) return;

    addImmobilisation({
      libelle: immoForm.libelle.trim(),
      categorie: immoForm.categorie,
      dateAcquisition: new Date(
        `${immoForm.dateAcquisition}T12:00:00`,
      ).toISOString(),
      valeurAcquisition: valeur,
      dureeAmortissementAns: duree,
      pointDeVenteId: immoForm.pointDeVenteId,
      note: immoForm.note.trim() || undefined,
    });

    setOpenImmo(false);
    setImmoForm({
      libelle: "",
      categorie: "materiel",
      dateAcquisition: new Date().toISOString().slice(0, 10),
      valeurAcquisition: "",
      dureeAmortissementAns: "5",
      pointDeVenteId: "tous",
      note: "",
    });
  }

  return (
    <div>
      <PageHeader
        title="Éléments du bilan"
        description={`Acquisitions d'immobilisations — ${parametres.nomEntreprise}. Le bilan initial se paramètre dans Paramétrage.`}
        showPosSelector={false}
        actions={
          <div className="flex gap-2">
            <Link
              href="/parametres/bilan-initial"
              className="btn btn-secondary"
            >
              <Settings className="h-4 w-4" />
              Bilan initial
            </Link>
            <Link href="/bilan" className="btn btn-secondary">
              <FileSpreadsheet className="h-4 w-4" />
              Voir le bilan
            </Link>
          </div>
        }
      />

      <section className="rounded-[var(--radius)] border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Immobilisations
            </h2>
            <p className="text-xs text-muted">
              Acquisitions — amortissement linéaire automatique
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge badge-sea">
              Net {formatCurrency(totauxImmo.net)}
            </span>
            <button
              className="btn btn-primary"
              onClick={() => setOpenImmo(true)}
            >
              <Plus className="h-4 w-4" />
              Acquisition
            </button>
          </div>
        </div>

        {openImmo && (
          <form
            onSubmit={onAddImmo}
            className="grid gap-4 border-b border-line p-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <label className="block text-xs font-semibold text-muted sm:col-span-2">
              Libellé
              <input
                className="input mt-1"
                value={immoForm.libelle}
                onChange={(e) =>
                  setImmoForm({ ...immoForm, libelle: e.target.value })
                }
                required
                placeholder="Ex. Chambre froide, balance…"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Catégorie
              <select
                className="select mt-1"
                value={immoForm.categorie}
                onChange={(e) =>
                  setImmoForm({
                    ...immoForm,
                    categorie: e.target.value as ImmobilisationCategorie,
                  })
                }
              >
                {Object.entries(IMMO_CATEGORIES).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Date d&apos;acquisition
              <input
                type="date"
                className="input mt-1"
                value={immoForm.dateAcquisition}
                onChange={(e) =>
                  setImmoForm({
                    ...immoForm,
                    dateAcquisition: e.target.value,
                  })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Valeur d&apos;acquisition (Ar)
              <input
                type="number"
                min="0"
                step="1000"
                className="input mt-1"
                value={immoForm.valeurAcquisition}
                onChange={(e) =>
                  setImmoForm({
                    ...immoForm,
                    valeurAcquisition: e.target.value,
                  })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Durée d&apos;amortissement (ans)
              <input
                type="number"
                min="1"
                className="input mt-1"
                value={immoForm.dureeAmortissementAns}
                onChange={(e) =>
                  setImmoForm({
                    ...immoForm,
                    dureeAmortissementAns: e.target.value,
                  })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Point de vente
              <select
                className="select mt-1"
                value={immoForm.pointDeVenteId}
                onChange={(e) =>
                  setImmoForm({
                    ...immoForm,
                    pointDeVenteId: e.target.value,
                  })
                }
              >
                <option value="tous">Siège / tous</option>
                {pointsDeVente.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <button type="submit" className="btn btn-primary">
                Enregistrer l&apos;acquisition
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOpenImmo(false)}
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="table-shell border-0">
          <table className="data">
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Catégorie</th>
                <th>Acquisition</th>
                <th>Valeur brute</th>
                <th>Amortissement</th>
                <th>Valeur nette</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {immobilisations.map((immo) => {
                const v = valeurNetteImmobilisation(immo);
                return (
                  <tr key={immo.id}>
                    <td className="font-medium">{immo.libelle}</td>
                    <td>
                      <span className="badge badge-sea">
                        {IMMO_CATEGORIES[immo.categorie]}
                      </span>
                    </td>
                    <td>{formatDate(immo.dateAcquisition)}</td>
                    <td>{formatCurrency(v.brut)}</td>
                    <td>{formatCurrency(v.amortissement)}</td>
                    <td className="font-semibold">
                      {formatCurrency(v.net)}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          if (confirm(`Supprimer « ${immo.libelle} » ?`)) {
                            deleteImmobilisation(immo.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
