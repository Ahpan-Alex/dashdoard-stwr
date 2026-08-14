"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Trash2, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ROLE_LABELS, type RoleId } from "@/lib/auth/rbac";
import { useAuthStore } from "@/lib/auth-store";
import { compressProfilePhoto } from "@/lib/profile-photo";

export default function MonComptePage() {
  const params = useSearchParams();
  const mustChange = params.get("mustChange") === "1";
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTenant = useAuthStore((s) => s.currentTenant);
  const changeOwnPassword = useAuthStore((s) => s.changeOwnPassword);
  const updateOwnPhoto = useAuthStore((s) => s.updateOwnPhoto);
  const revokeOtherSessions = useAuthStore((s) => s.revokeOtherSessions);
  const logout = useAuthStore((s) => s.logout);
  const sessions = useAuthStore((s) => s.sessions);
  const currentSessionId = useAuthStore((s) => s.currentSessionId);
  const refreshSessions = useAuthStore((s) => s.refreshSessions);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

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
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

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

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setPhotoErr(null);
    setPhotoMsg(null);
    setPhotoLoading(true);
    try {
      const dataUrl = await compressProfilePhoto(file);
      const res = await updateOwnPhoto(dataUrl);
      if (!res.ok) {
        setPhotoErr(res.error);
        return;
      }
      setPhotoMsg("Photo de profil enregistrée.");
    } catch (e) {
      setPhotoErr(e instanceof Error ? e.message : "Échec du traitement.");
    } finally {
      setPhotoLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemovePhoto() {
    setPhotoErr(null);
    setPhotoMsg(null);
    setPhotoLoading(true);
    try {
      const res = await updateOwnPhoto(null);
      if (!res.ok) {
        setPhotoErr(res.error);
        return;
      }
      setPhotoMsg("Photo supprimée.");
    } finally {
      setPhotoLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div>
      <PageHeader
        title="Mon compte"
        description="Profil, photo, mot de passe et sessions."
        showPosSelector={false}
      />

      {(mustChange || user.mustChangePassword) && (
        <p className="mb-6 rounded-lg border border-warning/40 bg-amber-50 px-4 py-3 text-sm text-ink">
          Vous devez changer votre mot de passe avant de continuer.
        </p>
      )}

      <div className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted">
          Photo de profil
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-line bg-sea-50">
            {user.photoData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoData}
                alt={`Photo de ${user.nom}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sea-400">
                <UserRound className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-muted">
              JPEG, PNG ou WebP — recadrée en carré (256 px) à l&apos;enregistrement.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={photoLoading}
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                {photoLoading ? "…" : user.photoData ? "Changer la photo" : "Ajouter une photo"}
              </button>
              {user.photoData && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={photoLoading}
                  onClick={() => void onRemovePhoto()}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              )}
            </div>
            {photoErr && <p className="text-sm text-danger">{photoErr}</p>}
            {photoMsg && <p className="text-sm text-success">{photoMsg}</p>}
          </div>
        </div>
      </div>

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
