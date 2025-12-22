// src/lib/useSession.js
import { useEffect, useState } from "react";
import { apiFetch } from "./api";

const STORAGE_KEY = "activeLeagueId";

export function persistLeagueId(leagueId) {
  const id = (leagueId || "").trim();
  if (id) localStorage.setItem(STORAGE_KEY, id);
  else localStorage.removeItem(STORAGE_KEY);
}

function readPersistedLeagueId() {
  return (localStorage.getItem(STORAGE_KEY) || "").trim();
}

function normalizeMemberships(me) {
  // Support both shapes, but prefer camelCase going forward.
  const m =
    (Array.isArray(me?.memberships) && me.memberships) ||
    (Array.isArray(me?.Memberships) && me.Memberships) ||
    [];

  // Normalize each entry to { leagueId, role }
  return m
    .map((x) => ({
      leagueId: (x?.leagueId ?? x?.LeagueId ?? "").trim(),
      role: (x?.role ?? x?.Role ?? "").trim(),
    }))
    .filter((x) => x.leagueId);
}

export function getInitialLeagueId(me) {
  const memberships = normalizeMemberships(me);

  const saved = readPersistedLeagueId();
  if (saved && memberships.some((m) => m.leagueId === saved)) return saved;

  const first = memberships[0]?.leagueId || "";
  if (first) persistLeagueId(first);
  return first;
}

export function useSession() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch("/api/me", { method: "GET" });

        // Normalize into camelCase for the UI
        const memberships = normalizeMemberships(data);
        const normalized = {
          userId: data?.userId ?? data?.UserId ?? "",
          email: data?.email ?? data?.Email ?? "",
          leagueId: data?.leagueId ?? data?.LeagueId ?? "",
          isMember: !!(data?.isMember ?? data?.IsMember),
          role: data?.role ?? data?.Role ?? "",
          memberships,
        };

        setMe(normalized);
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { me, loading, error };
}
