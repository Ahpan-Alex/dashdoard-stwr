"use client";

import { useState, type FormEvent } from "react";
import { MapPin, Plus } from "lucide-react";
import { FicheApercuModal, LigneInfo } from "@/components/fiche-apercu-modal";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RowCrudActions } from "@/components/row-crud-actions";
import { motifLienPointDeVente } from "@/lib/commercial";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { PointDeVente, RoleSite } from "@/lib/types";
import { libelleRolesSite, rolesSiteDuSite, siteEstAtelier } from "@/lib/sites";

const FORM_VIDE = {
  nom: "",
  adresse: "",
  ville: "",
  telephone: "",
  objectifCAMensuel: "",
  objectifCAAnnuel: "",
  objectifMargeMensuel: "",
  objectifMargeAnnuel: "",
  tauxHoraireMod: "",
  capaciteOfSimultanes: "",
  rolesSite: ["point_de_vente"] as RoleSite[],
};

function pdvVersForm(pdv: PointDeVente) {
  return {
    nom: pdv.nom,
    adresse: pdv.adresse,
    ville: pdv.ville,
    telephone: pdv.telephone,
    objectifCAMensuel: String(pdv.objectifCAMensuel || ""),
    objectifCAAnnuel: String(pdv.objectifCAAnnuel || ""),
    objectifMargeMensuel: String(pdv.objectifMargeMensuel || ""),
    objectifMargeAnnuel: String(pdv.objectifMargeAnnuel || ""),
    tauxHoraireMod:
      pdv.tauxHoraireMod && pdv.tauxHoraireMod > 0
        ? String(pdv.tauxHoraireMod)
        : "",
    capaciteOfSimultanes:
      pdv.capaciteOfSimultanes && pdv.capaciteOfSimultanes > 0
        ? String(pdv.capaciteOfSimultanes)
        : "",
    rolesSite: rolesSiteDuSite(pdv),
  };
}

