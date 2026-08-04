---
name: figma-build-frames
description: Push app screens into Figma as real Auto Layout layers with design-token bindings via use_figma. Use when building or updating Figma frames from code, pushing a page into Figma, code-to-design, or when an agent is tempted to ship generate_figma_design / screenshot captures as the deliverable instead of editable layers and variable-bound tokens.
---

# Build Figma frames from code (real layers, not screenshots)

The deliverable is an **editable Auto Layout frame** whose fills, strokes, and radii are bound to the project's design-system variables. A rasterized capture is never the deliverable.

This skill is **repo-agnostic**. Discover tokens, fonts, file key, and layout conventions from the current project before building. Do not assume another product's variable names, fonts, or Figma file.

## Hard rule: screenshots are reference only

| Tool | Role |
|------|------|
| `use_figma` | **Build** — creates/edits real nodes. This is the work. |
| `get_screenshot` / `node.screenshot()` | **Verify** — after a section, check layout/type. |
| `generate_figma_design` | **Optional visual reference** for web apps — compare spacing, then **delete** the capture. Never leave it as the shipped frame. |

If the canvas only has an image, flattened capture, or a frame full of unbound `#ffffff` rectangles, the job failed. Rebuild with `use_figma`.

## Mandatory prep (every session)

1. Load **figma-use** before any `use_figma` call.
2. Load **figma-generate-design** when the task is a full page / multi-section screen.
3. Pass `skillNames: "figma-use,figma-generate-design"` on every `use_figma` call.
4. **Discover the project profile** (below) — tokens, fonts, Figma file, sibling conventions. Prefer the product's real fonts; never default to Inter unless the app uses Inter.

### Discover the project profile

Before creating nodes, resolve these from the repo + Figma file (or ask once if missing):

| Probe | Where to look | What you need |
|-------|---------------|---------------|
| Figma file | User URL / prompt / README / prior frames | `fileKey`, target page |
| Color / radius tokens | CSS variables, `@theme`, `tokens.*`, Tailwind theme, `figma/*variables*` scripts | Map CSS → existing Figma variable names |
| Fonts | root layout, `next/font`, global CSS `font-family` | Family + weights actually loaded |
| Layout chrome | Existing top-level frames in the file | Width, padding, gap, card treatment |
| Audit helper | `figma/audit*.js`, `.cursor/rules/*figma*` | Use if present; otherwise audit manually via `use_figma` |

Rules for discovery:

- Prefer **existing** Figma variable collections. Do **not** invent new modes, variables, pages, or collections unless the prompt asks.
- If a CSS token has no Figma variable, bind the closest existing variable (or leave a named raw paint only when no token exists). Do not silently create variables unless asked.
- If the user gave a `fileKey` / URL, use that. If not, inspect open files via Figma tools / ask.

## Workflow

### 1. Inspect before creating

One read-only `use_figma` to learn:

- Pages and existing top-level frames (name, width, padding, gap)
- Local variable collections (`getLocalVariableCollectionsAsync`) — names, modes, variable IDs
- Conventions from a sibling frame: layout-only frames have `fills = []`; cards bind surface + border + radius tokens

### 2. Create the wrapper first

- One top-level Auto Layout frame, named for the screen (e.g. `Home — from code`, `Restaurants — from code`).
- Position to the right of existing content (scan `currentPage.children` for `maxX`).
- Bind the page background to the project's bg / page token. Clear fill on the inner content column.
- Return `wrapperId` / `contentId`. Build every later section **inside** that wrapper by ID — do not create orphan top-level sections and reparent later.

### 3. Build one section per `use_figma` call

Order follows the **source page structure**, not a fixed dashboard template. Example patterns:

| Page shape | Suggested section order |
|------------|-------------------------|
| Marketing / hero | Nav → hero → next content band |
| Store listing | Header → filters → results / map → cards |
| App shell / dashboard | Page header → metrics → main row → secondary row |
| Detail | Header → primary panel → supporting panels |

After each section: screenshot that section, fix issues, then continue. Keep scripts small (~10 logical node operations).

### 4. Bind tokens — never raw paint on surfaces

For every paint/radius that has a matching token:

