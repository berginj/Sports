import { useMemo } from "react";

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card__header">
        <div className="h2">{title}</div>
      </div>
      <div className="card__body">{children}</div>
    </div>
  );
}

export default function HelpPage({ me, leagueId }) {
  const memberships = useMemo(() => me?.memberships || [], [me]);

  return (
    <div className="container">
      <div className="h1" style={{ marginBottom: 6 }}>
        Help
      </div>
      <div className="muted" style={{ marginBottom: 14 }}>
        This portal is intentionally simple: pick a league, pick a division, and use the Offer/Request workflow.
      </div>

      <Section title="1) League selection">
        <p>
          Use the league dropdown in the top bar. The selection persists in your browser and is sent to the API
          as <code>x-league-id</code> on every request.
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          Current league: <code>{leagueId || "(none selected)"}</code>
        </p>
      </Section>

      <Section title="2) Access control (request → approve → membership)">
        <p>
          Most endpoints require a membership row in the selected league. If you don’t have a league yet, use
          the Access page to request it; a global admin approves your request.
        </p>
        <div className="grid-2">
          <div className="card" style={{ background: "rgba(255,255,255,0.03)", borderColor: "transparent" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>What you should see</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>A non-empty membership list</li>
              <li>Slots for divisions you query</li>
              <li>Ability to post slots and submit requests</li>
            </ul>
          </div>
          <div className="card" style={{ background: "rgba(255,255,255,0.03)", borderColor: "transparent" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>If you see “Forbidden”</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Your membership row is missing or points to a different leagueId</li>
              <li>You selected a leagueId you don’t belong to</li>
              <li>Your auth headers aren’t present (common in local dev)</li>
            </ul>
          </div>
        </div>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer" }}>Show my memberships (from /api/me)</summary>
          <pre style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(memberships, null, 2)}
          </pre>
        </details>
      </Section>

      <Section title="3) Requesting access">
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>Sign in (Azure AD) via the login link.</li>
          <li>Go to the Access page and pick the league you want.</li>
          <li>Select the role you want and submit.</li>
          <li>A global admin approves it; refresh the page and pick your league in the dropdown.</li>
        </ol>
      </Section>

      <Section title="4) Offer → Request → Approve workflow">
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <b>Offer</b>: a team posts an open slot (date/time/field).
          </li>
          <li>
            <b>Request</b>: another team requests that slot with a message.
          </li>
          <li>
            <b>Approve</b>: an approver chooses one request; the slot becomes Confirmed; other requests become Rejected.
          </li>
          <li>
            <b>Cancel</b>: a slot can be cancelled; cancelled slots can’t be requested.
          </li>
        </ol>
        <p className="muted" style={{ marginBottom: 0 }}>
          The UI will show request buttons on each slot and a request list you can expand.
        </p>
      </Section>

      <Section title="5) Fields and normalization">
        <p>
          Fields are normalized around <code>ParkName</code> + <code>FieldName</code> (and optional <code>DisplayName</code>).
          Avoid feeding the system free-form field strings when possible.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          In Manage → Fields you can bulk upsert fields. Slots should reference fields consistently.
        </p>
      </Section>

      <Section title="6) Quick troubleshooting">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <b>Session error 404</b>: the Functions API isn’t reachable at <code>/api</code> from the Static Web App.
            Confirm your SWA is linked to the Functions app and the Functions app is deployed.
          </li>
          <li>
            <b>DNS_PROBE_FINISHED_NXDOMAIN</b>: you’re hitting a host that doesn’t exist (copy/paste typo or a deleted app).
          </li>
          <li>
            <b>“You do not have permission…”</b> on the Functions root URL is normal. Functions endpoints live under <code>/api/*</code>.
          </li>
        </ul>
      </Section>
    </div>
  );
}
