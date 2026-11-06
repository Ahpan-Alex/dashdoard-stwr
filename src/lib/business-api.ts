import { apiFetch, ApiError } from "./api";
import type { PrefsUserAffichage } from "./affichage-tableaux";
import type { ParametresAlertes, SuiviAlertesUser } from "./alertes";
import type { AppState } from "./types";

export type BusinessResponse = {
  revision: number;
  updatedAt: string;
  data: AppState;
};

let revision = 0;
let syncEnabled = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveInFlight: Promise<void> | null = null;
let pendingData: AppState | null = null;
/** Dernier état confirmé par le serveur. Ancêtre commun d'une fusion. */
let baseSnapshot: AppState | null = null;

function memoriserBase(data: AppState) {
  try {
    baseSnapshot = structuredClone(data);
  } catch {
    baseSnapshot = JSON.parse(JSON.stringify(data)) as AppState;
  }
}

export function getBusinessBase(): AppState | null {
  return baseSnapshot;
}

export function setBusinessBase(data: AppState | null) {
  baseSnapshot = data ? memoriserEtRetourner(data) : null;
}

function memoriserEtRetourner(data: AppState): AppState {
  memoriserBase(data);
  return baseSnapshot ?? data;
}

export function getBusinessRevision() {
  return revision;
}

export function setBusinessRevision(r: number) {
  revision = r;
}

export function setBusinessSyncEnabled(enabled: boolean) {
  syncEnabled = enabled;
  if (!enabled && saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

export function isBusinessSyncEnabled() {
  return syncEnabled;
}

async function lireBusinessState(): Promise<BusinessResponse> {
  return apiFetch<BusinessResponse>("/business");
}

export async function fetchBusinessState(): Promise<BusinessResponse> {
  const res = await lireBusinessState();
  revision = res.revision;
  memoriserBase(res.data);
  return res;
}

export async function putBusinessState(
  data: AppState,
  expectedRevision?: number,
): Promise<BusinessResponse> {
  const res = await apiFetch<BusinessResponse>("/business", {
    method: "PUT",
    body: JSON.stringify({
      data,
      expectedRevision: expectedRevision ?? revision,
    }),
  });
  revision = res.revision;
  memoriserBase(res.data);
  return res;
}

export async function putPreferencesAffichage(
  prefs: PrefsUserAffichage,
): Promise<BusinessResponse> {
  const res = await apiFetch<BusinessResponse>("/business/preferences-affichage", {
    method: "PUT",
    body: JSON.stringify({ prefs }),
  });
  // La réponse ne remplace pas le dossier entier de ce navigateur.
  // Avancer la révision ici ferait accepter, au prochain enregistrement,
  // une copie qui ignore ce que les autres comptes viennent de sauver.
  return res;
}

export async function putParametresAlertes(
  parametresAlertes: ParametresAlertes,
): Promise<BusinessResponse> {
  const res = await apiFetch<BusinessResponse>("/business/parametres-alertes", {
    method: "PUT",
    body: JSON.stringify({ parametresAlertes }),
  });
  return res;
}

export async function putAlertesSuivi(
  suivi: SuiviAlertesUser,
): Promise<BusinessResponse> {
  const res = await apiFetch<BusinessResponse>("/business/alertes-suivi", {
    method: "PUT",
    body: JSON.stringify({ suivi }),
  });
  return res;
}

export async function resetBusinessState(
  password: string,
): Promise<BusinessResponse> {
  const res = await apiFetch<BusinessResponse>("/business/reset", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  revision = res.revision;
  memoriserBase(res.data);
  return res;
}

let conflictHandler:
  | ((payload: { data: AppState; revision: number }) => void | Promise<void>)
  | null = null;

/** Callback UI : un autre compte a enregistré entre-temps. */
export function setBusinessConflictHandler(
  handler:
    | ((payload: { data: AppState; revision: number }) => void | Promise<void>)
    | null,
) {
  conflictHandler = handler;
}

async function chargerEtatServeur(): Promise<BusinessResponse | null> {
  try {
    return await lireBusinessState();
  } catch {
    return null;
  }
}
export function scheduleBusinessSave(data: AppState) {
  if (!syncEnabled) return;
  pendingData = data;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushBusinessSave();
  }, 250);
}

async function flushBusinessSave() {
  if (!pendingData || !syncEnabled) return;
  if (saveInFlight) {
    await saveInFlight;
    return flushBusinessSave();
  }
  const data = pendingData;
  pendingData = null;
  saveInFlight = putBusinessState(data)
    .then(() => undefined)
    .catch(async (err) => {
      if (err instanceof ApiError && err.status === 409) {
        pendingData = null;
        const body = err.body as { data?: AppState; revision?: number };
        const lu = body?.data
          ? { data: body.data, revision: body.revision ?? revision }
          : await chargerEtatServeur();
        if (lu?.data && conflictHandler) {
          await conflictHandler({
            data: lu.data,
            revision: lu.revision ?? body?.revision ?? revision,
          });
        }
        return;
      }
      console.error("[business] sync failed", err);
      if (!pendingData) pendingData = data;
    })
    .finally(() => {
      saveInFlight = null;
    });
  await saveInFlight;
  if (pendingData) await flushBusinessSave();
}

export async function flushBusinessSaveNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await flushBusinessSave();
}

export function installBusinessSaveLifecycle() {
  if (typeof window === "undefined") return;
  const flush = () => {
    void flushBusinessSaveNow();
  };
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
