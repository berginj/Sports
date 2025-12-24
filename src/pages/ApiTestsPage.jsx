import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

const endpointGroups = [
  {
    title: "Health",
    endpoints: [
      {
        id: "ping",
        method: "GET",
        path: "/api/ping",
        description: "Health check for the API.",
      },
    ],
  },
  {
    title: "Onboarding",
    endpoints: [
      {
        id: "me",
        method: "GET",
        path: "/api/me",
        description: "Returns identity and memberships.",
      },
    ],
  },
  {
    title: "Leagues",
    endpoints: [
      {
        id: "leagues-list",
        method: "GET",
        path: "/api/leagues",
        description: "List leagues for current user.",
      },
      {
        id: "league-get",
        method: "GET",
        path: "/api/league",
        description: "Get current league details.",
        requiresLeague: true,
      },
      {
        id: "league-patch",
        method: "PATCH",
        path: "/api/league",
        description: "Update current league details (LeagueAdmin).",
        requiresLeague: true,
        body: JSON.stringify(
          {
            name: "Arlington",
            timezone: "America/New_York",
            contact: { name: "Pat Coach", email: "pat@example.com", phone: "555-1212" },
            status: "Active",
          },
          null,
          2,
        ),
      },
      {
        id: "admin-leagues",
        method: "GET",
        path: "/api/admin/leagues",
        description: "Global admin list of leagues.",
      },
      {
        id: "admin-leagues-create",
        method: "POST",
        path: "/api/admin/leagues",
        description: "Global admin create league.",
        body: JSON.stringify(
          { leagueId: "ARL", name: "Arlington", timezone: "America/New_York" },
          null,
          2,
        ),
      },
    ],
  },
  {
    title: "Global admins",
    endpoints: [
      {
        id: "globaladmins-list",
        method: "GET",
        path: "/api/admin/globaladmins",
        description: "List global admins.",
      },
      {
        id: "globaladmins-add",
        method: "POST",
        path: "/api/admin/globaladmins",
        description: "Add a global admin.",
        body: JSON.stringify({ userId: "USER_ID" }, null, 2),
      },
      {
        id: "globaladmins-remove",
        method: "DELETE",
        path: "/api/admin/globaladmins/{userId}",
        description: "Remove global admin by userId.",
        pathParams: { userId: "USER_ID" },
      },
    ],
  },
  {
    title: "Access requests",
    endpoints: [
      {
        id: "accessrequests-create",
        method: "POST",
        path: "/api/accessrequests",
        description: "Create access request for selected league.",
        requiresLeague: true,
        body: JSON.stringify({ requestedRole: "Coach", notes: "I coach the Tigers" }, null, 2),
      },
      {
        id: "accessrequests-mine",
        method: "GET",
        path: "/api/accessrequests/mine",
        description: "Current user's access requests.",
      },
      {
        id: "accessrequests-admin",
        method: "GET",
        path: "/api/accessrequests",
        description: "League access requests (LeagueAdmin).",
        requiresLeague: true,
        queryDefaults: { status: "Pending" },
      },
      {
        id: "accessrequests-approve",
        method: "PATCH",
        path: "/api/accessrequests/{userId}/approve",
        description: "Approve access request (LeagueAdmin).",
        requiresLeague: true,
        pathParams: { userId: "USER_ID" },
        body: JSON.stringify(
          { role: "Coach", team: { division: "10U", teamId: "TIGERS" } },
          null,
          2,
        ),
      },
      {
        id: "accessrequests-deny",
        method: "PATCH",
        path: "/api/accessrequests/{userId}/deny",
        description: "Deny access request (LeagueAdmin).",
        requiresLeague: true,
        pathParams: { userId: "USER_ID" },
        body: JSON.stringify({ reason: "Not a coach" }, null, 2),
      },
    ],
  },
  {
    title: "Invites",
    endpoints: [
      {
        id: "invites-create",
        method: "POST",
        path: "/api/admin/invites",
        description: "Create invite (LeagueAdmin).",
        requiresLeague: true,
        body: JSON.stringify(
          {
            email: "coach@example.com",
            role: "Coach",
            team: { division: "10U", teamId: "TIGERS" },
          },
          null,
          2,
        ),
      },
      {
        id: "invites-accept",
        method: "POST",
        path: "/api/invites/accept",
        description: "Accept invite by token or code.",
        body: JSON.stringify({ token: "INVITE_TOKEN" }, null, 2),
      },
    ],
  },
  {
    title: "Memberships",
    endpoints: [
      {
        id: "memberships-list",
        method: "GET",
        path: "/api/memberships",
        description: "List memberships (LeagueAdmin).",
        requiresLeague: true,
      },
      {
        id: "memberships-update",
        method: "PATCH",
        path: "/api/memberships/{userId}",
        description: "Update membership (LeagueAdmin).",
        requiresLeague: true,
        pathParams: { userId: "USER_ID" },
        body: JSON.stringify(
          { team: { division: "10U", teamId: "TIGERS" } },
          null,
          2,
        ),
      },
    ],
  },
  {
    title: "Divisions",
    endpoints: [
      {
        id: "divisions-list",
        method: "GET",
        path: "/api/divisions",
        description: "List divisions.",
        requiresLeague: true,
      },
      {
        id: "divisions-create",
        method: "POST",
        path: "/api/divisions",
        description: "Create division (LeagueAdmin).",
        requiresLeague: true,
        body: JSON.stringify({ code: "10U", name: "10U" }, null, 2),
      },
      {
        id: "divisions-update",
        method: "PATCH",
        path: "/api/divisions/{code}",
        description: "Update division (LeagueAdmin).",
        requiresLeague: true,
        pathParams: { code: "10U" },
        body: JSON.stringify({ name: "10U Boys" }, null, 2),
      },
      {
        id: "division-templates-list",
        method: "GET",
        path: "/api/divisions/templates",
        description: "List division templates.",
        requiresLeague: true,
      },
      {
        id: "division-templates-update",
        method: "PATCH",
        path: "/api/divisions/templates",
        description: "Update division templates (LeagueAdmin).",
        requiresLeague: true,
        body: JSON.stringify(
          [
            { code: "10U", label: "10U" },
            { code: "12U", label: "12U" },
          ],
          null,
          2,
        ),
      },
    ],
  },
  {
    title: "Teams",
    endpoints: [
      {
        id: "teams-list",
        method: "GET",
        path: "/api/teams",
        description: "List teams.",
        requiresLeague: true,
        queryDefaults: { division: "" },
      },
      {
        id: "teams-create",
        method: "POST",
        path: "/api/teams",
        description: "Create team (LeagueAdmin).",
        requiresLeague: true,
        body: JSON.stringify(
          {
            division: "10U",
            teamId: "TIGERS",
            name: "Tigers",
            primaryContact: { name: "Pat Coach", email: "pat@example.com", phone: "555-1212" },
          },
          null,
          2,
        ),
      },
      {
        id: "teams-update",
        method: "PATCH",
        path: "/api/teams/{division}/{teamId}",
        description: "Update team (LeagueAdmin).",
        requiresLeague: true,
        pathParams: { division: "10U", teamId: "TIGERS" },
        body: JSON.stringify(
          {
            name: "Tigers",
            primaryContact: { name: "Pat Coach", email: "pat@example.com", phone: "555-1212" },
          },
          null,
          2,
        ),
      },
      {
        id: "teams-delete",
        method: "DELETE",
        path: "/api/teams/{division}/{teamId}",
        description: "Delete team (LeagueAdmin).",
        requiresLeague: true,
        pathParams: { division: "10U", teamId: "TIGERS" },
      },
    ],
  },
  {
    title: "Fields & imports",
    endpoints: [
      {
        id: "fields-list",
        method: "GET",
        path: "/api/fields",
        description: "List fields.",
        requiresLeague: true,
        queryDefaults: { activeOnly: "true" },
      },
      {
        id: "fields-import",
        method: "POST",
        path: "/api/import/fields",
        description: "CSV field import (LeagueAdmin).",
        requiresLeague: true,
        bodyType: "csv",
        csvBody: "fieldKey,parkName,fieldName,displayName,status\n" +
          "gunston/turf,Gunston Park,Turf,Gunston Park > Turf,Active",
      },
      {
        id: "slots-import",
        method: "POST",
        path: "/api/import/slots",
        description: "CSV slot import (LeagueAdmin).",
        requiresLeague: true,
        bodyType: "csv",
        csvBody: "division,offeringTeamId,gameDate,startTime,endTime,fieldKey,notes\n" +
          "10U,TIGERS,2026-04-10,18:00,20:00,gunston/turf,Imported slot",
      },
    ],
  },
  {
    title: "Slots",
    endpoints: [
      {
        id: "slots-list",
        method: "GET",
        path: "/api/slots",
        description: "List slots.",
        requiresLeague: true,
        queryDefaults: {
          division: "",
          status: "",
          dateFrom: "",
          dateTo: "",
        },
      },
      {
        id: "slots-create",
        method: "POST",
        path: "/api/slots",
        description: "Create slot (LeagueAdmin or Coach).",
        requiresLeague: true,
        body: JSON.stringify(
          {
            division: "10U",
            offeringTeamId: "TIGERS",
            gameDate: "2026-04-10",
            startTime: "18:00",
            endTime: "20:00",
            fieldKey: "gunston/turf",
            notes: "Open game offer",
          },
          null,
          2,
        ),
      },
      {
        id: "slot-cancel",
        method: "PATCH",
        path: "/api/slots/{division}/{slotId}/cancel",
        description: "Cancel slot (LeagueAdmin or offering coach).",
        requiresLeague: true,
        pathParams: { division: "10U", slotId: "SLOT_ID" },
      },
      {
        id: "slot-requests-list",
        method: "GET",
        path: "/api/slots/{division}/{slotId}/requests",
        description: "List requests for slot.",
        requiresLeague: true,
        pathParams: { division: "10U", slotId: "SLOT_ID" },
      },
      {
        id: "slot-requests-create",
        method: "POST",
        path: "/api/slots/{division}/{slotId}/requests",
        description: "Request slot (Coach).",
        requiresLeague: true,
        pathParams: { division: "10U", slotId: "SLOT_ID" },
        body: JSON.stringify({ notes: "We can play!" }, null, 2),
      },
      {
        id: "slot-requests-approve",
        method: "PATCH",
        path: "/api/slots/{division}/{slotId}/requests/{requestId}/approve",
        description: "Approve slot request (Coach).",
        requiresLeague: true,
        pathParams: { division: "10U", slotId: "SLOT_ID", requestId: "REQUEST_ID" },
      },
    ],
  },
  {
    title: "Events",
    endpoints: [
      {
        id: "events-list",
        method: "GET",
        path: "/api/events",
        description: "List events.",
        requiresLeague: true,
      },
      {
        id: "events-create",
        method: "POST",
        path: "/api/events",
        description: "Create event (LeagueAdmin).",
        requiresLeague: true,
        body: JSON.stringify(
          {
            division: "10U",
            eventDate: "2026-04-12",
            startTime: "17:00",
            endTime: "19:00",
            fieldKey: "gunston/turf",
            title: "Practice",
            notes: "Bring pinnies",
          },
          null,
          2,
        ),
      },
      {
        id: "events-update",
        method: "PATCH",
        path: "/api/events/{eventId}",
        description: "Update event (LeagueAdmin).",
        requiresLeague: true,
        pathParams: { eventId: "EVENT_ID" },
        body: JSON.stringify({ title: "Updated title", notes: "Updated notes" }, null, 2),
      },
      {
        id: "events-delete",
        method: "DELETE",
        path: "/api/events/{eventId}",
        description: "Delete event (LeagueAdmin).",
        requiresLeague: true,
        pathParams: { eventId: "EVENT_ID" },
      },
    ],
  },
];

