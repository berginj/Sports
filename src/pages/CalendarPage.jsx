import { useEffect, useMemo, useState } from "react";
import { apiBase, apiFetch } from "../lib/api";

function toDateInputValue(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeRole(role) {
  return (role || "").trim();
}

function toWebcalUrl(url) {
  if (!url) return "";
  return url.replace(/^https?:/i, "webcal:");
}

function buildSubscribeUrl(leagueId) {
  const template = import.meta.env.VITE_CALENDAR_SUBSCRIBE_URL;
  if (template) {
    return template.replace("{leagueId}", encodeURIComponent(leagueId || ""));
  }

  if (typeof window === "undefined") return "";
  const base = apiBase();
  const origin = base || window.location.origin;
  const url = new URL("/api/calendar/ics", origin);
  if (leagueId) url.searchParams.set("leagueId", leagueId);
  return url.toString();
}

export default function CalendarPage({ me, leagueId }) {
  const isGlobalAdmin = !!me?.isGlobalAdmin;
  const memberships = Array.isArray(me?.memberships) ? me.memberships : [];
  const role = useMemo(() => {
    const inLeague = memberships.filter((m) => (m?.leagueId || "").trim() === (leagueId || "").trim());
    const roles = inLeague.map((m) => normalizeRole(m?.role));
    if (roles.includes("LeagueAdmin")) return "LeagueAdmin";
    if (roles.includes("Coach")) return "Coach";
    return roles.includes("Viewer") ? "Viewer" : "";
  }, [memberships, leagueId]);

  const myCoachTeamId = useMemo(() => {
    const inLeague = memberships.filter((m) => (m?.leagueId || "").trim() === (leagueId || "").trim());
    const coach = inLeague.find((m) => normalizeRole(m?.role) === "Coach");
    return (coach?.teamId || coach?.team?.teamId || "").trim();
  }, [memberships, leagueId]);

  const [divisions, setDivisions] = useState([]);
  const [division, setDivision] = useState("");
  const [fields, setFields] = useState([]);

  const today = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState(toDateInputValue(today));
  const [dateTo, setDateTo] = useState(toDateInputValue(new Date(today.getTime() + 1000 * 60 * 60 * 24 * 30)));
  const [showCancelled, setShowCancelled] = useState(false);

  const [events, setEvents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  const subscribeUrl = useMemo(() => buildSubscribeUrl(leagueId), [leagueId]);
  const webcalUrl = useMemo(() => toWebcalUrl(subscribeUrl), [subscribeUrl]);

  async function copySubscribeUrl() {
    if (!subscribeUrl) return;
    try {
      await navigator.clipboard.writeText(subscribeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function loadMeta() {
    const [divs, flds] = await Promise.all([apiFetch("/api/divisions"), apiFetch("/api/fields")]);
    setDivisions(Array.isArray(divs) ? divs : []);
    setFields(Array.isArray(flds) ? flds : []);
  }

  async function loadData() {
    setErr("");
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (division) q.set("division", division);
      if (dateFrom) q.set("dateFrom", dateFrom);
      if (dateTo) q.set("dateTo", dateTo);

      // Slots default to Open + Confirmed. Cancelled is fetched only when explicitly requested.
      const qCancelled = new URLSearchParams(q);
      qCancelled.set("status", "Cancelled");

      const [ev, sl, slCancelled] = await Promise.all([
        apiFetch(`/api/events?${q.toString()}`),
        apiFetch(`/api/slots?${q.toString()}`),
        showCancelled ? apiFetch(`/api/slots?${qCancelled.toString()}`) : Promise.resolve([]),
      ]);
      setEvents(Array.isArray(ev) ? ev : []);
      const base = Array.isArray(sl) ? sl : [];
      const canc = Array.isArray(slCancelled) ? slCancelled : [];
      setSlots(showCancelled ? [...base, ...canc] : base);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await loadMeta();
      } catch {
        // ignore
      }
      await loadData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  const timeline = useMemo(() => {
    const items = [];

    for (const e of events || []) {
      items.push({
        kind: "event",
        id: e.eventId,
        date: e.eventDate,
        start: e.startTime || "",
        end: e.endTime || "",
        title: `${e.type ? `${e.type}: ` : ""}${e.title || "(Untitled event)"}`,
        subtitle: [e.status ? `Status: ${e.status}` : "", e.opponentTeamId ? `Opponent: ${e.opponentTeamId}` : "", e.location, e.division ? `Division: ${e.division}` : "", e.teamId ? `Team: ${e.teamId}` : ""]
          .filter(Boolean)
          .join(" • "),
        raw: e,
      });
    }

    for (const s of slots || []) {
      const label = `${s.offeringTeamId || ""} @ ${s.displayName || `${s.parkName || ""} ${s.fieldName || ""}`}`.trim();
      items.push({
        kind: "slot",
        id: s.slotId,
        date: s.gameDate,
        start: s.startTime || "",
        end: s.endTime || "",
        title: label ? `Slot: ${label}` : `Slot: ${s.slotId}`,
        subtitle: [
          s.division ? `Division: ${s.division}` : "",
          s.status ? `Status: ${s.status}` : "",
          s.confirmedTeamId ? `Confirmed: ${s.confirmedTeamId}` : "",
        ]
          .filter(Boolean)
          .join(" • "),
        raw: s,
      });
    }

    return items
      .filter((x) => x.date)
      .sort((a, b) => {
        const ad = `${a.date}T${a.start || "00:00"}`;
        const bd = `${b.date}T${b.start || "00:00"}`;
        return ad.localeCompare(bd) || a.kind.localeCompare(b.kind) || (a.title || "").localeCompare(b.title || "");
      });
  }, [events, slots]);

  const fieldByKey = useMemo(() => {
    const m = new Map();
    for (const f of fields || []) {
      const k = f?.fieldKey || "";
      if (k) m.set(k, f);
    }
    return m;
  }, [fields]);

  // --- Create events ---
  // Events are non-game calendar items managed by LeagueAdmin.
  // Game requests/offers live under Slots.
  const canCreateEvents = role === "LeagueAdmin";
  const canDeleteAnyEvent = role === "LeagueAdmin";
  const canCreateSlots = role === "Coach" || role === "LeagueAdmin" || isGlobalAdmin;

  const [createKind, setCreateKind] = useState(canCreateEvents ? "offer" : "offer");

  const [newType, setNewType] = useState("Practice");
  const [newDivision, setNewDivision] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const [offerDivision, setOfferDivision] = useState("");
  const [offeringTeamId, setOfferingTeamId] = useState("");
  const [offerDate, setOfferDate] = useState("");
  const [offerStart, setOfferStart] = useState("");
  const [offerEnd, setOfferEnd] = useState("");
  const [offerFieldKey, setOfferFieldKey] = useState("");
  const [offerNotes, setOfferNotes] = useState("");

  useEffect(() => {
    if (!canCreateEvents && createKind === "event") {
      setCreateKind("offer");
    }
  }, [canCreateEvents, createKind]);

  useEffect(() => {
    if (!offerDivision) {
      if (division) {
        setOfferDivision(division);
      } else if (divisions[0]?.code) {
        setOfferDivision(divisions[0].code);
      }
    }
  }, [division, divisions, offerDivision]);

  async function createSlot() {
    setErr("");
    const f = fieldByKey.get(offerFieldKey);
    if (!offerDivision) return setErr("Select a division first.");
    if (!offeringTeamId.trim()) return setErr("Offering Team ID is required.");
    if (!offerDate.trim()) return setErr("GameDate is required.");
    if (!offerStart.trim() || !offerEnd.trim()) return setErr("StartTime/EndTime are required.");
    if (offerStart.trim() >= offerEnd.trim()) return setErr("EndTime must be after StartTime.");
    if (!f) return setErr("Select a field.");

    try {
      await apiFetch(`/api/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          division: offerDivision,
          offeringTeamId: offeringTeamId.trim(),
          gameDate: offerDate.trim(),
          startTime: offerStart.trim(),
          endTime: offerEnd.trim(),
          parkName: f.parkName,
          fieldName: f.fieldName,
          displayName: f.displayName,
          fieldKey: f.fieldKey,
          notes: offerNotes.trim(),
        }),
      });
      setOfferingTeamId("");
      setOfferDate("");
      setOfferStart("");
      setOfferEnd("");
      setOfferFieldKey("");
      setOfferNotes("");
      await loadData();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  async function createEvent() {
    setErr("");
    if (!newTitle.trim()) return setErr("Title is required.");
    if (!newDate.trim()) return setErr("EventDate is required (YYYY-MM-DD).");
    if (!newStart.trim()) return setErr("StartTime is required (HH:MM).");
    if (!newEnd.trim()) return setErr("EndTime is required (HH:MM).");
    if (newStart.trim() >= newEnd.trim()) return setErr("EndTime must be after StartTime.");

    try {
      await apiFetch(`/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType.trim(),
          division: newDivision.trim(),
          teamId: newTeamId.trim(),
          title: newTitle.trim(),
          eventDate: newDate.trim(),
          startTime: newStart.trim(),
          endTime: newEnd.trim(),
          location: newLocation.trim(),
          notes: newNotes.trim(),
        }),
      });

      setNewType("Practice");
      setNewDivision("");
      setNewTeamId("");
      setNewTitle("");
      setNewDate("");
      setNewStart("");
      setNewEnd("");
      setNewLocation("");
      setNewNotes("");
      await loadData();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  async function deleteEvent(eventId) {
    if (!eventId) return;
    const ok = confirm("Delete this event?");
    if (!ok) return;
    setErr("");
    try {
      await apiFetch(`/api/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
      await loadData();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }


  async function requestSlot(slot) {
    if (!slot?.slotId || !slot?.division) return;
    const notes = prompt("Optional notes for the offering coach:") || "";
    setErr("");
    try {
      await apiFetch(`/api/slots/${encodeURIComponent(slot.division)}/${encodeURIComponent(slot.slotId)}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: String(notes || "").trim() }),
      });
      await loadData();
      alert("Accepted. The game is now scheduled on the calendar.");
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  async function cancelSlot(slot) {
    if (!slot?.slotId || !slot?.division) return;
    const ok = confirm("Cancel this game/slot?");
    if (!ok) return;
    setErr("");
    try {
      await apiFetch(`/api/slots/${encodeURIComponent(slot.division)}/${encodeURIComponent(slot.slotId)}/cancel`, {
        method: "PATCH",
      });
      await loadData();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  function canCancelSlot(slot) {
    if (!slot) return false;
    if (isGlobalAdmin) return true;
    if (role === "LeagueAdmin") return true;
    if (role !== "Coach") return false;
    const my = (myCoachTeamId || "").trim();
    if (!my) return false;
    const offering = (slot.offeringTeamId || "").trim();
    const confirmed = (slot.confirmedTeamId || "").trim();
    if (slot.status === "Open") return my && offering && my === offering;
    if (slot.status === "Confirmed") return my === offering || (confirmed && my === confirmed);
    return false;
  }
  if (loading) return <div className="card">Loading…</div>;

  return (
    <div className="stack">
      {err ? <div className="card error">{err}</div> : null}

      <div className="card">
        <div className="cardTitle">Calendar</div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <label>
            Division
            <select value={division} onChange={(e) => setDivision(e.target.value)}>
              <option value="">All</option>
              {divisions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
            Show cancelled
          </label>
          <button className="btn" onClick={loadData} disabled={loading}>
            Refresh
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Showing slots + events for <b>{leagueId || "(no league)"}</b>.
        </div>
        <div className="stack" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600 }}>Subscribe to this calendar</div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <input
              readOnly
              value={subscribeUrl || "Select a league to enable subscriptions."}
              style={{ minWidth: 280, flex: "1 1 320px" }}
            />
            <button className="btn" onClick={copySubscribeUrl} disabled={!subscribeUrl}>
              {copied ? "Copied" : "Copy URL"}
            </button>
            <a
              className="btn"
              href={webcalUrl || "#"}
              aria-disabled={!webcalUrl}
              onClick={(event) => {
                if (!webcalUrl) event.preventDefault();
              }}
            >
              Subscribe
            </a>
          </div>
          <div className="muted">
            Use the Subscribe button to open your calendar app, or copy the URL for manual setup.
          </div>
        </div>
      </div>

      {canCreateSlots || canCreateEvents ? (
        <div className="card">
          <div className="cardTitle">Create</div>
          {canCreateEvents ? (
            <div className="row" style={{ flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="createKind"
                  value="offer"
                  checked={createKind === "offer"}
                  onChange={() => setCreateKind("offer")}
                />
                Offer a game slot
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="createKind"
                  value="event"
                  checked={createKind === "event"}
                  onChange={() => setCreateKind("event")}
                />
                Create an event
              </label>
            </div>
          ) : null}

          {createKind === "offer" ? (
            <>
              <div className="grid2">
                <label>
                  Division
                  <select value={offerDivision} onChange={(e) => setOfferDivision(e.target.value)}>
                    <option value="">Select…</option>
                    {divisions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Offering Team ID
                  <input value={offeringTeamId} onChange={(e) => setOfferingTeamId(e.target.value)} />
                </label>
                <label>
                  Field
                  <select value={offerFieldKey} onChange={(e) => setOfferFieldKey(e.target.value)}>
                    <option value="">Select…</option>
                    {fields.map((f) => (
                      <option key={f.fieldKey} value={f.fieldKey}>
                        {f.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  GameDate (YYYY-MM-DD)
                  <input
                    type="date"
                    value={offerDate}
                    onChange={(e) => setOfferDate(e.target.value)}
                    placeholder="2026-03-29"
                  />
                </label>
                <label>
                  StartTime (HH:MM)
                  <input
                    type="time"
                    value={offerStart}
                    onChange={(e) => setOfferStart(e.target.value)}
                    placeholder="09:00"
                  />
                </label>
                <label>
                  EndTime (HH:MM)
                  <input
                    type="time"
                    value={offerEnd}
                    onChange={(e) => setOfferEnd(e.target.value)}
                    placeholder="10:15"
                  />
                </label>
                <label>
                  Notes
                  <input value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} />
                </label>
              </div>
              <div className="row">
                <button className="btn primary" onClick={createSlot} disabled={loading}>
                  Create Offer
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid2">
                <label>
                  Type
                  <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                    <option value="Practice">Practice</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Clinic">Clinic</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>
                  Title
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                </label>
                <label>
                  Location
                  <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} />
                </label>
                <label>
                  EventDate (YYYY-MM-DD)
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="2026-04-05"
                  />
                </label>
                <label>
                  StartTime (HH:MM)
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    placeholder="18:00"
                  />
                </label>
                <label>
                  EndTime (HH:MM)
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    placeholder="19:30"
                  />
                </label>
                <label>
                  Notes
                  <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
                </label>
                <label>
                  Division (optional)
                  <input value={newDivision} onChange={(e) => setNewDivision(e.target.value)} placeholder="10U" />
                </label>
                <label>
                  Team ID (optional)
                  <input value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)} placeholder="TIGERS" />
                </label>
              </div>
              <div className="row">
                <button className="btn primary" onClick={createEvent} disabled={loading}>
                  Create Event
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      <div className="card">
        <div className="cardTitle">Upcoming</div>
        {timeline.length === 0 ? <div className="muted">No items in this range.</div> : null}
        <div className="stack">
          {timeline.map((it) => (
            <div key={`${it.kind}:${it.id}`} className="card" style={{ margin: 0 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {it.date} {it.start ? `${it.start}${it.end ? `–${it.end}` : ""}` : ""} — {it.title}
                  </div>
                  {it.subtitle ? <div className="muted">{it.subtitle}</div> : null}
                  {it.kind === "event" && it.raw?.notes ? <div style={{ marginTop: 6 }}>{it.raw.notes}</div> : null}
                </div>
                <div className="row">
                  {it.kind === "slot" && role !== "Viewer" && (it.raw?.status || "") === "Open" && (it.raw?.offeringTeamId || "") !== myCoachTeamId ? (
                    <button className="btn primary" onClick={() => requestSlot(it.raw)}>
                      Accept
                    </button>
                  ) : null}
                  {it.kind === "slot" && canCancelSlot(it.raw) && (it.raw?.status || "") !== "Cancelled" ? (
                    <button className="btn" onClick={() => cancelSlot(it.raw)}>
                      Cancel
                    </button>
                  ) : null}
                  {it.kind === "event" && canDeleteAnyEvent ? (
                    <button className="btn" onClick={() => deleteEvent(it.id)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
