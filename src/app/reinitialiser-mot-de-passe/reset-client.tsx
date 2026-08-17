"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/password-input";
import { useAuthStore } from "@/lib/auth-store";

export default function ReinitialiserMotDePassePage() {
  const router = useRouter();
  const params = useSearchParams();
  const completePasswordReset = useAuthStore((s) => s.completePasswordReset);
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const res = await completePasswordReset(token, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sea-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-xl">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Nouveau mot de passe
        </h1>
        <p className="mt-1 text-sm text-muted">
          Minimum 12 caractères. Évitez les mots de passe trop prévisibles.
        </p>

        {!token ? (
          <p className="mt-6 text-sm text-danger">Lien manquant ou invalide.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Nouveau mot de passe
              <PasswordInput
                className="mt-1"
                autoComplete="new-password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Confirmation
              <PasswordInput
                className="mt-1"
                autoComplete="new-password"
                required
                minLength={12}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-4 block text-center text-sm text-sea-700 hover:underline"
        >
          Retour connexion
        </Link>
      </div>
    </div>
  );
}
