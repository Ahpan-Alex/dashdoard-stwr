"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import { downloadCsv } from "@/lib/csv";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";
import type { AuthAuditEntry } from "@/lib/auth/types";
import type { JournalAudit } from "@/lib/types";

const CONNEXION_ACTIONS = new Set([
  "login_ok",
  "login_fail",
  "logout",
  "lock",
  "unlock",
  "session_revoke",
  "password_reset_request",
  "password_reset_ok",
  "password_change",
]);

const ACTION_LABELS: Record<string, string> = {
  login_ok: "Connexion OK",
  login_fail: "Échec connexion",
  logout: "Déconnexion",
  lock: "Verrouillage",
  unlock: "Déverrouillage",
  password_reset_request: "Demande reset MDP",
  password_reset_ok: "Reset MDP OK",
  password_change: "Changement MDP",
  user_create: "Création utilisateur",
  user_update: "MAJ utilisateur",
  user_deactivate: "Désactivation",
  session_revoke: "Révocation session",
  business_reset: "Reset données métier",
  facture_brouillon: "Facture brouillon",
  facture_proforma: "Facture proforma",
  facture_validee: "Facture validée",
  facture_envoyee: "Facture envoyée",
  facture_paiement: "Paiement facture",
  facture_avoir: "Avoir",
  facture_annulee: "Facture annulée",
  facture_modifiee: "Facture modifiée",
  facture_supprimee: "Facture supprimée",
  autre: "Autre",
};

const PURGE_DAYS = 90;

export default function ParametresUtilisateursPage() {
  return (
    <RequirePermission permission={["audit.lire", "users.gerer", "parametres.lire"]}>
      <UtilisateursContent />
    </RequirePermission>
  );
}

