"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ROLE_LABELS, type RoleId } from "@/lib/auth/rbac";
import { useAuthStore } from "@/lib/auth-store";

export default function MonComptePage() {
  const params = useSearchParams();
  const mustChange = params.get("mustChange") === "1";
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTenant = useAuthStore((s) => s.currentTenant);
  const changeOwnPassword = useAuthStore((s) => s.changeOwnPassword);
  const revokeOtherSessions = useAuthStore((s) => s.revokeOtherSessions);
  const logout = useAuthStore((s) => s.logout);
  const sessions = useAuthStore((s) => s.sessions);
  const currentSessionId = useAuthStore((s) => s.currentSessionId);

  const user = currentUser();
  const tenant = currentTenant();
  const mySessions = useMemo(
    () => sessions.filter((s) => s.userId === user?.id),
    [sessions, user?.id],
  );

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (next !== confirm) {
      setErr("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const res = await changeOwnPassword(current, next);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setMsg("Mot de passe mis à jour.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div>
      <PageHeader
        title="Mon compte"
        description="Profil, mot de passe et sessions."
        showPosSelector={false}
      />

      {(mustChange || user.mustChangePassword) && (
        <p className="mb-6 rounded-lg border border-warning/40 bg-amber-50 px-4 py-3 text-sm text-ink">
          Vous devez changer votre mot de passe avant de continuer.
        </p>
      )}

      <div className="mb-6 grid gap-4 rounded-[var(--radius)] border border-line bg-card p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Identité
          </p>
          <p className="mt-1 font-medium text-ink">{user.nom}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Rôle / entreprise
          </p>
          <p className="mt-1 font-medium text-ink">
            {ROLE_LABELS[user.role as RoleId]}
          </p>
          <p className="text-sm text-muted">{tenant?.nom}</p>
        </div>
      </div>

      <form
        onSubmit={onChangePassword}
        className="mb-8 max-w-md space-y-3 rounded-[var(--radius)] border border-line bg-card p-5"
      >
        <h2 className="font-display text-lg font-semibold">Mot de passe</h2>
        <label className="block text-sm font-medium">
          Actuel
          <input
            className="input mt-1"
            type="password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Nouveau (min. 12)
          <input
            className="input mt-1"
            type="password"
            required
            minLength={12}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Confirmation
          <input
            className="input mt-1"
            type="password"
            required
            minLength={12}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {err && <p className="text-sm text-danger">{err}</p>}
        {msg && <p className="text-sm text-success">{msg}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "…" : "Mettre à jour"}
        </button>
      </form>

      <div className="rounded-[var(--radius)] border border-line bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Sessions</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => revokeOtherSessions()}
            >
              Révoquer les autres
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => logout()}
            >
              Déconnexion
            </button>
          </div>
        </div>
        <ul className="divide-y divide-line text-sm">
          {mySessions.map((s) => (
            <li key={s.id} className="flex justify-between gap-4 py-2">
              <span>
                {s.deviceLabel}
                {s.id === currentSessionId ? " · actuelle" : ""}
              </span>
              <span className="text-muted">
                {new Date(s.lastActivityAt).toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
          {!mySessions.length && (
            <li className="py-2 text-muted">Aucune session.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
