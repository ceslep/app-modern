/**
 * Dashboard orchestrator.
 *
 * Public API (kept stable for callers like login.js):
 *   - initDashboard()
 *
 * Renders the bento layout with skeleton placeholders, then hydrates
 * real data asynchronously. Wires delegated events for navigation
 * and copy-to-clipboard actions.
 */

import { auth } from '@services/auth.js';
import { notifications } from '@services/notifications.js';
import { activity } from '@services/activity.js';
import { api } from '@services/api.js';
import { navigateToSection } from '@components/sidebar.js';
import { delegate } from '@utils/dom.js';

import { injectDashboardStyles } from './styles.js';
import { renderGreeting } from './sections/greeting.js';
import { renderStats, updateStat } from './sections/stats.js';
import { renderQuickActions } from './sections/quick-actions.js';
import { renderProfile } from './sections/profile.js';
import { renderActivity, hydrateActivity } from './sections/activity.js';

let initialized = false;

export function initDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  injectDashboardStyles();

  const user = auth.getUser();
  const root = document.createElement('div');
  root.className = 'dashboard-module db-root';

  // ---- Section: HERO greeting ----
  root.appendChild(renderGreeting(user));

  // ---- Section: stats row (bento 3 cols) ----
  const statsEl = renderStats([
    { id: 'valoraciones', label: '% Valoraciones', icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-73pNGHJBFF75t0zRsAgQInW9DAM4vd.png', iconClass: 'icon-violet', badge: { text: 'Periodo actual', variant: 'live' }, trend: null, suffix: '%' },
    { id: 'estudiantes', label: 'Estudiantes a cargo', icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-WaLIdwjgmqnfE0GndCGu1R9ReZOal5.png', iconClass: 'icon-primary', badge: { text: 'Hoy', variant: 'live' }, trend: null },
    { id: 'asignaturas', label: 'Asignaturas', icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-V5g1BA4Fg3Mgks7vN6n3eaXb8KBz0g.png', iconClass: 'icon-emerald', badge: null, trend: null },
    { id: 'inasistencias', label: 'Inasistencias', icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-ij7GEZhfmzLNlLgDJVhkST8FIm5rJV.png', iconClass: 'icon-sky', badge: null, trend: null },
    { id: 'convivencia', label: 'Convivencia', icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-h0hzCqnJZkRGDg1z3YSvUnJV77Ck6f.png', iconClass: 'icon-amber', badge: null, trend: null },
    { id: 'descripciones', label: 'Descripciones', icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-73pNGHJBFF75t0zRsAgQInW9DAM4vd.png', iconClass: 'icon-sky', badge: { text: 'Período actual', variant: 'live' }, trend: null },
    { id: 'notificaciones', label: 'Notificaciones', icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-CK4odMSKWdmIj0ueBtNq9HOZR6Fbgv.png', iconClass: 'icon-red', badge: { text: 'En vivo', variant: 'live' }, trend: null },
  ]);
  root.appendChild(statsEl);

  // ---- Section: quick actions ----
  const quickActionsBlock = document.createElement('div');
  quickActionsBlock.className = 'db-section';
  quickActionsBlock.style.animationDelay = '0.3s';
  quickActionsBlock.appendChild(renderQuickActions());
  root.appendChild(quickActionsBlock);

  // ---- Section: profile + activity (bento 2 cols) ----
  const profileActivity = document.createElement('div');
  profileActivity.className = 'db-bento db-bento-profile db-section';
  profileActivity.appendChild(renderProfile(user));
  profileActivity.appendChild(renderActivity());
  root.appendChild(profileActivity);

  // ---- Toast for clipboard feedback ----
  const toast = document.createElement('div');
  toast.className = 'db-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  root.appendChild(toast);

  // ---- Mount ----
  container.innerHTML = '';
  container.appendChild(root);

  // ---- Wire events (only once) ----
  if (!initialized) {
    wireEvents(container, toast);
    initialized = true;
  }

  // ---- Hydrate async data ----
  hydrate(container, statsEl);
}

function wireEvents(container, toast) {
  // Quick nav
  delegate(container, 'click', '[data-nav-quick]', (e, target) => {
    e.preventDefault();
    const sectionId = target.getAttribute('data-nav-quick');
    if (sectionId) navigateToSection(sectionId);
  });

  // Copy-to-clipboard for profile rows
  delegate(container, 'click', '[data-copy-btn]', async (e, btn) => {
    e.preventDefault();
    const row = btn.closest('[data-copy-row]');
    if (!row) return;
    const valEl = row.querySelector('[data-row-val]');
    const value = valEl ? valEl.textContent.trim() : '';
    if (!value || value === '—') {
      showToast(toast, 'Nada que copiar', 'warn');
      return;
    }
    const ok = await copyToClipboard(value);
    if (ok) {
      btn.classList.add('copied');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = 'bi bi-check2';
        setTimeout(() => {
          btn.classList.remove('copied');
          if (icon) icon.className = 'bi bi-clipboard';
        }, 1600);
      }
      showToast(toast, 'Copiado al portapapeles', 'ok');
    } else {
      showToast(toast, 'No se pudo copiar', 'err');
    }
  });
}

async function hydrate(container, statsEl) {
  // Dashboard summary (estudiantes, asignaturas, valoraciones)
  try {
    const res = await api.post('dashboard/summary', {});
    if (res && !res.error) {
      const d = Array.isArray(res) ? res : res;
      updateStat(statsEl, 'estudiantes', d.total_estudiantes ?? 0);
      updateStat(statsEl, 'asignaturas', d.total_asignaturas ?? 0);
      updateStat(statsEl, 'valoraciones', d.porcentaje_valoraciones ?? 0, { decimals: 1 });
      updateStat(statsEl, 'inasistencias', d.total_inasistencias ?? 0);
      updateStat(statsEl, 'convivencia', d.total_convivencia ?? 0);
      // Card reflects the current period; badge shows that period. If the data
      // lags behind the current year (backend fell back), append that year.
      const convBadge = statsEl.querySelector('[data-stat-id="convivencia"] .db-stat-badge');
      if (convBadge) {
        const periodo = d.convivencia_periodo || d.periodo_actual;
        const cy = Number(d.convivencia_year);
        if (periodo) {
          convBadge.textContent = cy && cy !== Number(d.year) ? `${periodo} · ${cy}` : String(periodo);
          convBadge.classList.remove('soon');
        }
      }
      updateStat(statsEl, 'descripciones', d.total_descripciones ?? 0);
      const badge = statsEl.querySelector('[data-stat-id="valoraciones"] .db-stat-badge');
      if (badge) badge.textContent = d.periodo_actual || 'Periodo actual';
      const descBadge = statsEl.querySelector('[data-stat-id="descripciones"] .db-stat-badge');
      if (descBadge && d.porcentaje_descripciones !== undefined) descBadge.textContent = d.porcentaje_descripciones + '%';
      const periodRow = container.querySelector('.db-id-row .key');
      if (periodRow && periodRow.textContent.trim() === 'Período activo') {
        const valEl = periodRow.closest('.db-id-row').querySelector('[data-row-val]');
        if (valEl && d.periodo_actual) valEl.textContent = d.periodo_actual;
      }
    } else if (res?.error) {
      console.error('[Dashboard] API error:', res.error);
    }
  } catch (e) {
    console.error('[Dashboard] hydrate exception:', e);
  }

  // Notifications unread count
  try {
    const res = await notifications.getUnreadCount();
    if (res?.success) {
      const count = Number(res.data?.count ?? res.data?.unread ?? 0) || 0;
      updateStat(statsEl, 'notificaciones', count);
    } else {
      updateStat(statsEl, 'notificaciones', 0);
    }
  } catch {
    updateStat(statsEl, 'notificaciones', 0);
  }

  // Activity feed — recent module access + logins
  try {
    const res = await activity.getRecent();
    if (res?.success) {
      const list = Array.isArray(res.data) ? res.data : [];
      hydrateActivity(container, list);
    } else {
      hydrateActivity(container, []);
    }
  } catch {
    hydrateActivity(container, []);
  }
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to fallback
  }
  // Fallback: hidden textarea + execCommand
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

let toastTimer = null;
function showToast(el, message, variant = 'ok') {
  if (!el) return;
  clearTimeout(toastTimer);
  const icon = variant === 'ok' ? 'bi-check-circle-fill' : variant === 'warn' ? 'bi-exclamation-circle-fill' : 'bi-x-circle-fill';
  el.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i> ${message}`;
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
