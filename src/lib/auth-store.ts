"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { hashPassword, validerMotDePasse, verifyPassword } from "./auth/password";
import {
  LOCK_MINUTES,
  MAX_LOGIN_ATTEMPTS,
  ROLE_LABELS,
  SESSION_IDLE_MS,
  SESSION_MAX_MS,
  RESET_TOKEN_TTL_MS,
  roleHasPermission,
  type Permission,
  type RoleId,
} from "./auth/rbac";
import type {
  AppUser,
  AuthAuditEntry,
  AuthSession,
  PasswordResetToken,
  Tenant,
} from "./auth/types";

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function deviceLabel() {
  if (typeof navigator === "undefined") return "Navigateur";
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "Navigateur";
}

const DEMO_PASSWORD = "Demo2026!STWR";

type AuthStore = {
  tenants: Tenant[];
  users: AppUser[];
  sessions: AuthSession[];
  audit: AuthAuditEntry[];
  resetTokens: PasswordResetToken[];
  currentSessionId: string | null;
  passwordsReady: boolean;

  ensureDemoPasswords: () => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  touchSession: () => void;
  sessionValide: () => boolean;
  currentUser: () => AppUser | null;
  currentTenant: () => Tenant | null;
  hasPermission: (p: Permission) => boolean;

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
      Pick<
        AppUser,
        "nom" | "role" | "pointDeVenteIds" | "actif" | "mfaRequired"
      >
    >,
  ) => void;
  resetPasswordAdmin: (
    id: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  requestPasswordReset: (
    email: string,
  ) => Promise<{ ok: true; demoToken?: string }>;
  completePasswordReset: (
    token: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  changeOwnPassword: (
    current: string,
    next: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  revokeSession: (sessionId: string) => void;
  revokeOtherSessions: () => void;
};

function pushAudit(
  state: AuthStore,
  entry: Omit<AuthAuditEntry, "id" | "date">,
): AuthAuditEntry[] {
  return [
    {
      id: uid("aud"),
      date: new Date().toISOString(),
      ...entry,
    },
    ...state.audit,
  ].slice(0, 500);
}

const seedTenant: Tenant = {
  id: "tenant-stwr",
  slug: "stwr",
  nom: "STWR Poissonnerie",
  nif: "5000123456",
  actif: true,
};

function seedUserStub(
  partial: Omit<
    AppUser,
    | "passwordHash"
    | "passwordSalt"
    | "passwordHistory"
    | "failedAttempts"
    | "createdAt"
  > & { id: string },
): AppUser {
  return {
    ...partial,
    passwordHash: "",
    passwordSalt: "",
    passwordHistory: [],
    failedAttempts: 0,
    createdAt: new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      tenants: [seedTenant],
      users: [
        seedUserStub({
          id: "usr-admin",
          tenantId: seedTenant.id,
          email: "admin@stwr.mg",
          nom: "Administrateur STWR",
          role: "admin_entreprise",
          pointDeVenteIds: [],
          actif: true,
          mfaRequired: false,
        }),
        seedUserStub({
          id: "usr-compta",
          tenantId: seedTenant.id,
          email: "comptable@stwr.mg",
          nom: "Comptable STWR",
          role: "comptable",
          pointDeVenteIds: [],
          actif: true,
          mfaRequired: false,
        }),
        seedUserStub({
          id: "usr-caisse",
          tenantId: seedTenant.id,
          email: "caisse@stwr.mg",
          nom: "Caissier Marché",
          role: "caissier",
          pointDeVenteIds: ["pdv-marche"],
          actif: true,
          mfaRequired: false,
        }),
        seedUserStub({
          id: "usr-lecture",
          tenantId: seedTenant.id,
          email: "lecture@stwr.mg",
          nom: "Consultation direction",
          role: "lecture_seule",
          pointDeVenteIds: [],
          actif: true,
          mfaRequired: false,
        }),
      ],
      sessions: [],
      audit: [],
      resetTokens: [],
      currentSessionId: null,
      passwordsReady: false,

      ensureDemoPasswords: async () => {
        const state = get();
        const need = state.users.some((u) => !u.passwordHash);
        if (!need) {
          if (!state.passwordsReady) set({ passwordsReady: true });
          return;
        }
        const users: AppUser[] = [];
        for (const u of state.users) {
          if (u.passwordHash) {
            users.push(u);
            continue;
          }
          const { hash, salt } = await hashPassword(DEMO_PASSWORD);
          users.push({
            ...u,
            passwordHash: hash,
            passwordSalt: salt,
            passwordHistory: [`${salt}:${hash}`],
          });
        }
        set({ users, passwordsReady: true });
      },

      login: async (email, password) => {
        await get().ensureDemoPasswords();
        const normalized = email.trim().toLowerCase();
        const user = get().users.find(
          (u) => u.email.toLowerCase() === normalized,
        );
        if (!user) {
          set((s) => ({
            audit: pushAudit(s, {
              tenantId: seedTenant.id,
              email: normalized,
              action: "login_fail",
              detail: "Email inconnu",
            }),
          }));
          return { ok: false, error: "Identifiants incorrects." };
        }
        if (!user.actif) {
          return { ok: false, error: "Compte désactivé." };
        }
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          return {
            ok: false,
            error: `Compte verrouillé jusqu'à ${new Date(user.lockedUntil).toLocaleString("fr-FR")}.`,
          };
        }

        const ok = await verifyPassword(
          password,
          user.passwordHash,
          user.passwordSalt,
        );
        if (!ok) {
          const failed = user.failedAttempts + 1;
          const locked =
            failed >= MAX_LOGIN_ATTEMPTS
              ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
              : undefined;
          set((s) => ({
            users: s.users.map((u) =>
              u.id === user.id
                ? {
                    ...u,
                    failedAttempts: failed,
                    lockedUntil: locked,
                  }
                : u,
            ),
            audit: pushAudit(s, {
              tenantId: user.tenantId,
              userId: user.id,
              email: user.email,
              action: locked ? "lock" : "login_fail",
              detail: locked
                ? `Verrouillage après ${failed} échecs`
                : `Échec ${failed}/${MAX_LOGIN_ATTEMPTS}`,
            }),
          }));
          return {
            ok: false,
            error: locked
              ? `Trop de tentatives. Compte verrouillé ${LOCK_MINUTES} min.`
              : "Identifiants incorrects.",
          };
        }

        const now = Date.now();
        const session: AuthSession = {
          id: uid("ses"),
          userId: user.id,
          tenantId: user.tenantId,
          createdAt: new Date(now).toISOString(),
          lastActivityAt: new Date(now).toISOString(),
          expiresAt: new Date(now + SESSION_MAX_MS).toISOString(),
          deviceLabel: deviceLabel(),
        };

        set((s) => ({
          currentSessionId: session.id,
          sessions: [session, ...s.sessions.filter((x) => x.userId !== user.id || Date.now() < new Date(x.expiresAt).getTime())].slice(0, 20),
          users: s.users.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  failedAttempts: 0,
                  lockedUntil: undefined,
                  lastLoginAt: new Date().toISOString(),
                }
              : u,
          ),
          audit: pushAudit(s, {
            tenantId: user.tenantId,
            userId: user.id,
            email: user.email,
            action: "login_ok",
            detail: `${ROLE_LABELS[user.role]} · ${session.deviceLabel}`,
          }),
        }));
        return { ok: true };
      },

      logout: () => {
        const s = get();
        const session = s.sessions.find((x) => x.id === s.currentSessionId);
        const user = session
          ? s.users.find((u) => u.id === session.userId)
          : null;
        set({
          currentSessionId: null,
          sessions: session
            ? s.sessions.filter((x) => x.id !== session.id)
            : s.sessions,
          audit: user
            ? pushAudit(s, {
                tenantId: user.tenantId,
                userId: user.id,
                email: user.email,
                action: "logout",
              })
            : s.audit,
        });
      },

      touchSession: () => {
        const s = get();
        if (!s.currentSessionId) return;
        const now = Date.now();
        set({
          sessions: s.sessions.map((ses) =>
            ses.id === s.currentSessionId
              ? { ...ses, lastActivityAt: new Date(now).toISOString() }
              : ses,
          ),
        });
      },

      sessionValide: () => {
        const s = get();
        if (!s.currentSessionId) return false;
        const ses = s.sessions.find((x) => x.id === s.currentSessionId);
        if (!ses) return false;
        const now = Date.now();
        if (now > new Date(ses.expiresAt).getTime()) return false;
        if (now - new Date(ses.lastActivityAt).getTime() > SESSION_IDLE_MS) {
          return false;
        }
        const user = s.users.find((u) => u.id === ses.userId);
        return Boolean(user?.actif);
      },

      currentUser: () => {
        const s = get();
        if (!s.sessionValide()) return null;
        const ses = s.sessions.find((x) => x.id === s.currentSessionId);
        if (!ses) return null;
        return s.users.find((u) => u.id === ses.userId) ?? null;
      },

      currentTenant: () => {
        const user = get().currentUser();
        if (!user) return null;
        return get().tenants.find((t) => t.id === user.tenantId) ?? null;
      },

      hasPermission: (p) => {
        const user = get().currentUser();
        if (!user) return false;
        return roleHasPermission(user.role, p);
      },

      createUser: async (data) => {
        const actor = get().currentUser();
        if (!actor || !roleHasPermission(actor.role, "users.gerer")) {
          return { ok: false, error: "Permission refusée." };
        }
        const email = data.email.trim().toLowerCase();
        if (get().users.some((u) => u.email.toLowerCase() === email)) {
          return { ok: false, error: "Cet e-mail existe déjà." };
        }
        const errs = validerMotDePasse(data.password);
        if (errs.length) return { ok: false, error: errs.join(" · ") };
        const { hash, salt } = await hashPassword(data.password);
        const id = uid("usr");
        const user: AppUser = {
          id,
          tenantId: actor.tenantId,
          email,
          nom: data.nom.trim(),
          role: data.role,
          pointDeVenteIds: data.pointDeVenteIds,
          passwordHash: hash,
          passwordSalt: salt,
          passwordHistory: [`${salt}:${hash}`],
          actif: true,
          mfaRequired: data.mfaRequired ?? false,
          failedAttempts: 0,
          mustChangePassword: true,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          users: [user, ...s.users],
          audit: pushAudit(s, {
            tenantId: actor.tenantId,
            userId: actor.id,
            email: actor.email,
            action: "user_create",
            detail: `${email} · ${ROLE_LABELS[data.role]}`,
          }),
        }));
        return { ok: true, id };
      },

      updateUser: (id, data) => {
        const actor = get().currentUser();
        if (!actor || !roleHasPermission(actor.role, "users.gerer")) return;
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id && u.tenantId === actor.tenantId
              ? { ...u, ...data }
              : u,
          ),
          audit: pushAudit(s, {
            tenantId: actor.tenantId,
            userId: actor.id,
            email: actor.email,
            action: data.actif === false ? "user_deactivate" : "user_update",
            detail: id,
          }),
        }));
      },

      resetPasswordAdmin: async (id, newPassword) => {
        const actor = get().currentUser();
        if (!actor || !roleHasPermission(actor.role, "users.gerer")) {
          return { ok: false, error: "Permission refusée." };
        }
        const errs = validerMotDePasse(newPassword);
        if (errs.length) return { ok: false, error: errs.join(" · ") };
        const { hash, salt } = await hashPassword(newPassword);
        set((s) => ({
          users: s.users.map((u) => {
            if (u.id !== id || u.tenantId !== actor.tenantId) return u;
            const hist = [`${salt}:${hash}`, ...u.passwordHistory].slice(0, 5);
            return {
              ...u,
              passwordHash: hash,
              passwordSalt: salt,
              passwordHistory: hist,
              mustChangePassword: true,
              failedAttempts: 0,
              lockedUntil: undefined,
            };
          }),
          sessions: s.sessions.filter((ses) => ses.userId !== id),
          audit: pushAudit(s, {
            tenantId: actor.tenantId,
            userId: actor.id,
            email: actor.email,
            action: "password_reset_ok",
            detail: `Admin reset · ${id}`,
          }),
        }));
        return { ok: true };
      },

      requestPasswordReset: async (email) => {
        await get().ensureDemoPasswords();
        const normalized = email.trim().toLowerCase();
        const user = get().users.find(
          (u) => u.email.toLowerCase() === normalized && u.actif,
        );
        // Réponse générique
        if (!user) {
          set((s) => ({
            audit: pushAudit(s, {
              tenantId: seedTenant.id,
              email: normalized,
              action: "password_reset_request",
              detail: "Email inconnu (réponse neutre)",
            }),
          }));
          return { ok: true };
        }
        const raw = crypto.randomUUID() + crypto.randomUUID();
        const { hash, salt } = await hashPassword(raw);
        const token: PasswordResetToken = {
          id: uid("rst"),
          userId: user.id,
          tokenHash: `${salt}:${hash}`,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
        };
        set((s) => ({
          resetTokens: [token, ...s.resetTokens].slice(0, 50),
          audit: pushAudit(s, {
            tenantId: user.tenantId,
            userId: user.id,
            email: user.email,
            action: "password_reset_request",
            detail: "Lien généré (TTL 60 min)",
          }),
        }));
        return { ok: true, demoToken: `${token.id}.${raw}` };
      },

      completePasswordReset: async (tokenComposite, newPassword) => {
        const dot = tokenComposite.indexOf(".");
        if (dot < 0) {
          return { ok: false, error: "Lien invalide." };
        }
        const tokenId = tokenComposite.slice(0, dot);
        const raw = tokenComposite.slice(dot + 1);
        if (!tokenId || !raw) {
          return { ok: false, error: "Lien invalide." };
        }
        const tokenFull = get().resetTokens.find((t) => t.id === tokenId);
        if (!tokenFull || tokenFull.usedAt) {
          return { ok: false, error: "Lien invalide ou déjà utilisé." };
        }
        if (new Date(tokenFull.expiresAt) < new Date()) {
          return { ok: false, error: "Lien expiré." };
        }
        const [salt, hash] = tokenFull.tokenHash.split(":");
        if (!salt || !hash) {
          return { ok: false, error: "Lien invalide." };
        }
        const valid = await verifyPassword(raw, hash, salt);
        if (!valid) return { ok: false, error: "Lien invalide." };

        const errs = validerMotDePasse(newPassword);
        if (errs.length) return { ok: false, error: errs.join(" · ") };

        const { hash: ph, salt: ps } = await hashPassword(newPassword);
        const userId = tokenFull.userId;
        set((s) => ({
          users: s.users.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  passwordHash: ph,
                  passwordSalt: ps,
                  passwordHistory: [`${ps}:${ph}`, ...u.passwordHistory].slice(
                    0,
                    5,
                  ),
                  mustChangePassword: false,
                  failedAttempts: 0,
                  lockedUntil: undefined,
                }
              : u,
          ),
          resetTokens: s.resetTokens.map((t) =>
            t.id === tokenId ? { ...t, usedAt: new Date().toISOString() } : t,
          ),
          sessions: s.sessions.filter((ses) => ses.userId !== userId),
          currentSessionId:
            s.sessions.find((x) => x.id === s.currentSessionId)?.userId ===
            userId
              ? null
              : s.currentSessionId,
          audit: pushAudit(s, {
            tenantId:
              s.users.find((u) => u.id === userId)?.tenantId ?? seedTenant.id,
            userId,
            action: "password_reset_ok",
            detail: "Réinitialisation via lien",
          }),
        }));
        return { ok: true };
      },

      changeOwnPassword: async (current, next) => {
        const user = get().currentUser();
        if (!user) return { ok: false, error: "Non connecté." };
        const ok = await verifyPassword(
          current,
          user.passwordHash,
          user.passwordSalt,
        );
        if (!ok) return { ok: false, error: "Mot de passe actuel incorrect." };
        const errs = validerMotDePasse(next);
        if (errs.length) return { ok: false, error: errs.join(" · ") };
        const { hash, salt } = await hashPassword(next);
        set((s) => ({
          users: s.users.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  passwordHash: hash,
                  passwordSalt: salt,
                  passwordHistory: [`${salt}:${hash}`, ...u.passwordHistory].slice(
                    0,
                    5,
                  ),
                  mustChangePassword: false,
                }
              : u,
          ),
          audit: pushAudit(s, {
            tenantId: user.tenantId,
            userId: user.id,
            email: user.email,
            action: "password_change",
          }),
        }));
        return { ok: true };
      },

      revokeSession: (sessionId) => {
        const actor = get().currentUser();
        set((s) => ({
          sessions: s.sessions.filter((x) => x.id !== sessionId),
          currentSessionId:
            s.currentSessionId === sessionId ? null : s.currentSessionId,
          audit: actor
            ? pushAudit(s, {
                tenantId: actor.tenantId,
                userId: actor.id,
                email: actor.email,
                action: "session_revoke",
                detail: sessionId,
              })
            : s.audit,
        }));
      },

      revokeOtherSessions: () => {
        const s = get();
        if (!s.currentSessionId) return;
        const current = s.sessions.find((x) => x.id === s.currentSessionId);
        if (!current) return;
        set({
          sessions: s.sessions.filter(
            (x) => x.id === s.currentSessionId || x.userId !== current.userId,
          ),
        });
      },
    }),
    {
      name: "stwr-auth-v1",
      skipHydration: true,
      version: 1,
    },
  ),
);

export { DEMO_PASSWORD };
