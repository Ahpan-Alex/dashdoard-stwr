"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Search, Shield } from "lucide-react";
import { AdminSubnav } from "@/components/admin-subnav";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";
import { formatDateTime } from "@/lib/format";
import {
  ACTIONS_JOURNAL_AUDIT,
  ACTION_JOURNAL_LABELS,
  CATEGORIES_JOURNAL_AUDIT,
  CATEGORIE_JOURNAL_LABELS,
  CATEGORIES_RETENTION_ILLIMITEE,
  imprimerPdfJournalAudit,
  libelleActionAudit,
  libelleCategorieAudit,
  libelleModuleAudit,
  listerJournalAudit,
  MODULES_JOURNAL_AUDIT,
  MODULE_JOURNAL_LABELS,
  telechargerCsvJournalAudit,
  texteAvantApres,
  type ActionJournalAudit,
  type CategorieJournalAudit,
  type EntreeJournalAudit,
  type ModuleJournalAudit,
} from "@/lib/journal-audit";
import { useStore } from "@/lib/store";

export default function JournalAuditPage() {
  return (
    <RequirePermission permission="audit.lire">
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const users = useAuthStore((s) => s.users);
  const refreshUsers = useAuthStore((s) => s.refreshUsers);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const [userId, setUserId] = useState("");
  const [categorie, setCategorie] = useState<CategorieJournalAudit | "">("");
  const [action, setAction] = useState<ActionJournalAudit | "">("");
  const [module, setModule] = useState<ModuleJournalAudit | "">("");
  const [siteId, setSiteId] = useState("");
  const [objetSaisi, setObjetSaisi] = useState("");
  const [objet, setObjet] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<EntreeJournalAudit[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const pageSize = 50;

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await listerJournalAudit({
        userId: userId || undefined,
        categorie,
        action,
        module,
        siteId: siteId || undefined,
        objet,
        debut,
        fin,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Lecture du journal impossible.");
      setItems([]);
      setTotal(0);
    } finally {
      setChargement(false);
    }
  }, [userId, categorie, action, module, siteId, objet, debut, fin, page]);

  useEffect(() => {
    void refreshUsers().catch(() => undefined);
  }, [refreshUsers]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setObjet(objetSaisi);
    }, 300);
    return () => window.clearTimeout(t);
  }, [objetSaisi]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  async function exporter(format: "csv" | "pdf") {
    const res = await listerJournalAudit({
      userId: userId || undefined,
      categorie,
      action,
      module,
      siteId: siteId || undefined,
      objet,
      debut,
      fin,
      export: true,
    });
    if (format === "csv") telechargerCsvJournalAudit(res.items);
    else await imprimerPdfJournalAudit(res.items);
  }

  return (
    <div>
      <PageHeader
        title="Journal d'audit"
        description="Actions sensibles, immuables, isolées par entreprise. Aucune modification ni purge manuelle, y compris pour un administrateur."
        showPosSelector={false}
      />
      <AdminSubnav />

      <div className="mb-4 grid gap-3 rounded-[var(--radius)] border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-muted">
          Utilisateur
          <select
            className="select mt-1"
            value={userId}
            onChange={(e) => {
              setPage(1);
              setUserId(e.target.value);
            }}
          >
            <option value="">Tous</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom}
              </option>
            ))}
            {items
              .filter(
                (e) =>
                  e.userId && !users.some((u) => u.id === e.userId),
              )
              .filter(
                (e, i, arr) =>
                  arr.findIndex((x) => x.userId === e.userId) === i,
              )
              .map((e) => (
                <option key={e.userId!} value={e.userId!}>
                  {e.userNom}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Catégorie
          <select
            className="select mt-1"
            value={categorie}
            onChange={(e) => {
              setPage(1);
              setCategorie(e.target.value as CategorieJournalAudit | "");
            }}
          >
            <option value="">Toutes</option>
            {CATEGORIES_JOURNAL_AUDIT.map((c) => (
              <option key={c} value={c}>
                {CATEGORIE_JOURNAL_LABELS[c]}
                {CATEGORIES_RETENTION_ILLIMITEE.includes(c) ? " (illimitée)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Type d'action
          <select
            className="select mt-1"
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value as ActionJournalAudit | "");
            }}
          >
            <option value="">Toutes</option>
            {ACTIONS_JOURNAL_AUDIT.map((a) => (
              <option key={a} value={a}>
                {ACTION_JOURNAL_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Module
          <select
            className="select mt-1"
            value={module}
            onChange={(e) => {
              setPage(1);
              setModule(e.target.value as ModuleJournalAudit | "");
            }}
          >
            <option value="">Tous</option>
            {MODULES_JOURNAL_AUDIT.map((m) => (
              <option key={m} value={m}>
                {MODULE_JOURNAL_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Site
          <select
            className="select mt-1"
            value={siteId}
            onChange={(e) => {
              setPage(1);
              setSiteId(e.target.value);
            }}
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
          Du
          <input
            type="date"
            className="input mt-1"
            value={debut}
            onChange={(e) => {
              setPage(1);
              setDebut(e.target.value);
            }}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Au
          <input
            type="date"
            className="input mt-1"
            value={fin}
            onChange={(e) => {
              setPage(1);
              setFin(e.target.value);
            }}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Objet concerné
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted" />
            <input
              className="input pl-8"
              value={objetSaisi}
              placeholder="Nom, n°, identifiant…"
              onChange={(e) => setObjetSaisi(e.target.value)}
            />
          </span>
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {total} entrée(s) — page {page} / {pages}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/parametres/audit" className="btn btn-secondary">
            Rétention
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => void exporter("csv")}>
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void exporter("pdf")}>
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      {erreur && <p className="mb-3 text-sm text-danger">{erreur}</p>}

      {chargement && items.length === 0 ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-5 w-5" />}
          title="Aucune entrée"
          description="Aucune action sensible ne correspond à ces filtres."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Objet</th>
                <th>Avant → après</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{formatDateTime(e.date)}</td>
                  <td>{e.userNom}</td>
                  <td>
                    <span className="badge badge-sea">{libelleCategorieAudit(e.categorie)}</span>
                    <p className="mt-1 text-sm">{libelleActionAudit(e.action)}</p>
                    <p className="text-[11px] text-muted">{libelleModuleAudit(e.module)}</p>
                  </td>
                  <td>
                    {e.objetHref && e.objetId ? (
                      <Link href={e.objetHref} className="text-sea-700 underline">
                        {e.objetLibelle || e.objetId}
                      </Link>
                    ) : (
                      e.objetLibelle || e.objetId || "—"
                    )}
                    {e.detail && (
                      <p className="text-[11px] text-muted">{e.detail}</p>
                    )}
                  </td>
                  <td className="max-w-[18rem] text-sm">{texteAvantApres(e)}</td>
                  <td>{e.siteLibelle || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
