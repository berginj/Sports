// src/components/DivisionsManager.jsx
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export default function DivisionsManager({ leagueId }) {
  const [divs, setDivs] = useState([]);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  async function load() {
    try {
      setErr("");
      const data = await apiFetch("/divisions", { leagueId });
      setDivs(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setDivs([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  async function create() {
    try {
      setSaving(true);
      setErr("");
      await apiFetch("/divisions", {
        method: "POST",
        leagueId,
        body: { name: name.trim(), code: code.trim() || undefined, isActive: true },
      });
      setName("");
      setCode("");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(d) {
    try {
      setErr("");
      await apiFetch(`/divisions/${encodeURIComponent(d.id)}`, {
        method: "PUT",
        leagueId,
        body: { name: d.name, code: d.code, isActive: !d.isActive },
      });
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  return (
    <section className="card">
      <div className="card__header">
        <h2 style={{ margin: 0 }}>Divisions</h2>
        <button onClick={load}>Refresh</button>
      </div>

      {err && <div className="error">{err}</div>}

      <div className="grid2">
        <div>
          <label className="label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., 10U" />
        </div>
        <div>
          <label className="label">Code (optional)</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., 10u" />
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={create} disabled={!canSubmit || saving}>
          {saving ? "Saving…" : "Add Division"}
        </button>
        <div className="muted">
          Any league member can manage divisions for now. We can tighten roles later.
        </div>
      </div>

      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {divs.map((d) => (
              <tr key={d.id}>
                <td>{d.code}</td>
                <td>{d.name}</td>
                <td>{d.isActive ? "Yes" : "No"}</td>
                <td style={{ textAlign: "right" }}>
                  <button onClick={() => toggle(d)}>{d.isActive ? "Deactivate" : "Activate"}</button>
                </td>
              </tr>
            ))}
            {divs.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No divisions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
