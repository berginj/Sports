import { useEffect, useState } from "react";
import { apiFetch } from "./api";

/**
 * Loads identity from Functions.
 * Endpoint: GET /api/me  (GetMe.cs)
 *
 * Note:
 * - /api/me returns memberships[] even when leagueId header isn't provided.
 * - To compute isMember/role, the API needs x-league-id (or ?leagueId=...).
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
        // First call: get identity + memberships (no league header required)
        const base = await apiFetch("/api/me", { method: "GET" });
        if (cancelled) return;

        // Choose a league (stored first, otherwise first membership)
        const initialLeagueId = getInitialLeagueId(base);

        // If we have a league, call /api/me again with x-league-id so API can set isMember/role
        const data =
          initialLeagueId
            ? await apiFetch("/api/me", { method: "GET", leagueId: initialLeagueId })
            : base;

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
  const memberships = Array.isArray(me?.memberships) ? me.memberships : [];

  if (stored && memberships.some((m) => m?.leagueId === stored)) return stored;
  return memberships[0]?.leagueId || "";
}

export function persistLeagueId(leagueId) {
  if (!leagueId) return;
  window.localStorage.setItem(LS_KEY, leagueId);
}
