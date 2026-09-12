"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoNegoo } from "@/components/logo-negoo";
import { PasswordInput } from "@/components/password-input";
import { useAuthStore } from "@/lib/auth-store";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reason = params.get("reason");
  const next = useMemo(() => {
    const n = params.get("next");
    if (!n || !n.startsWith("/") || n.startsWith("//")) return "/";
    return n;
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(61,184,196,0.22), transparent), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(15,74,92,0.12), transparent), linear-gradient(160deg, #041f2b 0%, #0a3344 45%, #0f4a5c 100%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <h1 className="sr-only">Connexion à Négoo</h1>
        <div className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
          <LogoNegoo
            tone="onLight"
            className="mx-auto mb-8 block w-[clamp(200px,78vw,280px)]"
          />

          <form onSubmit={onSubmit}>
            {reason === "idle" && (
              <p className="mb-4 rounded-lg bg-sand px-3 py-2 text-sm text-ink">
                Session expirée pour inactivité. Reconnectez-vous.
              </p>
            )}

            <label className="mb-3 block text-sm font-medium text-ink">
              Identifiant
              <input
                className="input mt-1"
                type="text"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="mb-4 block text-sm font-medium text-ink">
              Mot de passe
              <PasswordInput
                className="mt-1"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>

            <p className="mt-4 text-center text-sm">
              <Link
                href="/mot-de-passe-oublie"
                className="text-sea-700 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
