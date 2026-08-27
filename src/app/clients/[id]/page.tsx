"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Contact,
  FileText,
  Package,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClientContactsPanel } from "@/components/client-contacts-panel";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { StatCard } from "@/components/stat-card";
import {
  CLIENT_TYPES,
  couleurStatutDocument,
  creancesDunClient,
  totalAcomptesClient,
} from "@/lib/commercial";
import {
  caMensuelClient,
  caParArticleClient,
  documentsCommerciauxClient,
  ventesDuClient,
  type CategorieDocumentClient,
} from "@/lib/client-fiche";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ClientContact } from "@/lib/types";

type Onglet = "contacts" | "tableau" | "documents";

const ONGLETS: { id: Onglet; label: string; icon: typeof Contact }[] = [
  { id: "contacts", label: "Liste des contacts", icon: Contact },
  { id: "tableau", label: "Tableau de bord", icon: BarChart3 },
  { id: "documents", label: "Documents commerciaux", icon: FileText },
];

const FILTRES_DOCS: { id: CategorieDocumentClient | "tous"; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "devis", label: "Devis" },
  { id: "commande", label: "Bons de commande" },
  { id: "bon_de_livraison", label: "Bons de livraison" },
  { id: "facture", label: "Factures" },
  { id: "acompte", label: "Acomptes" },
];

