"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Contact,
  FileText,
  FolderOpen,
  IdCard,
  ScrollText,
  Stamp,
  StickyNote,
} from "lucide-react";
import { ClientContactsPanel } from "@/components/client-contacts-panel";
import { EmptyState } from "@/components/empty-state";
import { KpiBatCards } from "@/components/kpi-bat-cards";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { StatCard } from "@/components/stat-card";
import { TiersAdressePanel } from "@/components/tiers-adresse-panel";
import { TiersBatPanel } from "@/components/tiers-bat-panel";
import { TiersDashboardPanel } from "@/components/tiers-dashboard-panel";
import { TiersFacturesPanel } from "@/components/tiers-factures-panel";
import {
  TiersFiscalitePanel,
  TiersImmatriculationPanel,
  TiersPaiementsPanel,
} from "@/components/tiers-infos-panels";
import { TiersNotesPanel } from "@/components/tiers-notes-panel";
import { TiersStockagePanel } from "@/components/tiers-stockage-panel";
import { HistoriquePrixFournisseur } from "@/components/historique-prix-fournisseur";
import { couleurStatutDocument } from "@/lib/commercial";
import { formatCurrency, formatDate } from "@/lib/format";
import { compteUtiliseEnEcriture } from "@/lib/comptabilite";
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
  tauxUtilisationPlafond,
  avertissementPlafond,
  type StatutMouvementTiers,
} from "@/lib/tiers";
import type { ClientContact } from "@/lib/types";

type Onglet =
  | "infos"
  | "contacts"
  | "factures"
  | "dashboard"
  | "bat"
  | "notes"
  | "stockage";

