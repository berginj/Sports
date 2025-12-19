import { useEffect, useState } from "react";

export default function DivisionsManager() {
  const [divisions, setDivisions] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const r = await fetch("/api/divisions");
    if (!r.ok) throw new Error(await r.text());
    setDivisions(await r.json());
  }

  useEffect(() => {
    load().catch((e) => setError(String(e.message || e)));
  }, []);

  return (
    <div>
      <h3>Divisions</h3>

      {error && <div style={{ padding: 10, border: "1px solid #f99" }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New division name"
        />
        <button disabled={!newName.trim()} onClick={() => alert("wire POST /api/divisions next")}>
          Add
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {divisions.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td>{d.code}</td>
              <td>{String(!!d.isActive)}</td>
              <td>
                <button onClick={() => alert("wire PUT /api/divisions/:id next")}>Edit</button>
              </td>
            </tr>
          ))}
          {!divisions.length && (
            <tr>
              <td colSpan={4} style={{ opacity: 0.7 }}>
                No divisions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
