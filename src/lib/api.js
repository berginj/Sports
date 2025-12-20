// src/lib/api.js

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
  const leagueId = localStorage.getItem("activeLeagueId");
  if (leagueId && !headers.has("x-league-id")) {
    headers.set("x-league-id", leagueId);
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

  if (!res.ok) {
    const msg =
      typeof data === "string" && data
        ? data
        : data?.error || data?.message || res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }

  return data;
}
