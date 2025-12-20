import { useEffect, useState } from "react";
import FieldsImport from "../components/FieldsImport";
import DivisionsManager from "../components/DivisionsManager";
import { apiFetch } from "../lib/api";

function roleForLeague(me, leagueId) {
  const m = me?.Memberships?.find((x) => x.LeagueId === leagueId);
  return m?.Role || "";
}

export default function ManagePage({ leagueId, me }) {
  const [activeOnly, setActiveOnly] = useState(true);
  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldsError, setFieldsError] = useState("");

  const role = roleForLeague(me, leagueId);

  async function loadFields() {
    if (!leagueId) return;
    setFieldsError("");
    setLoadingFields(true);
    try {
      const data = await apiFetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/fields?activeOnly=${activeOnly ? "true" : "false"}`,
        { method: "GET" }
      );
      setFields(Array.isArray(data) ? data : []);
    } catch (e) {
      setFieldsError(String(e?.message || e));
      setFields([]);
    } finally {
      setLoadingFields(false);
    }
  }

  useEffect(() => {
    loadFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, activeOnly]);

  const page = {
    padding: 18,
    maxWidth: 1100,
    margin: "0 auto",
    display: "grid",
    gap: 14,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  };

  const card = {
    border: "1px solid #e6e6e6",
    borderRadius: 10,
    padding: 14,
    background: "white",
  };

  const row = {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  };

  const label = { fontSize: 12, color: "#555" };

  const msgErr = {
    background: "#fff3f3",
    border: "1px solid #ffd2d2",
    color: "#8a0000",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  };

  const table = { width: "100%", borderCollapse: "collapse", marginTop: 12 };
  const th = {
    textAlign: "left",
    padding: 10,
    borderBottom: "2px solid #eee",
    fontSize: 12,
    color: "#444",
  };
  const td = {
    padding: 10,
    borderBottom: "1px solid #eee",
    verticalAlign: "top",
  };

  const buttonSecondary = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #999",
    background: "white",
    color: "#111",
    cursor: "pointer",
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={row}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Manage</div>
            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
              League: <code>{leagueId || "(none)"}</code>
              {role ? (
                <>
                  {" "}
                  • Role: <code>{role}</code>
                </>
              ) : null}
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span style={label}>Active only</span>
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
            </label>

            <button style={buttonSecondary} onClick={loadFields} disabled={loadingFields || !leagueId}>
              {loadingFields ? "Loading..." : "Refresh fields"}
            </button>
          </div>
        </div>

        {fieldsError ? <div style={msgErr}>{fieldsError}</div> : null}

        <div style={{ marginTop: 12, fontWeight: 600 }}>Fields</div>

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
            {fields.length === 0 ? (
              <tr>
                <td style={td} colSpan={4}>
                  {loadingFields ? "Loading..." : "No fields found."}
                </td>
              </tr>
            ) : (
              fields.map((f) => (
                <tr key={f.FieldId}>
                  <td style={td}>{f.Name}</td>
                  <td style={td}>{f.Surface || "—"}</td>
                  <td style={td}>{f.Lights ? "Yes" : "No"}</td>
                  <td style={td}>{f.IsActive ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
          API: <code>GET /api/leagues/{`{leagueId}`}/fields</code> • Next up: add <code>UpsertField</code> + <code>ArchiveField</code> so this table becomes editable.
        </div>
      </div>

      {/* Keep your existing tools */}
      <FieldsImport />
      <DivisionsManager />
    </div>
  );
}
