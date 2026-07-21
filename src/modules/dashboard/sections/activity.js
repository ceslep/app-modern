/**
 * Activity timeline — last N notifications.
 *
 * Renders a stable skeleton. The orchestrator calls hydrateActivity(root, list)
 * to populate it. Uses dayjs (already a dep) for "hace 5 min" relative time.
 */

import { escapeHtml } from '@utils/dom.js';
import { devTag } from '@utils/devLabel.js';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime.js';

dayjs.extend(relativeTime);
dayjs.locale('es');

const MAX_ITEMS = 5;

export function renderActivity() {
  const card = document.createElement('div');
  card.className = 'db-card';
  card.style.animationDelay = '0.6s';
  card.setAttribute('data-activity-card', '');

  card.innerHTML = `
    <h2 class="db-section-title" style="margin-bottom:0.85rem">
      <img src="https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-73pNGHJBFF75t0zRsAgQInW9DAM4vd.png" alt="" width="16" height="16" style="width:16px;height:16px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))" loading="lazy" aria-hidden="true"> Actividad reciente
    </h2>
    <div class="db-activity" data-activity-list>
      <div class="db-empty">
        <img src="https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-jZvuQMZCi8XuT0afzKwdnQXwS7maTf.png" alt="" width="24" height="24" style="width:24px;height:24px;object-fit:contain;display:block;margin:0 auto 0.25rem;opacity:0.4" loading="lazy" aria-hidden="true">
        Cargando actividad…
      </div>
    </div>
  `;

  devTag(card, 'dashboard/sections/activity.js');
  return card;
}

export function hydrateActivity(rootEl, notifications = []) {
  const card = rootEl.querySelector('[data-activity-card]');
  if (!card) return;
  const list = card.querySelector('[data-activity-list]');
  if (!list) return;

  const items = (Array.isArray(notifications) ? notifications : [])
    .slice(0, MAX_ITEMS)
    .filter(Boolean);

  if (items.length === 0) {
    list.innerHTML = `
      <div class="db-empty">
        <img src="https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-CK4odMSKWdmIj0ueBtNq9HOZR6Fbgv.png" alt="" width="24" height="24" style="width:24px;height:24px;object-fit:contain;display:block;margin:0 auto 0.25rem;opacity:0.4" loading="lazy" aria-hidden="true">
        Sin actividad reciente
      </div>
    `;
    return;
  }

  list.innerHTML = items
    .map((n) => {
      const tipo = (n.tipo || 'GENERAL').toString().toUpperCase();
      const texto = stripHtml(n.texto || n.mensaje || '').trim() || '(sin contenido)';
      const fecha = formatDate(n.fecha || n.created_at || n.createdAt);
      return `
        <div class="db-activity-item">
          <span class="dot t-${escapeHtml(tipo)}"></span>
          <div class="body">
            <div class="t">${escapeHtml(texto)}</div>
            <div class="meta">${escapeHtml(tipo)} · ${escapeHtml(fecha)}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

function stripHtml(input) {
  if (!input) return '';
  return String(input).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(value) {
  if (!value) return 'hace un momento';
  const d = dayjs(value);
  if (!d.isValid()) return '';
  return d.fromNow();
}
