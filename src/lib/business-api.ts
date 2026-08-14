import { apiFetch } from "./api";
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
  const res = await apiFetch<BusinessResponse>("/business", {
    method: "PUT",
    body: JSON.stringify({
      data,
      expectedRevision: expectedRevision ?? revision,
    }),
  });
  revision = res.revision;
  return res;
}

export async function resetBusinessState(
  mode: "empty" | "demo" = "demo",
): Promise<BusinessResponse> {
  const res = await apiFetch<BusinessResponse>("/business/reset", {
    method: "POST",
    body: JSON.stringify({ mode }),
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
  }, 600);
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
