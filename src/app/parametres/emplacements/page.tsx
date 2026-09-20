"use client";

import { useMemo, useState, type FormEvent } from "react";
import { MapPin, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RowCrudActions } from "@/components/row-crud-actions";
import { useAuthStore } from "@/lib/auth-store";
import {
  codeEmplacement,
  emplacementsDuSite,
  libelleEmplacement,
  nbLignesBpSurEmplacement,
} from "@/lib/emplacements-stock";
import { useStore } from "@/lib/store";

export default function ParametresEmplacementsPage() {
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const emplacements = useStore((s) => s.emplacementsStock ?? []);
  const bps = useStore((s) => s.bonsDePreparation ?? []);
  const addEmplacementStock = useStore((s) => s.addEmplacementStock);
  const updateEmplacementStock = useStore((s) => s.updateEmplacementStock);
  const deleteEmplacementStock = useStore((s) => s.deleteEmplacementStock);
  const peutGerer = useAuthStore((s) => s.hasPermission("parametres.gerer"));

  const sites = useMemo(
    () => [...pointsDeVente].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    [pointsDeVente],
  );
  const [filtreSite, setFiltreSite] = useState("tous");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ siteId: "", allee: "", casier: "" });

  const liste = useMemo(() => {
    if (filtreSite === "tous") {
      return [...emplacements].sort(
        (a, b) =>
          (sites.find((s) => s.id === a.siteId)?.nom ?? "").localeCompare(
            sites.find((s) => s.id === b.siteId)?.nom ?? "",
            "fr",
          ) ||
          a.allee.localeCompare(b.allee, "fr", { numeric: true }) ||
          a.casier.localeCompare(b.casier, "fr", { numeric: true }),
      );
    }
    return emplacementsDuSite(emplacements, filtreSite);
  }, [emplacements, filtreSite, sites]);

  const nomSite = (id: string) => sites.find((s) => s.id === id)?.nom ?? id;

  function demarrer(id?: string) {
    const actuel = id ? emplacements.find((e) => e.id === id) : undefined;
    setEditingId(id ?? null);
    setForm({
      siteId: actuel?.siteId ?? (filtreSite !== "tous" ? filtreSite : sites[0]?.id ?? ""),
      allee: actuel?.allee ?? "",
      casier: actuel?.casier ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = editingId
      ? updateEmplacementStock(editingId, form)
      : addEmplacementStock(form);
    if (!res.ok) {
      setError(res.reason ?? "Enregistrement impossible.");
      return;
    }
    setOpen(false);
    setEditingId(null);
  }

  return (
    <div>
      <PageHeader
        title="Emplacements d'entrepôt"
        description="Allées et casiers de picking. Un seul casier actif sur un site est proposé par défaut sur le bon de préparation."
        showPosSelector={false}
        actions={
          peutGerer ? (
            <button type="button" className="btn btn-primary" onClick={() => demarrer()}>
              <Plus className="h-4 w-4" />
              Emplacement
            </button>
          ) : undefined
        }
      />
      <ParametresSubnav />

      <div className="mb-4">
        <label className="text-xs font-semibold text-muted">
          Site
          <select
            className="input mt-1"
            value={filtreSite}
            onChange={(e) => setFiltreSite(e.target.value)}
          >
            <option value="tous">Tous les sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-[var(--radius)] border border-line bg-card p-4"
        >
          <label className="text-xs font-semibold text-muted">
            Site
            <select
              className="input mt-1"
              value={form.siteId}
              onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              required
            >
              <option value="">Choisir…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Allée
            <input
              className="input mt-1 w-28"
              value={form.allee}
              onChange={(e) => setForm({ ...form, allee: e.target.value })}
              required
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Casier
            <input
              className="input mt-1 w-28"
              value={form.casier}
              onChange={(e) => setForm({ ...form, casier: e.target.value })}
              required
            />
          </label>
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
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      )}

      {sites.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-5 w-5" />}
          title="Aucun site"
          description="Créez d'abord un site dans Paramètres → Sites."
        />
      ) : liste.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-5 w-5" />}
          title="Aucun emplacement"
          description="Ajoutez une allée et un casier pour indiquer le picking sur le bon de préparation."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Site</th>
                <th>Allée / casier</th>
                <th>Statut</th>
                <th>BP</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((e) => {
                const nb = nbLignesBpSurEmplacement(bps, e.id);
                return (
                  <tr key={e.id} className={e.actif ? "" : "opacity-60"}>
                    <td className="font-medium">{nomSite(e.siteId)}</td>
                    <td>
                      <p>{codeEmplacement(e)}</p>
                      <p className="text-xs text-muted">{libelleEmplacement(e)}</p>
                    </td>
                    <td>
                      {peutGerer ? (
                        <button
                          type="button"
                          className={`badge ${e.actif ? "badge-success" : "badge-muted"}`}
                          onClick={() =>
                            updateEmplacementStock(e.id, { actif: !e.actif })
                          }
                        >
                          {e.actif ? "Actif" : "Inactif"}
                        </button>
                      ) : (
                        <span className={`badge ${e.actif ? "badge-success" : "badge-muted"}`}>
                          {e.actif ? "Actif" : "Inactif"}
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-muted">
                      {nb > 0 ? `${nb} ligne${nb > 1 ? "s" : ""}` : "—"}
                    </td>
                    <td>
                      {peutGerer && (
                        <RowCrudActions
                          onView={() => demarrer(e.id)}
                          onEdit={() => demarrer(e.id)}
                          onDelete={() => {
                            const res = deleteEmplacementStock(e.id);
                            if (!res.ok) alert(res.reason);
                          }}
                          deleteDisabled={nb > 0}
                          deleteReason="Déjà utilisé sur un bon de préparation."
                        />
                      )}
                    </td>
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