type SousInfos = "adresse" | "immatriculation" | "fiscalite" | "paiements";

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
    parametresAlertes,
    bonsATirer,
    ventes,
    produits,
    categoriesProduits,
    pointsDeVente,
    updateTiers,
    comptesComptables,
    ecrituresComptables,
    modesPaiement,
  } = useStore();

  const liste = useMemo(
    () => assurerTiers({ clients, fournisseurs, tiers }),
    [clients, fournisseurs, tiers],
  );
  const tiersActif = liste.find((t) => t.id === id);
  const [onglet, setOnglet] = useState<Onglet>("infos");
  const [sousInfos, setSousInfos] = useState<SousInfos>("adresse");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<StatutMouvementTiers | "tous">(
    "tous",
  );

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

  const onglets: { id: Onglet; label: string; icon: typeof FileText }[] = [
    { id: "infos", label: "Infos tiers", icon: IdCard },
    { id: "contacts", label: "Contacts", icon: Contact },
    { id: "factures", label: "Factures", icon: FileText },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    ...(estClient(tiersActif)
      ? [{ id: "bat" as const, label: "BAT", icon: Stamp }]
      : []),
    { id: "notes", label: "Notes & échanges", icon: StickyNote },
    { id: "stockage", label: "Stockage", icon: FolderOpen },
  ];
  const ongletAffiche: Onglet = onglets.some((o) => o.id === onglet)
    ? onglet
    : "infos";

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
  const usagePlafond = estClient(tiersActif)
    ? tauxUtilisationPlafond(tiersActif, { factures, acomptes, parametres })
    : null;
  const nivPlafond = usagePlafond
    ? avertissementPlafond(
        usagePlafond.usagePercent,
        parametresAlertes.ventePlafondCredit?.seuilPercent ?? 80,
        usagePlafond.depasse,
      )
    : "ok";
  const depasse = nivPlafond === "depasse";
  const sauvegarder = (patch: Partial<typeof tiersActif>) =>
    updateTiers(tiersActif.id, patch);

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
          tiersActif.nomCommercial ? ` · ${tiersActif.nomCommercial}` : ""
        }${tiersActif.ville ? ` · ${tiersActif.ville}` : ""}`}
        showPosSelector={false}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {estClient(tiersActif) && (
              <span className="badge badge-sea">Client</span>
            )}
            {estFournisseur(tiersActif) && (
              <span className="badge badge-sea">Fournisseur</span>
            )}
            {tiersActif.code && (
              <span className="badge badge-sand font-mono">{tiersActif.code}</span>
            )}
            <span
              className={`badge ${tiersActif.actif ? "badge-success" : "badge-sand"}`}
            >
              {tiersActif.actif ? "Actif" : "Inactif"}
            </span>
            {depasse && <span className="badge badge-danger">Plafond dépassé</span>}
            {nivPlafond === "avertissement" && (
              <span className="badge badge-sand">
                Alerte plafond {Math.round(usagePlafond?.usagePercent ?? 0)} %
              </span>
            )}
          </div>
        }
      />

      <nav className="mb-6 flex flex-wrap gap-2">
        {onglets.map(({ id: ongletId, label, icon: Icon }) => (
          <button
            key={ongletId}
            type="button"
            className={`btn ${ongletAffiche === ongletId ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setOnglet(ongletId)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {ongletAffiche === "infos" && (
        <div className="space-y-4">
          <nav className="flex flex-wrap gap-2">
            {(
              [
                ["adresse", "Adresse"],
                ["immatriculation", "Immatriculation"],
                ["fiscalite", "Fiscalité"],
                ["paiements", "Paiements"],
              ] as const
            ).map(([idSous, label]) => (
              <button
                key={idSous}
                type="button"
                className={`btn ${sousInfos === idSous ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSousInfos(idSous)}
              >
                {label}
              </button>
            ))}
          </nav>
          {sousInfos === "adresse" && (
            <TiersAdressePanel
              key={tiersActif.id}
              tiers={tiersActif}
              onSave={sauvegarder}
            />
          )}
          {sousInfos === "immatriculation" && (
            <TiersImmatriculationPanel
              key={tiersActif.id}
              tiers={tiersActif}
              comptes={comptesComptables}
              tous={liste}
              pointsDeVente={pointsDeVente}
              compteClientVerrouille={compteUtiliseEnEcriture(
                tiersActif.compteClientId,
                ecrituresComptables,
              )}
              compteFournisseurVerrouille={compteUtiliseEnEcriture(
                tiersActif.compteFournisseurId,
                ecrituresComptables,
              )}
              onSave={sauvegarder}
            />
          )}
          {sousInfos === "fiscalite" && (
            <TiersFiscalitePanel
              key={`${tiersActif.id}-${String(tiersActif.assujettiTVA)}`}
              tiers={tiersActif}
              onSave={sauvegarder}
            />
          )}
          {sousInfos === "paiements" && (
            <TiersPaiementsPanel
              key={tiersActif.id}
              tiers={tiersActif}
              modes={modesPaiement ?? []}
              onSave={sauvegarder}
            />
          )}
        </div>
      )}

      {ongletAffiche === "dashboard" && (
        <div className="space-y-6">
          {estClient(tiersActif) && (
            <>
              <KpiBatCards
                bats={bonsATirer ?? []}
                commandes={commandes}
                delaiRelanceJours={parametresAlertes.batRelance?.delaiJours ?? 7}
                clientId={tiersActif.id}
              />
              <TiersDashboardPanel
                clientId={tiersActif.id}
                factures={factures}
                parametres={parametres}
                ventes={ventes}
                produits={produits}
                categories={categoriesProduits}
                pointsDeVente={pointsDeVente}
              />
            </>
          )}
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
                  hint={
                    plafond > 0
                      ? `Plafond ${formatCurrency(plafond)}${
                          usagePlafond?.usagePercent != null
                            ? ` · ${Math.round(usagePlafond.usagePercent)} %`
                            : ""
                        }`
                      : "Sans plafond"
                  }
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
              <p className="mt-4">
                <Link
                  href={`/achats/lots/nouveau?fournisseur=${tiersActif.id}`}
                  className="btn btn-primary"
                >
                  Paiement groupé des factures ouvertes
                </Link>
              </p>
            </section>
          )}
        </div>
      )}

      {ongletAffiche === "factures" && (
        <div className="space-y-8">
          <TiersFacturesPanel tiers={tiersActif} />

          <div>
          {estFournisseur(tiersActif) && (
            <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
              <h2 className="mb-2 font-display text-lg font-semibold">
                Historique des prix par article
              </h2>
              <p className="mb-3 text-xs text-muted">
                Prix proposés en demande de prix et prix d&apos;achat réalisés avec
                ce fournisseur.
              </p>
              <HistoriquePrixFournisseur fournisseurId={tiersActif.id} />
            </section>
          )}
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
        </div>
      )}

      {ongletAffiche === "contacts" && (
        <ClientContactsPanel
          contacts={tiersActif.contacts ?? []}
          onChange={(contacts: ClientContact[]) =>
            updateTiers(tiersActif.id, { contacts })
          }
        />
      )}

      {ongletAffiche === "notes" && (
        <TiersNotesPanel
          notes={tiersActif.notesEchanges ?? []}
          onSave={(notesEchanges) => sauvegarder({ notesEchanges })}
        />
      )}

      {ongletAffiche === "stockage" && (
        <TiersStockagePanel
          tiers={tiersActif}
          parametres={parametres}
          onSave={sauvegarder}
        />
      )}

      {ongletAffiche === "bat" && estClient(tiersActif) && (
        <TiersBatPanel clientId={tiersActif.id} />
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
