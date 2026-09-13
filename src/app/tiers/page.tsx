"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import {
  TIERS_FORM_VIDE,
  TiersFicheForm,
  payloadTiers,
  tiersVersForm,
} from "@/components/tiers-fiche-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";
import {
  assurerTiers,
  estClient,
  estFournisseur,
  libelleRolesTiers,
  soldeClientTiers,
  soldeFournisseurTiers,
} from "@/lib/tiers";
import { compteUtiliseEnEcriture } from "@/lib/comptabilite";
import type { RoleTiers, Tiers } from "@/lib/types";

export default function TiersPage() {
  return (
    <RequirePermission permission="clients.lire">
      <TiersListe />
    </RequirePermission>
  );
}

function TiersListe() {
  const {
    clients,
    fournisseurs,
    tiers,
    factures,
    acomptes,
    achats,
    parametres,
    addTiers,
    updateTiers,
    deleteTiers,
    comptesComptables,
    ecrituresComptables,
  } = useStore();
  const liste = useMemo(
    () => assurerTiers({ clients, fournisseurs, tiers }),
    [clients, fournisseurs, tiers],
  );
  const [filtre, setFiltre] = useState<RoleTiers | "tous">("tous");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(TIERS_FORM_VIDE);

  const visibles = liste.filter((t) => {
    if (filtre === "tous") return true;
    return t.roles.includes(filtre);
  });

  function fermer() {
    setOpen(false);
    setEditingId(null);
    setForm(TIERS_FORM_VIDE);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = payloadTiers(form);
    if (editingId) {
      const res = updateTiers(editingId, payload);
      if (!res.ok) {
        alert(res.reason);
        return;
      }
    } else {
      const res = addTiers({ ...payload, actif: true });
      if (!res.ok) {
        alert(res.reason);
        return;
      }
    }
    fermer();
  }

  function editer(t: Tiers) {
    setEditingId(t.id);
    setForm(tiersVersForm(t));
    setOpen(true);
  }

  function supprimer(t: Tiers) {
    if (!confirm(`Supprimer « ${t.nom} » ?`)) return;
    const res = deleteTiers(t.id);
    if (!res.ok && res.reason) alert(res.reason);
    if (editingId === t.id) fermer();
  }

  return (
    <div>
      <PageHeader
        title="Tiers"
        description="Fiche unique : client, fournisseur, ou les deux. Soldes et historique restent distincts par rôle."
        showPosSelector={false}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingId(null);
              setForm(TIERS_FORM_VIDE);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nouveau tiers
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["tous", "Tous"],
            ["client", "Clients"],
            ["fournisseur", "Fournisseurs"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn ${filtre === id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltre(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {open && (
        <TiersFicheForm
          form={form}
          setForm={setForm}
          onSubmit={onSubmit}
          onCancel={fermer}
          submitLabel={editingId ? "Enregistrer" : "Créer"}
          comptes={comptesComptables}
          tiers={liste}
          ignoreTiersId={editingId ?? undefined}
          compteClientVerrouille={compteUtiliseEnEcriture(
            form.compteClientId,
            ecrituresComptables,
          )}
          compteFournisseurVerrouille={compteUtiliseEnEcriture(
            form.compteFournisseurId,
            ecrituresComptables,
          )}
        />
      )}

      {visibles.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Aucun tiers"
          description="Créez une fiche pour un client, un fournisseur, ou les deux."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôles</th>
                <th>Solde client</th>
                <th>Solde fournisseur</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.map((t) => {
                const sc = estClient(t)
                  ? soldeClientTiers(t.id, { factures, acomptes, parametres })
                  : null;
                const sf = estFournisseur(t)
                  ? soldeFournisseurTiers(t.id, achats)
                  : null;
                return (
                  <tr key={t.id}>
                    <td className="font-medium">
                      <Link href={`/tiers/${t.id}`} className="hover:underline">
                        {t.code ? `${t.code} — ${t.nom}` : t.nom}
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-sea">{libelleRolesTiers(t)}</span>
                    </td>
                    <td>{sc ? formatCurrency(sc.solde) : "—"}</td>
                    <td>{sf ? formatCurrency(sf.solde) : "—"}</td>
                    <td>
                      <span
                        className={`badge ${t.actif ? "badge-success" : "badge-sand"}`}
                      >
                        {t.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/tiers/${t.id}`} className="btn btn-secondary">
                          Fiche
                        </Link>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => editer(t)}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => supprimer(t)}
                        >
                          Supprimer
                        </button>
                      </div>
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
