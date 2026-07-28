"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function ParametresFournisseursPage() {
  const {
    fournisseurs,
    entrees,
    addFournisseur,
    updateFournisseur,
    deleteFournisseur,
  } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    ville: "",
    specialite: "",
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    addFournisseur({
      nom: form.nom.trim(),
      telephone: form.telephone.trim() || undefined,
      ville: form.ville.trim() || undefined,
      specialite: form.specialite.trim() || undefined,
      actif: true,
    });
    setForm({ nom: "", telephone: "", ville: "", specialite: "" });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Fournisseurs"
        description="Paramétrage des partenaires d'achat."
        showPosSelector={false}
        actions={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau fournisseur
          </button>
        }
      />

      <ParametresSubnav />

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 grid gap-4 rounded-[var(--radius)] border border-sea-200 bg-card p-5 sm:grid-cols-2"
        >
          <label className="block text-xs font-semibold text-muted">
            Nom
            <input
              className="input mt-1"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Spécialité
            <input
              className="input mt-1"
              value={form.specialite}
              onChange={(e) =>
                setForm({ ...form, specialite: e.target.value })
              }
              placeholder="Poissons, crustacés…"
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Téléphone
            <input
              className="input mt-1"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Ville
            <input
              className="input mt-1"
              value={form.ville}
              onChange={(e) => setForm({ ...form, ville: e.target.value })}
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn btn-primary">
              Enregistrer
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

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Spécialité</th>
              <th>Contact</th>
              <th>Entrées</th>
              <th>Achats cumulés</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fournisseurs.map((f) => {
              const lignes = entrees.filter(
                (e) =>
                  e.fournisseurId === f.id ||
                  e.fournisseur.toLowerCase() === f.nom.toLowerCase(),
              );
              const achats = lignes.reduce(
                (s, e) => s + e.quantite * e.prixAchatUnitaire,
                0,
              );
              return (
                <tr key={f.id}>
                  <td className="font-medium">
                    {f.nom}
                    {f.ville && (
                      <span className="mt-0.5 block text-xs font-normal text-muted">
                        {f.ville}
                      </span>
                    )}
                  </td>
                  <td>{f.specialite || "—"}</td>
                  <td>{f.telephone || "—"}</td>
                  <td>{formatNumber(lignes.length, 0)}</td>
                  <td className="font-semibold">{formatCurrency(achats)}</td>
                  <td>
                    <button
                      className={`badge ${f.actif ? "badge-success" : "badge-sand"}`}
                      onClick={() =>
                        updateFournisseur(f.id, { actif: !f.actif })
                      }
                    >
                      {f.actif ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        if (confirm(`Supprimer « ${f.nom} » ?`)) {
                          deleteFournisseur(f.id);
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
    </div>
  );
}