export default function ClientDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");

  const {
    clients,
    produits,
    ventes,
    devis,
    commandes,
    bonsDeLivraison,
    factures,
    acomptes,
    parametres,
    updateClient,
  } = useStore();

  const client = clients.find((c) => c.id === id);
  const [onglet, setOnglet] = useState<Onglet>("contacts");

  const anneesDisponibles = useMemo(() => {
    const set = new Set<number>();
    for (const v of ventesDuClient(ventes, id)) {
      set.add(new Date(v.date).getFullYear());
    }
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [ventes, id]);

  const [annee, setAnnee] = useState(() => new Date().getFullYear());

  const caMensuel = useMemo(
    () => caMensuelClient(ventes, id, annee),
    [ventes, id, annee],
  );
  const caArticles = useMemo(
    () => caParArticleClient(ventes, produits, id, annee),
    [ventes, produits, id, annee],
  );
  const documents = useMemo(
    () =>
      documentsCommerciauxClient(id, {
        devis,
        commandes,
        bonsDeLivraison,
        factures,
        acomptes,
        parametres,
      }),
    [id, devis, commandes, bonsDeLivraison, factures, acomptes, parametres],
  );

  const [filtreDoc, setFiltreDoc] = useState<CategorieDocumentClient | "tous">(
    "tous",
  );

  if (!client) {
    return (
      <RequirePermission permission="clients.lire">
        <PageHeader title="Client introuvable" showPosSelector={false} />
        <EmptyState
          icon={<Contact className="h-5 w-5" />}
          title="Cette fiche client n'existe pas"
          description="Le client a peut-être été supprimé."
        />
        <Link href="/clients" className="btn btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" />
          Retour aux clients
        </Link>
      </RequirePermission>
    );
  }

  const caAnnee = caMensuel.reduce((s, m) => s + m.montant, 0);
  const caTotalHistorique = ventesDuClient(ventes, id).reduce(
    (s, v) => s + v.quantite * v.prixUnitaire,
    0,
  );
  const totalArticlesCA = caArticles.reduce((s, l) => s + l.montant, 0);
  const meilleurArticle = caArticles[0];
  const acomptesClient = totalAcomptesClient(id, acomptes);
  const resteDu = creancesDunClient(id, factures, parametres, acomptes);

  const documentsFiltres =
    filtreDoc === "tous"
      ? documents
      : documents.filter((d) => d.categorie === filtreDoc);

  const compteParCategorie = (cat: CategorieDocumentClient | "tous") =>
    cat === "tous"
      ? documents.length
      : documents.filter((d) => d.categorie === cat).length;

  return (
    <RequirePermission permission="clients.lire">
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Link>

      <PageHeader
        title={client.nom}
        description={`Fiche client — ${CLIENT_TYPES[client.type]}${
          client.ville ? ` · ${client.ville}` : ""
        }`}
        showPosSelector={false}
        actions={
          <div className="flex items-center gap-2">
            {client.code && (
              <span className="badge badge-sand font-mono">{client.code}</span>
            )}
            <span
              className={`badge ${client.actif ? "badge-success" : "badge-sand"}`}
            >
              {client.actif ? "Actif" : "Inactif"}
            </span>
          </div>
        }
      />

      <nav className="mb-6 flex flex-wrap gap-2">
        {ONGLETS.map(({ id: ongletId, label, icon: Icon }) => (
          <button
            key={ongletId}
            className={`btn ${onglet === ongletId ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setOnglet(ongletId)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {onglet === "contacts" && (
        <ClientContactsPanel
          contacts={client.contacts ?? []}
          onChange={(contacts: ClientContact[]) =>
            updateClient(client.id, { contacts })
          }
        />
      )}

      {onglet === "tableau" && (
        <div>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Année
            </span>
            {anneesDisponibles.map((y) => (
              <button
                key={y}
                className={`btn ${annee === y ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setAnnee(y)}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={`CA ${annee}`}
              value={formatCurrency(caAnnee)}
              hint="Chiffre d'affaires HT réalisé"
            />
            <StatCard
              label="CA total historique"
              value={formatCurrency(caTotalHistorique)}
              hint="Toutes périodes confondues"
            />
            <StatCard
              label="Acomptes encaissés"
              value={formatCurrency(acomptesClient)}
            />
            <StatCard
              label="Reste dû"
              value={formatCurrency(resteDu)}
              hint={resteDu > 0 ? "Créances en cours" : "Aucune créance"}
            />
          </div>

          <div className="mt-6 rounded-[var(--radius)] border border-line bg-card p-5">
            <h2 className="mb-1 font-display text-lg font-semibold">
              CA mensuel {annee}
            </h2>
            <p className="mb-4 text-xs text-muted">
              Chiffre d&apos;affaires HT réalisé avec {client.nom}, mois par mois.
            </p>
            <div className="h-72">
              {caAnnee === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted">
                  Aucune vente facturée à ce client en {annee}.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={caMensuel} margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d4e5e9" />
                    <XAxis
                      dataKey="mois"
                      tick={{ fontSize: 11, fill: "#5a7380" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#5a7380" }}
                      axisLine={false}
                      tickLine={false}
                      width={72}
                      tickFormatter={(v) => formatCompactCurrency(Number(v))}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #d4e5e9",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="montant" fill="#1b7d8f" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-[var(--radius)] border border-line bg-card p-5">
            <h2 className="mb-1 font-display text-lg font-semibold">
              CA par article — {annee}
            </h2>
            <p className="mb-4 text-xs text-muted">
              Produits les plus achetés par ce client.
              {meilleurArticle
                ? ` Top : ${meilleurArticle.nom} (${formatCurrency(meilleurArticle.montant)}).`
                : ""}
            </p>
            {caArticles.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                Aucun article facturé à ce client en {annee}.
              </p>
            ) : (
              <>
                <div className="mb-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={caArticles.slice(0, 10).map((l) => ({
                        name:
                          l.nom.length > 18 ? `${l.nom.slice(0, 16)}…` : l.nom,
                        montant: l.montant,
                      }))}
                      layout="vertical"
                      margin={{ left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d4e5e9" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#5a7380" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatCompactCurrency(Number(v))}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 11, fill: "#5a7380" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) =>
                          formatCurrency(Number(value ?? 0))
                        }
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #d4e5e9",
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="montant"
                        fill="#1b7d8f"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="table-shell">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Article</th>
                        <th>Quantité</th>
                        <th>Chiffre d&apos;affaires</th>
                        <th>Part</th>
                      </tr>
                    </thead>
                    <tbody>
                      {caArticles.map((l) => (
                        <tr key={l.id}>
                          <td className="font-medium">{l.nom}</td>
                          <td>
                            {formatNumber(l.quantite)} {l.unite}
                          </td>
                          <td className="font-semibold">
                            {formatCurrency(l.montant)}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-sea-100">
                                <div
                                  className="h-full rounded-full bg-sea-600"
                                  style={{
                                    width: `${
                                      totalArticlesCA > 0
                                        ? (l.montant / totalArticlesCA) * 100
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted">
                                {totalArticlesCA > 0
                                  ? formatPercent(l.montant / totalArticlesCA)
                                  : "—"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {onglet === "documents" && (
        <div>
          <div className="mb-6 flex flex-wrap gap-2">
            {FILTRES_DOCS.map((f) => (
              <button
                key={f.id}
                className={`btn ${filtreDoc === f.id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setFiltreDoc(f.id)}
              >
                {f.label}
                <span className="ml-1.5 rounded-full bg-black/10 px-1.5 text-xs">
                  {compteParCategorie(f.id)}
                </span>
              </button>
            ))}
          </div>

          {documentsFiltres.length === 0 ? (
            <EmptyState
              icon={<Package className="h-5 w-5" />}
              title="Aucun document commercial"
              description="Les devis, commandes, bons de livraison, factures et acomptes de ce client apparaîtront ici."
            />
          ) : (
            <div className="table-shell">
              <table className="data">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Numéro</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Montant TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {documentsFiltres.map((d) => (
                    <tr key={`${d.categorie}-${d.id}`}>
                      <td>
                        <span className="badge badge-sea">
                          {d.categorieLabel}
                        </span>
                      </td>
                      <td className="font-medium">{d.numero}</td>
                      <td>{formatDate(d.date)}</td>
                      <td>
                        <span
                          className={`badge badge-${couleurStatutDocument(d.statut)}`}
                        >
                          {d.statutLabel}
                        </span>
                      </td>
                      <td className="font-semibold">
                        {formatCurrency(d.montant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </RequirePermission>
  );
}
