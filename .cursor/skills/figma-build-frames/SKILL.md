---
name: figma-build-frames
description: Push app screens into Figma as real Auto Layout layers with design-token bindings via use_figma. Use when building or updating Figma frames from code, pushing a page into Figma, code-to-design, or when an agent is tempted to ship generate_figma_design / screenshot captures as the deliverable instead of editable layers and Loop variables.
---

# Build Figma frames from code (real layers, not screenshots)

The deliverable is an **editable Auto Layout frame** whose fills, strokes, and radii are bound to design-system variables. A rasterized capture is never the deliverable.

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
4. Read the source page and the UI primitives it uses. Prefer the product's font (this app: **Geist** / **Geist Mono** — never default to Inter).

## Workflow

### 1. Inspect before creating

One read-only `use_figma` to learn:

- Pages and existing top-level frames (name, width, padding, gap)
- Local variable collections (`getLocalVariableCollectionsAsync`) — names, modes, variable IDs
- Conventions from a sibling frame (e.g. Insights): layout-only frames have `fills = []`; cards bind `color/card` + `color/border` + `radius/lg`

Do **not** invent new modes, variables, pages, or collections unless the prompt asks.

### 2. Create the wrapper first

- One top-level Auto Layout frame, named for the screen (e.g. `Dashboard — from code`).
- Position to the right of existing content (scan `currentPage.children` for `maxX`).
- Bind the page background to the bg token. Clear fill on the inner content column.
- Return `wrapperId` / `contentId`. Build every later section **inside** that wrapper by ID — do not create orphan top-level sections and reparent later.

### 3. Build one section per `use_figma` call

Typical order for an app shell content column:

1. Page header + actions
2. Stat / metric row
3. Mid row (chart + side card)
4. Bottom row (list + secondary card)

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

Muted / subtle text: bind to `color/fg` and set paint `opacity` (0.6 / 0.42) — do not invent grey hexes.

### 5. Layout-only frames must not paint

`createFrame` / `createAutoLayout` start opaque white. Immediately:

```js
layoutFrame.fills = [];
```

Rows, columns, header groups, card bodies, chart columns, label stacks — all `fills = []`.
Only surfaces (page bg, cards, buttons, badges, progress tracks, bars) get a **bound** fill.

**Exception:** avatar tints stay raw hex and must be named `Avatar/...` so audits can allow them.

### 6. Icons = SVG import, not rotated primitives

Pull path data from the codebase icon source (e.g. lucide-react `*.mjs`), then:

```js
const icon = figma.createNodeFromSvg(
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none">...</svg>',
);
icon.resize(16, 16);
// bind strokes/fills to a color variable — createNodeFromSvg does not understand currentColor
```

Never rebuild chevrons/arrows from rotated lines.

### 7. Componentize repeats

Build one StatCard / list-row pattern as a local component (or a helper that emits identical structure), then place instances — do not hand-duplicate N near-identical trees with drift.

## Done checklist (required)

Before reporting finished:

1. Run `figma/audit-frame-fills.js` against the new frame (`TARGET_ID` = your frame).  
   **Must report `offenderCount: 0`** (avatars excepted). Set `FIX = true` only to repair, then re-audit with `FIX = false`.
2. Broader check: no unbound solid fills/strokes on non-avatar nodes; corner radii bound where a radius token exists; text uses the product font.
3. Screenshot each mode the collection **already has** (`setExplicitVariableModeForCollection`). Clear the override afterward so the frame sits on Light.
4. **Do not** add Dark (or any new mode) just to verify. If only Light exists, audit + screenshot Light and say so.

## Loop demo specifics

File: `https://www.figma.com/design/sS7qxQ4YCFUcsC4Anuyq26` (`fileKey` = `sS7qxQ4YCFUcsC4Anuyq26`)

| Item | Convention |
|------|------------|
| Collection | **Loop** — use existing variables only |
| Token names | `color/bg`, `color/fg`, `color/card`, `color/border`, `color/accent`, … + `radius/sm|md|lg|xl` |
| Page width | 1440; content column ~1152; horizontal pad 144; section gap 28 |
| Sibling reference | **Insights** frame (`3:27`) — match padding, gap, card chrome |
| Fonts | Geist / Geist Mono (`SemiBold`, `Medium`, `Regular`) |
| Audit script | `figma/audit-frame-fills.js` |
| Always-apply rule | `.cursor/rules/figma-frame-fills.mdc` |

CSS ↔ Figma map lives in `src/app/globals.css` (`@theme`) and `figma/create-loop-variables.js`. If a CSS token has no Loop variable, bind what exists; do not silently create variables unless asked.

## Anti-patterns (fail the task)

- Shipping `generate_figma_design` output or a pasted screenshot as the frame
- Leaving default white fills on layout frames
- Hardcoded hex on cards/text/borders when a Loop color exists
- One giant `use_figma` that builds the whole page
- Adding Dark mode / new tokens to "complete" verification
- Reconstructing icons from rectangles and rotation
- Building sections as page-level orphans then trying to `appendChild` into the wrapper later
