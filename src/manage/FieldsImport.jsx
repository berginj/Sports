import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { FIELD_STATUS } from "../lib/constants";

// Admin tool: CSV import is the ONLY fields workflow.
// Contract: POST /import/fields (text/csv) with required columns: fieldKey, parkName, fieldName.

const SAMPLE_CSV = `fieldKey,parkName,fieldName,displayName,address,notes,status
gunston/turf,Gunston Park,Turf,Gunston Park > Turf,,,${FIELD_STATUS.ACTIVE}
tuckahoe/field-2,Tuckahoe Park,Field 2,Tuckahoe Park > Field 2,,,${FIELD_STATUS.ACTIVE}
`;

export default function FieldsImport({ leagueId }) {
  const [fields, setFields] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [csvText, setCsvText] = useState(SAMPLE_CSV);

  async function load() {
    setErr("");
    try {
      const list = await apiFetch("/api/fields?activeOnly=false");
      setFields(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || "Failed to load fields");
    }
  }

  useEffect(() => {
    if (!leagueId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  async function importCsv() {
    setErr("");
    setOk("");
    setBusy(true);
    try {
      const res = await apiFetch("/api/import/fields", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: csvText,
      });
      const msg = `Imported. Upserted: ${res?.upserted ?? 0}, Rejected: ${res?.rejected ?? 0}, Skipped: ${res?.skipped ?? 0}`;
      setOk(msg);
      await load();
    } catch (e) {
      setErr(e?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {err ? <div className="callout callout--error">{err}</div> : null}
      {ok ? <div className="callout callout--ok">{ok}</div> : null}

      <div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>CSV import</div>
        <div className="subtle" style={{ marginBottom: 10, lineHeight: 1.4 }}>
          Required columns: <code>fieldKey</code>, <code>parkName</code>, <code>fieldName</code>. Optional: <code>displayName</code>,{" "}
          <code>address</code>, <code>notes</code>, <code>status</code> ({FIELD_STATUS.ACTIVE}/{FIELD_STATUS.INACTIVE}).
        </div>

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={10}
          style={{
            width: "100%",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          }}
        />

        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={importCsv} disabled={busy || !leagueId}>
            {busy ? "Importing…" : "Import CSV"}
          </button>
          <button className="btn btn--ghost" onClick={load} disabled={!leagueId}>
            Reload
          </button>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Current fields ({fields.length})</div>
        {fields.length === 0 ? (
          <div className="subtle">No fields yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Display</th>
                <th>Field Key</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.fieldKey}>
                  <td>{f.displayName}</td>
                  <td>
                    <code>{f.fieldKey}</code>
                  </td>
                  <td>{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
