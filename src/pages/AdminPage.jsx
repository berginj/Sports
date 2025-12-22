import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

const ROLE_OPTIONS = [
  "LeagueAdmin",
  "Scheduler",
  "Commissioner",
  "Coach",
  "Parent",
  "Viewer",
  "Umpire",
];

export default function AdminPage({ me }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [items, setItems] = useState([]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("status", "Pending");
      if (leagueFilter.trim()) qs.set("leagueId", leagueFilter.trim());
      const data = await apiFetch(`/api/admin/accessrequests?${qs.toString()}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load pending requests");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueFilter]);

  async function approve(req, roleOverride) {
    const leagueId = req?.leagueId || "";
    const userId = req?.userId || "";
    const role = (roleOverride || req?.requestedRole || "Viewer").trim();
    if (!leagueId || !userId) return;
    try {
      await apiFetch(`/api/admin/accessrequests/${encodeURIComponent(leagueId)}/${encodeURIComponent(userId)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (e) {
      alert(e?.message || "Approve failed");
    }
  }

  async function deny(req) {
    const leagueId = req?.leagueId || "";
    const userId = req?.userId || "";
    if (!leagueId || !userId) return;
    const reason = prompt("Reason for denial? (optional)") || "";
    try {
      await apiFetch(`/api/admin/accessrequests/${encodeURIComponent(leagueId)}/${encodeURIComponent(userId)}/deny`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      await load();
    } catch (e) {
      alert(e?.message || "Deny failed");
    }
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const la = (a.leagueId || "").localeCompare(b.leagueId || "");
      if (la !== 0) return la;
      return (a.requestedAtUtc || "").localeCompare(b.requestedAtUtc || "");
    });
  }, [items]);

  return (
    <div className="card">
      <h2>Admin: access requests</h2>
      <p className="muted">
        You are a <strong>global admin</strong>. You can approve/deny access requests for any league.
      </p>

      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        <label className="field">
          <span>Filter by LeagueId</span>
          <input
            value={leagueFilter}
            placeholder="(optional)"
            onChange={(e) => setLeagueFilter(e.target.value)}
          />
        </label>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {err && <div className="error">{err}</div>}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="muted">No pending requests.</div>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>League</th>
                <th>User</th>
                <th>Requested role</th>
                <th>Message</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={`${r.leagueId}|${r.userId}`}>
                  <td>{r.leagueId}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.email || r.userId}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{r.userId}</div>
                  </td>
                  <td>
                    <select
                      defaultValue={r.requestedRole || "Viewer"}
                      onChange={(e) => approve(r, e.target.value)}
                      title="Pick a role to approve"
                    >
                      {ROLE_OPTIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                    <div className="muted" style={{ fontSize: 12 }}>{r.requestedAtUtc}</div>
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{r.message || ""}</div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btnPrimary" onClick={() => approve(r)}>
                        Approve
                      </button>
                      <button className="btn" onClick={() => deny(r)}>
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

      <details style={{ marginTop: 16 }}>
        <summary>Notes</summary>
        <ul>
          <li>
            Approving creates a row in <code>GameSwapMemberships</code> and marks the request as Approved.
          </li>
          <li>
            Denying marks the request as Denied.
          </li>
          <li>
            All actions are written to <code>GameSwapAuditLog</code>.
          </li>
        </ul>
      </details>
    </div>
  );
}
