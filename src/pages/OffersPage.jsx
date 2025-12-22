import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const k = String(x ?? "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

export default function OffersPage({ leagueId, me }) {
  const [divisions, setDivisions] = useState([]);
  const [fields, setFields] = useState([]);

  const [division, setDivision] = useState("");
  const [status, setStatus] = useState(""); // "", Open, Pending, Confirmed, Cancelled

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [expanded, setExpanded] = useState(""); // slotId
  const [requests, setRequests] = useState({}); // slotId -> requests[]
  const [requestsBusy, setRequestsBusy] = useState({}); // slotId -> bool

  // create form
  const [form, setForm] = useState({
    division: "",
    offeringTeamId: "",
    offeringEmail: me?.Email || "",
    gameDate: "",
    startTime: "",
    endTime: "",
    parkName: "",
    fieldName: "",
    gameType: "Swap",
    notes: "",
  });
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  // request form
  const [requestingTeamId, setRequestingTeamId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMsg, setRequestMsg] = useState("");

  async function loadBootstrap() {
    if (!leagueId) return;
    try {
      const [divs, f] = await Promise.all([
        apiFetch("/api/divisions").catch(() => []),
        apiFetch("/api/fields", { leagueId, query: { activeOnly: true } }).catch(() => []),
      ]);
      setDivisions(Array.isArray(divs) ? divs : []);
      setFields(Array.isArray(f) ? f : []);
    } catch {
      // ignore; individual calls already handled
    }
  }

  async function loadSlots() {
    if (!leagueId) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/slots", { leagueId, query: { division: division || undefined, status: status || undefined } });
      setSlots(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBootstrap(); }, [leagueId]);
  useEffect(() => { loadSlots(); }, [leagueId, division, status]);

  const parks = useMemo(() => uniq(fields.map((f) => f.ParkName).filter(Boolean)).sort(), [fields]);
  const fieldsForPark = useMemo(() => {
    if (!form.parkName) return [];
    return fields
      .filter((f) => (f.ParkName || "").toLowerCase() === form.parkName.toLowerCase())
      .map((f) => f.FieldName)
      .filter(Boolean)
      .sort();
  }, [fields, form.parkName]);

  function setFormField(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function createSlot() {
    setCreateMsg("");
    setError("");
    if (!leagueId) return;

    const payload = {
      division: form.division.trim(),
      offeringTeamId: form.offeringTeamId.trim(),
      offeringEmail: (form.offeringEmail || "").trim(),
      gameDate: form.gameDate.trim(),
      startTime: form.startTime.trim(),
      endTime: form.endTime.trim(),
      parkName: form.parkName.trim(),
      fieldName: form.fieldName.trim(),
      gameType: (form.gameType || "Swap").trim(),
      notes: (form.notes || "").trim(),
    };

    // quick validation for user sanity
    const required = ["division", "offeringTeamId", "gameDate", "startTime", "endTime", "parkName", "fieldName"];
    for (const k of required) {
      if (!payload[k]) {
        setCreateMsg(`Missing required: ${k}`);
        return;
      }
    }

    setCreateBusy(true);
    try {
      await apiFetch("/api/slots", { method: "POST", leagueId, body: JSON.stringify(payload) });
      setCreateMsg("Created.");
      setForm((s) => ({ ...s, notes: "" }));
      await loadSlots();
    } catch (e) {
      setCreateMsg(String(e?.message || e));
    } finally {
      setCreateBusy(false);
    }
  }

  async function cancelSlot(slot) {
    if (!leagueId) return;
    if (!slot?.Division || !slot?.SlotId) return;
    setError("");
    try {
      await apiFetch(`/api/slots/${encodeURIComponent(slot.Division)}/${encodeURIComponent(slot.SlotId)}/cancel`, {
        method: "PATCH",
        leagueId,
      });
      await loadSlots();
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  async function loadRequests(slot) {
    if (!leagueId || !slot?.Division || !slot?.SlotId) return;
    const key = slot.SlotId;
    setRequestsBusy((s) => ({ ...s, [key]: true }));
    try {
      const data = await apiFetch(`/api/slots/${encodeURIComponent(slot.Division)}/${encodeURIComponent(slot.SlotId)}/requests`, {
        leagueId,
      });
      setRequests((s) => ({ ...s, [key]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setRequestsBusy((s) => ({ ...s, [key]: false }));
    }
  }

  async function approveRequest(slot, reqItem) {
    if (!leagueId) return;
    setError("");
    try {
      await apiFetch(
        `/api/slots/${encodeURIComponent(slot.Division)}/${encodeURIComponent(slot.SlotId)}/requests/${encodeURIComponent(reqItem.RequestId)}/approve`,
        { method: "PATCH", leagueId }
      );
      await Promise.all([loadSlots(), loadRequests(slot)]);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  async function submitRequest(slot) {
    if (!leagueId) return;
    setRequestBusy(true);
    setRequestMsg("");
    setError("");
    try {
      const payload = {
        requestingTeamId: requestingTeamId.trim(),
        requestingEmail: (me?.Email || "").trim(),
        message: requestMessage.trim(),
      };
      if (!payload.requestingTeamId) {
        setRequestMsg("RequestingTeamId is required.");
        return;
      }

      await apiFetch(`/api/slots/${encodeURIComponent(slot.Division)}/${encodeURIComponent(slot.SlotId)}/requests`, {
        method: "POST",
        leagueId,
        body: JSON.stringify(payload),
      });

      setRequestingTeamId("");
      setRequestMessage("");
      setRequestMsg("Request submitted.");
      await Promise.all([loadSlots(), loadRequests(slot)]);
    } catch (e) {
      setRequestMsg(String(e?.message || e));
    } finally {
      setRequestBusy(false);
    }
  }

  function slotTitle(s) {
    const when = `${s.GameDate} ${s.StartTime}–${s.EndTime}`;
    const where = s.DisplayName || `${s.ParkName} > ${s.FieldName}`;
    return `${when} • ${where}`;
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="row row--space">
          <div>
            <div className="h2">Offers</div>
            <div className="muted">
              Create slots, request swaps, and approve requests. League-scoped via <code>x-league-id</code>.
            </div>
          </div>
          <button className="btn" onClick={loadSlots} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="formGrid">
          <div className="control">
            <label>Division filter</label>
            <select value={division} onChange={(e) => setDivision(e.target.value)}>
              <option value="">(all)</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.code}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="control">
            <label>Status filter</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">(all)</option>
              {["Open", "Pending", "Confirmed", "Cancelled"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="control control--end">
            <div className="muted">{slots.length} slot{slots.length === 1 ? "" : "s"}</div>
          </div>
        </div>

        {error && <div className="alert alert--danger">{error}</div>}
      </section>

      {/* Create slot */}
      <section className="card">
        <div className="h2">Create slot</div>
        <div className="formGrid">
          <div className="control">
            <label>Division</label>
            <input value={form.division} onChange={(e) => setFormField("division", e.target.value)} placeholder="Ponytail 4th" />
          </div>
          <div className="control">
            <label>OfferingTeamId</label>
            <input value={form.offeringTeamId} onChange={(e) => setFormField("offeringTeamId", e.target.value)} placeholder="Blue Waves" />
          </div>

          <div className="control">
            <label>GameDate (YYYY-MM-DD)</label>
            <input value={form.gameDate} onChange={(e) => setFormField("gameDate", e.target.value)} placeholder="2026-03-29" />
          </div>
          <div className="control">
            <label>StartTime (HH:mm)</label>
            <input value={form.startTime} onChange={(e) => setFormField("startTime", e.target.value)} placeholder="08:00" />
          </div>
          <div className="control">
            <label>EndTime (HH:mm)</label>
            <input value={form.endTime} onChange={(e) => setFormField("endTime", e.target.value)} placeholder="09:15" />
          </div>

          <div className="control">
            <label>Park</label>
            <select value={form.parkName} onChange={(e) => setFormField("parkName", e.target.value)}>
              <option value="">Select park…</option>
              {parks.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="control">
            <label>Field</label>
            <select
              value={form.fieldName}
              onChange={(e) => setFormField("fieldName", e.target.value)}
              disabled={!form.parkName}
            >
              <option value="">{form.parkName ? "Select field…" : "Pick a park first…"}</option>
              {fieldsForPark.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="control">
            <label>GameType</label>
            <input value={form.gameType} onChange={(e) => setFormField("gameType", e.target.value)} placeholder="Swap" />
          </div>

          <div className="control">
            <label>Notes</label>
            <input value={form.notes} onChange={(e) => setFormField("notes", e.target.value)} placeholder="optional" />
          </div>

          <div className="control">
            <label>OfferingEmail (optional)</label>
            <input value={form.offeringEmail} onChange={(e) => setFormField("offeringEmail", e.target.value)} placeholder="coach@example.com" />
          </div>

          <div className="control control--end">
            <button className="btn btn--primary" onClick={createSlot} disabled={createBusy}>
              {createBusy ? "Creating…" : "Create"}
            </button>
          </div>
        </div>

        {createMsg && <div className={createMsg === "Created." ? "alert alert--ok" : "alert"}>{createMsg}</div>}
      </section>

      {/* Slots list */}
      <section className="stack">
        {slots.map((s) => {
          const isExpanded = expanded === s.SlotId;
          const reqs = requests[s.SlotId] || [];
          const busyReqs = !!requestsBusy[s.SlotId];

          return (
            <article key={s.SlotId} className="card">
              <div className="row row--space">
                <div className="stack" style={{ gap: 6 }}>
                  <div className="h3">{slotTitle(s)}</div>
                  <div className="muted">
                    <span className="pill">{s.Division}</span>{" "}
                    <span className="pill">{s.Status || "Open"}</span>{" "}
                    <span className="pill">Offering: {s.OfferingTeamId}</span>
                    {s.ConfirmedTeamId ? <span className="pill pill--ok">Confirmed: {s.ConfirmedTeamId}</span> : null}
                  </div>
                </div>

                <div className="row row--end">
                  <button
                    className="btn"
                    onClick={() => {
                      const next = isExpanded ? "" : s.SlotId;
                      setExpanded(next);
                      setRequestMsg("");
                      if (!isExpanded) loadRequests(s);
                    }}
                  >
                    {isExpanded ? "Hide requests" : "Requests"}
                  </button>

                  <button className="btn btn--danger" onClick={() => cancelSlot(s)} disabled={String(s.Status).toLowerCase() === "cancelled"}>
                    Cancel
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="stack">
                  <div className="divider" />

                  {/* Request this slot */}
                  <div className="card card--subtle">
                    <div className="h3">Request this slot</div>
                    <div className="formGrid">
                      <div className="control">
                        <label>RequestingTeamId</label>
                        <input value={requestingTeamId} onChange={(e) => setRequestingTeamId(e.target.value)} placeholder="Your team" />
                      </div>
                      <div className="control">
                        <label>Message (optional)</label>
                        <input value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} placeholder="Any details…" />
                      </div>
                      <div className="control control--end">
                        <button className="btn btn--primary" onClick={() => submitRequest(s)} disabled={requestBusy}>
                          {requestBusy ? "Submitting…" : "Submit request"}
                        </button>
                      </div>
                    </div>
                    {requestMsg && <div className={requestMsg.endsWith(".") ? "alert alert--ok" : "alert"}>{requestMsg}</div>}
                  </div>

                  {/* Requests table */}
                  <div className="row row--space">
                    <div className="h3">Requests</div>
                    <button className="btn btn--sm" onClick={() => loadRequests(s)} disabled={busyReqs}>
                      {busyReqs ? "Loading…" : "Refresh requests"}
                    </button>
                  </div>

                  <div className="tableWrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Team</th>
                          <th>Status</th>
                          <th>Message</th>
                          <th>Requested</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {reqs.map((r) => (
                          <tr key={r.RequestId}>
                            <td>{r.RequestingTeamId}</td>
                            <td>{r.Status}</td>
                            <td className="muted">{r.Message}</td>
                            <td className="muted">{r.RequestedAtUtc ? new Date(r.RequestedAtUtc).toLocaleString() : ""}</td>
                            <td className="row row--end">
                              <button
                                className="btn btn--sm btn--primary"
                                onClick={() => approveRequest(s, r)}
                                disabled={String(s.Status).toLowerCase() === "confirmed" || String(r.Status).toLowerCase() === "approved"}
                              >
                                Approve
                              </button>
                            </td>
                          </tr>
                        ))}
                        {reqs.length === 0 && (
                          <tr><td colSpan={5} className="muted">No requests yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {slots.length === 0 && !loading && (
          <div className="card">
            <div className="muted">No slots found for the current filters.</div>
          </div>
        )}
      </section>
    </div>
  );
}
