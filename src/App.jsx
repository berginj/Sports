import { useEffect, useState } from "react";
import OffersPage from "./pages/OffersPage";
import ManagePage from "./pages/ManagePage";
import HelpPage from "./pages/HelpPage";
import TopNav from "./components/TopNav";
import { useSession, getInitialLeagueId } from "./lib/useSession";

export default function App() {
  const [tab, setTab] = useState("offers");
  const { me, loading, error } = useSession();

  const [leagueId, setLeagueId] = useState("");

  useEffect(() => {
    if (me && !leagueId) setLeagueId(getInitialLeagueId(me));
  }, [me, leagueId]);

  if (loading) return <div className="page"><div className="card">Loading session…</div></div>;
  if (error) return <div className="page"><div className="card card--danger">Session error: {error}</div></div>;

  const memberships = me?.memberships || [];
  if (!memberships.length) {
    return (
      <div className="page">
        <div className="card">
          <div className="h2">No league access yet.</div>
          <p className="muted">
            Add a row in <code>GameSwapMemberships</code> for your UserId + LeagueId (Role=Admin), then refresh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopNav tab={tab} setTab={setTab} me={me} leagueId={leagueId} setLeagueId={setLeagueId} />
      <main className="page">
        {tab === "offers" && <OffersPage leagueId={leagueId} me={me} />}
        {tab === "manage" && <ManagePage leagueId={leagueId} me={me} />}
        {tab === "help" && <HelpPage />}
      </main>
    </>
  );
}
