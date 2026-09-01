# YouTrack setup (admin, once per instance)

The app runs entirely in the browser, so YouTrack must (1) accept cross-origin
requests from the app and (2) know the app as an OAuth client.

## 1. Allow the app origin (CORS)

Administration → Global Settings → Resource Sharing → **Allowed origins**. Add one
origin per line:

    https://xelon-ua.github.io
    http://localhost:5173

Or via REST with an admin token:

    curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      "$YT/api/admin/globalSettings/restSettings" \
      -d '{"allowedOrigins":["https://xelon-ua.github.io","http://localhost:5173"]}'

Without this every request fails with "Could not reach YouTrack".

## 2. Register the OAuth client (Hub service)

Administration → Access Management → Services → **New service**:

| Field | Value |
|---|---|
| Name | Epic Roadmap |
| Home URL | `https://xelon-ua.github.io/youtrack-epic-roadmap/` |
| Redirect URIs | `https://xelon-ua.github.io/youtrack-epic-roadmap/` and `http://localhost:5173/youtrack-epic-roadmap/` |
| Trusted | off (users consent on first sign-in) |

Or via REST:

    curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      "$YT/hub/api/rest/services?fields=id,name" \
      -d '{"name":"Epic Roadmap","applicationName":"YouTrack Epic Roadmap","vendor":"xelon-ua",
           "homeUrl":"https://xelon-ua.github.io/youtrack-epic-roadmap/",
           "redirectUris":["https://xelon-ua.github.io/youtrack-epic-roadmap/","http://localhost:5173/youtrack-epic-roadmap/"],
           "trusted":false}'

Copy the service **ID**: users paste it as *OAuth client ID* in the app's Settings.
No client secret is needed (implicit flow). The redirect URI must match exactly,
including the trailing slash; a mismatch shows up as `#error=invalid_request`.

## 3. Without OAuth

Users can instead paste a personal permanent token (Profile → Account Security →
Tokens, scope YouTrack) into Settings. It is kept in the browser's localStorage only.

## What the app reads

`GET /api/issues/{id}` with summary, resolved, State, Assignee and links
(Subtask, Depend), plus `GET /api/users/me`. Nothing is written.
