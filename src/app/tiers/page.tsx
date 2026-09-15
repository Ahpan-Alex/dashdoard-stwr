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
import { REGIONS_MADAGASCAR } from "@/lib/madagascar";
import { codeTypeClientDefaut } from "@/lib/types-clients";
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
import {
  FILTRES_LISTE_TIERS_VIDE,
  filtrerListeTiers,
  type FiltresListeTiers,
} from "@/lib/tiers-filtres";
import type { Tiers } from "@/lib/types";

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
    pointsDeVente,
    addTiers,
    updateTiers,
    deleteTiers,
    comptesComptables,
    ecrituresComptables,
    typesClients,
  } = useStore();
  const liste = useMemo(
    () => assurerTiers({ clients, fournisseurs, tiers }),
    [clients, fournisseurs, tiers],
  );
  const [filtres, setFiltres] = useState<FiltresListeTiers>(
    FILTRES_LISTE_TIERS_VIDE,
  );
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(TIERS_FORM_VIDE);

  const ctxFiltres = useMemo(
    () => ({ factures, acomptes, achats, parametres }),
    [factures, acomptes, achats, parametres],
  );

  const visibles = useMemo(
    () => filtrerListeTiers(liste, filtres, ctxFiltres),
    [liste, filtres, ctxFiltres],
  );

  const villes = useMemo(() => {
    const set = new Set<string>();
    for (const t of liste) {
      const v = (t.adressePrincipale?.ville || t.ville || "").trim();
      if (v) set.add(v);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [liste]);

  function patchFiltre<K extends keyof FiltresListeTiers>(
    key: K,
    value: FiltresListeTiers[K],
  ) {
    setFiltres((f) => ({ ...f, [key]: value }));
  }

  function fermer() {
    setOpen(false);
    setEditingId(null);
    setForm(TIERS_FORM_VIDE);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const base = editingId ? liste.find((t) => t.id === editingId) : undefined;
    const payload = payloadTiers(form, base);
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
              setForm({
                ...TIERS_FORM_VIDE,
                type: codeTypeClientDefaut(typesClients),
              });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nouveau tiers
          </button>
        }
      />

      <div className="mb-4 grid gap-3 rounded-[var(--radius)] border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-muted">
          Rôle
          <select
            className="select mt-1"
            value={filtres.role}
            onChange={(e) =>
              patchFiltre("role", e.target.value as FiltresListeTiers["role"])
            }
          >
            <option value="tous">Tous</option>
            <option value="client">Client</option>
            <option value="fournisseur">Fournisseur</option>
            <option value="les_deux">Les deux</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Nom ou raison sociale
          <input
            className="input mt-1"
            value={filtres.nom}
            onChange={(e) => patchFiltre("nom", e.target.value)}
            placeholder="Recherche…"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          NIF / STAT / RCS
          <input
            className="input mt-1"
            value={filtres.immatriculation}
            onChange={(e) => patchFiltre("immatriculation", e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Statut du solde
          <select
            className="select mt-1"
            value={filtres.statutSolde}
            onChange={(e) =>
              patchFiltre(
                "statutSolde",
                e.target.value as FiltresListeTiers["statutSolde"],
              )
            }
          >
            <option value="tous">Tous</option>
            <option value="paye">Payé</option>
            <option value="impaye">Impayé</option>
            <option value="en_retard">En retard</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Balance âgée
          <select
            className="select mt-1"
            value={filtres.trancheAgee}
            onChange={(e) =>
              patchFiltre(
                "trancheAgee",
                e.target.value as FiltresListeTiers["trancheAgee"],
              )
            }
          >
            <option value="tous">Toutes</option>
            <option value="0-30">0–30 j</option>
            <option value="31-60">31–60 j</option>
            <option value="61-90">61–90 j</option>
            <option value="90+">+90 j</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Dépassement plafond
          <select
            className="select mt-1"
            value={filtres.depassePlafond}
            onChange={(e) =>
              patchFiltre(
                "depassePlafond",
                e.target.value as FiltresListeTiers["depassePlafond"],
              )
            }
          >
            <option value="tous">Tous</option>
            <option value="oui">Oui</option>
            <option value="non">Non</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Site de rattachement
          <select
            className="select mt-1"
            value={filtres.siteId}
            onChange={(e) => patchFiltre("siteId", e.target.value)}
          >
            <option value="">Tous</option>
            {pointsDeVente.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Ville
          <input
            className="input mt-1"
            list="tiers-villes"
            value={filtres.ville}
            onChange={(e) => patchFiltre("ville", e.target.value)}
          />
          <datalist id="tiers-villes">
            {villes.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
        <label className="text-xs font-semibold text-muted">
          Région
          <select
            className="select mt-1"
            value={filtres.region}
            onChange={(e) => patchFiltre("region", e.target.value)}
          >
            <option value="">Toutes</option>
            {REGIONS_MADAGASCAR.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Statut
          <select
            className="select mt-1"
            value={filtres.actif}
            onChange={(e) =>
              patchFiltre("actif", e.target.value as FiltresListeTiers["actif"])
            }
          >
            <option value="tous">Tous</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFiltres(FILTRES_LISTE_TIERS_VIDE)}
          >
            Réinitialiser
          </button>
        </div>
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
          pointsDeVente={pointsDeVente}
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
          description="Aucun tiers ne correspond à ces filtres, ou le carnet est vide."
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
