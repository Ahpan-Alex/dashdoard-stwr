export type RoleId =
  | "admin_entreprise"
  | "comptable"
  | "acheteur"
  | "caissier"
  | "facturier"
  | "vendeur"
  | "lecture_seule";

export type OperationalRole = "acheteur" | "caissier" | "facturier" | "vendeur";

export type Permission =
  | "factures.lire"
  | "factures.creer"
  | "factures.modifier"
  | "factures.valider"
  | "factures.avoir"
  | "factures.encaisser"
  | "produits.lire"
  | "produits.gerer"
  | "clients.lire"
  | "clients.gerer"
  | "commercial.lire"
  | "commercial.gerer"
  | "achats.lire"
  | "achats.gerer"
  | "rentabilite.lire"
  | "parametres.lire"
  | "parametres.gerer"
  | "navigation.identite"
  | "users.gerer"
  | "audit.lire"
  | "securite.gerer"
  | "sites.vue_globale"
  | "ventes.deroger_credit"
  | "fabrication.deroger_bat"
  | "comptabilite.lire"
  | "comptabilite.gerer"
  | "missions.lire"
  | "missions.gerer";

export const ROLE_LABELS: Record<RoleId, string> = {
  admin_entreprise: "Administrateur entreprise",
  comptable: "Comptable",
  acheteur: "Acheteur",
  caissier: "Caissier",
  facturier: "Facturier",
  vendeur: "Vendeur",
  lecture_seule: "Lecture seule",
};

export const OPERATIONAL_ROLES: OperationalRole[] = [
  "acheteur",
  "caissier",
  "facturier",
  "vendeur",
];

export const ROLE_IDS: RoleId[] = [
  "admin_entreprise",
  "comptable",
  "acheteur",
  "caissier",
  "facturier",
  "vendeur",
  "lecture_seule",
];

export const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  admin_entreprise: [
    "factures.lire",
    "factures.creer",
    "factures.modifier",
    "factures.valider",
    "factures.avoir",
    "factures.encaisser",
    "produits.lire",
    "produits.gerer",
    "clients.lire",
    "clients.gerer",
    "commercial.lire",
    "commercial.gerer",
    "achats.lire",
    "achats.gerer",
    "rentabilite.lire",
    "parametres.lire",
    "parametres.gerer",
    "navigation.identite",
    "users.gerer",
    "audit.lire",
    "securite.gerer",
    "sites.vue_globale",
    "ventes.deroger_credit",
    "fabrication.deroger_bat",
    "comptabilite.lire",
    "comptabilite.gerer",
    "missions.lire",
    "missions.gerer",
  ],
  comptable: [
    "factures.lire",
    "factures.creer",
    "factures.modifier",
    "factures.valider",
    "factures.avoir",
    "factures.encaisser",
    "produits.lire",
    "produits.gerer",
    "clients.lire",
    "clients.gerer",
    "commercial.lire",
    "achats.lire",
    "achats.gerer",
    "rentabilite.lire",
    "parametres.lire",
    "audit.lire",
    "sites.vue_globale",
    "ventes.deroger_credit",
    "fabrication.deroger_bat",
    "comptabilite.lire",
    "comptabilite.gerer",
    "missions.lire",
    "missions.gerer",
  ],
  acheteur: [
    "achats.lire",
    "achats.gerer",
    "produits.lire",
    "clients.lire",
    "missions.lire",
    "missions.gerer",
  ],
  caissier: [
    "factures.lire",
    "factures.creer",
    "factures.encaisser",
    "produits.lire",
    "clients.lire",
    "commercial.lire",
  ],
  facturier: [
    "factures.lire",
    "factures.creer",
    "factures.modifier",
    "factures.valider",
    "factures.avoir",
    "produits.lire",
    "clients.lire",
    "clients.gerer",
    "commercial.lire",
  ],
  vendeur: [
    "factures.lire",
    "produits.lire",
    "clients.lire",
    "clients.gerer",
    "commercial.lire",
    "commercial.gerer",
    "rentabilite.lire",
  ],
  lecture_seule: [
    "factures.lire",
    "produits.lire",
    "clients.lire",
    "commercial.lire",
    "achats.lire",
    "rentabilite.lire",
    "parametres.lire",
    "audit.lire",
    "comptabilite.lire",
    "missions.lire",
  ],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  "factures.lire": "Factures — lecture",
  "factures.creer": "Factures — création",
  "factures.modifier": "Factures — modification",
  "factures.valider": "Factures — validation fiscale",
  "factures.avoir": "Factures — avoirs",
  "factures.encaisser": "Factures — encaissement",
  "produits.lire": "Produits — lecture",
  "produits.gerer": "Produits — gestion",
  "clients.lire": "Clients — lecture",
  "clients.gerer": "Clients — gestion",
  "commercial.lire": "Commercial — lecture",
  "commercial.gerer": "Commercial — gestion",
  "achats.lire": "Achats — lecture",
  "achats.gerer": "Achats — gestion",
  "rentabilite.lire": "Rentabilité — lecture",
  "parametres.lire": "Paramètres — lecture",
  "parametres.gerer": "Paramètres — gestion",
  "navigation.identite": "Menu — identité (nom et logo)",
  "users.gerer": "Utilisateurs — gestion",
  "audit.lire": "Journal d'audit — lecture",
  "securite.gerer": "Sécurité — gestion",
  "sites.vue_globale": "Sites — vue globale (tous les stocks)",
  "ventes.deroger_credit": "Ventes — dérogation au plafond de crédit",
  "fabrication.deroger_bat": "Fabrication — dérogation BAT (démarrer sans BAT validé)",
  "comptabilite.lire": "Comptabilité — lecture",
  "comptabilite.gerer": "Comptabilité — plan et écritures",
  "missions.lire": "Missions d'achat — lecture",
  "missions.gerer": "Missions d'achat — création, clôture et règlement",
};

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as string[]).includes(value);
}

