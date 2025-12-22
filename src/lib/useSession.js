import { useEffect, useMemo, useState } from "react";

// Local storage key for the last selected league.
const LS_LEAGUE = "gameswap_leagueId";

export function persistLeagueId(leagueId) {
  try {
    if (!leagueId) {
      localStorage.removeItem(LS_LEAGUE);
    } else {
      localStorage.setItem(LS_LEAGUE, leagueId);
    }
  } catch {
    // ignore
  }
}

export function getInitialLeagueId(me) {
  // 1) Persisted value
  try {
    const saved = (localStorage.getItem(LS_LEAGUE) || "").trim();
    if (saved) return saved;
  } catch {
    // ignore
  }

  // 2) First membership, if any
  const memberships = Array.isArray(me?.memberships) ? me.memberships : [];
  return (memberships[0]?.leagueId || "").trim();
}

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
        const res = await fetch("/api/me", { credentials: "include" });
        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }
        if (!res.ok) throw new Error(data?.error || `Failed to load /api/me (${res.status})`);
        if (!cancelled) setMe(data || {});
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load session");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const memberships = useMemo(() => (Array.isArray(me?.memberships) ? me.memberships : []), [me]);
  const hasMemberships = memberships.length > 0;
  const isGlobalAdmin = !!me?.isGlobalAdmin;

  const [leagueId, setLeagueId] = useState("");

  // Pick an initial leagueId once `me` loads.
  useEffect(() => {
    if (!me) return;
    const initial = getInitialLeagueId(me);
    if (initial && !leagueId) setLeagueId(initial);
  }, [me]); // intentionally omit leagueId

  // Persist league changes
  useEffect(() => {
    if (leagueId) persistLeagueId(leagueId);
  }, [leagueId]);

  return {
    me: me || {},
    memberships,
    hasMemberships,
    isGlobalAdmin,
    leagueId,
    setLeagueId,
    loading,
    error,
    refreshMe: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json();
      setMe(data || {});
      return data;
    },
  };
}
