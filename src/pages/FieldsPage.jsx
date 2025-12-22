import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export default function FieldsPage({ leagueId }) {
  const [items, setItems] = useState([]);
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!leagueId) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/fields", { leagueId, query: { activeOnly } });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [leagueId, activeOnly]);

  const countLabel = useMemo(() => `${items.length} field${items.length === 1 ? "" : "s"}`, [items.length]);

  return (
    <section className="card">
      <div className="row row--space">
        <div>
          <div className="h2">Fields</div>
          <div className="muted">{countLabel}</div>
        </div>

        <div className="row">
          <label className="checkbox">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            Active only
          </label>
          <button className="btn" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
        </div>
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Park</th>
              <th>Field</th>
              <th>Display</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.FieldKey || `${f.ParkCode}/${f.FieldCode}` || `${f.ParkName}|${f.FieldName}`}>
                <td>{f.ParkName}</td>
                <td>{f.FieldName}</td>
                <td className="muted">{f.DisplayName}</td>
                <td>{String(f.IsActive ?? true)}</td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td colSpan={4} className="muted">No fields yet. Import fields to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <div className="cards cards--mobile">
        {items.map((f) => (
          <div key={f.FieldKey || `${f.ParkCode}/${f.FieldCode}` || `${f.ParkName}|${f.FieldName}`} className="miniCard">
            <div className="miniCard__title">{f.DisplayName || `${f.ParkName} > ${f.FieldName}`}</div>
            <div className="miniCard__meta">
              <span className="pill">{f.ParkName}</span>
              <span className="pill">{f.FieldName}</span>
              <span className="pill">{(f.IsActive ?? true) ? "Active" : "Inactive"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
