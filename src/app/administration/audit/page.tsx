"use client";

import { useEffect, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { AdminSubnav } from "@/components/admin-subnav";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";

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
};

export default function AuditPage() {
  return (
    <RequirePermission permission="audit.lire">
      <AuditContent />
    </RequirePermission>
  );
}

function AuditContent() {
  const audit = useAuthStore((s) => s.audit);
  const currentUser = useAuthStore((s) => s.currentUser);
  const refreshAudit = useAuthStore((s) => s.refreshAudit);
  const me = currentUser();

  useEffect(() => {
    void refreshAudit();
  }, [refreshAudit]);

  const rows = useMemo(
    () => audit.filter((a) => a.tenantId === me?.tenantId).slice(0, 200),
    [audit, me?.tenantId],
  );

  return (
    <div>
      <PageHeader
        title="Journal d'audit accès"
        description="Connexions, verrouillages, changements de mots de passe et administration."
        showPosSelector={false}
      />
      <AdminSubnav />

      <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-card">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-line bg-sea-50/50 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">E-mail</th>
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
                <td className="px-4 py-2.5">{a.email ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted">{a.detail ?? "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  Aucun événement pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
