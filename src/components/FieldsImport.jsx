// src/components/FieldsImport.jsx
import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

function parseCSV(text) {
  // Very simple CSV parser: commas, newlines, no quoted commas.
  // Good enough for admin import sheets; we can upgrade later.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return { header: [], rows: [] };

  const header = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()));
  return { header, rows };
}

export default function FieldsImport({ leagueId }) {
  const [csv, setCsv] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    const { header, rows } = parseCSV(csv);
    return { header, rows: rows.slice(0, 5) };
  }, [csv]);

  async function submit() {
    try {
      setBusy(true);
      setErr("");
      setStatus("");

      const { header, rows } = parseCSV(csv);
      if (header.length === 0 || rows.length === 0) throw new Error("Paste a CSV with a header row and at least 1 data row.");

      const idx = {};
      header.forEach((h, i) => (idx[h.toLowerCase()] = i));

      // Required columns
      const required = ["park", "name", "displayname"];
      const missing = required.filter((c) => idx[c] === undefined);
      if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}.`);

      const items = rows.map((r) => ({
        park: r[idx.park] || "",
        name: r[idx.name] || "",
        displayName: r[idx.displayname] || "",
        address: idx.address !== undefined ? r[idx.address] || "" : "",
        notes: idx.notes !== undefined ? r[idx.notes] || "" : "",
        isActive:
          idx.isactive !== undefined ? String(r[idx.isactive] || "").toLowerCase() !== "false" : true,
      }));

      const res = await apiFetch("/fields/bulk", {
        method: "POST",
        leagueId,
        body: { items },
      });

      setStatus(`Imported: created=${res.created ?? 0}, updated=${res.updated ?? 0}, failed=${res.failed ?? 0}`);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card__header">
        <h2 style={{ margin: 0 }}>Fields Import</h2>
      </div>

      <div className="muted" style={{ marginBottom: 8 }}>
        CSV columns: <code>park</code>, <code>name</code>, <code>displayName</code> (required). Optional:
        <code> address</code>, <code>notes</code>, <code>isActive</code>.
      </div>

      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={8}
        placeholder={"park,name,displayName,address,notes,isActive\nTuckahoe,Field 2,Tuckahoe Park > Field 2,,,true"}
        style={{ width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
      />

      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={submit} disabled={busy || !csv.trim()}>
          {busy ? "Importing…" : "Import Fields"}
        </button>
        {status && <div style={{ color: "seagreen" }}>{status}</div>}
        {err && <div className="error">{err}</div>}
      </div>

      {preview.header.length > 0 && (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <div className="muted" style={{ marginBottom: 6 }}>
            Preview (first {preview.rows.length} rows)
          </div>
          <table className="table">
            <thead>
              <tr>
                {preview.header.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r, i) => (
                <tr key={i}>
                  {preview.header.map((_, j) => (
                    <td key={j}>{r[j] || ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
