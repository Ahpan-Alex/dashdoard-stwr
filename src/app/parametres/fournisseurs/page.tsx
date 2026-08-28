"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import {
  FournisseurFicheForm,
  FOURNISSEUR_FORM_VIDE,
  fournisseurVersForm,
  payloadFournisseur,
} from "@/components/fournisseur-fiche-form";
import { FicheApercuModal, LigneInfo } from "@/components/fiche-apercu-modal";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RowCrudActions } from "@/components/row-crud-actions";
import { motifLienFournisseur } from "@/lib/commercial";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Fournisseur } from "@/lib/types";

export default function ParametresFournisseursPage() {
  const {
    fournisseurs,
    entrees,
    achats,
    addFournisseur,
    updateFournisseur,
    deleteFournisseur,
  } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [apercuId, setApercuId] = useState<string | null>(null);
  const [form, setForm] = useState(FOURNISSEUR_FORM_VIDE);
  const apercu = fournisseurs.find((x) => x.id === apercuId);

  function fermerForm() {
    setOpen(false);
    setEditingId(null);
    setForm(FOURNISSEUR_FORM_VIDE);
  }

  function ouvrirCreation() {
    setEditingId(null);
    setForm(FOURNISSEUR_FORM_VIDE);
    setOpen(true);
  }

  function demarrerEdition(f: Fournisseur) {
    setEditingId(f.id);
    setForm(fournisseurVersForm(f));
    setOpen(true);
    setApercuId(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    const payload = payloadFournisseur(form);
    if (editingId) {
      updateFournisseur(editingId, payload);
    } else {
      addFournisseur({ ...payload, actif: true });
    }
    fermerForm();
  }

  function supprimer(f: Fournisseur) {
    const motif = motifLienFournisseur(f.id, f.nom, entrees, achats);
    if (motif) {
      alert(motif);
      return;
    }
    if (!confirm(`Supprimer « ${f.nom} » ?`)) return;
    const res = deleteFournisseur(f.id);
    if (!res.ok && res.reason) alert(res.reason);
    if (editingId === f.id) fermerForm();
    if (apercuId === f.id) setApercuId(null);
  }

  return (
    <div>
      <PageHeader
        title="Fournisseurs"
        description="Création, modification et suppression des partenaires d'achat."
        showPosSelector={false}
        actions={
          <button className="btn btn-primary" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" />
            Nouveau fournisseur
          </button>
        }
      />

      <ParametresSubnav />

      {open && (
        <FournisseurFicheForm
          form={form}
          setForm={setForm}
          onSubmit={onSubmit}
          onCancel={fermerForm}
          submitLabel={editingId ? "Enregistrer les modifications" : "Enregistrer"}
        />
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
              <th>Actions</th>
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
              const motif = motifLienFournisseur(f.id, f.nom, entrees, achats);
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
                  <td className="text-sm">
                    {f.telephone || "—"}
                    {f.email && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {f.email}
                      </span>
                    )}
                  </td>
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
                    <RowCrudActions
                      onView={() => {
                        setApercuId(f.id);
                        setOpen(false);
                      }}
                      onEdit={() => demarrerEdition(f)}
                      onDelete={() => supprimer(f)}
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
        subtitle="Fiche fournisseur"
        onClose={() => setApercuId(null)}
        onEdit={apercu ? () => demarrerEdition(apercu) : undefined}
      >
        <LigneInfo label="Spécialité" value={apercu?.specialite} />
        <LigneInfo label="Téléphone" value={apercu?.telephone} />
        <LigneInfo label="Email" value={apercu?.email} />
        <LigneInfo label="Adresse" value={apercu?.adresse} />
        <LigneInfo label="Ville" value={apercu?.ville} />
        <LigneInfo label="NIF" value={apercu?.nif} />
        <LigneInfo
          label="Statut"
          value={apercu?.actif ? "Actif" : "Inactif"}
        />
      </FicheApercuModal>
    </div>
  );
}
