// src/pages/FieldsPage.jsx
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function FieldsPage({ leagueId }) {
  const [fields, setFields] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      setLoading(true);
      setErr("");
      const data = await apiFetch("/fields?activeOnly=true", { leagueId });
      setFields(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  return (
    <section className="card">
      <div className="card__header">
        <h2 style={{ margin: 0 }}>Fields</h2>
        <button onClick={refresh} disabled={loading}>
          Refresh
        </button>
      </div>

      {err && <div className="error">{err}</div>}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Display</th>
                <th>Park</th>
                <th>Field</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.fieldKey || f.id || `${f.parkName}-${f.fieldName}`}>
                  <td>{f.displayName || ""}</td>
                  <td>{f.parkName || ""}</td>
                  <td>{f.fieldName || ""}</td>
                  <td>{f.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
              {fields.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No fields yet. Import some using the Fields Import section below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
