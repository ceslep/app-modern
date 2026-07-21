/**
 * Stats / KPIs section — bento grid of 4 primary cards.
 *
 * Data model:
 *   stats: [{ id, label, value, icon, iconClass, badge?, trend? }]
 *
 * If `value` is null, the card renders a skeleton placeholder.
 * The orchestrator hydrates values asynchronously and calls `updateStat(id, value)`.
 */

import { escapeHtml } from '@utils/dom.js';
import { devTag } from '@utils/devLabel.js';
import { animateCount } from '../counter.js';

const DEFAULT_STATS = [
  {
    id: 'estudiantes',
    label: 'Estudiantes a cargo',
    icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-WaLIdwjgmqnfE0GndCGu1R9ReZOal5.png',
    iconClass: 'icon-primary',
    badge: { text: 'Hoy', variant: 'live' },
    trend: null,
  },
  {
    id: 'asignaturas',
    label: 'Asignaturas',
    icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-V5g1BA4Fg3Mgks7vN6n3eaXb8KBz0g.png',
    iconClass: 'icon-emerald',
    badge: null,
    trend: null,
  },
  {
    id: 'inasistencias',
    label: 'Inasistencias',
    icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-ij7GEZhfmzLNlLgDJVhkST8FIm5rJV.png',
    iconClass: 'icon-sky',
    badge: null,
    trend: null,
  },
  {
    id: 'convivencia',
    label: 'Convivencia',
    icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-h0hzCqnJZkRGDg1z3YSvUnJV77Ck6f.png',
    iconClass: 'icon-amber',
    badge: null,
    trend: null,
  },
  {
    id: 'descripciones',
    label: 'Descripciones',
    icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-73pNGHJBFF75t0zRsAgQInW9DAM4vd.png',
    iconClass: 'icon-sky',
    badge: { text: 'Período actual', variant: 'live' },
    trend: null,
  },
  {
    id: 'notificaciones',
    label: 'Notificaciones',
    icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-CK4odMSKWdmIj0ueBtNq9HOZR6Fbgv.png',
    iconClass: 'icon-red',
    badge: { text: 'En vivo', variant: 'live' },
    trend: null,
  },
];

export function renderStats(stats = DEFAULT_STATS) {
  const wrap = document.createElement('div');
  wrap.className = 'db-bento db-bento-stats';

  wrap.innerHTML = stats
    .map((s, i) => renderCard(s, i))
    .join('');

  devTag(wrap, 'dashboard/sections/stats.js');
  return wrap;
}

function renderCard(s, index) {
  const badgeHtml = s.badge
    ? `<span class="db-stat-badge${s.badge.variant === 'soon' ? ' soon' : ''}">${escapeHtml(s.badge.text)}</span>`
    : '<span class="db-stat-badge soon">Pronto</span>';

  const trendHtml = s.trend
    ? `<div class="db-stat-trend ${escapeHtml(s.trend.dir || 'flat')}">
         <i class="bi bi-arrow-${s.trend.dir === 'down' ? 'down' : s.trend.dir === 'up' ? 'up' : 'right'}-short" aria-hidden="true"></i>
         ${escapeHtml(s.trend.label || '')}
       </div>`
    : '';

  const suffixHtml = s.suffix ? `<span class="unit">${escapeHtml(s.suffix)}</span>` : '';
  const valueHtml =
    s.value === null || s.value === undefined
      ? `<span class="db-skel" style="width:${s.id === 'notificaciones' ? '3.5rem' : '5.5rem'}"></span>`
      : `<span class="num" data-stat-num>${s.value}</span>${suffixHtml}`;

  return `
    <article class="db-stat" data-stat-id="${escapeHtml(s.id)}" style="animation-delay:${0.1 + index * 0.06}s">
      <div class="db-stat-head">
        <div class="db-stat-icon ${escapeHtml(s.iconClass)}">
          ${s.icon && s.icon.startsWith('http')
            ? `<img src="${escapeHtml(s.icon)}" alt="" width="24" height="24" style="width:24px;height:24px;object-fit:contain;" loading="lazy">`
            : `<i class="bi ${escapeHtml(s.icon)}" aria-hidden="true"></i>`
          }
        </div>
        ${badgeHtml}
      </div>
      <div class="db-stat-value" data-stat-value>
        ${valueHtml}
      </div>
      <div class="db-stat-label">${escapeHtml(s.label)}</div>
      ${trendHtml}
    </article>
  `;
}

/**
 * Update a stat's value in-place with an animated counter.
 * No-op if the card does not exist.
 */
export function updateStat(rootEl, id, value, { decimals = 0 } = {}) {
  if (!rootEl) return;
  const card = rootEl.querySelector(`[data-stat-id="${CSS.escape(id)}"]`);
  if (!card) return;
  const valueEl = card.querySelector('[data-stat-value]');
  if (!valueEl) return;
  const numEl = valueEl.querySelector('[data-stat-num]') || (() => {
    const span = document.createElement('span');
    span.setAttribute('data-stat-num', '');
    valueEl.innerHTML = '';
    valueEl.appendChild(span);
    return span;
  })();
  animateCount(numEl, Number(value) || 0, { decimals });
}

// CSS.escape polyfill (very old browsers)
if (typeof CSS === 'undefined' || !CSS.escape) {
  globalThis.CSS = globalThis.CSS || {};
  CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}
