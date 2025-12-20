export default function TopNav({ tab, setTab, me, leagueId, setLeagueId }) {
  const memberships = me?.Memberships || [];
  const email = me?.Email || "";

  return (
    <header style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>GameSwap</h1>
        {email ? <span style={{ opacity: 0.7 }}>{email}</span> : null}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {memberships.length > 0 ? (
            <>
              <span style={{ opacity: 0.7 }}>League</span>
              <select
                value={leagueId || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setLeagueId(v);
                  localStorage.setItem("activeLeagueId", v);
                }}
              >
                {memberships.map((m) => (
                  <option key={m.LeagueId} value={m.LeagueId}>
                    {m.LeagueId} ({m.Role})
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={() => setTab("offers")} disabled={tab === "offers"}>
          Offers
        </button>
        <button onClick={() => setTab("manage")} disabled={tab === "manage"}>
          Manage
        </button>
      </div>
    </header>
  );
}
