export type RoleId =
  | "admin_entreprise"
  | "comptable"
  | "commercial"
  | "caissier"
  | "lecture_seule";

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
  | "charges.lire"
  | "charges.gerer"
  | "rentabilite.lire"
  | "parametres.lire"
  | "parametres.gerer"
  | "navigation.identite"
  | "users.gerer"
  | "audit.lire"
  | "securite.gerer";

export const ROLE_LABELS: Record<RoleId, string> = {
  admin_entreprise: "Administrateur entreprise",
  comptable: "Comptable",
  commercial: "Commercial",
  caissier: "Caissier",
  lecture_seule: "Lecture seule",
};

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
    "charges.lire",
    "charges.gerer",
    "rentabilite.lire",
    "parametres.lire",
    "parametres.gerer",
    "navigation.identite",
    "users.gerer",
    "audit.lire",
    "securite.gerer",
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
    "charges.lire",
    "charges.gerer",
    "rentabilite.lire",
    "parametres.lire",
    "audit.lire",
  ],
  commercial: [
    "factures.lire",
    "factures.creer",
    "factures.modifier",
    "factures.valider",
    "produits.lire",
    "clients.lire",
    "clients.gerer",
    "commercial.lire",
    "commercial.gerer",
    "rentabilite.lire",
  ],
  caissier: [
    "factures.lire",
    "factures.creer",
    "factures.encaisser",
    "produits.lire",
    "clients.lire",
    "commercial.lire",
  ],
  lecture_seule: [
    "factures.lire",
    "produits.lire",
    "clients.lire",
    "commercial.lire",
    "charges.lire",
    "rentabilite.lire",
    "parametres.lire",
    "audit.lire",
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
  "charges.lire": "Charges — lecture",
  "charges.gerer": "Charges — gestion",
  "rentabilite.lire": "Rentabilité — lecture",
  "parametres.lire": "Paramètres — lecture",
  "parametres.gerer": "Paramètres — gestion",
  "navigation.identite": "Menu — identité (nom et logo)",
  "users.gerer": "Utilisateurs — gestion",
  "audit.lire": "Journal d'audit — lecture",
  "securite.gerer": "Sécurité — gestion",
};

export function roleHasPermission(role: RoleId, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const SESSION_IDLE_MS = 60 * 60 * 1000; // 60 min
export const SESSION_MAX_MS = 14 * 24 * 60 * 60 * 1000; // 14 j
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 60 min