const METHOD_COLORS = {
  GET: "method method--get",
  POST: "method method--post",
  PATCH: "method method--patch",
  DELETE: "method method--delete",
};

function extractPathParams(path) {
  const matches = path.match(/\{([^}]+)\}/g) || [];
  return matches.map((match) => match.replace(/[{}]/g, ""));
}

function buildPath(path, values) {
  return path.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(values?.[key] || ""));
}

function buildQueryString(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values || {})) {
    if (value === undefined || value === null) continue;
    if (String(value).trim() === "") continue;
    params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function ApiEndpointCard({ endpoint }) {
  const paramNames = useMemo(
    () => endpoint.pathParams ? Object.keys(endpoint.pathParams) : extractPathParams(endpoint.path),
    [endpoint.path, endpoint.pathParams],
  );
  const [pathValues, setPathValues] = useState(() => {
    const initial = {};
    for (const name of paramNames) {
      initial[name] = endpoint.pathParams?.[name] || "";
    }
    return initial;
  });
  const [queryValues, setQueryValues] = useState(() => ({ ...endpoint.queryDefaults }));
  const [bodyText, setBodyText] = useState(endpoint.body || "");
  const [csvText, setCsvText] = useState(endpoint.csvBody || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState(null);

  const resolvedPath = useMemo(() => buildPath(endpoint.path, pathValues), [endpoint.path, pathValues]);
  const fullPath = useMemo(() => `${resolvedPath}${buildQueryString(queryValues)}`, [resolvedPath, queryValues]);

  function updatePathValue(key, value) {
    setPathValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateQueryValue(key, value) {
    setQueryValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSend() {
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const options = { method: endpoint.method };
      if (endpoint.bodyType === "csv") {
        options.body = csvText;
        options.headers = { "Content-Type": "text/csv" };
      } else if (!["GET", "HEAD"].includes(endpoint.method)) {
        if (bodyText.trim()) {
          let parsed;
          try {
            parsed = JSON.parse(bodyText);
          } catch (err) {
            throw new Error("Body must be valid JSON before sending.");
          }
          options.body = JSON.stringify(parsed);
          options.headers = { "Content-Type": "application/json" };
        }
      }

      const data = await apiFetch(fullPath, options);
      setResponse(data ?? null);
    } catch (err) {
      setError(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card apiCard">
      <div className="apiCard__header">
        <div>
          <div className="apiCard__title">
            <span className={METHOD_COLORS[endpoint.method] || "method"}>{endpoint.method}</span>
            <span className="apiCard__path">{endpoint.path}</span>
          </div>
          <div className="muted">{endpoint.description}</div>
        </div>
        <div className="apiCard__meta">
          {endpoint.requiresLeague ? <span className="pill">x-league-id required</span> : null}
        </div>
      </div>

      <div className="apiCard__grid">
        <div>
          {paramNames.length > 0 ? (
            <div className="apiCard__section">
              <div className="apiCard__label">Path parameters</div>
              <div className="apiCard__fields">
                {paramNames.map((name) => (
                  <label key={name}>
                    {name}
                    <input
                      value={pathValues[name] || ""}
                      onChange={(e) => updatePathValue(name, e.target.value)}
                      placeholder={name}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {endpoint.queryDefaults ? (
            <div className="apiCard__section">
              <div className="apiCard__label">Query parameters</div>
              <div className="apiCard__fields">
                {Object.keys(endpoint.queryDefaults).map((name) => (
                  <label key={name}>
                    {name}
                    <input
                      value={queryValues[name] ?? ""}
                      onChange={(e) => updateQueryValue(name, e.target.value)}
                      placeholder={name}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {endpoint.bodyType === "csv" ? (
            <div className="apiCard__section">
              <div className="apiCard__label">CSV body</div>
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} />
            </div>
          ) : endpoint.body || !["GET", "HEAD", "DELETE"].includes(endpoint.method) ? (
            <div className="apiCard__section">
              <div className="apiCard__label">JSON body</div>
              <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
            </div>
          ) : null}

          <div className="apiCard__section">
            <div className="apiCard__label">Resolved request</div>
            <div className="apiCard__request">
              <code>{endpoint.method}</code>
              <code>{fullPath}</code>
            </div>
          </div>

          <div className="apiCard__actions">
            <button className="primary" onClick={handleSend} disabled={loading}>
              {loading ? "Sending…" : "Send request"}
            </button>
          </div>
        </div>

        <div>
          <div className="apiCard__section">
            <div className="apiCard__label">Response</div>
            {error ? (
              <pre className="apiCard__response apiCard__response--error">{error}</pre>
            ) : response ? (
              <pre className="apiCard__response">
                {typeof response === "string" ? response : JSON.stringify(response, null, 2)}
              </pre>
            ) : (
              <pre className="apiCard__response muted">No response yet.</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApiTestsPage({ leagueId }) {
  return (
    <div className="apiPage">
      <div className="card apiHeader">
        <h2>API test lab</h2>
        <p className="muted">
          Use this workspace to exercise every GameSwap API endpoint from a single page.
          It uses the selected league id for league-scoped requests.
        </p>
        <div className="apiHeader__meta">
          <span className="pill">Active league: {leagueId || "None selected"}</span>
          <span className="pill">Base path: /api</span>
        </div>
      </div>

      {endpointGroups.map((group) => (
        <section className="apiGroup" key={group.title}>
          <h3>{group.title}</h3>
          <div className="apiGroup__grid">
            {group.endpoints.map((endpoint) => (
              <ApiEndpointCard endpoint={endpoint} key={endpoint.id} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
