/**
 * Activity timeline — last N notifications.
 *
 * Renders a stable skeleton. The orchestrator calls hydrateActivity(root, list)
 * to populate it. Uses dayjs (already a dep) for "hace 5 min" relative time.
 */

import { escapeHtml } from '@utils/dom.js';
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
      <i class="bi bi-activity" aria-hidden="true"></i> Actividad reciente
    </h2>
    <div class="db-activity" data-activity-list>
      <div class="db-empty">
        <i class="bi bi-hourglass-split" aria-hidden="true"></i>
        Cargando actividad…
      </div>
    </div>
  `;

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
        <i class="bi bi-bell-slash" aria-hidden="true"></i>
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
