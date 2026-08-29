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
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { TdCol, ThCol } from "@/components/table-col";
import { RowCrudActions } from "@/components/row-crud-actions";
import { motifLienFournisseur } from "@/lib/commercial";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useAffichageTable } from "@/lib/use-affichage-table";
import type { Fournisseur } from "@/lib/types";

export default function FournisseursPage() {
  const {
    fournisseurs,
    entrees,
    achats,
    addFournisseur,
    updateFournisseur,
    deleteFournisseur,
  } = useStore();
  const { visible } = useAffichageTable("fournisseurs");
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
        description="Partenaires d'achat : créez, modifiez ou désactivez une fiche. La suppression n'est possible que s'il n'y a pas encore d'entrées de stock."
        showPosSelector={false}
        actions={
          <button className="btn btn-primary" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" />
            Nouveau fournisseur
          </button>
        }
      />

      {open && (
        <FournisseurFicheForm
          form={form}
          setForm={setForm}
          onSubmit={onSubmit}
          onCancel={fermerForm}
          submitLabel={editingId ? "Enregistrer les modifications" : "Enregistrer"}
        />
      )}

      <TableAffichageBarre
        tableId="fournisseurs"
        lignes={fournisseurs.map((f) => {
          const lignes = entrees.filter(
            (e) =>
              e.fournisseurId === f.id ||
              e.fournisseur.toLowerCase() === f.nom.toLowerCase(),
          );
          const achatsCumules = lignes.reduce(
            (s, e) => s + e.quantite * e.prixAchatUnitaire,
            0,
          );
          return {
            nom: f.nom,
            specialite: f.specialite || "",
            contact: [f.telephone, f.email].filter(Boolean).join(" · "),
            entrees: String(lignes.length),
            achats: formatCurrency(achatsCumules),
            statut: f.actif ? "Actif" : "Inactif",
          };
        })}
        fichier="fournisseurs"
        titre="Fournisseurs"
      />

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <ThCol id="nom" show={visible}>Fournisseur</ThCol>
              <ThCol id="specialite" show={visible}>Spécialité</ThCol>
              <ThCol id="contact" show={visible}>Contact</ThCol>
              <ThCol id="entrees" show={visible}>Entrées</ThCol>
              <ThCol id="achats" show={visible}>Achats cumulés</ThCol>
              <ThCol id="statut" show={visible}>Statut</ThCol>
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
              const achatsCumules = lignes.reduce(
                (s, e) => s + e.quantite * e.prixAchatUnitaire,
                0,
              );
              const motif = motifLienFournisseur(f.id, f.nom, entrees, achats);
              return (
                <tr key={f.id}>
                  <TdCol id="nom" show={visible} className="font-medium">
                    {f.nom}
                    {f.ville && (
                      <span className="mt-0.5 block text-xs font-normal text-muted">
                        {f.ville}
                      </span>
                    )}
                  </TdCol>
                  <TdCol id="specialite" show={visible}>{f.specialite || "—"}</TdCol>
                  <TdCol id="contact" show={visible} className="text-sm">
                    {f.telephone || "—"}
                    {f.email && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {f.email}
                      </span>
                    )}
                  </TdCol>
                  <TdCol id="entrees" show={visible}>{formatNumber(lignes.length, 0)}</TdCol>
                  <TdCol id="achats" show={visible} className="font-semibold">{formatCurrency(achatsCumules)}</TdCol>
                  <TdCol id="statut" show={visible}>
                    <button
                      className={`badge ${f.actif ? "badge-success" : "badge-sand"}`}
                      onClick={() =>
                        updateFournisseur(f.id, { actif: !f.actif })
                      }
                    >
                      {f.actif ? "Actif" : "Inactif"}
                    </button>
                  </TdCol>
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
