import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { FIELD_STATUS, LEAGUE_HEADER_NAME } from "../lib/constants";

const ROLE_OPTIONS = ["LeagueAdmin", "Coach", "Viewer"];
const TABLE_SUGGESTIONS = [
  "GameSwapLeagues",
  "GameSwapMemberships",
  "GameSwapDivisions",
  "GameSwapTeams",
  "GameSwapFields",
  "GameSwapSlots",
  "GameSwapEvents",
  "GameSwapAccessRequests",
  "GameSwapInvites",
];
const SAMPLE_FIELDS_CSV = `fieldKey,parkName,fieldName,displayName,address,notes,status
gunston/turf,Gunston Park,Turf,Gunston Park > Turf,,,${FIELD_STATUS.ACTIVE}
tuckahoe/field-2,Tuckahoe Park,Field 2,Tuckahoe Park > Field 2,,,${FIELD_STATUS.ACTIVE}
`;

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
  const [globalAdmins, setGlobalAdmins] = useState([]);
  const [loadingGlobalAdmins, setLoadingGlobalAdmins] = useState(false);
  const [globalAdminErr, setGlobalAdminErr] = useState("");
  const [newGlobalAdminId, setNewGlobalAdminId] = useState("");

  const [leagueDraft, setLeagueDraft] = useState({
    leagueId: "",
    name: "",
    timezone: "America/New_York",
    status: "Active",
  });
  const [leagueCreateBusy, setLeagueCreateBusy] = useState(false);
  const [leagueCreateErr, setLeagueCreateErr] = useState("");
  const [leagueCreateOk, setLeagueCreateOk] = useState("");

  const [tableName, setTableName] = useState("");
  const [tableBusy, setTableBusy] = useState(false);
  const [tableErr, setTableErr] = useState("");
  const [tableOk, setTableOk] = useState("");

  const [divisionDraft, setDivisionDraft] = useState({ name: "", code: "" });
  const [divisionBusy, setDivisionBusy] = useState(false);
  const [divisionErr, setDivisionErr] = useState("");
  const [divisionOk, setDivisionOk] = useState("");

  const [teamDraft, setTeamDraft] = useState({
    division: "",
    teamId: "",
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamErr, setTeamErr] = useState("");
  const [teamOk, setTeamOk] = useState("");

  const [fieldsCsv, setFieldsCsv] = useState(SAMPLE_FIELDS_CSV);
  const [fieldsBusy, setFieldsBusy] = useState(false);
  const [fieldsErr, setFieldsErr] = useState("");
  const [fieldsOk, setFieldsOk] = useState("");

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

  async function loadGlobalAdmins() {
    setLoadingGlobalAdmins(true);
    setGlobalAdminErr("");
    try {
      const data = await apiFetch("/api/admin/globaladmins");
      setGlobalAdmins(Array.isArray(data) ? data : []);
    } catch (e) {
      setGlobalAdminErr(e?.message || "Failed to load global admins");
      setGlobalAdmins([]);
    } finally {
      setLoadingGlobalAdmins(false);
    }
  }

  async function addGlobalAdmin() {
    const userId = newGlobalAdminId.trim();
    setGlobalAdminErr("");
    if (!userId) return setGlobalAdminErr("User ID is required.");
    try {
      await apiFetch("/api/admin/globaladmins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setNewGlobalAdminId("");
      await loadGlobalAdmins();
    } catch (e) {
      setGlobalAdminErr(e?.message || "Failed to add global admin");
    }
  }

  async function removeGlobalAdmin(userId) {
    if (!userId) return;
    setGlobalAdminErr("");
    try {
      await apiFetch(`/api/admin/globaladmins/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      await loadGlobalAdmins();
    } catch (e) {
      setGlobalAdminErr(e?.message || "Failed to remove global admin");
    }
  }

  async function createLeague() {
    setLeagueCreateErr("");
    setLeagueCreateOk("");
    const leagueId = leagueDraft.leagueId.trim();
    const name = leagueDraft.name.trim();
    const timezone = leagueDraft.timezone.trim();
    const status = leagueDraft.status.trim();
    if (!leagueId) return setLeagueCreateErr("League ID is required.");
    if (!name) return setLeagueCreateErr("League name is required.");
    if (!timezone) return setLeagueCreateErr("Timezone is required.");

    setLeagueCreateBusy(true);
    try {
      await apiFetch("/api/admin/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId, name, timezone, status }),
      });
      setLeagueCreateOk("League created.");
      setLeagueDraft({ leagueId: "", name: "", timezone, status: status || "Active" });
      await loadLeagues();
    } catch (e) {
      setLeagueCreateErr(e?.message || "Failed to create league");
    } finally {
      setLeagueCreateBusy(false);
    }
  }

  async function ensureTable() {
    const name = tableName.trim();
    setTableErr("");
    setTableOk("");
    if (!name) return setTableErr("Table name is required.");
    setTableBusy(true);
    try {
      await apiFetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName: name }),
      });
      setTableOk(`Table ensured: ${name}`);
    } catch (e) {
      setTableErr(e?.message || "Failed to ensure table");
    } finally {
      setTableBusy(false);
    }
  }

  async function createDivision() {
    const leagueId = selectedLeagueId;
    const name = divisionDraft.name.trim();
    const code = divisionDraft.code.trim();
    setDivisionErr("");
    setDivisionOk("");
    if (!leagueId || leagueId === "all") return setDivisionErr("Select a single league first.");
    if (!name) return setDivisionErr("Division name is required.");
    setDivisionBusy(true);
    try {
      await apiFetch("/api/divisions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...leagueHeader(leagueId) },
        body: JSON.stringify({ name, code: code || undefined, isActive: true }),
      });
      setDivisionOk("Division created.");
      setDivisionDraft({ name: "", code: "" });
      await loadLeagueBundle(leagueId);
    } catch (e) {
      setDivisionErr(e?.message || "Failed to create division");
    } finally {
      setDivisionBusy(false);
    }
  }

  async function createTeam() {
    const leagueId = selectedLeagueId;
    const division = teamDraft.division.trim();
    const teamId = teamDraft.teamId.trim();
    const name = teamDraft.name.trim();
    setTeamErr("");
    setTeamOk("");
    if (!leagueId || leagueId === "all") return setTeamErr("Select a single league first.");
    if (!division) return setTeamErr("Division is required.");
    if (!teamId) return setTeamErr("Team ID is required.");
    setTeamBusy(true);
    try {
      await apiFetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...leagueHeader(leagueId) },
        body: JSON.stringify({
          division,
          teamId,
          name: name || teamId,
          primaryContact: {
            name: teamDraft.contactName.trim(),
            email: teamDraft.contactEmail.trim(),
            phone: teamDraft.contactPhone.trim(),
          },
        }),
      });
      setTeamOk("Team created.");
      setTeamDraft({
        division,
        teamId: "",
        name: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      });
      await loadLeagueBundle(leagueId);
    } catch (e) {
      setTeamErr(e?.message || "Failed to create team");
    } finally {
      setTeamBusy(false);
    }
  }

  async function importFieldsCsv() {
    const leagueId = selectedLeagueId;
    setFieldsErr("");
    setFieldsOk("");
    if (!leagueId || leagueId === "all") return setFieldsErr("Select a single league first.");
    if (!fieldsCsv.trim()) return setFieldsErr("CSV body is required.");
    setFieldsBusy(true);
    try {
      await apiFetch("/api/import/fields", {
        method: "POST",
        headers: { "Content-Type": "text/csv", ...leagueHeader(leagueId) },
        body: fieldsCsv,
      });
      setFieldsOk("Fields import submitted.");
      await loadLeagueBundle(leagueId);
    } catch (e) {
      setFieldsErr(e?.message || "Failed to import fields");
    } finally {
      setFieldsBusy(false);
    }
  }

  useEffect(() => {
    loadLeagues();
    loadGlobalAdmins();
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

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Create league</h3>
        <p className="muted">Create a new league and then bootstrap its data tables.</p>
        {leagueCreateErr ? <div className="error">{leagueCreateErr}</div> : null}
        {leagueCreateOk ? <div className="callout callout--ok">{leagueCreateOk}</div> : null}
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <label style={{ flex: 1, minWidth: 160 }}>
            League ID
            <input
              value={leagueDraft.leagueId}
              onChange={(e) => setLeagueDraft((prev) => ({ ...prev, leagueId: e.target.value }))}
              placeholder="ARL"
            />
          </label>
          <label style={{ flex: 2, minWidth: 220 }}>
            Name
            <input
              value={leagueDraft.name}
              onChange={(e) => setLeagueDraft((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Arlington"
            />
          </label>
          <label style={{ flex: 2, minWidth: 220 }}>
            Timezone
            <input
              value={leagueDraft.timezone}
              onChange={(e) => setLeagueDraft((prev) => ({ ...prev, timezone: e.target.value }))}
              placeholder="America/New_York"
            />
          </label>
          <label style={{ flex: 1, minWidth: 140 }}>
            Status
            <select
              value={leagueDraft.status}
              onChange={(e) => setLeagueDraft((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnPrimary" onClick={createLeague} disabled={leagueCreateBusy}>
            {leagueCreateBusy ? "Creating…" : "Create league"}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Manage global admins</h3>
        <p className="muted">Add or remove global admin user IDs.</p>
        {globalAdminErr ? <div className="error">{globalAdminErr}</div> : null}
        <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ flex: 1, minWidth: 220 }}>
            User ID
            <input
              value={newGlobalAdminId}
              onChange={(e) => setNewGlobalAdminId(e.target.value)}
              placeholder="USER_ID"
            />
          </label>
          <button className="btn btnPrimary" onClick={addGlobalAdmin} disabled={loadingGlobalAdmins}>
            Add global admin
          </button>
          <button className="btn btn--ghost" onClick={loadGlobalAdmins} disabled={loadingGlobalAdmins}>
            Refresh list
          </button>
        </div>
        <div className="tableWrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {globalAdmins.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    {loadingGlobalAdmins ? "Loading…" : "No global admins found."}
                  </td>
                </tr>
              ) : (
                globalAdmins.map((a) => (
                  <tr key={a.userId}>
                    <td>{a.userId}</td>
                    <td>{a.email || ""}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn--ghost" onClick={() => removeGlobalAdmin(a.userId)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
        <h3 style={{ marginTop: 0 }}>Bootstrap league data</h3>
        <p className="muted">
          Create initial divisions, teams, and fields for the selected league. Select a specific league above.
        </p>

        <div className="card" style={{ marginTop: 12 }}>
          <h4 style={{ marginTop: 0 }}>Ensure storage tables</h4>
          <p className="muted">If a storage table is missing, ensure it exists before importing data.</p>
          {tableErr ? <div className="error">{tableErr}</div> : null}
          {tableOk ? <div className="callout callout--ok">{tableOk}</div> : null}
          <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ flex: 1, minWidth: 220 }}>
              Table name
              <input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="GameSwapDivisions"
              />
            </label>
            <button className="btn btnPrimary" onClick={ensureTable} disabled={tableBusy}>
              {tableBusy ? "Ensuring…" : "Ensure table"}
            </button>
          </div>
          <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
            {TABLE_SUGGESTIONS.map((name) => (
              <button
                key={name}
                className="btn btn--ghost"
                type="button"
                onClick={() => setTableName(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h4 style={{ marginTop: 0 }}>Create division</h4>
          {divisionErr ? <div className="error">{divisionErr}</div> : null}
          {divisionOk ? <div className="callout callout--ok">{divisionOk}</div> : null}
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <label style={{ flex: 2, minWidth: 200 }}>
              Division name
              <input
                value={divisionDraft.name}
                onChange={(e) => setDivisionDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ponytail (4th Grade)"
              />
            </label>
            <label style={{ flex: 1, minWidth: 140 }}>
              Code (optional)
              <input
                value={divisionDraft.code}
                onChange={(e) => setDivisionDraft((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="pony4"
              />
            </label>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btnPrimary" onClick={createDivision} disabled={divisionBusy}>
              {divisionBusy ? "Creating…" : "Create division"}
            </button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h4 style={{ marginTop: 0 }}>Create team</h4>
          {teamErr ? <div className="error">{teamErr}</div> : null}
          {teamOk ? <div className="callout callout--ok">{teamOk}</div> : null}
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 140 }}>
              Division
              <input
                value={teamDraft.division}
                onChange={(e) => setTeamDraft((prev) => ({ ...prev, division: e.target.value }))}
                placeholder="10U"
              />
            </label>
            <label style={{ flex: 1, minWidth: 140 }}>
              Team ID
              <input
                value={teamDraft.teamId}
                onChange={(e) => setTeamDraft((prev) => ({ ...prev, teamId: e.target.value }))}
                placeholder="TIGERS"
              />
            </label>
            <label style={{ flex: 2, minWidth: 200 }}>
              Team name
              <input
                value={teamDraft.name}
                onChange={(e) => setTeamDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Tigers"
              />
            </label>
          </div>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 200 }}>
              Contact name
              <input
                value={teamDraft.contactName}
                onChange={(e) => setTeamDraft((prev) => ({ ...prev, contactName: e.target.value }))}
                placeholder="Pat Coach"
              />
            </label>
            <label style={{ flex: 1, minWidth: 200 }}>
              Contact email
              <input
                value={teamDraft.contactEmail}
                onChange={(e) => setTeamDraft((prev) => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="coach@example.com"
              />
            </label>
            <label style={{ flex: 1, minWidth: 200 }}>
              Contact phone
              <input
                value={teamDraft.contactPhone}
                onChange={(e) => setTeamDraft((prev) => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="555-1212"
              />
            </label>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btnPrimary" onClick={createTeam} disabled={teamBusy}>
              {teamBusy ? "Creating…" : "Create team"}
            </button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h4 style={{ marginTop: 0 }}>Import fields CSV</h4>
          <p className="muted">Seed the fields table with a quick CSV paste.</p>
          {fieldsErr ? <div className="error">{fieldsErr}</div> : null}
          {fieldsOk ? <div className="callout callout--ok">{fieldsOk}</div> : null}
          <label style={{ display: "block" }}>
            CSV body
            <textarea
              rows={6}
              value={fieldsCsv}
              onChange={(e) => setFieldsCsv(e.target.value)}
              style={{ width: "100%", fontFamily: "monospace" }}
            />
          </label>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btnPrimary" onClick={importFieldsCsv} disabled={fieldsBusy}>
              {fieldsBusy ? "Importing…" : "Import fields"}
            </button>
          </div>
        </div>
      </div>

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
