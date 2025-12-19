import { useEffect, useMemo, useState } from "react";

const DEFAULT_DIVISION = "Ponytail-4th";

/**
 * PROD (Azure Static Web Apps): always use relative /api so SWA proxies to linked Function App.
 * DEV (npm run dev): allow overriding to call a direct Function App host.
 */
function apiBase() {
  if (import.meta.env.DEV) {
    const b = import.meta.env.VITE_API_BASE_URL;
    return b && b.trim() ? b.trim().replace(/\/+$/, "") : "";
  }
  return "";
}

async function apiFetch(path, options = {}) {
  const base = apiBase();
  const url = base ? `${base}${path}` : path;

  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      typeof data === "string" && data
        ? data
        : data?.error || data?.message || res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }

  return data;
}

function formatDateISO(d) {
  return d; // expects YYYY-MM-DD
}

/**
 * Configure your backend routes here (one place).
 * If your Function App uses a different accept route, change only ACCEPT_ROUTE.
 */
const ACCEPT_ROUTE = (div, slotId) =>
  `/api/slots/${encodeURIComponent(div)}/${encodeURIComponent(slotId)}/accept`;

const CANCEL_ROUTE = (div, slotId) =>
  `/api/slots/${encodeURIComponent(div)}/${encodeURIComponent(slotId)}/cancel`;

export default function OffersPage() {
  // Filters + list
  const [division, setDivision] = useState(DEFAULT_DIVISION);
  const [statusFilter, setStatusFilter] = useState("Open");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // "Who am I?" (needed for Accept)
  const [myTeamId, setMyTeamId] = useState("3");

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
    return s.filter(
      (x) => String(x?.Status || "").toLowerCase() === statusFilter.toLowerCase()
    );
  }, [slots, statusFilter]);

  async function refresh() {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await apiFetch(
        `/api/slots?division=${encodeURIComponent(division)}`,
        { method: "GET" }
      );
      setSlots(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e?.message || e));
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

      const slotId = data?.SlotId || data?.slotId || "";
      setSuccess(slotId ? `Posted! SlotId: ${slotId}` : "Posted!");
      await refresh();
    } catch (e) {
      setError(String(e?.message || e));
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
      await apiFetch(CANCEL_ROUTE(div, slotId), { method: "PATCH" });
      setSuccess(`Cancelled: ${slotId}`);
      await refresh();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function acceptSlot(slot) {
    setError("");
    setSuccess("");

    const slotId = slot?.SlotId;
    const div = slot?.Division || division;

    if (!slotId) {
      setError("Missing SlotId");
      return;
    }
    if (!String(myTeamId || "").trim()) {
      setError("MyTeamId is required to accept a slot.");
      return;
    }

    setLoading(true);
    try {
      // If your backend expects acceptingTeamId in the body, keep this.
      // If it expects it elsewhere (query/header), change here.
      await apiFetch(ACCEPT_ROUTE(div, slotId), {
        method: "PATCH",
        body: JSON.stringify({ acceptingTeamId: String(myTeamId).trim() }),
      });

      setSuccess(`Accepted: ${slotId}`);
      await refresh();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Basic inline styles (dependency-free)
  const page = {
    fontFamily:
      "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    padding: 18,
    maxWidth: 1100,
    margin: "0 auto",
  };
  const row = {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "end",
  };
  const card = {
    border: "1px solid #e6e6e6",
    borderRadius: 10,
    padding: 14,
    background: "white",
  };
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
  const pill = (bg, fg) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: bg, color: fg, fontSize: 12 });

  function statusPill(statusRaw) {
    const s = String(statusRaw || "").toLowerCase();
    if (s === "open") return <span style={pill("#eef6ff", "#084298")}>Open</span>;
    if (s === "pending") return <span style={pill("#fff3cd", "#664d03")}>Pending</span>;
    if (s === "confirmed") return <span style={pill("#d1e7dd", "#0f5132")}>Confirmed</span>;
    if (s === "cancelled") return <span style={pill("#f8d7da", "#842029")}>Cancelled</span>;
    return <span>{String(statusRaw || "")}</span>;
  }

  return (
    <div style={page}>
      <h1 style={{ margin: "0 0 6px 0" }}>GameSwap</h1>
      <div style={{ color: "#555", marginBottom: 14 }}>
        API Base:{" "}
        <code>{apiBase() || "(relative /api — SWA integrated API)"}</code>
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

          <div>
            <label style={label}>MyTeamId (for Accept)</label>
            <input style={smallInput} value={myTeamId} onChange={(e) => setMyTeamId(e.target.value)} />
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
              filteredSlots.map((s) => {
                const status = String(s.Status || "");
                const statusLower = status.toLowerCase();
                const isCancelled = statusLower === "cancelled";
                const isOpen = statusLower === "open";

                return (
                  <tr key={s.SlotId}>
                    <td style={td}>
                      <code>{s.SlotId}</code>
                    </td>
                    <td style={td}>{s.OfferingTeamId}</td>
                    <td style={td}>{s.GameDate}</td>
                    <td style={td}>
                      {s.StartTime}–{s.EndTime}
                    </td>
                    <td style={td}>{s.Field}</td>
                    <td style={td}>{s.GameType}</td>
                    <td style={td}>{statusPill(status)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          style={buttonSecondary}
                          onClick={() => acceptSlot(s)}
                          disabled={loading || !isOpen}
                          title="Accept this slot"
                        >
                          Accept
                        </button>

                        <button
                          style={buttonSecondary}
                          onClick={() => cancelSlot(s)}
                          disabled={loading || isCancelled}
                          title="Cancel slot"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
          Note: “Accept” is wired to <code>{ACCEPT_ROUTE("Division", "SlotId")}</code>. If your Function App uses a different route or method, update <code>ACCEPT_ROUTE</code> and the HTTP method in <code>acceptSlot()</code>.
        </div>
      </div>
    </div>
  );
}
