import { useEffect, useState } from "react";
import OffersPage from "./pages/OffersPage";
import ManagePage from "./pages/ManagePage";
import TopNav from "./components/TopNav";
import { useSession, getInitialLeagueId } from "./lib/useSession";

export default function App() {
  const [tab, setTab] = useState("offers");
  const { me, loading, error } = useSession();

  const [leagueId, setLeagueId] = useState("");

  useEffect(() => {
    if (me && !leagueId) setLeagueId(getInitialLeagueId(me));
  }, [me, leagueId]);

  if (loading) return <div style={{ padding: 18 }}>Loading session…</div>;
  if (error) return <div style={{ padding: 18, color: "crimson" }}>Session error: {error}</div>;

  // If you’re not using EasyAuth yet, me might exist but show UNKNOWN values.
  // Still works for development, but membership-gated endpoints will 403 until you add memberships.
  const memberships = me?.Memberships || [];
  if (!memberships.length) {
    return (
      <div style={{ padding: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>No league access yet.</div>
        <div style={{ opacity: 0.8 }}>
          Add a row in <code>GameSwapMemberships</code> for your UserId + LeagueId (Role=Admin),
          then refresh.
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopNav tab={tab} setTab={setTab} me={me} leagueId={leagueId} setLeagueId={setLeagueId} />

      {tab === "offers" && <OffersPage leagueId={leagueId} me={me} />}
      {tab === "manage" && <ManagePage leagueId={leagueId} me={me} />}
    </div>
  );
}
