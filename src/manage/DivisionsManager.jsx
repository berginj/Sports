import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

const API = {
  list: "/api/divisions",
  create: "/api/divisions",
  update: (id) => `/api/divisions/${encodeURIComponent(id)}`,
  archive: (id) => `/api/divisions/${encodeURIComponent(id)}/archive`, // optional (if you have it)
};

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function DivisionsManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dirtyCount = useMemo(() => rows.filter((r) => r.__dirty).length, [rows]);

  async function load() {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await apiFetch(API.list, { method: "GET" });
      const list = Array.isArray(data) ? data : (data?.items || []);
      setRows(list.map((d) => ({ ...normalizeDivision(d), __dirty: false })));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function normalizeDivision(d) {
    // Accept a few common shapes
    return {
      id: d.id ?? d.DivisionId ?? d.divisionId ?? d.code ?? d.Code ?? d.Name ?? crypto.randomUUID(),
      name: d.name ?? d.Name ?? "",
      code: d.code ?? d.Code ?? "",
      isActive: d.isActive ?? d.Active ?? true,
    };
  }

  function updateRow(id, patch) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, __dirty: true } : r))
    );
  }

  async function addDivision() {
    setError("");
    setSuccess("");

    const name = newName.trim();
    const code = (newCode.trim() || slugify(name)).trim();

    if (!name) return setError("Division name is required.");
    if (!code) return setError("Division code is required.");

    setLoading(true);
    try {
      await apiFetch(API.create, {
        method: "POST",
        body: JSON.stringify({ name, code, isActive: true }),
      });
      setNewName("");
      setNewCode("");
      setSuccess("Division created.");
      await load();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function saveRow(r) {
    setError("");
    setSuccess("");

    const payload = {
      name: String(r.name || "").trim(),
      code: String(r.code || "").trim(),
      isActive: !!r.isActive,
    };

    if (!payload.name) return setError("Name is required.");
    if (!payload.code) return setError("Code is required.");

    setLoading(true);
    try {
      await apiFetch(API.update(r.id), {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSuccess(`Saved ${payload.code}.`);
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, __dirty: false } : x)));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    const dirty = rows.filter((r) => r.__dirty);
    if (!dirty.length) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // sequential (simple + readable). If you want parallel later, we can do Promise.allSettled
      for (const r of dirty) {
        const payload = {
          name: String(r.name || "").trim(),
          code: String(r.code || "").trim(),
          isActive: !!r.isActive,
        };
        await apiFetch(API.update(r.id), { method: "PUT", body: JSON.stringify(payload) });
      }
      setSuccess(`Saved ${dirty.length} change(s).`);
      await load();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function archiveRow(r) {
    setError("");
    setSuccess("");

    // If you don't have an archive endpoint, this can just set isActive=false and save.
    setLoading(true);
    try {
      // Preferred: explicit archive endpoint
      await apiFetch(API.archive(r.id), { method: "POST" });
      setSuccess(`Archived ${r.code}.`);
      await load();
    } catch {
      // Fallback: treat "archive" as "set inactive"
      try {
        await apiFetch(API.update(r.id), {
          method: "PUT",
          body: JSON.stringify({ name: r.name, code: r.code, isActive: false }),
        });
        setSuccess(`Deactivated ${r.code}.`);
        await load();
      } catch (e2) {
        setError(String(e2?.message || e2));
      }
    } finally {
      setLoading(false);
    }
  }

  const card = { border: "1px solid #e6e6e6", borderRadius: 10, padding: 14, background: "white" };
  const rowStyle = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" };
  const label = { display: "block", fontSize: 12, color: "#555", marginBottom: 6 };
  const input = { padding: 10, borderRadius: 8, border: "1px solid #ccc", minWidth: 220 };
  const small = { padding: 10, borderRadius: 8, border: "1px solid #ccc", minWidth: 140 };
  const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #222", background: "#111", color: "white", cursor: "pointer" };
  const btn2 = { padding: "10px 14px", borderRadius: 10, border: "1px solid #999", background: "white", color: "#111", cursor: "pointer" };
  const msgErr = { background: "#fff3f3", border: "1px solid #ffd2d2", color: "#8a0000", padding: 10, borderRadius: 10, marginTop: 10 };
  const msgOk = { background: "#f3fff5", border: "1px solid #c9ffd3", color: "#0a6b1f", padding: 10, borderRadius: 10, marginTop: 10 };
  const table = { width: "100%", borderCollapse: "collapse", marginTop: 12 };
  const th = { textAlign: "left", padding: 10, borderBottom: "2px solid #eee", fontSize: 12, color: "#444" };
  const td = { padding: 10, borderBottom: "1px solid #eee", verticalAlign: "top" };

  return (
    <div style={card}>
      <h3 style={{ marginTop: 0 }}>Divisions</h3>

      <div style={rowStyle}>
        <div>
          <label style={label}>New division name</label>
          <input style={input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ponytail (4th Grade)" />
        </div>
        <div>
          <label style={label}>Code (optional)</label>
          <input style={small} value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="ponytail-4th" />
        </div>
        <button style={btn} onClick={addDivision} disabled={loading || !newName.trim()}>
          {loading ? "Working..." : "Add"}
        </button>

        <div style={{ flex: 1 }} />

        <button style={btn2} onClick={load} disabled={loading}>Refresh</button>
        <button style={btn} onClick={saveAll} disabled={loading || dirtyCount === 0}>
          Save all ({dirtyCount})
        </button>
      </div>

      {error ? <div style={msgErr}>{error}</div> : null}
      {success ? <div style={msgOk}>{success}</div> : null}

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Code</th>
            <th style={th}>Active</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td style={td} colSpan={4}>{loading ? "Loading..." : "No divisions found."}</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>
                  <input
                    style={{ ...input, minWidth: 260 }}
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                  />
                </td>
                <td style={td}>
                  <input
                    style={small}
                    value={r.code}
                    onChange={(e) => updateRow(r.id, { code: e.target.value })}
                  />
                </td>
                <td style={td}>
                  <input
                    type="checkbox"
                    checked={!!r.isActive}
                    onChange={(e) => updateRow(r.id, { isActive: e.target.checked })}
                  />
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button style={btn2} onClick={() => saveRow(r)} disabled={loading || !r.__dirty}>Save</button>
                    <button style={btn2} onClick={() => archiveRow(r)} disabled={loading}>Archive</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
        Expected API:
        <code style={{ marginLeft: 6 }}>GET {API.list}</code>,{" "}
        <code>POST {API.create}</code>,{" "}
        <code>PUT {API.update(":id")}</code>
      </div>
    </div>
  );
}

