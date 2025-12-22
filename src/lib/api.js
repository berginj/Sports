// src/lib/api.js

const LS_LEAGUE = "activeLeagueId";

export function getStoredLeagueId() {
  try {
    return (localStorage.getItem(LS_LEAGUE) || "").trim();
  } catch {
    return "";
  }
}

export function setStoredLeagueId(leagueId) {
  try {
    const v = (leagueId || "").trim();
    if (v) localStorage.setItem(LS_LEAGUE, v);
    else localStorage.removeItem(LS_LEAGUE);
  } catch {
    // ignore
  }
}

function getLeagueIdFromQuery() {
  try {
    const u = new URL(window.location.href);
    return (u.searchParams.get("leagueId") || "").trim();
  } catch {
    return "";
  }
}

function shouldSkipLeagueHeader(url) {
  // SWA auth endpoints live at /.auth/*
  if (typeof url === "string" && url.startsWith("/.auth/")) return true;

  // /api/me is “league discovery” and should work without a league selected
  if (typeof url === "string" && url === "/api/me") return true;

  return false;
}

async function readErrorBody(resp) {
  try {
    const text = await resp.text();
    return text || "";
  } catch {
    return "";
  }
}

export async function apiFetch(url, opts = {}) {
  const {
    leagueId: leagueIdOpt,
    headers: headersOpt,
    method,
    body,
    ...rest
  } = opts;

  const headers = new Headers(headersOpt || {});

  // JSON convenience: if body is an object, stringify it unless already a string/FormData/etc
  const isBodyPlainObject =
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer);

  const finalBody = isBodyPlainObject ? JSON.stringify(body) : body;

  if (isBodyPlainObject && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  // league header
  if (!shouldSkipLeagueHeader(url)) {
    const leagueId =
      (leagueIdOpt || "").trim() ||
      getStoredLeagueId() ||
      getLeagueIdFromQuery();

    if (leagueId) headers.set("x-league-id", leagueId);
  }

  const resp = await fetch(url, {
    method: method || (finalBody ? "POST" : "GET"),
    headers,
    body: finalBody,
    // same-origin cookies are included by default, but being explicit is fine:
    credentials: "same-origin",
    ...rest,
  });

  if (!resp.ok) {
    const errBody = await readErrorBody(resp);
    const msg = errBody
      ? `${resp.status} ${resp.statusText}: ${errBody}`
      : `${resp.status} ${resp.statusText}`;
    const e = new Error(msg);
    e.status = resp.status;
    e.body = errBody;
    throw e;
  }

  // Auto-parse JSON when content-type says so, else return text
  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return await resp.json();
  return await resp.text();
}

// Small helpers if you want them
export const apiGet = (url, opts) => apiFetch(url, { ...opts, method: "GET" });
export const apiPost = (url, body, opts) => apiFetch(url, { ...opts, method: "POST", body });
export const apiPut = (url, body, opts) => apiFetch(url, { ...opts, method: "PUT", body });
export const apiPatch = (url, body, opts) => apiFetch(url, { ...opts, method: "PATCH", body });
export const apiDel = (url, opts) => apiFetch(url, { ...opts, method: "DELETE" });
