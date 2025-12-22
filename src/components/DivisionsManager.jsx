import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function DivisionsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/divisions");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    setError("");
    try {
      const payload = { name: newName, code: newCode || undefined, isActive: true };
      await apiFetch("/api/divisions", { method: "POST", body: JSON.stringify(payload) });
      setNewName("");
      setNewCode("");
      await load();
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  async function toggleActive(id, isActive) {
    setError("");
    const current = items.find((x) => x.id === id);
    if (!current) return;
    try {
      await apiFetch(`/api/divisions/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ name: current.name, code: current.code, isActive }),
      });
      await load();
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  return (
    <section className="card">
      <div className="row row--space">
        <div>
          <div className="h2">Divisions</div>
          <div className="muted">Global list used for slot filtering and admin maintenance.</div>
        </div>
        <button className="btn" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      <div className="formGrid">
        <div className="control">
          <label>Name</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ponytail (4th Grade)" />
        </div>
        <div className="control">
          <label>Code (optional)</label>
          <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="ponytail-4th" />
        </div>
        <div className="control control--end">
          <button className="btn btn--primary" onClick={create} disabled={!newName.trim()}>
            Create
          </button>
        </div>
      </div>

      <div className="tableWrap">
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
            {items.map((d) => (
              <tr key={d.id}>
                <td><code>{d.code}</code></td>
                <td>{d.name}</td>
                <td>{String(d.isActive ?? true)}</td>
                <td className="row row--end">
                  <button className="btn btn--sm" onClick={() => toggleActive(d.id, !(d.isActive ?? true))}>
                    {(d.isActive ?? true) ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td colSpan={4} className="muted">No divisions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
