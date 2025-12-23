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

export async function apiFetch(path, options = {}) {
  const base = apiBase();
  const url = base ? `${base}${path}` : path;

  const headers = new Headers(options.headers || {});

  // Always attach active league id (multi-tenant context)
  // NOTE: league-scoped endpoints require this header.
  const leagueId = (localStorage.getItem(LEAGUE_STORAGE_KEY) || "").trim();
  if (leagueId && !headers.has(LEAGUE_HEADER_NAME)) {
    headers.set(LEAGUE_HEADER_NAME, leagueId);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // REQUIRED for EasyAuth / SWA auth cookies
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  // Standard envelope
  if (!res.ok) {
    const err = data?.error;
    const msg =
      (typeof err === "string" ? err : err?.message) ||
      (typeof data === "string" ? data : "Request failed");
    const code = typeof err === "object" && err?.code ? `${err.code}: ` : "";
    throw new Error(`${res.status} ${code}${msg}`);
  }

  // Successful responses should be { data: ... }
  if (data && typeof data === "object" && "data" in data) return data.data;
  return data;
}
