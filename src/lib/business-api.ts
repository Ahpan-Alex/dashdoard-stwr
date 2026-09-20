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

export async function fetchBusinessState(): Promise<BusinessResponse> {
  const res = await apiFetch<BusinessResponse>("/business");
  revision = res.revision;
  return res;
}

export async function putBusinessState(
  data: AppState,
  expectedRevision?: number,
): Promise<BusinessResponse> {
  try {
    const res = await apiFetch<BusinessResponse>("/business", {
      method: "PUT",
      body: JSON.stringify({
        data,
        expectedRevision: expectedRevision ?? revision,
      }),
    });
    revision = res.revision;
    return res;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409 && err.body && typeof err.body === "object") {
      const body = err.body as { revision?: number };
      if (typeof body.revision === "number") revision = body.revision;
    }
    throw err;
  }
}

export async function putPreferencesAffichage(
  prefs: PrefsUserAffichage,
): Promise<BusinessResponse> {
  const res = await apiFetch<BusinessResponse>("/business/preferences-affichage", {
    method: "PUT",
    body: JSON.stringify({ prefs }),
  });
  revision = res.revision;
  return res;
}

export async function putParametresAlertes(
  parametresAlertes: ParametresAlertes,
): Promise<BusinessResponse> {
  const res = await apiFetch<BusinessResponse>("/business/parametres-alertes", {
    method: "PUT",
    body: JSON.stringify({ parametresAlertes }),
  });
  revision = res.revision;
  return res;
}

export async function putAlertesSuivi(
  suivi: SuiviAlertesUser,
): Promise<BusinessResponse> {
  const res = await apiFetch<BusinessResponse>("/business/alertes-suivi", {
    method: "PUT",
    body: JSON.stringify({ suivi }),
  });
  revision = res.revision;
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
  return res;
}

let conflictHandler: ((payload: { data: AppState }) => void) | null = null;

/** Callback UI : un autre utilisateur a enregistré, on recharge sa version. */
export function setBusinessConflictHandler(
  handler: ((payload: { data: AppState }) => void) | null,
) {
  conflictHandler = handler;
}

async function chargerEtatServeur(): Promise<AppState | null> {
  try {
    const res = await fetchBusinessState();
    return res.data;
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
        const body = err.body as { data?: AppState };
        const serveur = body?.data ?? (await chargerEtatServeur());
        if (serveur) conflictHandler?.({ data: serveur });
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
