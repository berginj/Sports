import { persistLeagueId } from "../lib/useSession";

export default function TopNav({ tab, setTab, me, leagueId, setLeagueId }) {
  // API returns `memberships` (camelCase), each item has `leagueId` + `role`
  const memberships = Array.isArray(me?.memberships) ? me.memberships : [];
  const email = me?.email || "";

  function pickLeague(id) {
    setLeagueId(id);
    persistLeagueId(id);
  }

  return (
    <header className="topnav">
      <div className="topnav__inner">
        <div className="brand">
          <div className="brand__title">GameSwap</div>
          <div className="brand__sub">League slot swaps & approvals</div>
        </div>

        <div className="topnav__controls">
          <div className="control">
            <label>League</label>
            <select value={leagueId || ""} onChange={(e) => pickLeague(e.target.value)}>
              {memberships.length === 0 ? (
                <option value="" disabled>
                  No leagues
                </option>
              ) : (
                memberships.map((m) => {
                  const id = (m?.leagueId || "").trim();
                  const role = (m?.role || "").trim();
                  return (
                    <option key={id || Math.random()} value={id}>
                      {role ? `${id} (${role})` : id}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <nav className="tabs" aria-label="Primary">
            <button
              className={tab === "offers" ? "tab tab--active" : "tab"}
              onClick={() => setTab("offers")}
            >
              Offers
            </button>
            <button
              className={tab === "manage" ? "tab tab--active" : "tab"}
              onClick={() => setTab("manage")}
            >
              Manage
            </button>
            <button
              className={tab === "help" ? "tab tab--active" : "tab"}
              onClick={() => setTab("help")}
            >
              Help
            </button>
          </nav>

          <div className="whoami" title={email}>
            {email || "Signed in"}
          </div>
        </div>
      </div>
    </header>
  );
}
