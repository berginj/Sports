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
  const leagueId = (localStorage.getItem(LEAGUE_STORAGE_KEY) || "").trim();
  if (leagueId && !headers.has(LEAGUE_HEADER_NAME)) {
    headers.set(LEAGUE_HEADER_NAME, leagueId);
  }

  const body = options.body;

  // IMPORTANT: do not set Content-Type for FormData uploads.
  // The browser must set the multipart boundary.
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  // If caller didn't set Content-Type:
  // - for JSON-ish bodies we default to application/json
  // - for FormData we do nothing
  if (body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // If Content-Type is application/json and body is a plain object, stringify it.
  // (Do not stringify strings, Blobs, ArrayBuffers, FormData, etc.)
  const contentType = headers.get("Content-Type") || "";
  let finalBody = body;

  const looksJson =
    contentType.toLowerCase().includes("application/json") ||
    contentType.toLowerCase().includes("application/problem+json");

  const isPlainObject =
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof URLSearchParams) &&
    !isFormData;

  if (looksJson && isPlainObject) {
    finalBody = JSON.stringify(body);
  }

  const res = await fetch(url, {
    ...options,
    body: finalBody,
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
