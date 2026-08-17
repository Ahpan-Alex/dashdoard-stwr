"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/password-input";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (password: string) => void | Promise<void>;
};

export function ConfirmPasswordModal({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  loading = false,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) setPassword("");
  }, [open]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim() || loading) return;
    await onConfirm(password);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
      <form
        onSubmit={onSubmit}
        className="my-16 w-full max-w-md rounded-[var(--radius)] border border-line bg-card p-5 shadow-lg"
      >
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
        <label className="mt-4 block text-sm font-medium">
          Mot de passe du compte
          <PasswordInput
            className="mt-1"
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Vérification…" : confirmLabel}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => {
              setPassword("");
              onCancel();
            }}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
