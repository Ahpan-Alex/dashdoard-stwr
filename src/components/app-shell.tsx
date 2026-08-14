"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { HydrationGate } from "./hydration-gate";
import { Sidebar } from "./sidebar";

const AUTH_PUBLIC = new Set([
  "/login",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
]);

function isPublicAuthPath(pathname: string) {
  return AUTH_PUBLIC.has(pathname);
}

function AuthSessionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentSessionId = useAuthStore((s) => s.currentSessionId);
  const userState = useAuthStore((s) => s.user);
  const touchSession = useAuthStore((s) => s.touchSession);
  const logout = useAuthStore((s) => s.logout);
  const sessionValide = useAuthStore((s) => s.sessionValide);
  const currentUser = useAuthStore((s) => s.currentUser);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  const publicAuth = isPublicAuthPath(pathname);
  void userState;
  const valid = sessionValide();
  const user = currentUser();

  useEffect(() => {
    if (publicAuth) {
      if (valid) router.replace("/");
      return;
    }
    if (!valid) {
      if (currentSessionId) void logout();
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [publicAuth, valid, currentSessionId, logout, pathname, router]);

  useEffect(() => {
    if (!valid || publicAuth) return;
    touchSession();
    const onActivity = () => touchSession();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    const interval = window.setInterval(async () => {
      try {
        const { apiFetch } = await import("@/lib/api");
        await apiFetch("/auth/me");
        touchSession();
      } catch {
        await useAuthStore.getState().logout();
        router.replace("/login?reason=idle");
      }
    }, 60_000);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.clearInterval(interval);
    };
  }, [valid, publicAuth, touchSession, router, bootstrap]);

  useEffect(() => {
    if (!valid || publicAuth || !user?.mustChangePassword) return;
    if (pathname !== "/mon-compte") {
      router.replace("/mon-compte?mustChange=1");
    }
  }, [valid, publicAuth, user?.mustChangePassword, pathname, router]);

  if (publicAuth) {
    return <>{children}</>;
  }

  if (!valid) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Redirection vers la connexion…
      </div>
    );
  }

  return children;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const publicAuth = isPublicAuthPath(pathname);

  return (
    <HydrationGate>
      <AuthSessionGuard>
        {publicAuth ? (
          <div className="min-h-screen w-full">{children}</div>
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
                {children}
              </div>
            </main>
          </div>
        )}
      </AuthSessionGuard>
    </HydrationGate>
  );
}
