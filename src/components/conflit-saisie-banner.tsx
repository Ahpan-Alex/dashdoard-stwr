"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  getBusinessBase,
  putBusinessState,
  setBusinessBase,
  setBusinessConflictHandler,
  setBusinessRevision,
  setBusinessSyncEnabled,
} from "@/lib/business-api";
import {
  etatsEquivalents,
  fusionnerEtatsSimultanes,
} from "@/lib/conflit-saisie";
import { pickAppState } from "@/lib/empty-state";
import { useStore } from "@/lib/store";
import type { AppState } from "@/lib/types";

function copier(etat: AppState): AppState {
  try {
    return structuredClone(etat);
  } catch {
    return JSON.parse(JSON.stringify(etat)) as AppState;
  }
}

/** Deux comptes ont enregistré ensemble : on garde les deux saisies. */
export function ConflitSaisieBanner() {
  const [visible, setVisible] = useState(false);
  const applyBusinessData = useStore((s) => s.applyBusinessData);

  useEffect(() => {
    setBusinessConflictHandler(async ({ data: serveurInitial, revision }) => {
      setBusinessSyncEnabled(false);
      let distant = serveurInitial;
      let revisionDistante = revision;
      let ancetre = getBusinessBase();
      let conflit = false;
      let resolu = false;
      try {
        for (let essai = 0; essai < 5; essai++) {
          const local = copier(pickAppState(useStore.getState()));
          const fusion = fusionnerEtatsSimultanes(ancetre, local, distant);
          if (fusion.conflit) conflit = true;
          if (!fusion.aEnregistrer) {
            applyBusinessData(distant);
            setBusinessBase(distant);
            setBusinessRevision(revisionDistante);
            resolu = true;
            break;
          }
          try {
            const res = await putBusinessState(fusion.etat, revisionDistante);
            const apres = pickAppState(useStore.getState());
            if (etatsEquivalents(apres, local)) {
              applyBusinessData(res.data);
              resolu = true;
              break;
            }
            ancetre = local;
            distant = res.data;
            revisionDistante = res.revision;
          } catch (err) {
            if (
              err instanceof ApiError &&
              err.status === 409 &&
              err.body &&
              typeof err.body === "object" &&
              "data" in err.body
            ) {
              const body = err.body as { data?: AppState; revision?: number };
              if (body.data) distant = body.data;
              if (typeof body.revision === "number") revisionDistante = body.revision;
              continue;
            }
            applyBusinessData(distant);
            setBusinessBase(distant);
            setBusinessRevision(revisionDistante);
            conflit = true;
            resolu = true;
            break;
          }
        }
        if (!resolu) {
          applyBusinessData(distant);
          setBusinessBase(distant);
          setBusinessRevision(revisionDistante);
          conflit = true;
        }
        if (conflit) setVisible(true);
      } finally {
        setBusinessSyncEnabled(true);
      }
    });
    return () => setBusinessConflictHandler(null);
  }, [applyBusinessData]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="mb-6 rounded-[var(--radius)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="font-semibold">Enregistrement simultané</p>
      <p className="mt-1">
        Deux comptes ont modifié la même information au même moment. Le reste
        des deux saisies a été conservé. Pour cette information précise, la
        version déjà enregistrée est restée : si votre dernière saisie n&apos;y
        est plus, refaites-la.
      </p>
      <button
        type="button"
        className="btn btn-secondary mt-3"
        onClick={() => setVisible(false)}
      >
        J&apos;ai compris
      </button>
    </div>
  );
}
