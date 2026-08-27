"use client";

import { useAuthStore } from "./auth-store";
import {
  modelePourType,
  type ModeleDocument,
  type TypeDocumentCommercial,
} from "./document-templates";
import { useStore } from "./store";

/**
 * Modèle de document effectif pour l'utilisateur courant : sa préférence
 * personnelle si définie, sinon le modèle par défaut du tenant.
 */
export function useModelePourType(
  type: TypeDocumentCommercial,
): ModeleDocument | undefined {
  const modeles = useStore((s) => s.modelesDocuments);
  const preferences = useStore((s) => s.preferencesModeles);
  const userId = useAuthStore((s) => s.user?.id);
  return modelePourType(modeles, type, { preferences, userId });
}
