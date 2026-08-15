"use client";

import { create } from "zustand";
import { apiFetch, ApiError } from "./api";
import { roleHasPermission, type Permission, type RoleId } from "./auth/rbac";
import type {
  AppUser,
  AuthAuditEntry,
  AuthSession,
  Tenant,
} from "./auth/types";

type MeResponse = {
  user: Omit<
    AppUser,
    "passwordHash" | "passwordSalt" | "passwordHistory" | "failedAttempts" | "lockedUntil"
  > & {
    lastLoginAt: string | null;
    mustChangePassword: boolean;
    photoData?: string | null;
  };
  tenant: Tenant;
  permissions: Permission[];
  session: {
    id: string;
    createdAt: string;
    lastActivityAt: string;
    expiresAt: string;
    deviceLabel: string;
  };
};

type PublicUser = MeResponse["user"];

function toAppUser(u: PublicUser): AppUser {
  return {
    id: u.id,
    tenantId: u.tenantId,
    email: u.email,
    nom: u.nom,
    role: u.role,
    pointDeVenteIds: u.pointDeVenteIds ?? [],
    passwordHash: "",
    passwordSalt: "",
    passwordHistory: [],
    actif: u.actif,
    mfaRequired: u.mfaRequired,
    failedAttempts: 0,
    mustChangePassword: u.mustChangePassword,
    lastLoginAt: u.lastLoginAt ?? undefined,
    createdAt: u.createdAt,
    photoData: u.photoData ?? null,
  };
}

function deviceLabel() {
  if (typeof navigator === "undefined") return "Navigateur";
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "Navigateur";
}

