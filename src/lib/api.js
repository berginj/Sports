// src/lib/api.js
import { LEAGUE_HEADER_NAME, LEAGUE_STORAGE_KEY } from "./constants";

export function apiBase() {
  const b = import.meta.env.VITE_API_BASE_URL;
  return b && b.trim() ? b.trim().replace(/\/+$/, "") : "";
}

function buildApiUrl(base, path) {
  if (!base) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (/\/api$/.test(base) && normalizedPath.startsWith("/api/")) {
    return `${base}${normalizedPath.slice(4)}`;
  }
  return `${base}${normalizedPath}`;
}

function isNonJsonBody(body) {
  // Bodies where the browser MUST control Content-Type (boundary, etc.)
  return (
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) ||
    (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams)
  );
}

export async function apiFetch(path, options = {}) {
  const { omitLeagueHeader = false, ...fetchOptions } = options;
  const base = apiBase();
  const url = buildApiUrl(base, path);

  const headers = new Headers(fetchOptions.headers || {});

  // Always attach active league id (multi-tenant context)
  if (!omitLeagueHeader) {
    const leagueId = (localStorage.getItem(LEAGUE_STORAGE_KEY) || "").trim();
    if (leagueId && !headers.has(LEAGUE_HEADER_NAME)) {
      headers.set(LEAGUE_HEADER_NAME, leagueId);
    }
  }

  const body = fetchOptions.body;

  // Only default to JSON when it's NOT a FormData/blob/etc request.
  if (body != null && !headers.has("Content-Type") && !isNonJsonBody(body)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include", // EasyAuth/SWA cookies
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = data?.error;
    const msg =
      (typeof err === "string" ? err : err?.message) ||
      (typeof data === "string" ? data : "Request failed");
    const code = typeof err === "object" && err?.code ? `${err.code}: ` : "";
    throw new Error(`${res.status} ${code}${msg}`);
  }

  if (data && typeof data === "object" && "data" in data) return data.data;
  return data;
}
