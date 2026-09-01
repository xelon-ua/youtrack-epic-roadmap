# Architecture

Single-page app, no backend. Everything below runs in the browser.

## Modules

| Module | Responsibility |
|---|---|
| `src/api/` | Typed `fetch` wrapper over YouTrack REST; maps HTTP/CORS failures to error classes. |
| `src/graph/collect.ts` | BFS that builds the roadmap: epic tree (Subtask, recursive) → external prerequisites (Depend "depends on", recursive) → external dependents (Depend "is required for", one level). Concurrency 6, soft cap 500 issues. |
| `src/graph/filter.ts` | Projection that hides resolved issues (root always kept); no bridging edges, so a node whose prerequisites are all resolved moves to layer 0. |
| `src/graph/layout.ts` | `dagre` left-to-right layout; orphans (epic issues without any Depend link) go to a separate lane below. |
| `src/auth/` | Hub OAuth 2.0 implicit flow: auth URL, `state` (nonce + issue id), fragment parsing, silent refresh via hidden iframe + `postMessage`, storage, login session. |
| `src/store/` | Zustand stores: settings (localStorage), auth token (sessionStorage), roadmap build state. |
| `src/ui/` | React Flow canvas, issue cards coloured by YouTrack state, toolbar, settings, status banner. |

`graph/*` is pure: it takes a `fetchIssue(id)` function and has no React or network
dependency, so the whole algorithm is unit-tested against fixtures.

## Link semantics (YouTrack)

| Link | OUTWARD on issue A | INWARD on issue A |
|---|---|---|
| Subtask | A is *parent for* X → X is a child | A is *subtask of* X → X is the parent |
| Depend | A *is required for* X → edge A → X | A *depends on* X → edge X → A |

Map edges are Depend only, drawn prerequisite → dependent. Relates and Duplicate are
ignored.

## Node classes

| Kind | Border | How collected |
|---|---|---|
| `root` | thick solid | the requested issue |
| `epic` | solid | subtasks, recursively (intermediate parents included) |
| `external-prerequisite` | dashed | Depend-INWARD targets outside the epic, followed recursively along Depend-INWARD only |
| `external-dependent` | dotted | Depend-OUTWARD targets outside the epic, not traversed further |

When an issue is reachable through several classes the highest-priority one wins
(`root` > `epic` > `external-prerequisite` > `external-dependent`). Issues the user
cannot read become "(no access)" placeholders and are not traversed.

## Auth flow

1. Sign in → redirect to `{hub}/api/rest/oauth2/auth?response_type=token&scope=YouTrack…`
   with a random `state` that also carries the current issue id.
2. Hub redirects back with `#access_token=…&expires_in=…&state=…`; the app verifies
   `state`, stores the token in sessionStorage and strips the fragment.
3. 60 s before expiry a hidden iframe repeats the request with
   `request_credentials=silent`; the iframe page relays its fragment to the parent
   via `postMessage` (same origin) and the token is replaced.
4. A permanent token in Settings bypasses OAuth entirely.

## Out of scope (v1)

Image export, editing links from the map, critical path, dates or sprints on the axis,
dark theme, multiple epics on one map.