type AuthStore = {
  ready: boolean;
  bootstrapped: boolean;
  user: AppUser | null;
  tenant: Tenant | null;
  permissions: Permission[];
  currentSessionId: string | null;
  users: AppUser[];
  sessions: AuthSession[];
  audit: AuthAuditEntry[];

  bootstrap: () => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  touchSession: () => void;
  sessionValide: () => boolean;
  currentUser: () => AppUser | null;
  currentTenant: () => Tenant | null;
  hasPermission: (p: Permission) => boolean;

  refreshUsers: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshAudit: () => Promise<void>;
  exportAuditOlderThan: (olderThanDays: number) => Promise<AuthAuditEntry[]>;
  purgeAuditOlderThan: (olderThanDays: number) => Promise<number>;

  createUser: (data: {
    email: string;
    nom: string;
    role: RoleId;
    pointDeVenteIds: string[];
    password: string;
    mfaRequired?: boolean;
  }) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  updateUser: (
    id: string,
    data: Partial<
      Pick<AppUser, "nom" | "role" | "pointDeVenteIds" | "actif" | "mfaRequired">
    >,
  ) => Promise<void>;
  resetPasswordAdmin: (
    id: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  requestPasswordReset: (
    email: string,
  ) => Promise<{ ok: true }>;
  completePasswordReset: (
    token: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  changeOwnPassword: (
    current: string,
    next: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateOwnPhoto: (
    photoData: string | null,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeOtherSessions: () => Promise<void>;
};

function applyMe(set: (p: Partial<AuthStore>) => void, me: MeResponse) {
  set({
    user: toAppUser(me.user),
    tenant: me.tenant,
    permissions: me.permissions,
    currentSessionId: me.session.id,
    sessions: [
      {
        id: me.session.id,
        userId: me.user.id,
        tenantId: me.user.tenantId,
        createdAt: me.session.createdAt,
        lastActivityAt: me.session.lastActivityAt,
        expiresAt: me.session.expiresAt,
        deviceLabel: me.session.deviceLabel,
      },
    ],
    ready: true,
  });
}

function clearAuth(set: (p: Partial<AuthStore>) => void) {
  set({
    user: null,
    tenant: null,
    permissions: [],
    currentSessionId: null,
    users: [],
    sessions: [],
    audit: [],
    ready: true,
  });
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  ready: false,
  bootstrapped: false,
  user: null,
  tenant: null,
  permissions: [],
  currentSessionId: null,
  users: [],
  sessions: [],
  audit: [],

  bootstrap: async () => {
    if (get().bootstrapped) return;
    try {
      const me = await apiFetch<MeResponse>("/auth/me");
      applyMe(set, me);
    } catch {
      clearAuth(set);
    } finally {
      set({ bootstrapped: true });
    }
  },

  login: async (email, password) => {
    try {
      const me = await apiFetch<MeResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          deviceLabel: deviceLabel(),
        }),
      });
      applyMe(set, me);
      return { ok: true };
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Impossible de se connecter.";
      return { ok: false, error: msg };
    }
  },

  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    clearAuth(set);
  },

  touchSession: () => {
    if (!get().currentSessionId) return;
    void apiFetch("/auth/session/touch", { method: "POST" }).catch(() => {
      /* idle check will catch invalid session */
    });
  },

  sessionValide: () => {
    const s = get();
    return Boolean(s.user?.actif && s.currentSessionId && s.tenant?.actif);
  },

  currentUser: () => (get().sessionValide() ? get().user : null),

  currentTenant: () => (get().sessionValide() ? get().tenant : null),

  hasPermission: (p) => {
    const user = get().currentUser();
    if (!user) return false;
    if (get().permissions.includes(p)) return true;
    const role =
      (user.role as string) === "admin"
        ? ("admin_entreprise" as RoleId)
        : user.role;
    return roleHasPermission(role, p);
  },

  refreshUsers: async () => {
    try {
      const res = await apiFetch<{ users: PublicUser[] }>("/users");
      set({ users: res.users.map(toAppUser) });
    } catch {
      /* no permission or offline */
    }
  },

  refreshSessions: async () => {
    try {
      const res = await apiFetch<{
        sessions: Array<{
          id: string;
          userId: string;
          tenantId: string;
          createdAt: string;
          lastActivityAt: string;
          expiresAt: string;
          deviceLabel: string;
          userEmail: string;
          userNom: string;
          isCurrent: boolean;
        }>;
      }>("/admin/sessions");
      set({
        sessions: res.sessions.map((s) => ({
          id: s.id,
          userId: s.userId,
          tenantId: s.tenantId,
          createdAt: s.createdAt,
          lastActivityAt: s.lastActivityAt,
          expiresAt: s.expiresAt,
          deviceLabel: s.deviceLabel,
        })),
        users: [
          ...get().users,
          ...res.sessions.map((s) => ({
            id: s.userId,
            tenantId: s.tenantId,
            email: s.userEmail,
            nom: s.userNom,
            role: "lecture_seule" as RoleId,
            pointDeVenteIds: [],
            passwordHash: "",
            passwordSalt: "",
            passwordHistory: [],
            actif: true,
            mfaRequired: false,
            failedAttempts: 0,
            createdAt: s.createdAt,
          })),
        ].filter(
          (u, i, arr) => arr.findIndex((x) => x.id === u.id) === i,
        ),
        currentSessionId:
          res.sessions.find((s) => s.isCurrent)?.id ?? get().currentSessionId,
      });
    } catch {
      /* ignore */
    }
  },

  refreshAudit: async () => {
    try {
      const res = await apiFetch<{ audit: AuthAuditEntry[] }>(
        "/admin/audit?limit=2000",
      );
      set({ audit: res.audit });
    } catch {
      /* ignore */
    }
  },

  exportAuditOlderThan: async (olderThanDays: number) => {
    const res = await apiFetch<{ audit: AuthAuditEntry[] }>(
      `/admin/audit?limit=5000&olderThanDays=${olderThanDays}`,
    );
    return res.audit;
  },

  purgeAuditOlderThan: async (olderThanDays: number) => {
    const res = await apiFetch<{
      ok: boolean;
      deleted: number;
      olderThanDays: number;
    }>("/admin/audit", {
      method: "DELETE",
      body: JSON.stringify({ olderThanDays }),
    });
    await get().refreshAudit();
    return res.deleted;
  },

  createUser: async (data) => {
    try {
      const res = await apiFetch<{ user: PublicUser }>("/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
      await get().refreshUsers();
      return { ok: true, id: res.user.id };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof ApiError ? e.message : "Création impossible.",
      };
    }
  },

  updateUser: async (id, data) => {
    try {
      await apiFetch(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      await get().refreshUsers();
    } catch {
      /* ignore */
    }
  },

  resetPasswordAdmin: async (id, newPassword) => {
    try {
      await apiFetch(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: newPassword }),
      });
      await get().refreshUsers();
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof ApiError ? e.message : "Reset impossible.",
      };
    }
  },

  requestPasswordReset: async (email) => {
    try {
      return await apiFetch<{ ok: true }>(
        "/auth/password/forgot",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      );
    } catch {
      return { ok: true };
    }
  },

  completePasswordReset: async (token, newPassword) => {
    try {
      await apiFetch("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof ApiError ? e.message : "Lien invalide.",
      };
    }
  },

  changeOwnPassword: async (current, next) => {
    try {
      await apiFetch("/auth/password/change", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
        }),
      });
      const me = await apiFetch<MeResponse>("/auth/me");
      applyMe(set, me);
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof ApiError ? e.message : "Changement impossible.",
      };
    }
  },

  updateOwnPhoto: async (photoData) => {
    try {
      const res = await apiFetch<{ user: PublicUser }>("/auth/me/photo", {
        method: "PATCH",
        body: JSON.stringify({ photoData }),
      });
      const current = get().user;
      if (current) {
        set({ user: { ...current, photoData: res.user.photoData ?? null } });
      }
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof ApiError ? e.message : "Photo non enregistrée.",
      };
    }
  },

  revokeSession: async (sessionId) => {
    try {
      await apiFetch(`/admin/sessions/${sessionId}`, { method: "DELETE" });
      if (get().currentSessionId === sessionId) {
        clearAuth(set);
      } else {
        await get().refreshSessions();
      }
    } catch {
      /* ignore */
    }
  },

  revokeOtherSessions: async () => {
    const current = get().currentSessionId;
    const mine = get().sessions.filter(
      (s) => s.userId === get().user?.id && s.id !== current,
    );
    for (const s of mine) {
      await get().revokeSession(s.id);
    }
  },
}));
