import { useEffect, useState } from "react";
import { apiFetch } from "./api";

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
        setMe(data);
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { me, loading, error };
}

export function getInitialLeagueId(me) {
  const saved = localStorage.getItem("activeLeagueId");
  if (saved && me?.Memberships?.some((m) => m.LeagueId === saved)) return saved;

  const first = me?.Memberships?.[0]?.LeagueId || "";
  if (first) localStorage.setItem("activeLeagueId", first);
  return first;
}
