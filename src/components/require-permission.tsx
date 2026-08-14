"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import type { Permission } from "@/lib/auth/rbac";

export function RequirePermission({
  permission,
  children,
  fallback,
}: {
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentSessionId = useAuthStore((s) => s.currentSessionId);
  const user = useAuthStore((s) => s.user);
  void currentSessionId;
  void user;
  const needed = Array.isArray(permission) ? permission : [permission];
  const ok = needed.some((p) => hasPermission(p));

  if (!ok) {
    return (
      fallback ?? (
        <div className="rounded-[var(--radius)] border border-line bg-card p-8 text-center">
          <p className="font-display text-xl text-ink">Accès refusé</p>
          <p className="mt-2 text-sm text-muted">
            Votre rôle ne permet pas d&apos;ouvrir cette page.
          </p>
          <Link href="/" className="btn btn-primary mt-6">
            Retour au tableau de bord
          </Link>
        </div>
      )
    );
  }

  return children;
}
