import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { LEAGUE_HEADER_NAME } from "../lib/constants";

const ROLE_OPTIONS = ["LeagueAdmin", "Coach", "Viewer"];

function leagueHeader(leagueId) {
  return { [LEAGUE_HEADER_NAME]: leagueId };
}

export default function GlobalAdminPage() {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState("all");
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [err, setErr] = useState("");
  const [leagueData, setLeagueData] = useState({});
  const [coachDraft, setCoachDraft] = useState({});

  async function loadLeagues() {
    setLoadingLeagues(true);
    setErr("");
    try {
      const data = await apiFetch("/api/admin/leagues");
      const list = Array.isArray(data) ? data : [];
      setLeagues(list);
      return list;
    } catch (e) {
      setErr(e?.message || "Failed to load leagues");
      setLeagues([]);
      return [];
    } finally {
      setLoadingLeagues(false);
    }
  }

  async function loadLeagueBundle(leagueId) {
    const headers = leagueHeader(leagueId);
    const [memberships, divisions, teams, accessRequests] = await Promise.all([
      apiFetch("/api/memberships", { headers }),
      apiFetch("/api/divisions", { headers }),
      apiFetch("/api/teams", { headers }),
      apiFetch("/api/accessrequests?status=Pending", { headers }),
    ]);

    const mems = Array.isArray(memberships) ? memberships : [];
    const draft = {};
    for (const m of mems) {
      if ((m.role || "").toLowerCase() !== "coach") continue;
      draft[`${leagueId}::${m.userId}`] = {
        division: m.team?.division || "",
        teamId: m.team?.teamId || "",
      };
    }

    setLeagueData((prev) => ({
      ...prev,
      [leagueId]: {
        memberships: mems,
        divisions: Array.isArray(divisions) ? divisions : [],
        teams: Array.isArray(teams) ? teams : [],
        accessRequests: Array.isArray(accessRequests) ? accessRequests : [],
      },
    }));
    setCoachDraft((prev) => ({ ...prev, ...draft }));
  }

  async function refreshAll() {
    setLoadingData(true);
    setErr("");
    try {
      const list = await loadLeagues();
      const leagueIds = (list || []).map((l) => l.leagueId).filter(Boolean);
      await Promise.all(leagueIds.map((id) => loadLeagueBundle(id)));
    } catch (e) {
      setErr(e?.message || "Failed to load global admin data");
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadLeagues();
  }, []);

  useEffect(() => {
    if (selectedLeagueId === "all") return;
    if (!selectedLeagueId) return;
    if (leagueData[selectedLeagueId]) return;
    setLoadingData(true);
    loadLeagueBundle(selectedLeagueId)
      .catch((e) => setErr(e?.message || "Failed to load league data"))
      .finally(() => setLoadingData(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeagueId]);

  const memberships = useMemo(() => {
    const leagueIds =
      selectedLeagueId === "all"
        ? (leagues || []).map((l) => l.leagueId).filter(Boolean)
        : [selectedLeagueId];
    const rows = [];
    for (const leagueId of leagueIds) {
      const data = leagueData[leagueId];
      if (!data?.memberships) continue;
      for (const m of data.memberships) {
        rows.push({ leagueId, ...m });
      }
    }
    return rows.sort((a, b) => {
      const leagueCompare = (a.leagueId || "").localeCompare(b.leagueId || "");
      if (leagueCompare !== 0) return leagueCompare;
      return (a.email || a.userId || "").localeCompare(b.email || b.userId || "");
    });
  }, [leagueData, leagues, selectedLeagueId]);

  const accessRequests = useMemo(() => {
    const leagueIds =
      selectedLeagueId === "all"
        ? (leagues || []).map((l) => l.leagueId).filter(Boolean)
        : [selectedLeagueId];
    const rows = [];
    for (const leagueId of leagueIds) {
      const data = leagueData[leagueId];
      if (!data?.accessRequests) continue;
      for (const r of data.accessRequests) {
        rows.push({ leagueId, ...r });
      }
    }
    return rows.sort((a, b) => {
      const leagueCompare = (a.leagueId || "").localeCompare(b.leagueId || "");
      if (leagueCompare !== 0) return leagueCompare;
      return (b.updatedUtc || "").localeCompare(a.updatedUtc || "");
    });
  }, [leagueData, leagues, selectedLeagueId]);

  function leagueTeams(leagueId, division) {
    const data = leagueData[leagueId];
    const teams = data?.teams || [];
    return teams
      .filter((t) => (t.division || "").trim() === division)
      .sort((a, b) => (a.name || a.teamId || "").localeCompare(b.name || b.teamId || ""));
  }

  function leagueDivisions(leagueId) {
    const data = leagueData[leagueId];
    return (data?.divisions || [])
      .map((d) => (typeof d === "string" ? d : d.code || d.division || ""))
      .filter(Boolean);
  }

  function setDraftForCoach(leagueId, userId, patch) {
    const key = `${leagueId}::${userId}`;
    setCoachDraft((prev) => {
      const cur = prev[key] || { division: "", teamId: "" };
      return { ...prev, [key]: { ...cur, ...patch } };
    });
  }

  async function saveCoachAssignment(leagueId, userId) {
    const key = `${leagueId}::${userId}`;
    const draft = coachDraft[key] || { division: "", teamId: "" };
    const division = (draft.division || "").trim();
    const teamId = (draft.teamId || "").trim();
    const body = division && teamId ? { team: { division, teamId } } : { team: null };

    try {
      await apiFetch(`/api/memberships/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...leagueHeader(leagueId),
        },
        body: JSON.stringify(body),
      });
      await loadLeagueBundle(leagueId);
    } catch (e) {
      alert(e?.message || "Failed to update coach assignment");
    }
  }

  async function approveRequest(req, roleOverride) {
    const userId = req?.userId || "";
    const role = (roleOverride || req?.requestedRole || "Viewer").trim();
    if (!userId || !req?.leagueId) return;
    try {
      await apiFetch(`/api/accessrequests/${encodeURIComponent(userId)}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...leagueHeader(req.leagueId),
        },
        body: JSON.stringify({ role }),
      });
      await loadLeagueBundle(req.leagueId);
    } catch (e) {
      alert(e?.message || "Approve failed");
    }
  }

  async function denyRequest(req) {
    const userId = req?.userId || "";
    if (!userId || !req?.leagueId) return;
    const reason = prompt("Reason for denial? (optional)") || "";
    try {
      await apiFetch(`/api/accessrequests/${encodeURIComponent(userId)}/deny`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...leagueHeader(req.leagueId),
        },
        body: JSON.stringify({ reason }),
      });
      await loadLeagueBundle(req.leagueId);
    } catch (e) {
      alert(e?.message || "Deny failed");
    }
  }

  return (
    <div className="card">
      <h2>Global admin</h2>
      <p className="muted">
        Review all leagues, membership assignments, and pending access requests.
      </p>

      <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <label>
          League filter
          <select
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            disabled={loadingLeagues}
          >
            <option value="all">All leagues</option>
            {leagues.map((l) => (
              <option key={l.leagueId} value={l.leagueId}>
                {l.name ? `${l.leagueId} — ${l.name}` : l.leagueId}
              </option>
            ))}
          </select>
        </label>

        <button className="btn" onClick={refreshAll} disabled={loadingLeagues || loadingData}>
          {loadingData ? "Refreshing…" : "Refresh all data"}
        </button>
      </div>

      {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Memberships ({memberships.length})</h3>
        {loadingData ? (
          <div className="muted">Loading memberships…</div>
        ) : memberships.length === 0 ? (
          <div className="muted">No memberships loaded yet. Choose a league or refresh.</div>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>League</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Division</th>
                  <th>Team</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => {
                  const leagueId = m.leagueId || "";
                  const key = `${leagueId}::${m.userId}`;
                  const draft = coachDraft[key] || { division: m.team?.division || "", teamId: m.team?.teamId || "" };
                  const currentDiv = draft.division || "";
                  const currentTeam = draft.teamId || "";
                  const divOptions = leagueDivisions(leagueId);
                  const teamsForDiv = currentDiv ? leagueTeams(leagueId, currentDiv) : [];
                  const isCoach = (m.role || "").toLowerCase() === "coach";

                  return (
                    <tr key={key}>
                      <td>{leagueId}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.email || m.userId}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{m.userId}</div>
                      </td>
                      <td>{m.role}</td>
                      <td>
                        <select
                          value={currentDiv}
                          onChange={(e) => setDraftForCoach(leagueId, m.userId, { division: e.target.value, teamId: "" })}
                          disabled={!isCoach}
                          title={isCoach ? "Set division" : "Only coaches have team assignments"}
                        >
                          <option value="">(unassigned)</option>
                          {divOptions.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={currentTeam}
                          onChange={(e) => setDraftForCoach(leagueId, m.userId, { division: currentDiv, teamId: e.target.value })}
                          disabled={!isCoach || !currentDiv}
                          title={!isCoach ? "Only coaches have team assignments" : !currentDiv ? "Pick a division first" : "Pick a team"}
                        >
                          <option value="">(unassigned)</option>
                          {teamsForDiv.map((t) => (
                            <option key={t.teamId} value={t.teamId}>
                              {t.name || t.teamId}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btnPrimary"
                          onClick={() => saveCoachAssignment(leagueId, m.userId)}
                          disabled={!isCoach}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Pending access requests ({accessRequests.length})</h3>
        {loadingData ? (
          <div className="muted">Loading requests…</div>
        ) : accessRequests.length === 0 ? (
          <div className="muted">No pending access requests for the selected scope.</div>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>League</th>
                  <th>User</th>
                  <th>Requested role</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accessRequests.map((r) => (
                  <tr key={`${r.leagueId}::${r.userId}`}>
                    <td>{r.leagueId}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.email || r.userId}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{r.userId}</div>
                    </td>
                    <td>
                      <select
                        defaultValue={r.requestedRole || "Viewer"}
                        onChange={(e) => approveRequest(r, e.target.value)}
                        title="Pick a role to approve"
                      >
                        {ROLE_OPTIONS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                      <div className="muted" style={{ fontSize: 12 }}>{r.updatedUtc || r.createdUtc || ""}</div>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ whiteSpace: "pre-wrap" }}>{r.notes || ""}</div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btnPrimary" onClick={() => approveRequest(r)}>
                          Approve
                        </button>
                        <button className="btn" onClick={() => denyRequest(r)}>
                          Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
