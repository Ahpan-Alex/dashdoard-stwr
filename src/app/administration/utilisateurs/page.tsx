"use client";

import { useMemo, useState, useEffect, type FormEvent } from "react";
import { PasswordInput } from "@/components/password-input";
import { PageHeader } from "@/components/page-header";
import { AdminSubnav } from "@/components/admin-subnav";
import { RequirePermission } from "@/components/require-permission";
import {
  OPERATIONAL_ROLES,
  ROLE_LABELS,
  libelleRoles,
  primaryRole,
  rolesFromStored,
  type OperationalRole,
  type RoleId,
} from "@/lib/auth/rbac";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";

type ProfilBase =
  | "admin_entreprise"
  | "comptable"
  | "lecture_seule"
  | "exploitant";

function profilDepuisRoles(roles: RoleId[]): ProfilBase {
  if (roles.includes("admin_entreprise")) return "admin_entreprise";
  if (roles.includes("comptable")) return "comptable";
  if (
    roles.includes("lecture_seule") &&
    !OPERATIONAL_ROLES.some((r) => roles.includes(r))
  ) {
    return "lecture_seule";
  }
  return "exploitant";
}

function composerRoles(profil: ProfilBase, ops: OperationalRole[]): RoleId[] {
  if (profil === "admin_entreprise") return ["admin_entreprise"];
  if (profil === "comptable") return ["comptable"];
  if (profil === "lecture_seule") return ["lecture_seule"];
  return ops.length ? [...ops] : ["vendeur"];
}

function RolesExploitant({
  value,
  onChange,
  disabled,
}: {
  value: OperationalRole[];
  onChange: (next: OperationalRole[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {OPERATIONAL_ROLES.map((r) => (
        <label key={r} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={disabled}
            checked={value.includes(r)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...value, r]
                  : value.filter((x) => x !== r),
              )
            }
          />
          {ROLE_LABELS[r]}
        </label>
      ))}
    </div>
  );
}

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
  const [profil, setProfil] = useState<ProfilBase>("exploitant");
  const [ops, setOps] = useState<OperationalRole[]>(["vendeur"]);
  const [password, setPassword] = useState("");
  const [pdvIds, setPdvIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetPwd, setResetPwd] = useState<Record<string, string>>({});

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (profil === "exploitant" && ops.length === 0) {
      setError("Cochez au moins un rôle : acheteur, caissier, facturier ou vendeur.");
      return;
    }
    setLoading(true);
    try {
      const roles = composerRoles(profil, ops);
      const res = await createUser({
        email,
        nom,
        role: primaryRole(roles),
        roles,
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
      setProfil("exploitant");
      setOps(["vendeur"]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Comptes, rôles cumulés et génération des mots de passe (administrateur uniquement)."
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
          Profil
          <select
            className="select mt-1"
            value={profil}
            onChange={(e) => setProfil(e.target.value as ProfilBase)}
          >
            <option value="exploitant">Exploitant (rôles à cocher)</option>
            <option value="admin_entreprise">Administrateur entreprise</option>
            <option value="comptable">Comptable</option>
            <option value="lecture_seule">Lecture seule</option>
          </select>
        </label>
        {profil === "exploitant" && (
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-2 text-sm font-medium">
              Rôles d&apos;exploitation (plusieurs possibles)
            </p>
            <RolesExploitant value={ops} onChange={setOps} />
          </div>
        )}
        <label className="text-sm font-medium sm:col-span-2">
          Mot de passe temporaire (min. 12) — généré par l&apos;administrateur
          <PasswordInput
            className="mt-1"
            autoComplete="new-password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="mb-2 text-sm font-medium">
            Sites rattachés (vide = tous les sites ; la vue consolidée est
            réservée aux rôles administrateur et comptable)
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
              <th className="px-4 py-3">Rôles</th>
              <th className="px-4 py-3">Sites</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Mot de passe</th>
            </tr>
          </thead>
          <tbody>
            {tenantUsers.map((u) => {
              const roles = rolesFromStored(u.role, u.roles);
              const profil = profilDepuisRoles(roles);
              const opsUser = OPERATIONAL_ROLES.filter((r) => roles.includes(r));
              const self = u.id === me?.id;
              return (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{u.nom}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="select mb-2"
                      value={profil}
                      disabled={self}
                      onChange={(e) => {
                        const next = e.target.value as ProfilBase;
                        const composed = composerRoles(next, opsUser);
                        void updateUser(u.id, {
                          role: primaryRole(composed),
                          roles: composed,
                        });
                      }}
                    >
                      <option value="exploitant">Exploitant</option>
                      <option value="admin_entreprise">Administrateur</option>
                      <option value="comptable">Comptable</option>
                      <option value="lecture_seule">Lecture seule</option>
                    </select>
                    {profil === "exploitant" ? (
                      <RolesExploitant
                        value={opsUser}
                        disabled={self}
                        onChange={(next) => {
                          if (next.length === 0) return;
                          void updateUser(u.id, {
                            role: primaryRole(next),
                            roles: next,
                          });
                        }}
                      />
                    ) : (
                      <p className="text-xs text-muted">{libelleRoles(roles)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-xs flex-col gap-1">
                      {pointsDeVente.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={u.pointDeVenteIds.includes(p.id)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...u.pointDeVenteIds, p.id]
                                : u.pointDeVenteIds.filter((id) => id !== p.id);
                              void updateUser(u.id, { pointDeVenteIds: next });
                            }}
                          />
                          {p.nom}
                        </label>
                      ))}
                      {u.pointDeVenteIds.length === 0 && (
                        <span className="text-[11px] text-muted">
                          Tous les sites (sans vue consolidée)
                        </span>
                      )}
                    </div>
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
                    {!self && (
                      <button
                        type="button"
                        className="btn btn-secondary mt-2"
                        onClick={() =>
                          updateUser(u.id, { actif: !u.actif })
                        }
                      >
                        {u.actif ? "Désactiver" : "Réactiver"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {self ? (
                      <p className="text-xs text-muted">Votre mot de passe se change dans Mon compte.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <PasswordInput
                          placeholder="Nouveau MDP"
                          autoComplete="new-password"
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
                              alert("Mot de passe généré. L'utilisateur devra le changer à la connexion.");
                              setResetPwd((prev) => ({ ...prev, [u.id]: "" }));
                            }
                          }}
                        >
                          Générer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
