"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";

export default function MotDePasseOubliePage() {
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [demoLink, setDemoLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      setDone(true);
      if (res.demoToken) {
        setDemoLink(`/reinitialiser-mot-de-passe?token=${encodeURIComponent(res.demoToken)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sea-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-xl">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Mot de passe oublié
        </h1>
        <p className="mt-1 text-sm text-muted">
          Saisissez votre e-mail. Si un compte existe, un lien de
          réinitialisation sera généré (démo locale sans envoi e-mail).
        </p>

        {done ? (
          <div className="mt-6 space-y-3">
            <p className="rounded-lg bg-sea-100 px-3 py-2 text-sm text-sea-900">
              Si un compte correspond, un lien a été préparé.
            </p>
            {demoLink && (
              <p className="text-sm">
                Lien démo :{" "}
                <Link href={demoLink} className="text-sea-700 underline">
                  Réinitialiser maintenant
                </Link>
              </p>
            )}
            <Link href="/login" className="btn btn-secondary mt-2 inline-flex">
              Retour connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              E-mail
              <input
                className="input mt-1"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Envoi…" : "Continuer"}
            </button>
            <Link
              href="/login"
              className="block text-center text-sm text-sea-700 hover:underline"
            >
              Retour
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
