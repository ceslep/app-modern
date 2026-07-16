/**
 * Skeleton loading component
 *
 * Progressive loading placeholders that mimic the shape of the content
 * that will eventually render in the container. Replaces blocking spinners
 * for >1s content loads (per ui-ux-pro-max `progressive-loading` rule).
 *
 * Use showSpinner / withFullscreenSpinner from spinner.js for ACTION
 * feedback (save, submit) — skeletons are for CONTENT loading.
 *
 * Variants:
 *   - list   : list of card-like rows (notificaciones, certificados, candidatos)
 *   - card   : single card with header + body
 *   - table  : header + N rows × M cols (administrativo, inasistencias)
 *   - stats  : grid of stat cards (convivencia stats)
 *   - chart  : chart-shaped placeholder (estadísticas, chart cards)
 *
 * Each piece can be customised via the `line()` / `circle()` / `block()` builders
 * for module-specific shapes. All variants respect `prefers-reduced-motion`
 * through CSS (animation is disabled, not JS-conditional).
 */

const active = new Map();

const ANIMATE_DEFAULT = 'shimmer';

function escape(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function el(tag, attrs = {}, children = '') {
  const parts = Object.entries(attrs)
    .filter(([, v]) => v != null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escape(v)}"`))
    .join('');
  return `<${tag}${parts}>${children}</${tag}>`;
}

function piece(extraClass = '', style = '') {
  const base = 'skeleton-piece';
  const cls = extraClass ? `${base} ${extraClass}` : base;
  return style ? `<span class="${cls}" style="${style}"></span>` : `<span class="${cls}"></span>`;
}

function wrap(content, { ariaLabel = 'Cargando contenido' } = {}) {
  return `
    <div class="skeleton-root" role="status" aria-busy="true" aria-live="polite" aria-label="${escape(ariaLabel)}">
      ${content}
    </div>
  `;
}

const line = ({ width = '100%', height = '0.75rem', radius = null } = {}) =>
  piece('skeleton-line', `width:${width};height:${height};${radius ? `border-radius:${radius};` : ''}`);

const circle = ({ size = '2.5rem' } = {}) =>
  piece('skeleton-circle', `width:${size};height:${size};`);

const block = ({ width = '100%', height = '1rem', radius = '0.5rem' } = {}) =>
  piece('skeleton-block', `width:${width};height:${height};border-radius:${radius};`);

/* ------------------------------------------------------------------ */
/*  Variant builders — return HTML strings                            */
/* ------------------------------------------------------------------ */

const variants = {
  list({ count = 5, animate = ANIMATE_DEFAULT } = {}) {
    const items = Array.from({ length: count }, () => `
      <div class="skeleton-item">
        <div class="skeleton-item-head">
          ${line({ width: '40%', height: '0.95rem' })}
          ${circle({ size: '0.85rem' })}
        </div>
        <div class="skeleton-item-body">
          ${line({ width: '95%' })}
          ${line({ width: '78%' })}
        </div>
        <div class="skeleton-item-foot">
          ${line({ width: '30%', height: '0.65rem' })}
        </div>
      </div>
    `).join('');
    return wrap(`<div class="skeleton-list skeleton--${animate}">${items}</div>`, {
      ariaLabel: 'Cargando lista',
    });
  },

  card({ animate = ANIMATE_DEFAULT, lines = 3 } = {}) {
    return wrap(`
      <div class="skeleton-card skeleton--${animate}">
        <div class="skeleton-card-header">
          ${circle({ size: '2.25rem' })}
          <div class="skeleton-card-titles">
            ${line({ width: '50%', height: '0.95rem' })}
            ${line({ width: '30%', height: '0.7rem' })}
          </div>
        </div>
        <div class="skeleton-card-body">
          ${Array.from({ length: lines }, () => line({ width: `${60 + Math.random() * 35}%` })).join('')}
        </div>
      </div>
    `, { ariaLabel: 'Cargando tarjeta' });
  },

  table({ rows = 8, cols = 4, animate = ANIMATE_DEFAULT } = {}) {
    const headerCells = Array.from({ length: cols }, () => line({ width: '70%', height: '0.7rem' })).join('');
    const bodyRows = Array.from({ length: rows }, () => `
      <div class="skeleton-row">
        ${Array.from({ length: cols }, () => line({ width: `${50 + Math.random() * 40}%` })).join('')}
      </div>
    `).join('');
    return wrap(`
      <div class="skeleton-table skeleton--${animate}">
        <div class="skeleton-thead">
          <div class="skeleton-row">${headerCells}</div>
        </div>
        <div class="skeleton-tbody">${bodyRows}</div>
      </div>
    `, { ariaLabel: 'Cargando tabla' });
  },

  stats({ count = 3, animate = ANIMATE_DEFAULT } = {}) {
    const cards = Array.from({ length: count }, () => `
      <div class="skeleton-stat">
        ${line({ width: '45%', height: '0.7rem' })}
        ${line({ width: '65%', height: '1.6rem', radius: '0.4rem' })}
        ${line({ width: '35%', height: '0.65rem' })}
      </div>
    `).join('');
    return wrap(
      `<div class="skeleton-stats skeleton--${animate}">${cards}</div>`,
      { ariaLabel: 'Cargando estadísticas' },
    );
  },

  chart({ height = 300, animate = ANIMATE_DEFAULT } = {}) {
    return wrap(`
      <div class="skeleton-chart skeleton--${animate}" style="height:${height}px;">
        <div class="skeleton-chart-grid">
          ${Array.from({ length: 4 }, () => '<div class="skeleton-chart-line"></div>').join('')}
        </div>
        <div class="skeleton-chart-bars">
          ${Array.from({ length: 7 }, (_, i) => `
            <div class="skeleton-chart-bar" style="height:${30 + (i * 11) % 60}%;"></div>
          `).join('')}
        </div>
      </div>
    `, { ariaLabel: 'Cargando gráfico' });
  },
};

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Show a skeleton in a container.
 *
 * @param {string|HTMLElement} target  container id or element
 * @param {object}  options
 * @param {string}  options.variant    'list' | 'card' | 'table' | 'stats' | 'chart'
 * @param {string}  options.animate    'shimmer' | 'pulse' | 'solid'
 * @param {number}  options.count      rows/items to render (list/stats/table)
 * @param {number}  options.rows       alias of count for table
 * @param {number}  options.cols       columns for table
 * @param {number}  options.height     height in px for chart
 * @param {number}  options.lines      body lines for card
 * @param {string}  options.ariaLabel  custom aria-label for the root
 * @param {string}  options.html       raw HTML to inject instead of a variant
 */
export function showSkeleton(target, options = {}) {
  const container = typeof target === 'string'
    ? document.getElementById(target)
    : target;
  if (!container) return null;

  const id = container.id || container.dataset.skeletonKey;
  if (!id) {
    container.dataset.skeletonKey = container.dataset.skeletonKey || `__sk_${Math.random().toString(36).slice(2, 9)}`;
  }
  const key = container.id || container.dataset.skeletonKey;

  hideSkeleton(container);

  const variant = options.variant || 'list';
  const merged = { ...options };

  let html;
  if (options.html) {
    html = wrap(`<div class="skeleton-custom skeleton--${merged.animate || ANIMATE_DEFAULT}">${options.html}</div>`, {
      ariaLabel: merged.ariaLabel || 'Cargando',
    });
  } else if (variants[variant]) {
    html = variants[variant]({
      count: merged.count ?? merged.rows ?? undefined,
      rows: merged.rows,
      cols: merged.cols,
      height: merged.height,
      lines: merged.lines,
      animate: merged.animate || ANIMATE_DEFAULT,
    });
  } else {
    html = variants.list({ count: merged.count || 5, animate: merged.animate });
  }

  container.innerHTML = html;
  container.dataset.skeletonActive = 'true';
  active.set(key, container);
  return container;
}

export function hideSkeleton(target) {
  const container = typeof target === 'string'
    ? document.getElementById(target)
    : target;
  if (!container) return;
  const key = container.id || container.dataset.skeletonKey;
  if (container.dataset.skeletonActive === 'true') {
    container.innerHTML = '';
    delete container.dataset.skeletonActive;
  }
  active.delete(key);
}

export function isSkeletonActive(target) {
  const container = typeof target === 'string'
    ? document.getElementById(target)
    : target;
  return !!container && container.dataset.skeletonActive === 'true';
}

/**
 * Wrap an async function with a skeleton.
 * Mirrors `withSpinner` from spinner.js for content loading.
 */
export function withSkeleton(target, asyncFn, options = {}) {
  return async (...args) => {
    showSkeleton(target, options);
    try {
      return await asyncFn(...args);
    } finally {
      hideSkeleton(target);
    }
  };
}

export const skeleton = Object.assign(
  { line, circle, block },
  variants,
);

export default skeleton;
