# Architecture

Single-page app, no backend. Everything below runs in the browser.

## Modules

| Module | Responsibility |
|---|---|
| `src/api/` | Typed `fetch` wrapper over YouTrack REST; maps HTTP/CORS failures to error classes. |
| `src/graph/collect.ts` | BFS that builds the roadmap: epic tree (Subtask, recursive) → external prerequisites (Depend "depends on", recursive) → external dependents (Depend "is required for", one level). Emits both Depend edges and implicit subtask → parent edges. Concurrency 6, soft cap 500 issues. |
| `src/graph/filter.ts` | Projection that hides resolved issues (root always kept); no bridging edges, so a node whose prerequisites are all resolved moves to layer 0. |
| `src/graph/layout.ts` | `dagre` left-to-right layout; orphans (issues without a single edge — in practice only a root that has neither subtasks nor Depend links) go to a separate lane below. |
| `src/auth/` | Hub OAuth 2.0 implicit flow: auth URL, `state` (nonce + issue id), fragment parsing, silent refresh via hidden iframe + `postMessage`, storage, login session. |
| `src/store/` | Zustand stores: settings (localStorage), auth token (sessionStorage), roadmap build state. |
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

## Theme

The toolbar's theme button cycles system → light → dark, persisted in `Settings.theme`.
`src/ui/theme.ts` resolves the preference against `prefers-color-scheme` (live, so `system`
follows the OS without a reload) and writes the result onto `<html>` as the `dark` class
plus `color-scheme`. `ThemeProvider` resolves it once and hands it down through context:
issue cards must not each own a media-query listener. Tailwind's `dark:` variant is bound
to that class in `src/index.css`, and a small inline script in `index.html` applies the
stored theme before the first paint so the app never flashes white.

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
