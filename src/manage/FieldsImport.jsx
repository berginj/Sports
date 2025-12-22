import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

// Bulk upsert Fields via /api/fields/bulk
// Expected CSV headers (case-insensitive):
//   ParkName, FieldName
// Optional:
//   DisplayName, Address, Surface, Lights, IsActive, Notes

function parseCsv(text) {
  const lines = (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  // very small CSV parser: supports commas + quoted values
  function splitLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map(splitLine);
  return { headers, rows };
}

function getCell(row, headers, name) {
  const idx = headers.indexOf(name.toLowerCase());
  if (idx < 0) return "";
  return (row[idx] || "").trim();
}

function toBool(v, defaultValue) {
  if (!v) return defaultValue;
  const s = String(v).trim().toLowerCase();
  if (["true", "t", "yes", "y", "1"].includes(s)) return true;
  if (["false", "f", "no", "n", "0"].includes(s)) return false;
  return defaultValue;
}

export default function FieldsImport() {
  const [csvText, setCsvText] = useState(
    [
      "ParkName,FieldName,DisplayName,Address,Surface,Lights,IsActive,Notes",
      "Gunston Park,Turf Field,Gunston Park > Turf Field,,,true,true,",
    ].join("\n")
  );

  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const preview = useMemo(() => {
    const parsed = parseCsv(csvText);
    const headers = parsed.headers;
    const rows = parsed.rows;

    const required = ["parkname", "fieldname"];
    const missing = required.filter((h) => !headers.includes(h));

    const items = [];
    const errors = [];

    rows.forEach((row, i) => {
      const parkName = getCell(row, headers, "parkname");
      const fieldName = getCell(row, headers, "fieldname");
      if (!parkName || !fieldName) {
        errors.push({ row: i + 2, error: "ParkName and FieldName are required" });
        return;
      }

      const displayName = getCell(row, headers, "displayname") || `${parkName} > ${fieldName}`;
      const address = getCell(row, headers, "address");
      const surface = getCell(row, headers, "surface");
      const notes = getCell(row, headers, "notes");
      const lights = toBool(getCell(row, headers, "lights"), false);
      const isActive = toBool(getCell(row, headers, "isactive"), true);

      items.push({ parkName, fieldName, displayName, address, surface, notes, lights, isActive });
    });

    return { headers, missing, items, errors };
  }, [csvText]);

  async function doImport() {
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      if (preview.missing.length) {
        setErr(`Missing required columns: ${preview.missing.join(", ")}`);
        return;
      }
      if (preview.items.length === 0) {
        setErr("No valid rows to import.");
        return;
      }

      const data = await apiFetch("/api/fields/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: preview.items }),
      });

      setResult(data);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Import Fields</h2>
      <p className="muted">
        Paste CSV below and import. Required columns: <b>ParkName</b>, <b>FieldName</b>.
        The active league is taken from the league picker above.
      </p>

      <textarea
        className="textarea"
        rows={10}
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
      />

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className="btn" disabled={busy} onClick={doImport}>
          {busy ? "Importing…" : `Import ${preview.items.length} fields`}
        </button>
        {preview.errors.length > 0 && (
          <span className="pill pill--warn">{preview.errors.length} row errors (will be skipped)</span>
        )}
      </div>

      {err && <div className="alert alert--error">{err}</div>}

      {preview.errors.length > 0 && (
        <details>
          <summary>Row errors</summary>
          <pre className="code">{JSON.stringify(preview.errors, null, 2)}</pre>
        </details>
      )}

      {result && (
        <details open>
          <summary>Result</summary>
          <pre className="code">{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
