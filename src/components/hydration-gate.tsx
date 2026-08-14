"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import {
  fetchBusinessState,
  setBusinessSyncEnabled,
} from "@/lib/business-api";
import { useStore } from "@/lib/store";

export function HydrationGate({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [businessReady, setBusinessReady] = useState(false);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const applyBusinessData = useStore((s) => s.applyBusinessData);
  const clearBusinessData = useStore((s) => s.clearBusinessData);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      await bootstrap();
      if (!cancelled) setAuthReady(true);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [bootstrap]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    async function syncBusiness() {
      setBusinessReady(false);
      setBusinessSyncEnabled(false);
      if (!userId) {
        clearBusinessData();
        if (!cancelled) setBusinessReady(true);
        return;
      }
      try {
        const res = await fetchBusinessState();
        if (!cancelled) {
          applyBusinessData(res.data);
          setBusinessSyncEnabled(true);
          setBusinessReady(true);
        }
      } catch (err) {
        console.error("[business] load failed", err);
        if (!cancelled) {
          clearBusinessData();
          setBusinessReady(true);
        }
      }
    }

    void syncBusiness();
    return () => {
      cancelled = true;
      setBusinessSyncEnabled(false);
    };
  }, [authReady, userId, applyBusinessData, clearBusinessData]);

  if (!authReady || !businessReady) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Chargement…
      </div>
    );
  }

  return children;
}
