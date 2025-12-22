export default function HelpPage() {
  return (
    <div className="stack">
      <section className="card">
        <div className="h2">Help</div>
        <p className="muted">
          This portal talks to Azure Functions via <code>/api</code>. Most endpoints are league-scoped and require
          <code> x-league-id</code>.
        </p>
      </section>

      <section className="card">
        <div className="h3">1) First-time setup</div>
        <ol className="list">
          <li>
            Enable App Service / Static Web Apps auth (EasyAuth). Until then, local/dev can pass{" "}
            <code>x-user-id</code> and <code>x-user-email</code> headers.
          </li>
          <li>
            Add your membership row in <code>GameSwapMemberships</code> (PartitionKey = UserId, RowKey = LeagueId,
            Role = Admin).
          </li>
          <li>
            Pick your league in the top bar (it’s stored in your browser).
          </li>
        </ol>
      </section>

      <section className="card">
        <div className="h3">2) Normalized data model</div>
        <ul className="list">
          <li><b>Fields</b> live in table <code>Fields</code> under PK <code>FIELD#&lt;leagueId&gt;#&lt;parkCode&gt;</code>.</li>
          <li><b>Slots</b> live in <code>GameSwapSlots</code> under PK <code>SLOT#&lt;leagueId&gt;#&lt;division&gt;</code>.</li>
          <li><b>Requests</b> live in <code>GameSwapSlotRequests</code> under PK <code>SLOTREQ#&lt;leagueId&gt;#&lt;division&gt;#&lt;slotId&gt;</code>.</li>
          <li>Legacy “Fields” partitions and leagueId-in-route patterns were removed intentionally.</li>
        </ul>
      </section>

      <section className="card">
        <div className="h3">3) Import workflow</div>
        <ol className="list">
          <li>Import fields first (Manage → Import Fields).</li>
          <li>Then import slots (Manage → Import Slots). Slots validate that the Park+Field exists and is active.</li>
          <li>Use ISO-ish dates/times: <code>YYYY-MM-DD</code> and <code>HH:mm</code>.</li>
        </ol>
      </section>

      <section className="card">
        <div className="h3">4) Swap workflow</div>
        <ul className="list">
          <li>Create a slot (Offers → Create slot).</li>
          <li>Any member can submit a request for that slot.</li>
          <li>Any member can approve a request (this can be tightened later).</li>
          <li>Cancelled and Confirmed slots are terminal.</li>
        </ul>
      </section>

      <section className="card">
        <div className="h3">Troubleshooting</div>
        <ul className="list">
          <li><b>401/403</b>: your membership row is missing or leagueId is wrong.</li>
          <li><b>400 “Missing leagueId”</b>: you’re calling a league-scoped endpoint without <code>x-league-id</code>.</li>
          <li><b>“Field does not exist” on slot import</b>: import fields first, and make sure names match exactly.</li>
          <li><b>UNKNOWN user</b>: EasyAuth isn’t providing principal claims; use dev headers temporarily.</li>
        </ul>
      </section>
    </div>
  );
}