```js
const paint = (variable, opacity) => {
  const p = { type: "SOLID", color: { r: 0, g: 0, b: 0 } };
  if (opacity !== undefined) p.opacity = opacity;
  return figma.variables.setBoundVariableForPaint(p, "color", variable);
};

frame.fills = [paint(cardVar)];
frame.strokes = [paint(borderVar)];
frame.strokeWeight = 1;
["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"].forEach((k) =>
  frame.setBoundVariable(k, radiusLgVar),
);
```

Muted / subtle text: bind to the foreground / ink token and set paint `opacity` (e.g. 0.6 / 0.42) — do not invent grey hexes when a muted token or opacity-on-fg pattern exists.

### 5. Layout-only frames must not paint

`createFrame` / `createAutoLayout` start opaque white. Immediately:

```js
layoutFrame.fills = [];
```

Rows, columns, header groups, card bodies, chart columns, label stacks — all `fills = []`.
Only surfaces (page bg, cards, buttons, badges, progress tracks, bars, hero overlays) get a **bound** fill.

**Exception:** avatar / photo tints may stay raw hex and must be named `Avatar/...` (or similar) so audits can allow them.

### 6. Icons = SVG import, not rotated primitives

Pull path data from the codebase icon source (e.g. lucide-react `*.mjs`, inline SVGs, icon components), then:

```js
const icon = figma.createNodeFromSvg(
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none">...</svg>',
);
icon.resize(16, 16);
// bind strokes/fills to a color variable — createNodeFromSvg does not understand currentColor
```

Never rebuild chevrons/arrows from rotated lines.

### 7. Componentize repeats

Build one card / list-row / chip pattern as a local component (or a helper that emits identical structure), then place instances — do not hand-duplicate N near-identical trees with drift.

## Done checklist (required)

Before reporting finished:

1. **Fill audit** — If the repo has `figma/audit-frame-fills.js` (or equivalent), run it against the new frame (`TARGET_ID` = your frame). **Must report `offenderCount: 0`** (avatars excepted). Set `FIX = true` only to repair, then re-audit with `FIX = false`. If no script exists, walk the frame in `use_figma` and confirm no unbound solid fills/strokes on non-avatar nodes.
2. Broader check: corner radii bound where a radius token exists; text uses the product font(s).
3. Screenshot each mode the collection **already has** (`setExplicitVariableModeForCollection`). Clear the override afterward so the frame sits on the default mode (usually Light).
4. **Do not** add Dark (or any new mode) just to verify. If only one mode exists, audit + screenshot that mode and say so.

## Anti-patterns (fail the task)

- Shipping `generate_figma_design` output or a pasted screenshot as the frame
- Leaving default white fills on layout frames
- Hardcoded hex on cards/text/borders when a project color variable exists
- One giant `use_figma` that builds the whole page
- Adding Dark mode / new tokens to "complete" verification
- Reconstructing icons from rectangles and rotation
- Building sections as page-level orphans then trying to `appendChild` into the wrapper later
- Copying another product's token names (e.g. `color/bg`) when this file uses a different collection

## Example profile: AussieEats (this repo)

Use when working in **aussie-eats**. Other repos: skip this section and rediscover.

| Item | Convention |
|------|------------|
| Tokens (CSS) | `:root` in `src/app/globals.css` — `--ae-bg`, `--ae-ink`, `--ae-ink-muted`, `--ae-green`, `--ae-green-deep`, `--ae-accent`, `--ae-line`, `--ae-panel`, … |
| Suggested Figma names | Prefer binding to whatever collection already exists in the target file. If creating a collection **only when asked**, mirror CSS: `ae/bg`, `ae/ink`, `ae/green`, `ae/accent`, `ae/line`, `ae/panel`, plus radii as used in UI (e.g. ~0.55rem controls). |
| Fonts | **Fraunces** (display / brand / headings), **Source Sans 3** (body / UI) — from `src/app/layout.tsx`. Not Geist, not Inter. |
| Typical screens | Store: home hero, restaurants list, restaurant detail, cart/checkout, orders. Admin: dashboard, restaurants, orders. |
| Page width | Match the source layout (store content ~ `page-shell` / ~72rem max); desktop artboard often 1440 with content centered. |
| Sibling reference | Any existing AussieEats frame in the target file — match padding, gap, card chrome (`--ae-panel` + `--ae-line`). |
| Audit script | None in-repo today — audit fills manually via `use_figma` unless one is added later under `figma/`. |

CSS source of truth: `src/app/globals.css`. Map paints from `--ae-*` into the Figma variables discovered in step 1; do not assume a "Loop" collection exists in this project.
