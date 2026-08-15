"use client";

import { useState, type FormEvent } from "react";
import { MapPin, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function ParametresPointsDeVentePage() {
  const { pointsDeVente, addPointDeVente, updatePointDeVente } = useStore();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: "",
    adresse: "",
    ville: "",
    telephone: "",
    objectifCAMensuel: "",
    objectifCAAnnuel: "",
    objectifMargeMensuel: "",
    objectifMargeAnnuel: "",
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setError(null);
    try {
      addPointDeVente({
        nom: form.nom.trim(),
        adresse: form.adresse.trim(),
        ville: form.ville.trim(),
        telephone: form.telephone.trim(),
        actif: true,
        objectifCAMensuel: Math.max(0, Number(form.objectifCAMensuel) || 0),
        objectifCAAnnuel: Math.max(0, Number(form.objectifCAAnnuel) || 0),
        objectifMargeMensuel: Math.max(0, Number(form.objectifMargeMensuel) || 0),
        objectifMargeAnnuel: Math.max(0, Number(form.objectifMargeAnnuel) || 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
      return;
    }
    setForm({
      nom: "",
      adresse: "",
      ville: "",
      telephone: "",
      objectifCAMensuel: "",
      objectifCAAnnuel: "",
      objectifMargeMensuel: "",
      objectifMargeAnnuel: "",
    });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Points de vente"
        description="Création et paramétrage des étals, boutiques et emplacements."
        showPosSelector={false}
        actions={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Ajouter un point de vente
          </button>
        }
      />

      <ParametresSubnav />

      {open && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">
            Nouveau point de vente
          </h2>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-muted">
              Nom
              <input
                className="input mt-1"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                placeholder="Ex. Étal Halles Centrales"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Téléphone
              <input
                className="input mt-1"
                value={form.telephone}
                onChange={(e) =>
                  setForm({ ...form, telephone: e.target.value })
                }
                placeholder="02 XX XX XX XX"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Adresse
              <input
                className="input mt-1"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
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
            <label className="block text-xs font-semibold text-muted">
              Objectif CA mensuel (Ar)
              <input
                type="number"
                min={0}
                step={100000}
                className="input mt-1"
                value={form.objectifCAMensuel}
                onChange={(e) =>
                  setForm({ ...form, objectifCAMensuel: e.target.value })
                }
                placeholder="Ex. 20000000"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Objectif CA annuel (Ar)
              <input
                type="number"
                min={0}
                step={1000000}
                className="input mt-1"
                value={form.objectifCAAnnuel}
                onChange={(e) =>
                  setForm({ ...form, objectifCAAnnuel: e.target.value })
                }
                placeholder="Ex. 240000000"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Objectif marge mensuelle (Ar)
              <input
                type="number"
                min={0}
                step={100000}
                className="input mt-1"
                value={form.objectifMargeMensuel}
                onChange={(e) =>
                  setForm({ ...form, objectifMargeMensuel: e.target.value })
                }
                placeholder="Ex. 5000000"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Objectif marge annuelle (Ar)
              <input
                type="number"
                min={0}
                step={1000000}
                className="input mt-1"
                value={form.objectifMargeAnnuel}
                onChange={(e) =>
                  setForm({ ...form, objectifMargeAnnuel: e.target.value })
                }
                placeholder="Ex. 60000000"
              />
            </label>
            <div className="sm:col-span-2 space-y-3">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                Créer
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Point de vente</th>
              <th>Contact</th>
              <th>CA mois / année</th>
              <th>Marge mois / année</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {pointsDeVente.map((pdv) => (
              <tr key={pdv.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-sea-600" />
                    <div>
                      <p className="font-medium">{pdv.nom}</p>
                      <p className="text-xs text-muted">
                        {[pdv.adresse, pdv.ville].filter(Boolean).join(", ") ||
                          "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td>{pdv.telephone || "—"}</td>
                <td>
                  <p>{formatCurrency(pdv.objectifCAMensuel ?? 0)}</p>
                  <p className="text-xs text-muted">
                    {formatCurrency(pdv.objectifCAAnnuel ?? 0)} / an
                  </p>
                </td>
                <td>
                  <p>{formatCurrency(pdv.objectifMargeMensuel ?? 0)}</p>
                  <p className="text-xs text-muted">
                    {formatCurrency(pdv.objectifMargeAnnuel ?? 0)} / an
                  </p>
                </td>
                <td>
                  <button
                    className={`badge ${pdv.actif ? "badge-success" : "badge-sand"}`}
                    onClick={() =>
                      updatePointDeVente(pdv.id, { actif: !pdv.actif })
                    }
                  >
                    {pdv.actif ? "Actif" : "Inactif"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
