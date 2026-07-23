---
name: thinking-orbs-loaders
description: >-
  The project-standard loading indicator for app-modern. Use this skill whenever
  you add, replace, or review ANY loading/spinner/"Cargando..." UI — inline
  placeholders, table/section loaders, buttons in a loading state, fullscreen
  overlays, or SweetAlert (Swal.fire) loading modals. Also use it whenever you
  see a Tailwind border-spin div (`border-[#543391] border-t-transparent
  rounded-full animate-spin`) or an `animate-spin` SVG being used as a loader —
  those are the OLD pattern and must be migrated to a thinking orb. Trigger on
  phrases like "loading spinner", "loader", "spinner", "cargando", "show a
  loading state", "while it fetches", or any request that displays progress
  while data loads.
---

# Thinking Orbs — the app-modern loading indicator

All loaders in this SPA render as **thinking orbs**: dotted, 3D canvas
animations ported from [`thinking-orbs`](https://github.com/Jakubantalik/thinking-orbs)
(MIT, Jakub Antalik). One shared engine, six animation *states*, drawn on a
plain 2D canvas so they look identical across browsers.

Engine + API: `src/components/thinkingOrb.js`
Central spinner helpers (already orb-backed): `src/components/spinner.js`

## When to reach for which state

Pick the state by *what the app is doing* — the animation is a hint, not
decoration. When unsure, default to `working`.

| State | Animation | Use for |
|-----------|-----------------------------------|-----------------------------------------|
| `working` | particles on tilted orbits | generic loading, fetching, saving, PDF gen |
| `searching`| scan meridian sweeps a globe | querying/consulting, "buscar", report lookups |
| `solving` | bands scramble then click back | computing/calculating (puestos, stats) |
| `listening`| waveform rolls through rings | recording, live input, polling |
| `composing`| undulating sash | generating text/documents |
| `shaping` | outline morphs circle→tri→square | building/rendering something visual |

## The two ways to render an orb

### 1. Declarative markup (preferred inside `innerHTML` template strings)

Any element with a `data-orb` attribute **auto-mounts** — including markup
injected later through `innerHTML` or a SweetAlert modal, because a
`MutationObserver` watches the DOM. You do NOT need to import or call anything.

```html
<span data-orb="searching" data-orb-size="40"
      class="inline-block" style="width:40px;height:40px"></span>
```

Attributes: `data-orb` (state), `data-orb-size` (px), optional
`data-orb-theme` (`auto|dark|light`), `data-orb-speed`.

Always set an explicit width/height (inline style or Tailwind `w-*`/`h-*`) so
layout doesn't jump before the canvas mounts.

Helper for template literals:

```js
import { orbHTML } from '@components/thinkingOrb.js';
resultsEl.innerHTML = orbHTML({ state: 'searching', size: 40, label: 'Cargando...' });
```

### 2. Programmatic (when you hold an element and manage its lifecycle)

```js
import { createOrb } from '@components/thinkingOrb.js';
const orb = createOrb(hostEl, { state: 'working', size: 48, theme: 'auto', speed: 1 });
orb.setState('solving'); // swap animation in place
orb.destroy();           // stop rAF + remove canvas — ALWAYS call on teardown
```

### 3. Central spinner helpers (section + fullscreen loaders)

Already orb-backed — keep using them, don't reinvent:

```js
import { showSpinner, hideSpinner, withSpinner,
         showFullscreenSpinner, hideFullscreenSpinner, withFullscreenSpinner }
  from '@components/spinner.js';

showSpinner('containerId', 'Cargando...');   // orb + caption inside #containerId
withSpinner('containerId', fetchFn)();        // auto show/hide around async
```

## Migrating the OLD pattern

Replace border-spin divs and `animate-spin` SVG loaders with an orb. Match the
new size to the old box (`w-8 h-8` → ~36px, `w-10 h-10` → ~44px, `w-6 h-6` →
~28px). Keep surrounding layout classes (`mx-auto`, `mb-3`, captions).

**Before:**
```html
<div class="w-8 h-8 border-4 border-[#543391] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
```
**After:**
```html
<span data-orb="searching" data-orb-size="36" class="inline-block mx-auto mb-3" style="width:36px;height:36px"></span>
```

Leave tiny **button/progress icon spins** (`bi bi-arrow-repeat animate-spin`,
a 12–20px spinner inside a button label) as-is unless asked — those are inline
affordances, not page loaders. If a button loader *should* be an orb, use
`data-orb-size="16"` and `align-middle`.

## Notes

- Sizes tune to two baked presets: ≥40px uses the 64 design, <40px the 20
  (inline) design. Any pixel size works; pick what fits the slot.
- Theme is `auto` by default: it reads an ancestor `data-theme`/`.dark` class,
  else `prefers-color-scheme`. Dark → light ink, light → dark ink. The canvas
  is transparent, so it sits on any background.
- Respects `prefers-reduced-motion` (renders one static frame) and pauses when
  offscreen or the tab is hidden — no wasted rAF.
- Never load the React package `thinking-orbs` from npm; this project uses the
  vanilla port in `src/components/thinkingOrb.js`.
