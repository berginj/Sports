import { useEffect, useState } from "react";
import { apiFetch } from "./api";

/**
 * Loads identity from Functions.
 * Endpoint: GET /api/me  (GetMe.cs)
 *
 * Note:
 * - When EasyAuth isn't fully wired, IdentityUtil will fall back to x-user-id / x-user-email headers.
 * - That means you may see UNKNOWN locally until you pass those headers or enable EasyAuth.
 */
export function useSession() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch("/api/me", { method: "GET" });
        if (!cancelled) setMe(data);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { me, loading, error };
}

const LS_KEY = "gameswap.activeLeagueId";

export function getInitialLeagueId(me) {
  const stored = window.localStorage.getItem(LS_KEY) || "";
  const memberships = Array.isArray(me?.Memberships) ? me.Memberships : [];

  if (stored && memberships.some((m) => m?.LeagueId === stored)) return stored;
  return memberships[0]?.LeagueId || "";
}

export function persistLeagueId(leagueId) {
  if (!leagueId) return;
  window.localStorage.setItem(LS_KEY, leagueId);
}
