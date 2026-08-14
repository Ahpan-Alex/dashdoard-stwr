"use client";

import { useMemo, useState, useEffect, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { AdminSubnav } from "@/components/admin-subnav";
import { RequirePermission } from "@/components/require-permission";
import { ROLE_LABELS, type RoleId } from "@/lib/auth/rbac";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";

const ROLES = Object.keys(ROLE_LABELS) as RoleId[];

export default function UtilisateursPage() {
  return (
    <RequirePermission permission="users.gerer">
      <UtilisateursContent />
    </RequirePermission>
  );
}

function UtilisateursContent() {
  const users = useAuthStore((s) => s.users);
  const currentUser = useAuthStore((s) => s.currentUser);
  const createUser = useAuthStore((s) => s.createUser);
  const updateUser = useAuthStore((s) => s.updateUser);
  const resetPasswordAdmin = useAuthStore((s) => s.resetPasswordAdmin);
  const refreshUsers = useAuthStore((s) => s.refreshUsers);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const me = currentUser();

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  const tenantUsers = useMemo(
    () => users.filter((u) => u.tenantId === me?.tenantId),
    [users, me?.tenantId],
  );

  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState<RoleId>("commercial");
  const [password, setPassword] = useState("");
  const [pdvIds, setPdvIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetPwd, setResetPwd] = useState<Record<string, string>>({});

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await createUser({
        email,
        nom,
        role,
        password,
        pointDeVenteIds: pdvIds,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEmail("");
      setNom("");
      setPassword("");
      setPdvIds([]);
      setRole("commercial");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Comptes de l'entreprise, rôles et activation."
        showPosSelector={false}
      />
      <AdminSubnav />

      <form
        onSubmit={onCreate}
        className="mb-8 grid gap-3 rounded-[var(--radius)] border border-line bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <h2 className="font-display text-lg font-semibold sm:col-span-2 lg:col-span-3">
          Nouvel utilisateur
        </h2>
        <label className="text-sm font-medium">
          Nom
          <input
            className="input mt-1"
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          E-mail
          <input
            className="input mt-1"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Rôle
          <select
            className="select mt-1"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleId)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Mot de passe temporaire (min. 12)
          <input
            className="input mt-1"
            type="password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="mb-2 text-sm font-medium">
            Points de vente (vide = tous)
          </p>
          <div className="flex flex-wrap gap-3">
            {pointsDeVente.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pdvIds.includes(p.id)}
                  onChange={(e) =>
                    setPdvIds((prev) =>
                      e.target.checked
                        ? [...prev, p.id]
                        : prev.filter((id) => id !== p.id),
                    )
                  }
                />
                {p.nom}
              </label>
            ))}
          </div>
        </div>
        {error && (
          <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">
            {error}
          </p>
        )}
        <div className="sm:col-span-2 lg:col-span-3">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Créer
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-sea-50/50 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenantUsers.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{u.nom}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="select"
                    value={u.role}
                    disabled={u.id === me?.id}
                    onChange={(e) =>
                      updateUser(u.id, { role: e.target.value as RoleId })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`badge ${u.actif ? "badge-success" : "badge-danger"}`}
                  >
                    {u.actif ? "Actif" : "Désactivé"}
                  </span>
                  {u.lockedUntil &&
                    new Date(u.lockedUntil) > new Date() && (
                      <span className="ml-2 text-xs text-warning">
                        Verrouillé
                      </span>
                    )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    {u.id !== me?.id && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          updateUser(u.id, { actif: !u.actif })
                        }
                      >
                        {u.actif ? "Désactiver" : "Réactiver"}
                      </button>
                    )}
                    <div className="flex gap-2">
                      <input
                        className="input"
                        placeholder="Nouveau MDP"
                        type="password"
                        value={resetPwd[u.id] ?? ""}
                        onChange={(e) =>
                          setResetPwd((prev) => ({
                            ...prev,
                            [u.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-ghost shrink-0"
                        onClick={async () => {
                          const pwd = resetPwd[u.id];
                          if (!pwd) return;
                          const res = await resetPasswordAdmin(u.id, pwd);
                          if (!res.ok) alert(res.error);
                          else {
                            alert("Mot de passe réinitialisé.");
                            setResetPwd((prev) => ({ ...prev, [u.id]: "" }));
                          }
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
