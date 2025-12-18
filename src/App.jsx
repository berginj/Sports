import { useEffect, useMemo, useState } from "react";

const DEFAULT_DIVISION = "Ponytail-4th";

function apiBase() {
  // In Azure, set this in SWA config:
  // VITE_API_BASE_URL = https://<your-functionapp>.azurewebsites.net
  const b = import.meta.env.VITE_API_BASE_URL;
  return (b && b.trim()) ? b.trim().replace(/\/+$/, "") : "";
}

async function apiFetch(path, options = {}) {
  const base = apiBase();
  const url = base ? `${base}${path}` : path;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Content-Type": options.body ? "application/json" : (options.headers?.["Content-Type"] || undefined),
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = typeof data === "string" && data ? data : (data?.error || res.statusText);
    throw new Error(`${res.status} ${msg}`);
  }
  return data;
}

function formatDateISO(d) {
  // d is "YYYY-MM-DD"
  return d;
}

export default function App() {
  // Filters + list
  const [division, setDivision] = useState(DEFAULT_DIVISION);
  const [statusFilter, setStatusFilter] = useState("Open");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create form
  const [offeringTeamId, setOfferingTeamId] = useState("3");
  const [gameDate, setGameDate] = useState("2025-12-25");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");
  const [field, setField] = useState("Gunston Park > Turf Field");
  const [gameType, setGameType] = useState("Swap");
  const [notes, setNotes] = useState("");

  // UI messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredSlots = useMemo(() => {
    const s = Array.isArray(slots) ? slots : [];
    if (!statusFilter || statusFilter === "All") return s;
    return s.filter((x) => (x?.Status || "").toLowerCase() === statusFilter.toLowerCase());
  }, [slots, statusFilter]);

  async function refresh() {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await apiFetch(`/api/slots?division=${encodeURIComponent(division)}`, { method: "GET" });
      setSlots(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division]);

  async function createSlot() {
    setError("");
    setSuccess("");

    const payload = {
      division,
      offeringTeamId: String(offeringTeamId || "").trim(),
      gameDate: formatDateISO(gameDate),
      startTime,
      endTime,
      field,
      gameType,
      notes,
    };

    if (!payload.offeringTeamId) {
      setError("OfferingTeamId is required.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch(`/api/slots`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Your API returns SlotId in some responses; handle either shape.
      const slotId = data?.SlotId || data?.slotId || "";
      setSuccess(slotId ? `Posted! SlotId: ${slotId}` : "Posted!");
      await refresh();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function cancelSlot(slot) {
    setError("");
    setSuccess("");
    const slotId = slot?.SlotId;
    const div = slot?.Division || division;
    if (!slotId) {
      setError("Missing SlotId");
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/slots/${encodeURIComponent(div)}/${encodeURIComponent(slotId)}/cancel`, {
        method: "PATCH",
      });
      setSuccess(`Cancelled: ${slotId}`);
      await refresh();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Basic inline styles (keeps this file dependency-free)
  const page = { fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif", padding: 18, maxWidth: 1100, margin: "0 auto" };
  const row = { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" };
  const card = { border: "1px solid #e6e6e6", borderRadius: 10, padding: 14, background: "white" };
  const label = { display: "block", fontSize: 12, color: "#555", marginBottom: 6 };
  const input = { padding: 10, borderRadius: 8, border: "1px solid #ccc", minWidth: 180 };
  const smallInput = { padding: 10, borderRadius: 8, border: "1px solid #ccc", minWidth: 120 };
  const button = { padding: "10px 14px", borderRadius: 10, border: "1px solid #222", background: "#111", color: "white", cursor: "pointer" };
  const buttonSecondary = { padding: "10px 14px", borderRadius: 10, border: "1px solid #999", background: "white", color: "#111", cursor: "pointer" };
  const msgErr = { background: "#fff3f3", border: "1px solid #ffd2d2", color: "#8a0000", padding: 10, borderRadius: 10, marginTop: 10 };
  const msgOk = { background: "#f3fff5", border: "1px solid #c9ffd3", color: "#0a6b1f", padding: 10, borderRadius: 10, marginTop: 10 };
  const table = { width: "100%", borderCollapse: "collapse", marginTop: 12 };
  const th = { textAlign: "left", padding: 10, borderBottom: "2px solid #eee", fontSize: 12, color: "#444" };
  const td = { padding: 10, borderBottom: "1px solid #eee", verticalAlign: "top" };

  return (
    <div style={page}>
      <h1 style={{ margin: "0 0 6px 0" }}>GameSwap</h1>
      <div style={{ color: "#555", marginBottom: 14 }}>
        API Base: <code>{apiBase() || "(relative /api — local dev proxy or SWA integrated API)"}</code>
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <div style={row}>
          <div>
            <label style={label}>Division</label>
            <input style={input} value={division} onChange={(e) => setDivision(e.target.value)} />
          </div>

          <div>
            <label style={label}>Status filter</label>
            <select style={input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="All">All</option>
            </select>
          </div>

          <button style={buttonSecondary} onClick={refresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error ? <div style={msgErr}>{error}</div> : null}
        {success ? <div style={msgOk}>{success}</div> : null}
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0 }}>Post a slot</h2>
        <div style={row}>
          <div>
            <label style={label}>OfferingTeamId</label>
            <input style={smallInput} value={offeringTeamId} onChange={(e) => setOfferingTeamId(e.target.value)} />
          </div>

          <div>
            <label style={label}>GameDate (YYYY-MM-DD)</label>
            <input style={smallInput} value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
          </div>

          <div>
            <label style={label}>Start</label>
            <input style={smallInput} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>

          <div>
            <label style={label}>End</label>
            <input style={smallInput} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={label}>Field</label>
            <input style={{ ...input, width: "100%" }} value={field} onChange={(e) => setField(e.target.value)} />
          </div>

          <div>
            <label style={label}>GameType</label>
            <select style={input} value={gameType} onChange={(e) => setGameType(e.target.value)}>
              <option value="Swap">Swap</option>
              <option value="Scrimmage">Scrimmage</option>
              <option value="Practice">Practice</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={label}>Notes</label>
            <input style={{ ...input, width: "100%" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <button style={button} onClick={createSlot} disabled={loading}>
            {loading ? "Working..." : "Post"}
          </button>
        </div>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Slots</h2>

        <table style={table}>
          <thead>
            <tr>
              <th style={th}>SlotId</th>
              <th style={th}>Team</th>
              <th style={th}>Date</th>
              <th style={th}>Time</th>
              <th style={th}>Field</th>
              <th style={th}>Type</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSlots.length === 0 ? (
              <tr>
                <td style={td} colSpan={8}>
                  {loading ? "Loading..." : "No slots found."}
                </td>
              </tr>
            ) : (
              filteredSlots.map((s) => (
                <tr key={s.SlotId}>
                  <td style={td}><code>{s.SlotId}</code></td>
                  <td style={td}>{s.OfferingTeamId}</td>
                  <td style={td}>{s.GameDate}</td>
                  <td style={td}>{s.StartTime}–{s.EndTime}</td>
                  <td style={td}>{s.Field}</td>
                  <td style={td}>{s.GameType}</td>
                  <td style={td}>{s.Status}</td>
                  <td style={td}>
                    <button
                      style={buttonSecondary}
                      onClick={() => cancelSlot(s)}
                      disabled={loading || String(s.Status || "").toLowerCase() === "cancelled"}
                      title="Cancel slot"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
