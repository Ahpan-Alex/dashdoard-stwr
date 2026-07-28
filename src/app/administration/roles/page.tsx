"use client";

import { PageHeader } from "@/components/page-header";
import { AdminSubnav } from "@/components/admin-subnav";
import { RequirePermission } from "@/components/require-permission";
import {
  PERMISSION_LABELS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type Permission,
  type RoleId,
} from "@/lib/auth/rbac";

const ROLES = Object.keys(ROLE_LABELS) as RoleId[];
const PERMS = Object.keys(PERMISSION_LABELS) as Permission[];

export default function RolesPage() {
  return (
    <RequirePermission permission="users.gerer">
      <div>
        <PageHeader
          title="Rôles & permissions"
          description="Matrice RBAC (lecture seule en phase 1 — rôles prédéfinis)."
          showPosSelector={false}
        />
        <AdminSubnav />

        <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-card">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-line bg-sea-50/50 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-3 py-3 text-center">
                    {ROLE_LABELS[r].replace("Administrateur entreprise", "Admin")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMS.map((p) => (
                <tr key={p} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 text-ink">
                    {PERMISSION_LABELS[p]}
                  </td>
                  {ROLES.map((r) => {
                    const ok = ROLE_PERMISSIONS[r].includes(p);
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        <span
                          className={
                            ok ? "font-semibold text-success" : "text-line"
                          }
                        >
                          {ok ? "✓" : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}