export default function ParametresPointsDeVentePage() {
  const {
    pointsDeVente,
    factures,
    devis,
    commandes,
    bonsDeLivraison,
    entrees,
    ventes,
    immobilisations,
    rapportsFinJournee,
    achats,
    transfertsStock,
    ordresFabrication,
    missionsAchat,
    addPointDeVente,
    updatePointDeVente,
    deletePointDeVente,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [apercuId, setApercuId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VIDE);

  const apercu = pointsDeVente.find((p) => p.id === apercuId);

  function refsPdv() {
    return {
      factures,
      devis,
      commandes,
      bonsDeLivraison,
      entrees,
      ventes,
      immobilisations,
      rapportsFinJournee,
      achats,
      transfertsStock,
      ordresFabrication,
      missionsAchat,
    };
  }

  function fermerForm() {
    setOpen(false);
    setEditingId(null);
    setError(null);
    setForm(FORM_VIDE);
  }

  function ouvrirCreation() {
    setEditingId(null);
    setError(null);
    setForm(FORM_VIDE);
    setOpen(true);
    setApercuId(null);
  }

  function demarrerEdition(pdv: PointDeVente) {
    setEditingId(pdv.id);
    setError(null);
    setForm(pdvVersForm(pdv));
    setOpen(true);
    setApercuId(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    if (form.rolesSite.length === 0) {
      setError("Choisissez au moins un rôle (entrepôt, point de vente ou atelier).");
      return;
    }
    setError(null);
    const payload = {
      nom: form.nom.trim(),
      adresse: form.adresse.trim(),
      ville: form.ville.trim(),
      telephone: form.telephone.trim(),
      objectifCAMensuel: Math.max(0, Number(form.objectifCAMensuel) || 0),
      objectifCAAnnuel: Math.max(0, Number(form.objectifCAAnnuel) || 0),
      objectifMargeMensuel: Math.max(0, Number(form.objectifMargeMensuel) || 0),
      objectifMargeAnnuel: Math.max(0, Number(form.objectifMargeAnnuel) || 0),
      tauxHoraireMod: Math.max(0, Number(form.tauxHoraireMod) || 0),
      capaciteOfSimultanes: Math.max(0, Number(form.capaciteOfSimultanes) || 0),
      rolesSite: form.rolesSite.length ? form.rolesSite : (["point_de_vente"] as RoleSite[]),
    };
    try {
      if (editingId) {
        const res = updatePointDeVente(editingId, payload);
        if (!res.ok) {
          setError(res.reason ?? "Enregistrement impossible.");
          return;
        }
      } else {
        const res = addPointDeVente({ ...payload, actif: true });
        if (!res.ok) {
          setError(res.reason ?? "Enregistrement impossible.");
          return;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      return;
    }
    fermerForm();
  }

  function supprimer(pdv: PointDeVente) {
    const motif = motifLienPointDeVente(pdv.id, refsPdv());
    if (motif) {
      alert(motif);
      return;
    }
    if (!confirm(`Supprimer « ${pdv.nom} » ?`)) return;
    const res = deletePointDeVente(pdv.id);
    if (!res.ok && res.reason) alert(res.reason);
    if (editingId === pdv.id) fermerForm();
    if (apercuId === pdv.id) setApercuId(null);
  }

  return (
    <div>
      <PageHeader
        title="Sites"
        description="Entrepôts, points de vente et ateliers. Chaque site a son propre stock et son propre CUMP — sans limite de nombre."
        showPosSelector={false}
        actions={
          <button className="btn btn-primary" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" />
            Ajouter un site
          </button>
        }
      />

      <ParametresSubnav />

      {open && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">
            {editingId ? "Modifier le site" : "Nouveau site"}
          </h2>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-muted">
              Nom
              <input
                className="input mt-1"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                placeholder="Ex. Entrepôt Tana / Boutique Analakely"
              />
            </label>
            <div className="block text-xs font-semibold text-muted">
              Rôle du site
              <div className="mt-2 flex flex-wrap gap-4 text-sm font-normal text-ink">
                {(
                  [
                    ["entrepot", "Entrepôt de stockage"],
                    ["point_de_vente", "Point de vente"],
                    ["atelier", "Atelier de fabrication"],
                    ["atelier_final", "Atelier final (assemblage / stock vente)"],
                  ] as const
                ).map(([role, label]) => (
                  <label key={role} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.rolesSite.includes(role)}
                      onChange={(e) => {
                        let next = e.target.checked
                          ? [...form.rolesSite, role]
                          : form.rolesSite.filter((r) => r !== role);
                        if (e.target.checked && role === "atelier") {
                          next = next.filter((r) => r !== "atelier_final");
                        }
                        if (e.target.checked && role === "atelier_final") {
                          next = next.filter((r) => r !== "atelier");
                        }
                        setForm({ ...form, rolesSite: next });
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {form.rolesSite.includes("point_de_vente") ? (
                <p className="mt-2 text-[11px] font-normal text-muted">
                  Un point de vente exige au moins un compte de trésorerie (global
                  ou rattaché) dans Paramètres → Trésorerie. Un atelier peut
                  fonctionner sans.
                </p>
              ) : (
                <p className="mt-2 text-[11px] font-normal text-muted">
                  Un atelier peut fonctionner sans compte de trésorerie.
                </p>
              )}
            </div>
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
            {form.rolesSite.includes("atelier") ||
            form.rolesSite.includes("atelier_final") ? (
              <>
              <label className="block text-xs font-semibold text-muted">
                Taux horaire MOD (Ar / h)
                <input
                  type="number"
                  min={0}
                  step={100}
                  className="input mt-1"
                  value={form.tauxHoraireMod}
                  onChange={(e) =>
                    setForm({ ...form, tauxHoraireMod: e.target.value })
                  }
                  placeholder="Ex. 15000"
                />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Capacité atelier (OF simultanés)
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="input mt-1"
                  value={form.capaciteOfSimultanes}
                  onChange={(e) =>
                    setForm({ ...form, capaciteOfSimultanes: e.target.value })
                  }
                  placeholder="Ex. 8 — 0 = pas d'alerte"
                />
              </label>
              </>
            ) : null}
            <div className="space-y-3 sm:col-span-2">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Enregistrer les modifications" : "Créer"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={fermerForm}
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
              <th>Site</th>
              <th>Type</th>
              <th>Contact</th>
              <th>CA mois / année</th>
              <th>Marge mois / année</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pointsDeVente.map((pdv) => {
              const motif = motifLienPointDeVente(pdv.id, refsPdv());
              return (
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
                  <td>
                    <span className="badge badge-sea">{libelleRolesSite(pdv)}</span>
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
                  <td>
                    <RowCrudActions
                      onView={() => {
                        setApercuId(pdv.id);
                        setOpen(false);
                      }}
                      onEdit={() => demarrerEdition(pdv)}
                      onDelete={() => supprimer(pdv)}
                      deleteDisabled={Boolean(motif)}
                      deleteReason={motif ?? undefined}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <FicheApercuModal
        open={Boolean(apercu)}
        title={apercu?.nom ?? ""}
        subtitle="Fiche site"
        onClose={() => setApercuId(null)}
        onEdit={
          apercu
            ? () => {
                demarrerEdition(apercu);
              }
            : undefined
        }
      >
        <LigneInfo
          label="Type"
          value={apercu ? libelleRolesSite(apercu) : "—"}
        />
        <LigneInfo label="Adresse" value={apercu?.adresse} />
        <LigneInfo label="Ville" value={apercu?.ville} />
        <LigneInfo label="Téléphone" value={apercu?.telephone} />
        <LigneInfo
          label="Statut"
          value={apercu?.actif ? "Actif" : "Inactif"}
        />
        <LigneInfo
          label="Objectif CA mensuel"
          value={formatCurrency(apercu?.objectifCAMensuel ?? 0)}
        />
        <LigneInfo
          label="Objectif CA annuel"
          value={formatCurrency(apercu?.objectifCAAnnuel ?? 0)}
        />
        <LigneInfo
          label="Objectif marge mensuelle"
          value={formatCurrency(apercu?.objectifMargeMensuel ?? 0)}
        />
        <LigneInfo
          label="Objectif marge annuelle"
          value={formatCurrency(apercu?.objectifMargeAnnuel ?? 0)}
        />
        {apercu && siteEstAtelier(apercu) ? (
          <LigneInfo
            label="Capacité atelier (OF simultanés)"
            value={String(apercu.capaciteOfSimultanes ?? 0)}
          />
        ) : null}
      </FicheApercuModal>
    </div>
  );
}
