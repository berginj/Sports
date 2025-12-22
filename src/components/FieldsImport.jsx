import { useRef, useState } from "react";
import { apiFetch } from "../lib/api";

const TEMPLATE = `ParkName,FieldName,DisplayName,IsActive
Tuckahoe Park,Field 2,Tuckahoe Park > Field 2,true
Gunston Park,Turf Field,Gunston Park > Turf Field,true
`;

export default function FieldsImport({ leagueId }) {
  const fileRef = useRef(null);
  const [csv, setCsv] = useState(TEMPLATE);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function importCsv() {
    if (!leagueId) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await apiFetch("/api/import/fields", {
        method: "POST",
        leagueId,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: csv,
      });
      setResult(data);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function loadFile(file) {
    const text = await file.text();
    setCsv(text);
  }

  return (
    <section className="card">
      <div className="row row--space">
        <div>
          <div className="h2">Import Fields (CSV)</div>
          <div className="muted">
            Writes to <code>Fields</code>. Must run before slot imports.
          </div>
        </div>
        <div className="row">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
          <button className="btn btn--primary" onClick={importCsv} disabled={busy || !csv.trim()}>
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      </div>

      <details className="details">
        <summary>CSV template</summary>
        <pre className="codeblock">{TEMPLATE}</pre>
      </details>

      <textarea className="textarea" rows={10} value={csv} onChange={(e) => setCsv(e.target.value)} />

      {error && <div className="alert alert--danger">{error}</div>}
      {result && (
        <div className="alert alert--ok">
          <div><b>Upserted:</b> {result.upserted ?? "?"}</div>
          {!!(result.errors?.length) && <div className="muted">Errors: {result.errors.length}</div>}
        </div>
      )}
    </section>
  );
}
