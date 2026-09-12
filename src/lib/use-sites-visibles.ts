"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAuthStore } from "./auth-store";
import {
  peutVoirTousLesSites,
  sitesVisiblesPourUtilisateur,
  utilisateurRattacheAuSite,
} from "./sites";
import { useStore } from "./store";

/** Sites visibles pour l'utilisateur connecté + correction du filtre actif. */
export function useSitesVisibles() {
  const sites = useStore((s) => s.pointsDeVente);
  const actif = useStore((s) => s.pointDeVenteActifId);
  const setActif = useStore((s) => s.setPointDeVenteActif);
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const vueGlobale = hasPermission("sites.vue_globale");
  const ids = user?.pointDeVenteIds;

  const visibles = useMemo(
    () => sitesVisiblesPourUtilisateur(sites, ids, vueGlobale),
    [sites, ids, vueGlobale],
  );
  const peutTous = peutVoirTousLesSites(ids, vueGlobale);

  useEffect(() => {
    if (actif === "tous") {
      if (!peutTous && visibles[0]) setActif(visibles[0].id);
      return;
    }
    if (!visibles.some((s) => s.id === actif)) {
      setActif(peutTous ? "tous" : (visibles[0]?.id ?? "tous"));
    }
  }, [actif, peutTous, visibles, setActif]);

  const rattache = useCallback(
    (siteId: string) => utilisateurRattacheAuSite(siteId, ids, vueGlobale),
    [ids, vueGlobale],
  );

  return { visibles, peutTous, actif, vueGlobale, rattache };
}