function UtilisateursContent() {
  const audit = useAuthStore((s) => s.audit);
  const refreshAudit = useAuthStore((s) => s.refreshAudit);
  const exportAuditOlderThan = useAuthStore((s) => s.exportAuditOlderThan);
  const purgeAuditOlderThan = useAuthStore((s) => s.purgeAuditOlderThan);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentUser = useAuthStore((s) => s.currentUser);
  const me = currentUser();

  const journalAudit = useStore((s) => s.journalAudit);
  const purgeJournalAuditOlderThan = useStore(
    (s) => s.purgeJournalAuditOlderThan,
  );

  const [emailFilter, setEmailFilter] = useState("");
  const [onglet, setOnglet] = useState<"connexions" | "actions">("connexions");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canPurge =
    hasPermission("parametres.gerer") ||
    hasPermission("securite.gerer") ||
    hasPermission("users.gerer");

  useEffect(() => {
    void refreshAudit();
  }, [refreshAudit]);

  const auditTenant = useMemo(
    () => audit.filter((a) => a.tenantId === me?.tenantId),
    [audit, me?.tenantId],
  );

  const connexions = useMemo(() => {
    const q = emailFilter.trim().toLowerCase();
    return auditTenant
      .filter((a) => CONNEXION_ACTIONS.has(a.action))
      .filter((a) => !q || (a.email ?? "").toLowerCase().includes(q))
      .slice(0, 300);
  }, [auditTenant, emailFilter]);

  const actionsAcces = useMemo(() => {
    const q = emailFilter.trim().toLowerCase();
    return auditTenant
      .filter((a) => !q || (a.email ?? "").toLowerCase().includes(q))
      .slice(0, 300);
  }, [auditTenant, emailFilter]);

  const actionsMetier = useMemo(() => {
    return journalAudit.slice(0, 300);
  }, [journalAudit]);

  function exportConnexionsCsv(rows: AuthAuditEntry[], suffix: string) {
    downloadCsv(`historique-connexions-${suffix}.csv`, [
      ["Date", "Action", "E-mail", "Détail", "IP"],
      ...rows.map((a) => [
        new Date(a.date).toLocaleString("fr-FR"),
        ACTION_LABELS[a.action] ?? a.action,
        a.email ?? "",
        a.detail ?? "",
        a.ipHint ?? "",
      ]),
    ]);
  }

  function exportActionsCsv(
    acces: AuthAuditEntry[],
    metier: JournalAudit[],
    suffix: string,
  ) {
    downloadCsv(`historique-actions-${suffix}.csv`, [
      ["Source", "Date", "Action", "E-mail / Entité", "Détail"],
      ...acces.map((a) => [
        "accès",
        new Date(a.date).toLocaleString("fr-FR"),
        ACTION_LABELS[a.action] ?? a.action,
        a.email ?? "",
        a.detail ?? "",
      ]),
      ...metier.map((a) => [
        "métier",
        new Date(a.date).toLocaleString("fr-FR"),
        ACTION_LABELS[a.action] ?? a.action,
        `${a.entite}${a.numero ? ` ${a.numero}` : ""}`,
        a.detail ?? "",
      ]),
    ]);
  }

  async function exporterEtPurger() {
    if (!canPurge) return;
    const ok = confirm(
      `Exporter puis purger les historiques de plus de ${PURGE_DAYS} jours ? Cette action est irréversible.`,
    );
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const cutoff = Date.now() - PURGE_DAYS * 86_400_000;
      const oldAcces = await exportAuditOlderThan(PURGE_DAYS);
      const oldMetier = journalAudit.filter(
        (e) => new Date(e.date).getTime() < cutoff,
      );
      const oldConnexions = oldAcces.filter((a) =>
        CONNEXION_ACTIONS.has(a.action),
      );

      exportConnexionsCsv(oldConnexions, `purge-${PURGE_DAYS}j`);
      exportActionsCsv(oldAcces, oldMetier, `purge-${PURGE_DAYS}j`);

      const deletedAcces = await purgeAuditOlderThan(PURGE_DAYS);
      const deletedMetier = purgeJournalAuditOlderThan(PURGE_DAYS);
      setMessage(
        `Archivage terminé : ${deletedAcces} événement(s) d'accès et ${deletedMetier} action(s) métier purgés (> ${PURGE_DAYS} j).`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Échec de l'archivage. Vérifiez vos permissions.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs & historiques"
        description="Historique de connexions, actions d'accès et journal métier — export CSV et purge au-delà de 90 jours."
        showPosSelector={false}
      />
      <ParametresSubnav />

      <p className="mb-4 text-sm text-muted">
        Gestion des comptes et sessions actives :{" "}
        <Link href="/administration" className="font-medium text-sea-700 underline">
          Administration
        </Link>
        .
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block text-xs font-semibold text-muted">
          Filtrer par e-mail
          <input
            className="input mt-1 min-w-[220px]"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder="ex. admin@…"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn ${onglet === "connexions" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setOnglet("connexions")}
          >
            Connexions ({connexions.length})
          </button>
          <button
            type="button"
            className={`btn ${onglet === "actions" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setOnglet("actions")}
          >
            Actions ({actionsAcces.length + actionsMetier.length})
          </button>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (onglet === "connexions") {
              exportConnexionsCsv(connexions, "export");
            } else {
              exportActionsCsv(actionsAcces, actionsMetier, "export");
            }
          }}
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
        {canPurge && (
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={() => void exporterEtPurger()}
          >
            <Trash2 className="h-4 w-4" />
            Exporter & purger &gt; {PURGE_DAYS} j
          </button>
        )}
      </div>

      {message && (
        <p className="mb-4 rounded-lg border border-line bg-sea-50 px-3 py-2 text-sm text-ink">
          {message}
        </p>
      )}

      {onglet === "connexions" ? (
        <AuditTable rows={connexions} />
      ) : (
        <div className="grid gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Actions d&apos;accès
            </p>
            <AuditTable rows={actionsAcces} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Actions métier (factures)
            </p>
            <MetierTable rows={actionsMetier} />
          </div>
        </div>
      )}
    </div>
  );
}

function AuditTable({ rows }: { rows: AuthAuditEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-card">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="border-b border-line bg-sea-50/50 text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">E-mail</th>
            <th className="px-4 py-3">Détail</th>
            <th className="px-4 py-3">IP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-line last:border-0">
              <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                {new Date(a.date).toLocaleString("fr-FR")}
              </td>
              <td className="px-4 py-2.5 font-medium text-ink">
                {ACTION_LABELS[a.action] ?? a.action}
              </td>
              <td className="px-4 py-2.5">{a.email ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted">{a.detail ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted">{a.ipHint ?? "—"}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted">
                Aucun événement pour le moment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MetierTable({ rows }: { rows: JournalAudit[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-card">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="border-b border-line bg-sea-50/50 text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Document</th>
            <th className="px-4 py-3">Détail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-line last:border-0">
              <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                {new Date(a.date).toLocaleString("fr-FR")}
              </td>
              <td className="px-4 py-2.5 font-medium text-ink">
                {ACTION_LABELS[a.action] ?? a.action}
              </td>
              <td className="px-4 py-2.5">
                {a.entite}
                {a.numero ? ` · ${a.numero}` : ""}
              </td>
              <td className="px-4 py-2.5 text-muted">{a.detail ?? "—"}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted">
                Aucune action métier pour le moment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
