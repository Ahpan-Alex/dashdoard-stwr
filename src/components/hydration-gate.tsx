"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";

export function HydrationGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      await Promise.all([
        Promise.resolve(useStore.persist.rehydrate()),
        Promise.resolve(useAuthStore.persist.rehydrate()),
      ]);
      await useAuthStore.getState().ensureDemoPasswords();
      if (!cancelled) setReady(true);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Chargement…
      </div>
    );
  }

  return children;
}
