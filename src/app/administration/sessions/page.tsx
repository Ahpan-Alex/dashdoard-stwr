"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { AdminSubnav } from "@/components/admin-subnav";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";

export default function SessionsPage() {
  return (
    <RequirePermission permission={["securite.gerer", "users.gerer"]}>
      <SessionsContent />
    </RequirePermission>
  );
}

function SessionsContent() {
  const sessions = useAuthStore((s) => s.sessions);
  const users = useAuthStore((s) => s.users);
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentSessionId = useAuthStore((s) => s.currentSessionId);
  const revokeSession = useAuthStore((s) => s.revokeSession);
  const me = currentUser();

  const rows = useMemo(() => {
    return sessions
      .filter((s) => s.tenantId === me?.tenantId)
      .map((s) => ({
        ...s,
        user: users.find((u) => u.id === s.userId),
      }));
  }, [sessions, users, me?.tenantId]);

  return (
    <div>
      <PageHeader
        title="Sessions actives"
        description="Révoquez une session compromise ou oubliée."
        showPosSelector={false}
      />
      <AdminSubnav />

      <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-card">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-line bg-sea-50/50 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Appareil</th>
              <th className="px-4 py-3">Dernière activité</th>
              <th className="px-4 py-3">Expire</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{s.user?.nom ?? s.userId}</p>
                  <p className="text-xs text-muted">{s.user?.email}</p>
                  {s.id === currentSessionId && (
                    <span className="text-xs text-sea-700">Session actuelle</span>
                  )}
                </td>
                <td className="px-4 py-3">{s.deviceLabel}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(s.lastActivityAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-muted">
                  {new Date(s.expiresAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => revokeSession(s.id)}
                  >
                    Révoquer
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Aucune session.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
