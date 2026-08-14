import type { RoleId } from "./rbac";

export type Tenant = {
  id: string;
  slug: string;
  nom: string;
  nif?: string;
  actif: boolean;
};

export type AppUser = {
  id: string;
  tenantId: string;
  email: string;
  nom: string;
  role: RoleId;
  /** PDV autorisés ; vide = tous */
  pointDeVenteIds: string[];
  passwordHash: string;
  passwordSalt: string;
  /** Hashes des 5 derniers MDP (sans salt réutilisé — stockés "salt:hash") */
  passwordHistory: string[];
  actif: boolean;
  mfaRequired: boolean;
  failedAttempts: number;
  lockedUntil?: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  /** Data URL de la photo de profil */
  photoData?: string | null;
};

export type AuthSession = {
  id: string;
  userId: string;
  tenantId: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  deviceLabel: string;
};

export type AuthAuditAction =
  | "login_ok"
  | "login_fail"
  | "logout"
  | "lock"
  | "unlock"
  | "password_reset_request"
  | "password_reset_ok"
  | "password_change"
  | "user_create"
  | "user_update"
  | "user_deactivate"
  | "session_revoke";

export type AuthAuditEntry = {
  id: string;
  date: string;
  tenantId: string;
  userId?: string;
  email?: string;
  action: AuthAuditAction;
  detail?: string;
  ipHint?: string;
};

export type PasswordResetToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
};
