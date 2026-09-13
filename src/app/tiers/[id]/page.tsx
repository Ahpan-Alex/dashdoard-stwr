"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Contact,
  Scale,
  ScrollText,
  SlidersHorizontal,
} from "lucide-react";
import { ClientContactsPanel } from "@/components/client-contacts-panel";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { StatCard } from "@/components/stat-card";
import { couleurStatutDocument } from "@/lib/commercial";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import {
  assurerTiers,
  balanceAgeeClient,
  balanceAgeeFournisseur,
  estClient,
  estFournisseur,
  filtrerHistoriqueTiers,
  historiqueTiers,
  libelleRolesTiers,
  soldeClientTiers,
  soldeFournisseurTiers,
  type StatutMouvementTiers,
} from "@/lib/tiers";
import type { ClientContact } from "@/lib/types";

type Onglet = "solde" | "historique" | "conditions" | "contacts" | "tableau";

const ONGLETS: { id: Onglet; label: string; icon: typeof Scale }[] = [
  { id: "solde", label: "Soldes", icon: Scale },
  { id: "historique", label: "Historique", icon: ScrollText },
  { id: "conditions", label: "Conditions", icon: SlidersHorizontal },
  { id: "contacts", label: "Contacts", icon: Contact },
  { id: "tableau", label: "Tableau de bord", icon: BarChart3 },
];

