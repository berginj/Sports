/**
 * API helper for GameSwap (SWA + Functions).
 *
 * - PROD (Azure Static Web Apps): always use relative /api so SWA proxies to linked Function App.
 * - DEV (vite): allow VITE_API_BASE_URL to call a direct Function App host.
 *
 * League-scoped endpoints REQUIRE x-league-id. Pass { leagueId } to apiFetch().
 */
function apiBase() {
  if (import.meta.env.DEV) {
    const b = import.meta.env.VITE_API_BASE_URL;
    return b && b.trim() ? b.trim().replace(/\/+$/, "") : "";
  }
  return "";
}

function buildUrl(path, query) {
  const base = apiBase();
  const url = base ? `${base}${path}` : path;

  if (!query || Object.keys(query).length === 0) return url;

  const u = new URL(url, window.location.origin);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    u.searchParams.set(k, String(v));
  }
  // keep relative if we started relative
  return base ? u.toString() : u.pathname + u.search;
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export async function apiFetch(path, { method = "GET", body, headers, leagueId, query } = {}) {
  const url = buildUrl(path, query);

  const h = new Headers(headers || {});
  if (leagueId) h.set("x-league-id", leagueId);
  if (body !== undefined && body !== null && !h.has("Content-Type")) h.set("Content-Type", "application/json");

  const res = await fetch(url, { method, headers: h, body: body !== undefined && body !== null ? body : undefined });

  const data = await parseBody(res);

  if (!res.ok) {
    const msg =
      typeof data === "string" && data
        ? data
        : data?.error || data?.message || res.statusText || "Request failed";
    throw new Error(`${res.status} ${msg}`);
  }

  return data;
}

export function getApiBaseLabel() {
  return apiBase() || "(relative /api — SWA integrated API)";
}
