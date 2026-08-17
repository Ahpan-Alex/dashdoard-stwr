import { apiFetch, ApiError } from "./api";
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

/** Debounce PUT après mutations locales. */
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
    .catch((err) => {
      console.error("[business] sync failed", err);
      // Remet en file pour retry
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
