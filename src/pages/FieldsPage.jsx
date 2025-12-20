import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function FieldsPage({ leagueId }) {
  const [activeOnly, setActiveOnly] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!leagueId) return;
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/fields?activeOnly=${activeOnly ? "true" : "false"}`,
        { method: "GET" }
      );
      setRows(Array.isArray(data) ? data : (data?.items || []));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [leagueId, activeOnly]);

  const card = { border: "1px solid #e6e6e6", borderRadius: 10, padding: 14, background: "white" };
  const msgErr = { background: "#fff3f3", border: "1px solid #ffd2d2", color: "#8a0000", padding: 10, borderRadius: 10, marginTop: 10 };
  const table = { width: "100%", borderCollapse: "collapse", marginTop: 12 };
  const th = { textAlign: "left", padding: 10, borderBottom: "2px solid #eee", fontSize: 12, color: "#444" };
  const td = { padding: 10, borderBottom: "1px solid #eee", verticalAlign: "top" };

  return (
    <div style={card}>
      <h3 style={{ marginTop: 0 }}>Fields</h3>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Active only
        </label>

        <div style={{ flex: 1 }} />
        <button onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error ? <div style={msgErr}>{error}</div> : null}

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Surface</th>
            <th style={th}>Lights</th>
            <th style={th}>Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td style={td} colSpan={4}>{loading ? "Loading..." : "No fields found."}</td></tr>
          ) : (
            rows.map((f) => (
              <tr key={f.FieldId || f.id}>
                <td style={td}>{f.Name ?? f.name ?? ""}</td>
                <td style={td}>{f.Surface ?? f.surface ?? "—"}</td>
                <td style={td}>{String(!!(f.Lights ?? f.lights))}</td>
                <td style={td}>{String(!!(f.IsActive ?? f.isActive ?? true))}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
        Expected API: <code>GET /api/leagues/{leagueId}/fields</code>
      </div>
    </div>
  );
}
