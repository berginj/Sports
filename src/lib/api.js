// src/lib/api.js
// Single fetch helper for the UI. Always prefers an explicit leagueId, otherwise falls back
// to localStorage("activeLeagueId"). Attaches x-league-id when available.

async function readTextSafely(resp) {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

function parseJsonOrNull(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizePath(path) {
  // Allow callers to pass "/api/..." or "api/..." or "/..."
  if (!path) return "/api/ping";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/api/")) return path;
  if (path.startsWith("api/")) return `/${path}`;
  if (path.startsWith("/")) return `/api${path}`;
  return `/api/${path}`;
}

function getStoredLeagueId() {
  return (localStorage.getItem("activeLeagueId") || "").trim();
}

export async function apiFetch(path, options = {}) {
  const url = normalizePath(path);

  const {
    leagueId: explicitLeagueId,
    headers: userHeaders,
    // common fetch options:
    method,
    body,
    signal,
    credentials,
    cache,
    redirect,
    referrerPolicy,
    mode,
    // allow pass-through for anything else
    ...rest
  } = options;

  const leagueId = (explicitLeagueId ?? getStoredLeagueId()).trim();

  const headers = new Headers(userHeaders || {});
  // Always attach league header when we have it
  if (leagueId) headers.set("x-league-id", leagueId);

  // If body is a plain object, send JSON by default
  let finalBody = body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
  const isString = typeof body === "string";

  if (body != null && !isFormData && !isBlob && !isString && typeof body === "object") {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
    finalBody = JSON.stringify(body);
  }

  const resp = await fetch(url, {
    method: method ?? (finalBody ? "POST" : "GET"),
    headers,
    body: finalBody,
    signal,
    credentials,
    cache,
    redirect,
    referrerPolicy,
    mode,
    ...rest,
  });

  // Success: try to return JSON; otherwise return raw text
  if (resp.ok) {
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return await resp.json();
      } catch {
        // fall through to text
      }
    }
    return await readTextSafely(resp);
  }

  // Error: build a useful error object
  const text = await readTextSafely(resp);
  const maybeJson = parseJsonOrNull(text);

  const err = new Error(
    maybeJson?.error ||
      maybeJson?.message ||
      text ||
      `Request failed (${resp.status})`
  );

  err.status = resp.status;
  err.url = url;
  err.body = maybeJson ?? text;

  throw err;
}

// Convenience wrappers (optional, but handy)
export const api = {
  get: (path, opts = {}) => apiFetch(path, { ...opts, method: "GET" }),
  post: (path, body, opts = {}) => apiFetch(path, { ...opts, method: "POST", body }),
  put: (path, body, opts = {}) => apiFetch(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts = {}) => apiFetch(path, { ...opts, method: "PATCH", body }),
  del: (path, opts = {}) => apiFetch(path, { ...opts, method: "DELETE" }),
};