export default function TiersDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const {
    clients,
    fournisseurs,
    tiers,
    factures,
    acomptes,
    achats,
    devis,
    commandes,
    bonsDeLivraison,
    parametres,
    updateTiers,
    updatePlafondCredit,
    comptesComptables,
  } = useStore();

  const liste = useMemo(
    () => assurerTiers({ clients, fournisseurs, tiers }),
    [clients, fournisseurs, tiers],
  );
  const tiersActif = liste.find((t) => t.id === id);
  const [onglet, setOnglet] = useState<Onglet>("solde");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<StatutMouvementTiers | "tous">(
    "tous",
  );
  const [plafondSaisi, setPlafondSaisi] = useState<string | null>(null);

  const ctxDocs = {
    devis,
    commandes,
    bonsDeLivraison,
    factures,
    acomptes,
    achats,
    parametres,
  };

  const mouvements = useMemo(
    () =>
      tiersActif
        ? historiqueTiers(tiersActif.id, tiersActif.roles, ctxDocs)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tiersActif, devis, commandes, bonsDeLivraison, factures, acomptes, achats, parametres],
  );
  const mouvementsFiltres = useMemo(
    () =>
      filtrerHistoriqueTiers(mouvements, {
        debut: debut || undefined,
        fin: fin || undefined,
        statut: filtreStatut,
      }),
    [mouvements, debut, fin, filtreStatut],
  );

  if (!tiersActif) {
    return (
      <RequirePermission permission="clients.lire">
        <PageHeader title="Tiers introuvable" showPosSelector={false} />
        <EmptyState
          icon={<Contact className="h-5 w-5" />}
          title="Cette fiche n'existe pas"
          description="Le tiers a peut-être été supprimé."
        />
        <Link href="/tiers" className="btn btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" />
          Retour aux tiers
        </Link>
      </RequirePermission>
    );
  }

  const soldeC = estClient(tiersActif)
    ? soldeClientTiers(tiersActif.id, { factures, acomptes, parametres })
    : null;
  const soldeF = estFournisseur(tiersActif)
    ? soldeFournisseurTiers(tiersActif.id, achats)
    : null;
  const ageeC = estClient(tiersActif)
    ? balanceAgeeClient(tiersActif.id, { factures, acomptes, parametres })
    : [];
  const ageeF = estFournisseur(tiersActif)
    ? balanceAgeeFournisseur(tiersActif.id, achats, parametres)
    : [];
  const plafond = tiersActif.plafondCredit ?? 0;
  const depasse = Boolean(soldeC && plafond > 0 && soldeC.solde > plafond);

  function enregistrerPlafond() {
    const v = Math.max(0, Number(plafondSaisi ?? plafond) || 0);
    const res = updatePlafondCredit(tiersActif!.id, v);
    if (!res.ok) alert(res.reason);
    setPlafondSaisi(null);
  }

  return (
    <RequirePermission permission="clients.lire">
      <Link
        href="/tiers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux tiers
      </Link>

      <PageHeader
        title={tiersActif.nom}
        description={`${libelleRolesTiers(tiersActif)}${
          tiersActif.ville ? ` · ${tiersActif.ville}` : ""
        }`}
        showPosSelector={false}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {tiersActif.code && (
              <span className="badge badge-sand font-mono">{tiersActif.code}</span>
            )}
            <span
              className={`badge ${tiersActif.actif ? "badge-success" : "badge-sand"}`}
            >
              {tiersActif.actif ? "Actif" : "Inactif"}
            </span>
            {depasse && <span className="badge badge-danger">Plafond dépassé</span>}
          </div>
        }
      />

      <nav className="mb-6 flex flex-wrap gap-2">
        {ONGLETS.map(({ id: ongletId, label, icon: Icon }) => (
          <button
            key={ongletId}
            type="button"
            className={`btn ${onglet === ongletId ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setOnglet(ongletId)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {onglet === "solde" && (
        <div className="space-y-6">
          {soldeC && (
            <section className="rounded-[var(--radius)] border border-line bg-card p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">
                Solde client
              </h2>
              <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Factures ouvertes" value={formatCurrency(soldeC.facturesOuvertes)} />
                <StatCard label="Avoirs disponibles" value={formatCurrency(soldeC.avoirsDisponibles)} />
                <StatCard label="Acomptes non imputés" value={formatCurrency(soldeC.acomptesDisponibles)} />
                <StatCard
                  label="Encours"
                  value={formatCurrency(soldeC.solde)}
                  hint={plafond > 0 ? `Plafond ${formatCurrency(plafond)}` : "Sans plafond"}
                />
              </div>
              <h3 className="mb-2 mt-6 text-sm font-semibold">Balance âgée — client</h3>
              <BalanceAgeeTable tranches={ageeC} />
            </section>
          )}
          {soldeF && (
            <section className="rounded-[var(--radius)] border border-line bg-card p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">
                Solde fournisseur
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Factures d'achat ouvertes" value={formatCurrency(soldeF.facturesOuvertes)} />
                <StatCard label="Avoirs disponibles" value={formatCurrency(soldeF.avoirsDisponibles)} />
                <StatCard label="Dettes" value={formatCurrency(soldeF.solde)} />
              </div>
              <h3 className="mb-2 mt-6 text-sm font-semibold">
                Balance âgée — fournisseur
              </h3>
              <BalanceAgeeTable tranches={ageeF} />
            </section>
          )}
        </div>
      )}

      {onglet === "historique" && (
        <div>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-semibold text-muted">
              Du
              <input
                type="date"
                className="input mt-1"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Au
              <input
                type="date"
                className="input mt-1"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Statut
              <select
                className="select mt-1"
                value={filtreStatut}
                onChange={(e) =>
                  setFiltreStatut(e.target.value as StatutMouvementTiers | "tous")
                }
              >
                <option value="tous">Tous</option>
                <option value="paye">Payé</option>
                <option value="impaye">Impayé</option>
                <option value="en_retard">En retard</option>
              </select>
            </label>
          </div>
          {mouvementsFiltres.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-5 w-5" />}
              title="Aucun mouvement"
              description="Les documents et règlements de ce tiers apparaîtront ici."
            />
          ) : (
            <div className="table-shell">
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>N°</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvementsFiltres.map((m) => (
                    <tr key={`${m.categorie}-${m.id}`}>
                      <td>{formatDate(m.date)}</td>
                      <td>
                        <span className="badge badge-sea">{m.categorieLabel}</span>
                      </td>
                      <td className="font-medium">{m.numero}</td>
                      <td>{m.role === "client" ? "Client" : "Fournisseur"}</td>
                      <td>
                        <span className={`badge badge-${couleurStatutDocument(m.statut)}`}>
                          {m.statutLabel}
                        </span>
                      </td>
                      <td className="font-semibold">{formatCurrency(m.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {onglet === "conditions" && (
        <div className="space-y-6">
          {estClient(tiersActif) && (
            <section className="rounded-[var(--radius)] border border-line bg-card p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">
                Conditions de vente
              </h2>
              <dl className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Délai de paiement</dt>
                  <dd className="font-medium">
                    {tiersActif.delaiPaiementClientJours ?? 0} jours
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Remise habituelle</dt>
                  <dd className="font-medium">
                    {tiersActif.remiseHabituelleClientPercent ?? 0} %
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Plafond de crédit</dt>
                  <dd className="flex flex-wrap items-end gap-2">
                    <input
                      type="number"
                      min={0}
                      className="input w-40"
                      value={plafondSaisi ?? String(plafond || "")}
                      onChange={(e) => setPlafondSaisi(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={enregistrerPlafond}
                    >
                      Enregistrer
                    </button>
                  </dd>
                  <p className="mt-1 text-[11px] text-muted">
                    Modifiable par tout utilisateur. Une vente est bloquée si
                    l&apos;encours dépasse ce plafond, sauf dérogation (admin /
                    comptable).
                  </p>
                </div>
              </dl>
            </section>
          )}
          {estFournisseur(tiersActif) && (
            <section className="rounded-[var(--radius)] border border-line bg-card p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">
                Conditions d&apos;achat
              </h2>
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Délai de paiement</dt>
                  <dd className="font-medium">
                    {tiersActif.delaiPaiementFournisseurJours ?? 0} jours
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Remise habituelle</dt>
                  <dd className="font-medium">
                    {tiersActif.remiseHabituelleFournisseurPercent ?? 0} %
                  </dd>
                </div>
              </dl>
            </section>
          )}
          <section className="rounded-[var(--radius)] border border-line bg-card p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">
              Comptes comptables
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              {estClient(tiersActif) && (
                <div>
                  <dt className="text-xs text-muted">Compte client (411)</dt>
                  <dd className="font-medium font-mono">
                    {(() => {
                      const c = comptesComptables.find(
                        (x) => x.id === tiersActif.compteClientId,
                      );
                      return c ? `${c.numero} — ${c.libelle}` : "Non renseigné";
                    })()}
                  </dd>
                </div>
              )}
              {estFournisseur(tiersActif) && (
                <div>
                  <dt className="text-xs text-muted">
                    Compte fournisseur (401)
                  </dt>
                  <dd className="font-medium font-mono">
                    {(() => {
                      const c = comptesComptables.find(
                        (x) => x.id === tiersActif.compteFournisseurId,
                      );
                      return c ? `${c.numero} — ${c.libelle}` : "Non renseigné";
                    })()}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      )}

      {onglet === "contacts" && (
        <ClientContactsPanel
          contacts={tiersActif.contacts ?? []}
          onChange={(contacts: ClientContact[]) =>
            updateTiers(tiersActif.id, { contacts })
          }
        />
      )}

      {onglet === "tableau" && (
        <div className="rounded-[var(--radius)] border border-line bg-card p-5 text-sm text-muted">
          <p>
            Identité : {[tiersActif.adresse, tiersActif.ville].filter(Boolean).join(", ") || "—"}
          </p>
          <p className="mt-1">
            NIF {tiersActif.nif || "—"} · STAT {tiersActif.stat || "—"}
          </p>
          <p className="mt-3">
            {estClient(tiersActif)
              ? `Encours client ${formatCurrency(soldeC?.solde ?? 0)}.`
              : ""}{" "}
            {estFournisseur(tiersActif)
              ? `Dettes fournisseur ${formatCurrency(soldeF?.solde ?? 0)}.`
              : ""}
          </p>
        </div>
      )}
    </RequirePermission>
  );
}

function BalanceAgeeTable({
  tranches,
}: {
  tranches: { label: string; montant: number }[];
}) {
  const total = tranches.reduce((s, t) => s + t.montant, 0);
  return (
    <div className="table-shell">
      <table className="data">
        <thead>
          <tr>
            <th>Tranche</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          {tranches.map((t) => (
            <tr key={t.label}>
              <td>{t.label}</td>
              <td className="font-semibold">{formatCurrency(t.montant)}</td>
            </tr>
          ))}
          <tr>
            <td className="font-medium">Total</td>
            <td className="font-semibold">{formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
