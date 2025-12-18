import { useEffect, useMemo, useState } from "react";

export default function App() {
  // Filters + list
  const [dision, setDivision] = useState("Ponytail-4th");
  const [sasFilter, setStatusFilter] = useState("Open");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Post form  const [offeringTeamId, setOfferingTeamId] = useState("3");  const [gameDate, setGameDate] = useState("2025-12-25");
  const [startTime, setStartTime] = useState("20:01");
  const [endTime, setEndTime] = useState("21:01");
  const [field, setField] = useState("Gunston Park > Turf Field");
  const [gameType, setGameType] = useState("Swap");
  const [notes, setNotes] = useState("");

  // UI messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function normalizeSlot(s) {
    // API returns PascalCase; UI uses camelCase.
    return {
      slotId: s?.SlotId ?? s?.slotId ?? s?.RowKey ?? s?.rowKey,
      division: s?.Division ?? s?.division ?? s?.PartitionKey ?? s?.partitionKey,
      offeringTeamId: s?.OfferingTeamId ?? s?.offeringTeamId,
      gameDate: s?.GameDate ?? s?.gameDate,
      startTime: s?.StartTime ?? s?.startTime,
      endTime: s?.EndTime ?? s?.endTime,
      field: s?.Field ?? s?.field,
      gameType: s?.GameType ?? s?.gameType,
      status: s?.Status ?? s?.status,
      notes: s?.Notes ?? s?.notes
    };
  }

  async function loadSlots() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const url = `/api/slots?division=${encodeURIComponent(division)}`;
      const res = await fetch(url);

      if (res.status === 401) {
        setError("Not signed in (401). Once Entra + Static Web App auth is wired, this will prompt login.");
        setSlots([]);
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}. ${text}`);
      }

      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : []).map(normalizeSlot);
      setSlots(normalized);
    } catch (e) {
      setError(e?.message ?? "Unknown error");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  async function createSlot(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // tiny client-side validation
    if (!division || !offeringTeamId || !gameDate || !startTime || !endTime || !field) {
      setError("Missing required fields.");
      return;
    }
    if (startTime >= endTime) {
      setError("Start time must be before end time.");
      return;
    }

    // Send what the API expects (camelCase is fine if your server deserializer is case-insensitive;
    // but if you ever make it strict, switch these keys to PascalCase).
    const payload = {
      division,
      offeringTeamId,
      gameDate,
      startTime,
      endTime,
      field,
      gameType,
      notes
    };

    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        setError("Not signed in (401). Create will work once Entra auth is wired.");
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Create failed ${res.status}. ${text}`);
      }

      const data = await res.json().catch(() => ({}));
      const slotId = data?.slotId || data?.SlotId;

      setSuccess(slotId ? `Posted! SlotId: ${slotId}` : "Posted!");
      await loadSlots();
    } catch (e) {
      setError(e?.message ?? "Unknown error creating slot");
    }
  }

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleSlots = useMemo(() => {
    if (!statusFilter) return slots;
    return slots.filter((s) => (s.status ?? "").toLowerCase() === statusFilter.toLowerCase());
  }, [slots, statusFilter]);

  const sortedSlots = useMemo(() => {
    const arr = [...visibleSlots];
    arr.sort((a, b) => (`${a.gameDate ?? ""} ${a.startTime ?? ""}`).localeCompare(`${b.gameDate ?? ""} ${b.startTime ?? ""}`));
    return arr;
  }, [visibleSlots]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ marginBottom: 8 }}>GameSwap</h1>
      <p style={{ marginTop: 0, color: "#444" }}>View open swap slots and post new ones.</p>

      {/* Create form */}
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 16 }}>Post a Slot</h2>

        <form onSubmit={createSlot} style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          <Field label="Division">
            <input value={division} onChange={(e) => setDivision(e.target.value)} style={input} />
          </Field>

          <Field label="Offering Team Id">
            <input value={offeringTeamId} onChange={(e) => setOfferingTeamId(e.target.value)} style={input} />
          </Field>

          <Field label="Game Date (YYYY-MM-DD)">
            <input value={gameDate} onChange={(e) => setGameDate(e.target.value)} style={input} />
          </Field>

          <Field label="Start (HH:mm)">
            <input value={startTime} onChange={(e) => setStartTime(e.target.value)} style={input} />
          </Field>

          <Field label="End (HH:mm)">
            <input value={endTime} onChange={(e) => setEndTime(e.target.value)} style={input} />
          </Field>

          <Field label="Game Type">
            <select value={gameType} onChange={(e) => setGameType(e.target.value)} style={input}>
              <option value="Swap">Swap</option>
              <option value="Scrimmage">Scrimmage</option>
              <option value="Exhibition">Exhibition</option>
            </select>
          </Field>

          <div style={{ gridColumn: "1 / span 4" }}>
            <label style={label}>Field</label>
            <input value={field} onChange={(e) => setField(e.target.value)} style={input} />
          </div>

          <div style={{ gridColumn: "5 / span 2" }}>
            <label style={label}>Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={input} />
          </div>

          <div style={{ gridColumn: "1 / span 6", display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" style={{ padding: "9px 14px", cursor: "pointer" }}>
              Post Slot
            </button>
            <button type="button" onClick={loadSlots} style={{ padding: "9px 14px", cursor: "pointer" }}>
              {loading ? "Loading..." : "Refresh List"}
            </button>
          </div>
        </form>

        {error && (
          <div style={{ marginTop: 12, background: "#fff3cd", border: "1px solid #ffeeba", padding: 12, borderRadius: 6 }}>
            <strong>Heads up:</strong> {error}
          </div>
        )}

        {success && (
          <div style={{ marginTop: 12, background: "#d1e7dd", border: "1px solid #badbcc", padding: 12, borderRadius: 6 }}>
            {success}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, alignItems: "end", marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <label style={label}>Division</label>
          <input
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            style={{ ...input, width: 220 }}
            placeholder="e.g., Ponytail-4th"
          />
        </div>

        <div>
          <label style={label}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={input}>
            <option value="Open">Open</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="">All</option>
          </select>
        </div>

        <button onClick={loadSlots} style={{ padding: "9px 14px", cursor: "pointer" }}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f6f6f6" }}>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Time</th>
              <th style={th}>Field</th>
              <th style={th}>Type</th>
              <th style={th}>Status</th>
              <th style={th}>SlotId</th>
            </tr>
          </thead>
          <tbody>
            {sortedSlots.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 14, color: "#666" }}>
                  {loading ? "Loading..." : "No slots found."}
                </td>
              </tr>
            ) : (
              sortedSlots.map((s) => (
                <tr key={s.slotId ?? Math.random()}>
                  <td style={td}>{s.gameDate ?? ""}</td>
                  <td style={td}>{`${s.startTime ?? ""}–${s.endTime ?? ""}`}</td>
                  <td style={td}>{s.field ?? ""}</td>
                  <td style={td}>{s.gameType ?? ""}</td>
                  <td style={td}>{s.status ?? ""}</td>
                  <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas" }}>
                    <button
                      onClick={() => navigator.clipboard.writeText(s.slotId ?? "")}
                      style={{ marginRight: 8, cursor: "pointer" }}
                      title="Copy SlotId"
                    >
                      Copy
                    </button>
                    {s.slotId ?? ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        Dev: React calls <code>/api/...</code> and Vite proxies to your Functions host.
      </p>
    </div>
  );
}

function Field({ label: lbl, children }) {
  return (
    <div>
      <label style={label}>{lbl}</label>
      {children}
    </div>
  );
}

const label = { display: "block", fontSize: 12, color: "#555", marginBottom: 4 };
const input = { padding: 8, width: "100%" };
const th = { textAlign: "left", padding: 10, borderBottom: "1px solid #ddd", fontSize: 12, color: "#555" };
const td = { padding: 10, borderBottom: "1px solid #eee", verticalAlign: "top" import { useEffect, useMemo, useState } from "react";

export default function App() {
  // Filters + list
  const [division, setDivision] = useState("Ponytail-4th");
  const [statusFilter, setStatusFilter] = useState("Open");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Post form
  const [offeringTeamId, setOfferingTeamId] = useState("3");
  const [gameDate, setGameDate] = useState("2025-12-25");
  const [startTime, setStartTime] = useState("20:01");
  const [endTime, setEndTime] = useState("21:01");
  const [field, setField] = useState("Gunston Park > Turf Field");
  const [gameType, setGameType] = useState("Swap");
  const [notes, setNotes] = useState("");

  // UI messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function normalizeSlot(s) {
    return {
      slotId: s?.SlotId ?? s?.slotId ?? s?.RowKey ?? s?.rowKey,
      division: s?.Division ?? s?.division ?? s?.PartitionKey ?? s?.partitionKey,
      offeringTeamId: s?.OfferingTeamId ?? s?.offeringTeamId,
      gameDate: s?.GameDate ?? s?.gameDate,
      startTime: s?.StartTime ?? s?.startTime,
      endTime: s?.EndTime ?? s?.endTime,
      field: s?.Field ?? s?.field,
      gameType: s?.GameType ?? s?.gameType,
      status: s?.Status ?? s?.status,
      notes: s?.Notes ?? s?.notes
    };
  }

  async function loadSlots() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const url = `/api/slots?division=${encodeURIComponent(division)}`;
      const res = await fetch(url);

      if (res.status === 401) {
        setError("Not signed in (401). Once Entra + Static Web App auth is wired, this will prompt login.");
        setSlots([]);
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}. ${text}`);
      }

      const data = await res.json();
      setSlots((Array.isArray(data) ? data : []).map(normalizeSlot));
    } catch (e) {
      setError(e?.message ?? "Unknown error");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  async function createSlot(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!division || !offeringTeamId || !gameDate || !startTime || !endTime || !field) {
      setError("Missing required fields.");
      return;
    }
    if (startTime >= endTime) {
      setError("Start time must be before end time.");
      return;
    }

    const payload = {
      division,
      offeringTeamId,
      gameDate,
      startTime,
      endTime,
      field,
      gameType,
      notes
    };

    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        setError("Not signed in (401). Create will work once Entra auth is wired.");
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Create failed ${res.status}. ${text}`);
      }

      const data = await res.json().catch(() => ({}));
      const slotId = data?.slotId || data?.SlotId;
      setSuccess(slotId ? `Posted! SlotId: ${slotId}` : "Posted!");
      await loadSlots();
    } catch (e) {
      setError(e?.message ?? "Unknown error creating slot");
    }
  }

  async function cancelSlot(slotId) {
    setError("");
    setSuccess("");

    if (!slotId) {
      setError("Missing slotId.");
      return;
    }

    const ok = window.confirm(`Cancel slot ${slotId}?`);
    if (!ok) return;

    try {
      const url = `/api/slots/${encodeURIComponent(division)}/${encodeURIComponent(slotId)}/cancel`;
      const res = await fetch(url, { method: "PATCH" });

      if (res.status === 401) {
        setError("Not signed in (401). Cancel will work once Entra auth is wired.");
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Cancel failed ${res.status}. ${text}`);
      }

      setSuccess(`Cancelled slot ${slotId}`);
      await loadSlots();
    } catch (e) {
      setError(e?.message ?? "Unknown error cancelling slot");
    }
  }

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleSlots = useMemo(() => {
    if (!statusFilter) return slots;
    return slots.filter((s) => (s.status ?? "").toLowerCase() === statusFilter.toLowerCase());
  }, [slots, statusFilter]);

  const sortedSlots = useMemo(() => {
    const arr = [...visibleSlots];
    arr.sort((a, b) =>
      (`${a.gameDate ?? ""} ${a.startTime ?? ""}`).localeCompare(`${b.gameDate ?? ""} ${b.startTime ?? ""}`)
    );
    return arr;
  }, [visibleSlots]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ marginBottom: 8 }}>GameSwap</h1>
      <p style={{ marginTop: 0, color: "#444" }}>View open swap slots and post new ones.</p>

      {/* Create form */}
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 16 }}>Post a Slot</h2>

        <form onSubmit={createSlot} style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          <Field label="Division">
            <input value={division} onChange={(e) => setDivision(e.target.value)} style={input} />
          </Field>

          <Field label="Offering Team Id">
            <input value={offeringTeamId} onChange={(e) => setOfferingTeamId(e.target.value)} style={input} />
          </Field>

          <Field label="Game Date (YYYY-MM-DD)">
            <input value={gameDate} onChange={(e) => setGameDate(e.target.value)} style={input} />
          </Field>

          <Field label="Start (HH:mm)">
            <input value={startTime} onChange={(e) => setStartTime(e.target.value)} style={input} />
          </Field>

          <Field label="End (HH:mm)">
            <input value={endTime} onChange={(e) => setEndTime(e.target.value)} style={input} />
          </Field>

          <Field label="Game Type">
            <select value={gameType} onChange={(e) => setGameType(e.target.value)} style={input}>
              <option value="Swap">Swap</option>
              <option value="Scrimmage">Scrimmage</option>
              <option value="Exhibition">Exhibition</option>
            </select>
          </Field>

          <div style={{ gridColumn: "1 / span 4" }}>
            <label style={label}>Field</label>
            <input value={field} onChange={(e) => setField(e.target.value)} style={input} />
          </div>

          <div style={{ gridColumn: "5 / span 2" }}>
            <label style={label}>Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={input} />
          </div>

          <div style={{ gridColumn: "1 / span 6", display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" style={{ padding: "9px 14px", cursor: "pointer" }}>
              Post Slot
            </button>
            <button type="button" onClick={loadSlots} style={{ padding: "9px 14px", cursor: "pointer" }}>
              {loading ? "Loading..." : "Refresh List"}
            </button>
          </div>
        </form>

        {error && (
          <div style={{ marginTop: 12, background: "#fff3cd", border: "1px solid #ffeeba", padding: 12, borderRadius: 6 }}>
            <strong>Heads up:</strong> {error}
          </div>
        )}

        {success && (
          <div style={{ marginTop: 12, background: "#d1e7dd", border: "1px solid #badbcc", padding: 12, borderRadius: 6 }}>
            {success}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, alignItems: "end", marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <label style={label}>Division</label>
          <input
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            style={{ ...input, width: 220 }}
            placeholder="e.g., Ponytail-4th"
          />
        </div>

        <div>
          <label style={label}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={input}>
            <option value="Open">Open</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="">All</option>
          </select>
        </div>

        <button onClick={loadSlots} style={{ padding: "9px 14px", cursor: "pointer" }}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f6f6f6" }}>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Time</th>
              <th style={th}>Field</th>
              <th style={th}>Type</th>
              <th style={th}>Status</th>
              <th style={th}>SlotId</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSlots.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 14, color: "#666" }}>
                  {loading ? "Loading..." : "No slots found."}
                </td>
              </tr>
            ) : (
              sortedSlots.map((s) => {
                const canCancel = ["open", "pending"].includes((s.status ?? "").toLowerCase());
                return (
                  <tr key={s.slotId ?? Math.random()}>
                    <td style={td}>{s.gameDate ?? ""}</td>
                    <td style={td}>{`${s.startTime ?? ""}–${s.endTime ?? ""}`}</td>
                    <td style={td}>{s.field ?? ""}</td>
                    <td style={td}>{s.gameType ?? ""}</td>
                    <td style={td}>{s.status ?? ""}</td>
                    <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas" }}>
                      <button
                        onClick={() => navigator.clipboard.writeText(s.slotId ?? "")}
                        style={{ marginRight: 8, cursor: "pointer" }}
                        title="Copy SlotId"
                      >
                        Copy
                      </button>
                      {s.slotId ?? ""}
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => cancelSlot(s.slotId)}
                        disabled={!canCancel}
                        style={{ padding: "6px 10px", cursor: canCancel ? "pointer" : "not-allowed" }}
                        title={canCancel ? "Cancel this slot" : "Only Open/Pending slots can be cancelled"}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        Dev: React calls <code>/api/...</code> and Vite proxies to your Functions host.
      </p>
    </div>
  );
}

function Field({ label: lbl, children }) {
  return (
    <div>
      <label style={label}>{lbl}</label>
      {children}
    </div>
  );
}

const label = { display: "block", fontSize: 12, color: "#555", marginBottom: 4 };
const input = { padding: 8, width: "100%" };
const th = { textAlign: "left", padding: 10, borderBottom: "1px solid #ddd", fontSize: 12, color: "#555" };
const td = { padding: 10, borderBottom: "1px solid #eee", verticalAlign: "top" };
