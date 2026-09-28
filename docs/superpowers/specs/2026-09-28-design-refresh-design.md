# Design refresh

Date: 2026-09-28. Scope approved in chat: every tier of the UI audit (quick wins, visual
refresh, tokens).

## Goal

Make the map readable at a glance and the chrome consistent, without changing what the app
does. Success: card titles show two full lines; nothing on the canvas hides the zoom
controls; every control has a visible keyboard focus; no colour means two things; first-run
users see what to do next; light and dark come from one set of tokens.

## Decisions

### Tokens (index.css)

Chrome colours are CSS custom properties on `:root` and `.dark`, exposed to Tailwind with
`@theme inline` as `surface`, `raised`, `sunken`, `fg`, `muted`, `line`, `primary`,
`primary-fg`, `focus`, `hover` and `critical`. Components use `bg-raised`, `text-muted`,
`border-line`, `ring-focus` and so on instead of pairs of `gray-*`/`dark:slate-*` classes.

Graph palettes (status buckets, edges, YouTrack tint) stay in TypeScript: they feed
`mixWith` and SVG marker colours, which need literal hex. Their hover and critical hues
match the `hover` and `critical` tokens.

Fonts: no web font download. `--font-mono` prefers a locally installed JetBrains Mono and
falls back to the system monospace stack.

### Colour meaning

- Hover (the card and its neighbours) moves from blue to violet: blue already means
  "In progress".
- The critical path moves from amber to rose: amber already means "In review".
- A resolved card also shows a check mark before its state, so "done" does not rely on the
  green fill and the fade alone.

### Issue card

`NODE_HEIGHT` 72 → 92 (the root's 4 px border must still leave room for two summary lines). Three rows in a column with no `justify-between`: id + kind badge;
summary clamped to two lines (with an ellipsis); state. Tooltip gains a hint that
right-click (or Shift+F10) opens more actions. Keyboard focus: `focus-visible` ring in the
`focus` token; hover keeps a ring, the critical path keeps the outline.

### Canvas

- Legend moves to the top-right and collapses to a single "Legend" button; the open/closed
  state is a setting (`legendOpen`) so it survives a reload. Default folded: open, it covers
  the top-right corner, where dagre always puts the root epic (the rightmost rank).
- React Flow Controls stay bottom-left (now uncovered); MiniMap bottom-right, nodes painted
  with each card's status accent.
- New switch **Epic links**: hides the subtask edges that end at the root epic (they only
  restate "the epic needs all of its children"). Edges on the critical path stay. Layout is
  unchanged: the edges are hidden, not removed. Setting `epicLinks`, default on.
- Animated hover edges stop animating under `prefers-reduced-motion`.

### Toolbar

One row, `h-8` controls, three groups separated by dividers:
brand mark + issue input + Build | view switches (Show resolved, Critical path, Epic links),
Colours select, stats | account, theme, settings. Icons are inline SVG (Lucide paths, ISC)
in `src/ui/icons.tsx`; emoji go. The toolbar Fit view button goes: the canvas Controls
carry it.

### States

- Empty, loading and error render in the centre of the canvas (`CanvasMessage`): the app
  name, a step list (connect in Settings → sign in → enter an epic id) with the next step's
  button, a spinner and "Fetched N issues…" with Cancel while loading, and the error with its
  action. The top banner no longer exists for these.
- Truncation and cycle warnings (a graph is shown) become a dismissible overlay at the top of
  the canvas, so the map does not shift.

### Settings dialog

Width `min(28rem, 100vw - 2rem)`, a close (×) button, focus rings on inputs, the token field
explained by a helper line.

### Housekeeping

Replace the Vite favicon with an app mark; delete the unused `public/icons.svg`.

## Testing

Existing tests keep passing, updated where they pin class names (`ring-blue-400`,
`outline-amber-500`) or the empty-state text. New tests: legend collapses and remembers it;
Epic links switch hides root subtask edges but keeps critical ones; canvas message shows the
next setup step, loading progress with Cancel, and errors; settings load rejects non-boolean
`legendOpen`/`epicLinks`. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