export function normalizeRole(role: string): RoleId {
  if (role === "admin") return "admin_entreprise";
  if (role === "commercial") return "vendeur";
  if (isRoleId(role)) return role;
  return "lecture_seule";
}

function uniqueRoles(roles: RoleId[]): RoleId[] {
  const seen = new Set<RoleId>();
  const out: RoleId[] = [];
  for (const r of roles) {
    if (!seen.has(r)) {
      seen.add(r);
      out.push(r);
    }
  }
  return out.length ? out : ["lecture_seule"];
}

/** Ancien rôle unique « commercial » = vendeur + facturier. */
export function rolesFromStored(role: string, extra?: unknown): RoleId[] {
  const fromJson = Array.isArray(extra)
    ? extra
        .filter((r): r is string => typeof r === "string")
        .map(normalizeRole)
    : [];
  if (fromJson.length) return uniqueRoles(fromJson);
  if (role === "commercial") return ["vendeur", "facturier"];
  return uniqueRoles([normalizeRole(role)]);
}

export function primaryRole(roles: RoleId[]): RoleId {
  if (roles.includes("admin_entreprise")) return "admin_entreprise";
  if (roles.includes("comptable")) return "comptable";
  for (const r of OPERATIONAL_ROLES) {
    if (roles.includes(r)) return r;
  }
  if (roles.includes("lecture_seule")) return "lecture_seule";
  return roles[0] ?? "lecture_seule";
}

export function permissionsForRoles(roles: RoleId[]): Permission[] {
  const set = new Set<Permission>();
  for (const r of roles) {
    for (const p of ROLE_PERMISSIONS[r] ?? []) set.add(p);
  }
  return [...set];
}

export function roleHasPermission(role: RoleId, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function userHasPermission(
  user: { role: string; roles?: unknown },
  permission: Permission,
) {
  return permissionsForRoles(rolesFromStored(user.role, user.roles)).includes(
    permission,
  );
}

export function estAdministrateur(user: { role: string; roles?: unknown }) {
  return rolesFromStored(user.role, user.roles).includes("admin_entreprise");
}

export function libelleRoles(roles: RoleId[]): string {
  return roles.map((r) => ROLE_LABELS[r]).join(" · ");
}

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const SESSION_IDLE_MS = 60 * 60 * 1000; // 60 min
export const SESSION_MAX_MS = 14 * 24 * 60 * 60 * 1000; // 14 j
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 60 min
