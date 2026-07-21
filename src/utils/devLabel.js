/**
 * Dev-only component labels.
 *
 * In `vite dev` (import.meta.env.DEV), `devTag(el, name)` shows a tiny badge in
 * the top-right corner of `el` naming its source file — so components are easy
 * to locate in the DOM. In production it is a no-op and tree-shakes away.
 *
 * IMPORTANT: badges do NOT touch the tagged element. They live in a separate
 * fixed overlay layer and are positioned over each target via getBoundingClientRect.
 * No `position`, no injected children, no layout shift on the components.
 *
 * Usage:
 *   import { devTag } from '@utils/devLabel.js';
 *   devTag(sectionEl, 'sections/greeting.js');
 *
 * Hover a badge = full path. Click = copy to clipboard. Alt+D = toggle all.
 */

const ENABLED = !!(import.meta && import.meta.env && import.meta.env.DEV);

let overlay = null;
let hidden = false;
let rafPending = false;
// registry: target element -> { badge, name }
const registry = new Map();

function ensureOverlay() {
  if (overlay) return overlay;

  const style = document.createElement('style');
  style.setAttribute('data-devlabel', '');
  style.textContent = `
    #devlabel-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      pointer-events: none;
      overflow: hidden;
    }
    #devlabel-overlay .devlabel {
      position: absolute;
      transform: translateX(-100%);
      max-width: 320px;
      padding: 1px 6px;
      font: 600 10px/1.5 ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
      letter-spacing: 0.02em;
      color: #fff;
      background: rgba(124, 58, 237, 0.92);
      border-bottom-left-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-top: 0;
      border-right: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      opacity: 0.55;
      transition: opacity 120ms ease;
      pointer-events: auto;
      user-select: none;
    }
    #devlabel-overlay .devlabel:hover { opacity: 1; max-width: none; }
    #devlabel-overlay .devlabel.copied { background: #10b981; }
    #devlabel-overlay.devlabel-hidden { display: none; }
  `;
  document.head.appendChild(style);

  overlay = document.createElement('div');
  overlay.id = 'devlabel-overlay';
  document.body.appendChild(overlay);

  // Reposition on any viewport change. Scroll uses capture to catch nested scrollers.
  window.addEventListener('scroll', scheduleReposition, true);
  window.addEventListener('resize', scheduleReposition);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(scheduleReposition).observe(document.documentElement);
  }
  // Catch DOM churn (sections shown/hidden, modules re-rendered) AND
  // auto-tag any newly added component (see autoScan).
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length) { autoScan(); break; }
    }
    scheduleReposition();
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });

  // Alt+D toggles all badges.
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'd' || e.key === 'D')) {
      hidden = !hidden;
      overlay.classList.toggle('devlabel-hidden', hidden);
    }
  });

  return overlay;
}

function scheduleReposition() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(reposition);
}

function isVisible(el) {
  if (!el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  if (r.bottom < 0 || r.top > window.innerHeight) return false;
  if (r.right < 0 || r.left > window.innerWidth) return false;
  return true;
}

function reposition() {
  rafPending = false;
  for (const [el, entry] of registry) {
    if (!el.isConnected) {
      entry.badge.remove();
      registry.delete(el);
      continue;
    }
    if (!isVisible(el)) {
      entry.badge.style.display = 'none';
      continue;
    }
    const r = el.getBoundingClientRect();
    entry.badge.style.display = '';
    // Anchor top-right corner of the target (badge is translateX(-100%)).
    entry.badge.style.left = Math.round(r.right) + 'px';
    entry.badge.style.top = Math.round(Math.max(r.top, 0)) + 'px';
  }
}

/**
 * Tag an element with a dev-only source badge. No-op in production.
 * Does not modify the element — badge floats in the overlay layer.
 * @param {HTMLElement} el   element to badge
 * @param {string} name      label, e.g. 'sections/greeting.js'
 * @returns {HTMLElement} el (for chaining)
 */
export function devTag(el, name) {
  if (!ENABLED || !el) return el;
  ensureOverlay();

  // Idempotent: replace existing badge for this element.
  const existing = registry.get(el);
  if (existing) existing.badge.remove();

  const badge = document.createElement('span');
  badge.className = 'devlabel';
  badge.textContent = name;
  badge.title = `Componente: ${name} (Alt+D ocultar · clic copiar)`;

  badge.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(name);
      badge.classList.add('copied');
      const prev = badge.textContent;
      badge.textContent = '✓ copiado';
      setTimeout(() => {
        badge.classList.remove('copied');
        badge.textContent = prev;
      }, 900);
    } catch {
      /* clipboard unavailable — ignore */
    }
  });

  overlay.appendChild(badge);
  registry.set(el, { badge, name });
  scheduleReposition();
  return el;
}

/**
 * Tag many section containers at once from a { sectionId: 'file.js' } map.
 * Looks up each `#sectionId` element and badges it. No-op in production.
 * @param {Record<string,string>} map
 */
export function devTagSections(map) {
  if (!ENABLED || !map) return;
  // Merge into the explicit-name map used by autoScan, then scan.
  Object.assign(sectionNames, map);
  const run = () => {
    autoScan();
    startAutoScan();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}

// ---- Auto-discovery: NEW components get tagged without touching the map ----

// Explicit sectionId -> file name (filled by devTagSections).
const sectionNames = {};
let autoScanStarted = false;

/**
 * Derive a readable label for a section container with no explicit mapping.
 * 'seccionControlEstudiantes' -> 'seccion: ControlEstudiantes (?)'
 */
function deriveSectionLabel(id) {
  const bare = id.replace(/^seccion/, '');
  return `seccion: ${bare} (?)`;
}

/**
 * Scan the DOM for taggable components and badge any not yet tagged:
 *   1. Anything with `data-devsrc="path/file.js"` — explicit convention for
 *      new components (add the attribute to the root element you render).
 *   2. Any `#seccion*` container — mapped name if known, else derived label.
 * Idempotent: skips elements already in the registry.
 */
function autoScan() {
  if (!ENABLED) return;

  // 1. Explicit convention — works for ANY component, anywhere.
  document.querySelectorAll('[data-devsrc]').forEach((el) => {
    if (registry.has(el)) return;
    const name = el.getAttribute('data-devsrc');
    if (name) devTag(el, name);
  });

  // 2. Section containers — catches new modules automatically.
  document.querySelectorAll('[id^="seccion"]').forEach((el) => {
    if (registry.has(el)) return;
    const name = sectionNames[el.id] || deriveSectionLabel(el.id);
    devTag(el, name);
  });
}

function startAutoScan() {
  if (autoScanStarted) return;
  autoScanStarted = true;
  ensureOverlay(); // wires the MutationObserver that calls autoScan on DOM churn
  autoScan();
}

/**
 * Opt-in auto-tagging for the whole app. Call once at startup.
 * Any element with `data-devsrc` and any `#seccion*` container is badged
 * automatically — including components added later. No-op in production.
 */
export function initDevLabels() {
  if (!ENABLED) return;
  const run = () => startAutoScan();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}
