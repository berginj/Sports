// src/lib/api.js

function getActiveLeagueId() {
  // Keep the existing key for backward compatibility
  return (localStorage.getItem("activeLeagueId") || "").trim();
}

function normalizeUrl(path) {
  // Accept absolute URLs
  if (/^https?:\/\//i.test(path)) return path;

  // Callers sometimes pass "/api/..." and sometimes "/..."
  if (path.startsWith("/api/")) return path;
  if (path.startsWith("/")) return `/api${path}`;
  return `/api/${path}`;
}

async function safeReadText(resp) {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

async function safeJson(resp) {
  const txt = await safeReadText(resp);
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

/**
 * apiFetch(path, options?)
 * - Automatically attaches x-league-id from localStorage("activeLeagueId") unless overridden.
 * - Supports callers passing "/api/..." OR "/...".
 */
export async function apiFetch(path, options = {}) {
  const url = normalizeUrl(path);

  const {
    method = "GET",
    headers = {},
    body = undefined,
    leagueId = undefined, // optional override
    signal = undefined,
  } = options;

  const activeLeagueId = (leagueId ?? getActiveLeagueId()).trim();

  const finalHeaders = {
    Accept: "application/json",
    ...headers,
  };

  // Attach league scope automatically when available
  if (activeLeagueId) {
    finalHeaders["x-league-id"] = activeLeagueId;
  }

  let finalBody = body;

  // If body is a plain object, send JSON
  const isPlainObject =
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer);

  if (isPlainObject) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  const resp = await fetch(url, {
    method,
    headers: finalHeaders,
    body: finalBody,
    signal,
  });

  if (!resp.ok) {
    const data = await safeJson(resp);
    const msg =
      data?.error ||
      data?.message ||
      (await safeReadText(resp)) ||
      `${resp.status} ${resp.statusText}`;
    throw new Error(msg);
  }

  // Some endpoints may legitimately return empty
  const data = await safeJson(resp);
  return data ?? {};
}
