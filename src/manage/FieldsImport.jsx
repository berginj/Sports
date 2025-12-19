import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

const API = {
  bulkCreate: "/api/fields/bulk", // recommended
  // fallback if you only have single create:
  create: "/api/fields",
};

function parseCSV(text) {
  // Simple CSV parser: handles commas + quoted fields.
  // Good enough for “fields import”; keep your CSV clean.
  const rows = [];
  let cur = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (c === '"' && inQuotes && n === '"') { cell += '"'; i++; continue; }
    if (c === '"') { inQuotes = !inQuotes; continue; }

    if (!inQuotes && (c === "," || c === "\n" || c === "\r")) {
      if (c === "\r" && n === "\n") i++;
      cur.push(cell.trim());
      cell = "";
      if (c === "\n" || c === "\r") { rows.push(cur); cur = []; }
      continue;
    }

    cell += c;
  }
  if (cell.length || cur.length) { cur.push(cell.trim()); rows.push(cur); }
  return rows.filter(r => r.some(x => String(x || "").trim() !== ""));
}

function normalizeHeaders(h) {
  return String(h || "").trim().toLowerCase();
}

export default function FieldsImport() {
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const parsed = useMemo(() => {
    setError("");
    setSuccess("");

    if (!raw.trim()) return { headers: [], records: [], issues: [] };

    const grid = parseCSV(raw);
    if (grid.length < 2) return { headers: [], records: [], issues: ["CSV needs a header row + at least one data row."] };

    const headers = grid[0].map(normalizeHeaders);
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

    // Required columns
    const required = ["name", "park", "displayname"];
    const issues = [];
    for (const r of required) if (!(r in idx)) issues.push(`Missing required column: ${r}`);

    const records = grid.slice(1).map((row, ri) => {
      const rec = {
        name: row[idx.name] ?? "",
        park: row[idx.park] ?? "",
        displayName: row[idx.displayname] ?? "",
        address: idx.address != null ? (row[idx.address] ?? "") : "",
        notes: idx.notes != null ? (row[idx.notes] ?? "") : "",
        isActive: idx.isactive != null ? String(row[idx.isactive] ?? "true").toLowerCase() !== "false" : true,
        __row: ri + 2,
      };
      return rec;
    });

    // Validate records
    records.forEach((r) => {
      if (!r.name.trim()) issues.push(`Row ${r.__row}: name is required`);
      if (!r.park.trim()) issues.push(`Row ${r.__row}: park is required`);
      if (!r.displayName.trim()) issues.push(`Row ${r.__row}: displayName is required`);
    });

    return { headers, records, issues };
  }, [raw]);

  async function onPickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setError("");
    setSuccess("");
    const text = await f.text();
    setRaw(text);
  }

  async function importFields() {
    setError("");
    setSuccess("");

    if (!parsed.records.length) return setError("No records to import.");
    if (parsed.issues.length) return setError("Fix CSV issues before importing.");

    setLoading(true);
    try {
      // Prefer bulk endpoint
      await apiFetch(API.bulkCreate, {
        method: "POST",
        body: JSON.stringify({ items: parsed.records.map(stripMeta) }),
      });
      setSuccess(`Imported ${parsed.records.length} field(s).`);
    } catch (e) {
      // Fallback: create one by one (if you don't have bulk)
      try {
        for (const r of parsed.records) {
          await apiFetch(API.create, { method: "POST", body: JSON.stringify(stripMeta(r)) });
        }
        setSuccess(`Imported ${parsed.records.length} field(s) (single-create fallback).`);
      } catch (e2) {
        setError(String(e2?.message || e2));
      }
    } finally {
      setLoading(false);
    }
  }

  function stripMeta(r) {
    const { __row, ...rest } = r;
    return rest;
  }

  const card = { border: "1px solid #e6e6e6", borderRadius: 10, padding: 14, background: "white" };
  const msgErr = { background: "#fff3f3", border: "1px solid #ffd2d2", color: "#8a0000", padding: 10, borderRadius: 10, marginTop: 10 };
  const msgOk = { background: "#f3fff5", border: "1px solid #c9ffd3", color: "#0a6b1f", padding: 10, borderRadius: 10, marginTop: 10 };
  const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #222", background: "#111", color: "white", cursor: "pointer" };
  const btn2 = { padding: "10px 14px", borderRadius: 10, border: "1px solid #999", background: "white", color: "#111", cursor: "pointer" };

  return (
    <div style={card}>
      <h3 style={{ marginTop: 0 }}>Import Fields from CSV</h3>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input type="file" accept=".csv,text/csv" onChange={onPickFile} />
        {fileName ? <span style={{ color: "#666" }}>{fileName}</span> : null}
        <div style={{ flex: 1 }} />
        <button style={btn} onClick={importFields} disabled={loading || !raw.trim() || parsed.issues.length > 0}>
          {loading ? "Importing..." : "Import"}
        </button>
      </div>

      {parsed.issues.length ? (
        <div style={msgErr}>
          <b>CSV issues:</b>
          <ul>
            {parsed.issues.slice(0, 20).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
          <div style={{ color: "#666", fontSize: 12 }}>
            Required columns: <code>name</code>, <code>park</code>, <code>displayName</code>.
            Optional: <code>address</code>, <code>notes</code>, <code>isActive</code>.
          </div>
        </div>
      ) : null}

      {error ? <div style={msgErr}>{error}</div> : null}
      {success ? <div style={msgOk}>{success}</div> : null}

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
          Preview (first 10 rows):
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Row", "Name", "Park", "Display Name", "Address", "Active"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #eee", fontSize: 12, color: "#444" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.records.slice(0, 10).map((r) => (
              <tr key={r.__row}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{r.__row}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{r.name}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{r.park}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{r.displayName}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{r.address}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{String(!!r.isActive)}</td>
              </tr>
            ))}
            {!parsed.records.length ? (
              <tr><td colSpan={6} style={{ padding: 8, color: "#666" }}>Upload a CSV to preview.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
        Bulk endpoint expected: <code>{API.bulkCreate}</code> with body <code>{"{ items: [...] }"}</code>.
      </div>
    </div>
  );
}
