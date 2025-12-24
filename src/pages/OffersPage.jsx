import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

function fmtDate(d) {
  return d || "";
}

export default function OffersPage({ me }) {
  const [divisions, setDivisions] = useState([]);
  const [division, setDivision] = useState("");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function loadAll(selectedDivision) {
    setErr("");
    setLoading(true);
    try {
      const divs = await apiFetch("/api/divisions");
      const divList = Array.isArray(divs) ? divs : [];
      setDivisions(divList);
      const firstDiv = selectedDivision || divList?.[0]?.code || "";
      setDivision(firstDiv);

      if (firstDiv) {
        const s = await apiFetch(`/api/slots?division=${encodeURIComponent(firstDiv)}`);
        setSlots(Array.isArray(s) ? s : []);
      } else {
        setSlots([]);
      }
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reloadSlots(nextDivision) {
    const d = nextDivision ?? division;
    setDivision(d);
    if (!d) return;
    setErr("");
    try {
      const s = await apiFetch(`/api/slots?division=${encodeURIComponent(d)}`);
      setSlots(Array.isArray(s) ? s : []);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  // --- Request slot ---
  async function requestSlot(slot) {
    setErr("");
    const notes = prompt("Notes for the other team? (optional)") || "";
    try {
      await apiFetch(`/api/slots/${encodeURIComponent(division)}/${encodeURIComponent(slot.slotId)}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      await reloadSlots(division);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  if (loading) return <div className="card">Loading…</div>;

  return (
    <div className="stack">
      {err ? <div className="card error">{err}</div> : null}

      <div className="card">
        <div className="cardTitle">Division</div>
        <div className="row">
          <select value={division} onChange={(e) => reloadSlots(e.target.value)}>
            {divisions.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => loadAll(division)} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <div className="cardTitle">Open slots</div>
        {slots.length === 0 ? (
          <div className="muted">No slots found for this division.</div>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Field</th>
                  <th>Offering Team</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.slotId}>
                    <td>{fmtDate(s.gameDate)}</td>
                    <td>
                      {s.startTime}–{s.endTime}
                    </td>
                    <td>{s.displayName || s.fieldKey}</td>
                    <td>{s.offeringTeamId}</td>
                    <td>{s.status}</td>
                    <td style={{ textAlign: "right" }}>
                      {s.status === "Open" ? (
                        <button className="btn" onClick={() => requestSlot(s)}>
                          Request
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
