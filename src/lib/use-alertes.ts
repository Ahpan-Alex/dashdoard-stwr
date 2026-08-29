"use client";

import { useMemo } from "react";
import {
  alerteVisiblePourUtilisateur,
  evaluerAlertes,
  filtrerAlertesPdv,
  normaliserSuiviUser,
  type AlerteInstance,
  type CategorieAlerte,
} from "./alertes";
import { useAuthStore } from "./auth-store";
import { useStore } from "./store";

export function useAlertes() {
  const userId = useAuthStore((s) => s.user?.id);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const parametresAlertes = useStore((s) => s.parametresAlertes);
  const parametres = useStore((s) => s.parametres);
  const achats = useStore((s) => s.achats);
  const factures = useStore((s) => s.factures);
  const acomptes = useStore((s) => s.acomptes);
  const journalAudit = useStore((s) => s.journalAudit);
  const clients = useStore((s) => s.clients);
  const fournisseurs = useStore((s) => s.fournisseurs);
  const produits = useStore((s) => s.produits);
  const entrees = useStore((s) => s.entrees);
  const ventes = useStore((s) => s.ventes);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const inventaires = useStore((s) => s.inventaires);
  const pointDeVenteActifId = useStore((s) => s.pointDeVenteActifId);
  const alertesSuivi = useStore((s) => s.alertesSuivi);

  const toutes = useMemo(
    () =>
      evaluerAlertes({
        parametresAlertes,
        parametres,
        achats,
        factures,
        acomptes,
        journalAudit,
        clients,
        fournisseurs,
        produits,
        entrees,
        ventes,
        pointsDeVente,
        inventaires,
      }),
    [
      parametresAlertes,
      parametres,
      achats,
      factures,
      acomptes,
      journalAudit,
      clients,
      fournisseurs,
      produits,
      entrees,
      ventes,
      pointsDeVente,
      inventaires,
    ],
  );

  const visibles = useMemo(
    () =>
      filtrerAlertesPdv(
        toutes.filter((a) => alerteVisiblePourUtilisateur(a, hasPermission)),
        pointDeVenteActifId,
      ),
    [toutes, hasPermission, pointDeVenteActifId],
  );

  const suivi = useMemo(
    () => normaliserSuiviUser(userId ? alertesSuivi[userId] : undefined),
    [alertesSuivi, userId],
  );

  const actives = useMemo(
    () => visibles.filter((a) => !suivi.traitees.includes(a.id)),
    [visibles, suivi.traitees],
  );
  const traitees = useMemo(
    () => visibles.filter((a) => suivi.traitees.includes(a.id)),
    [visibles, suivi.traitees],
  );
  const nonLues = useMemo(
    () => actives.filter((a) => !suivi.lues.includes(a.id)),
    [actives, suivi.lues],
  );

  function parCategorie(cat: CategorieAlerte | "toutes"): AlerteInstance[] {
    if (cat === "toutes") return actives;
    return actives.filter((a) => a.categorie === cat);
  }

  return {
    actives,
    traitees,
    nonLues,
    suivi,
    parCategorie,
    compteur: nonLues.length,
  };
}
