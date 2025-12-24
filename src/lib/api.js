// src/lib/api.js

import { LEAGUE_HEADER_NAME, LEAGUE_STORAGE_KEY } from "./constants";

/**
 * PROD (Azure Static Web Apps): use relative /api so SWA proxies to linked Function App.
 * DEV: allow overriding to call a direct Function App host.
 */
export function apiBase() {
  if (import.meta.env.DEV) {
    const b = import.meta.env.VITE_API_BASE_URL;
    return b && b.trim() ? b.trim().replace(/\/+$/, "") : "";
  }
  return "";
}

function isFormLikeBody(body) {
  // Things where the browser must control Content-Type (boundary, etc)
  return (
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) ||
    (typeof Uint8Array !== "undefined" && body instanceof Uint8Array)
  );
}

export async function apiFetch(path, options = {}) {
  const base = apiBase();
  const url = base ? `${base}${path}` : path;

  const headers = new Headers(options.headers || {});

  // Always attach active league id (multi-tenant context)
  const leagueId = (localStorage.getItem(LEAGUE_STORAGE_KEY) || "").trim();
  if (leagueId && !headers.has(LEAGUE_HEADER_NAME)) {
    headers.set(LEAGUE_HEADER_NAME, leagueId);
  }

  // Only default Content-Type to JSON for non-FormData bodies.
  // If caller sets Content-Type explicitly (text/csv, etc), we respect it.
  if (options.body != null && !headers.has("Content-Type")) {
    if (!isFormLikeBody(options.body)) {
      headers.set("Content-Type", "application/json");
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // REQUIRED for EasyAuth / SWA auth cookies
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  // Standard envelope
  if (!res.ok) {
    const err = payload?.error;
    const message =
      (typeof err === "string" ? err : err?.message) ||
      (typeof payload === "string" ? payload : "Request failed");
    const code = typeof err === "object" && err?.code ? err.code : null;
    const details = typeof err === "object" ? err?.details : null;

    const extra = details ? ` | details: ${JSON.stringify(details)}` : "";
    throw new Error(`${res.status}${code ? ` ${code}` : ""}: ${message}${extra}`);
  }

  if (payload && typeof payload === "object" && "data" in payload) return payload.data;
  return payload;
}
