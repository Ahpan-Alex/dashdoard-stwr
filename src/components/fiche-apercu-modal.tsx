"use client";

import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";

export function LigneInfo({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-ink">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteReason?: string;
  children: ReactNode;
};

export function FicheApercuModal({
  open,
  title,
  subtitle,
  onClose,
  onEdit,
  onDelete,
  deleteDisabled = false,
  deleteReason,
  children,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
      <div className="my-8 w-full max-w-2xl rounded-[var(--radius)] border border-line bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">{children}</div>
        <div className="mt-5 flex flex-wrap gap-2">
          {onEdit ? (
            <button type="button" className="btn btn-primary" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Modifier
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onDelete}
              disabled={deleteDisabled}
              title={
                deleteDisabled
                  ? (deleteReason ?? "Suppression impossible")
                  : "Supprimer"
              }
            >
              <Trash2
                className={`h-4 w-4 ${deleteDisabled ? "text-muted" : "text-danger"}`}
              />
              Supprimer
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
