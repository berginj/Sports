import { persistLeagueId } from "../lib/useSession";

export default function TopNav({ tab, setTab, me, leagueId, setLeagueId }) {
  // Be tolerant: API may return different casing depending on build/version.
  const membershipsRaw =
    (Array.isArray(me?.memberships) && me.memberships) ||
    (Array.isArray(me?.Memberships) && me.Memberships) ||
    [];

  const memberships = membershipsRaw
    .map((m) => ({
      leagueId: String(m?.leagueId ?? m?.LeagueId ?? "").trim(),
      role: String(m?.role ?? m?.Role ?? "").trim(),
      leagueName: String(m?.leagueName ?? m?.LeagueName ?? "").trim(),
    }))
    .filter((m) => m.leagueId);

  const email = String(me?.email ?? me?.Email ?? "").trim();

  function pickLeague(id) {
    const v = String(id || "").trim();
    setLeagueId(v);
    persistLeagueId(v);
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
            <select
              value={leagueId || ""}
              onChange={(e) => pickLeague(e.target.value)}
              disabled={memberships.length === 0}
            >
              {/* Always provide an empty option for the initial render */}
              <option value="">
                {memberships.length === 0 ? "No leagues" : "Select a league…"}
              </option>

              {memberships.map((m) => {
                const label = m.leagueName
                  ? `${m.leagueName} (${m.leagueId})${m.role ? ` • ${m.role}` : ""}`
                  : `${m.leagueId}${m.role ? ` (${m.role})` : ""}`;

                return (
                  <option key={m.leagueId} value={m.leagueId}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <nav className="tabs" aria-label="Primary">
            <button
              className={tab === "offers" ? "tab tab--active" : "tab"}
              onClick={() => setTab("offers")}
              type="button"
            >
              Offers
            </button>
            <button
              className={tab === "manage" ? "tab tab--active" : "tab"}
              onClick={() => setTab("manage")}
              type="button"
            >
              Manage
            </button>
            <button
              className={tab === "help" ? "tab tab--active" : "tab"}
              onClick={() => setTab("help")}
              type="button"
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
