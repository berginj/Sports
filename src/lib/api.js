// src/lib/api.js
function apiBase() {
  // PROD: use SWA proxy (/api). DEV: allow direct Function App override.
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
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(url, { ...options, headers });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = typeof data === "string" && data ? data : (data?.error || data?.message || res.statusText);
    throw new Error(`${res.status} ${msg}`);
  }

  return data;
}
