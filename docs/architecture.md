# Architecture

Single-page app, no backend. Everything below runs in the browser.

## Modules

| Module | Responsibility |
|---|---|
| `src/api/` | Typed `fetch` wrapper over YouTrack REST; maps HTTP/CORS failures to error classes. |
| `src/graph/collect.ts` | BFS that builds the roadmap: epic tree (Subtask, recursive) → external prerequisites (Depend "depends on", recursive) → external dependents (Depend "is required for", one level). Emits both Depend edges and implicit subtask → parent edges. Concurrency 6, soft cap 500 issues. |
| `src/graph/filter.ts` | Projection that hides resolved issues (root always kept); no bridging edges, so a node whose prerequisites are all resolved moves to layer 0. |
| `src/graph/criticalPath.ts` | Longest chain of issues ending at the root epic, measured in issues; returns every node and step with no slack. |
| `src/graph/layout.ts` | `dagre` left-to-right layout; orphans (issues without a single edge — in practice only a root that has neither subtasks nor Depend links) go to a separate lane below. |
| `src/auth/` | Hub OAuth 2.0 implicit flow: auth URL, `state` (nonce + issue id), fragment parsing, silent refresh via hidden iframe + `postMessage`, storage, login session. |
| `src/store/` | Zustand stores: settings (localStorage), auth token (sessionStorage), roadmap build state. Every switch in the toolbar lives in settings, so it survives a reload. |
| `src/ui/` | React Flow canvas, issue cards coloured by status, toolbar, settings, status banner. |

`graph/*` is pure: it takes a `fetchIssue(id)` function and has no React or network
dependency, so the whole algorithm is unit-tested against fixtures.

## Link semantics (YouTrack)

| Link | OUTWARD on issue A | INWARD on issue A |
|---|---|---|
| Subtask | A is *parent for* X → X is a child | A is *subtask of* X → X is the parent |
| Depend | A *is required for* X → edge A → X | A *depends on* X → edge X → A |

Map edges are drawn prerequisite → dependent and come in two kinds:

| Edge kind | Source | Drawn as |
|---|---|---|
| `depend` | an explicit Depend link | solid arrow |
| `subtask` | the Subtask hierarchy — a parent is finished only once all of its subtasks are, so every child is a prerequisite of its parent | dashed, paler arrow |

Both ends of the hierarchy are read (`Subtask OUTWARD` on the parent and `Subtask INWARD`
on the child) so the edge survives when one side is an inaccessible placeholder. When the
same pair carries both kinds the explicit `depend` wins. A subtask that was never
collected (a subtask of an external prerequisite, say) produces no edge.

Because of this, `dagre` puts a parent to the right of all of its subtasks and the root
epic ends up in the rightmost rank. Relates and Duplicate are ignored.

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

## Status colours

A card carries its status as a tinted fill plus a saturated 6 px stripe on the left; the
border is reserved for the node class above. The **Colours** control in the toolbar picks
the scheme (persisted in `Settings.colorScheme`); every palette exists in a light and a
dark variant, chosen by the active theme:

- `semantic` (default) — `src/ui/statusBucket.ts` sorts an issue into one of four buckets.
  `resolved` from YouTrack decides `done` outright; for the rest the state name is matched
  case-insensitively (`verify|review|qa|test|check` → review, checked first so "code review
  in progress" is review; `progress|in work|development|doing|ongoing|wip` → in progress;
  anything else, including a missing state → not started). Each bucket has a fixed palette
  per theme in `BUCKET_STYLES`.
- `youtrack` — the state's own colour: undiluted for the stripe, and mixed into the page
  surface for the fill (75 % white in the light theme, 72 % of the dark surface in the dark
  one) so the text on it stays readable. States without a colour fall back to neutral grey.

## Critical path

The **Critical path** switch in the toolbar (persisted in `Settings.criticalPath`) outlines the
longest chain of issues that has to finish before the root epic can. The roadmap carries no
estimates, so the chain is measured in issues: every one counts as a single step.

`criticalPath` ranks the visible projection with a Kahn topological order — `depth(n)` is the
longest chain ending at `n` — then walks back from the root, keeping every predecessor exactly
one rank lower. Ties are all kept: a node is on the path when *some* longest chain runs through
it, which is the same as saying it has no slack. Two consequences follow from working on the
projection: hiding resolved issues shortens the path, and issues downstream of the root
(`external-dependent`) are never on it. Nodes inside a cycle never reach indegree 0, so they
get no depth and no chain is routed through them; `findCycles` reports them separately.

Nothing is suppressed when the path turns out to cover the whole graph — the switch is the
control, and the toolbar states how many issues are on the path so that case is visible. Cards
on the path wear an amber outline (an outline, not a ring, so a hovered card keeps both marks)
and the steps between them are drawn in the same amber. The set lives in
`src/store/criticalPathStore.ts` rather than in `node.data`, for the same reason as the hover
state: a changed node object makes React Flow re-measure the graph.

## Theme

The toolbar's theme button cycles system → light → dark, persisted in `Settings.theme`.
`src/ui/theme.ts` resolves the preference against `prefers-color-scheme` (live, so `system`
follows the OS without a reload) and writes the result onto `<html>` as the `dark` class
plus `color-scheme`. `ThemeProvider` resolves it once and hands it down through context:
issue cards must not each own a media-query listener. Tailwind's `dark:` variant is bound
to that class in `src/index.css`, and a small inline script in `index.html` applies the
stored theme before the first paint so the app never flashes white.

## Remembered state

`Settings` (localStorage, key `yer.settings`) keeps the toolbar as you left it: the colour
scheme, the theme, the critical path and **Show resolved** switches, and `lastIssueId` — the
issue of the last build, written when the build starts so a failed one is remembered too.
Because these are per browser rather than per issue, opening a different epic inherits the
switches from the previous one.

`lastIssueId` is only ever *offered*: the toolbar seeds its input with it when the store has
no issue yet, and nothing is fetched until you press Build. Autobuilding stays the job of the
`?issue=` parameter (or an OAuth callback carrying the id), which also decides what the URL
says — a remembered id never rewrites it. Precedence at boot is OAuth callback → `?issue=` →
remembered id.

Loading is defensive: the store is hand-editable and outlives releases, so `loadSettings`
replaces any value of the wrong type with its default.

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

Image export, editing links from the map, dates or sprints on the axis, multiple epics on one
map, weighting the critical path by an estimate field.
