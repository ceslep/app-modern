import { delegate } from '../utils/dom.js';
import { notifications } from '../services/notifications.js';
import { activity } from '../services/activity.js';
import { auth } from '../services/auth.js';

// thiings.co 3D icons (PNG). Icons by Charlie Clark — https://www.thiings.co
// Vite resolves these to hashed asset URLs at build time.
const ICONS = import.meta.glob('../assets/icons/thiings/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
// Map section key -> resolved URL (key derived from filename)
const ICON_URL = Object.fromEntries(
  Object.entries(ICONS).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1, -4),
    url,
  ]),
);

const SECTIONS = [
  { id: 'dashboard',        label: 'Dashboard',         icon: 'dashboard',      sectionId: 'seccionDashboard' },
  { id: 'informes',         label: 'Informes',          icon: 'informes',       sectionId: 'seccionInformes', maestra: true },
  { id: 'descargas',        label: 'Descargas',         icon: 'descargas',      sectionId: 'seccionDescargas', maestra: true },
  { id: 'descripciones',    label: 'Descripciones',     icon: 'descripciones',  sectionId: 'seccionDescripciones' },
  { id: 'puestos',          label: 'Puestos',           icon: 'puestos',        sectionId: 'seccionPuestos' },
  { id: 'divider1',                                                            divider: true },
  { id: 'inasistencias',    label: 'Inasistencias',     icon: 'inasistencias', sub: [
    { id: 'seccionRegistroInasistencias',  label: 'Registrar Inasistencia', icon: 'pencil' },
    { id: 'seccionInasistencias',          label: 'Inasistencias',          icon: 'hourglass' },
    { id: 'seccionControlInasistencias',   label: 'Control Asistencia',     icon: 'check-mark' },
    { id: 'seccionObservador',             label: 'Observador',             icon: 'eye' },
    { id: 'seccionConsolidadoInasistencias', label: 'Consolidado Inasistencias', icon: 'spreadsheet' },
  ]},
  { id: 'divider2',                                                            divider: true },
  { id: 'administrativo',   label: 'Administrativo',            icon: 'administrativo', maestra: true, sub: [
    { id: 'seccionControlEstudiantes',    label: 'Estudiantes',            icon: 'student' },
    { id: 'seccionAsignaciones',          label: 'Asignación Asig.', maestra: true, icon: 'link-icon' },
    { id: 'seccionSubirNotas',            label: 'Subir Notas',            icon: 'up-arrow' },
    { id: 'seccionTiemposDocentes',       label: 'Tiempos Docentes',       icon: 'wall-clock' },
    { id: 'seccionHistoricoDocentes',     label: 'Histórico Docentes',     icon: 'hourglass' },
    { id: 'seccionMensajeNotas',          label: 'Mensaje Notas',          icon: 'envelope' },
    { id: 'seccionCerrarNotas',           label: 'Cerrar Notas',           icon: 'safe' },
    { id: 'seccionActivarNotas',          label: 'Activar Notas',          icon: 'key' },
    { id: 'seccionCantidades',            label: 'Consultar Cantidades',   icon: 'calculator' },
    { id: 'seccionVerificarFinales',      label: 'Verificar Finales',      icon: 'magnifying-glass' },
    { id: 'seccionLog',                   label: 'Log del Sistema',        icon: 'scroll' },
  ]},
  { id: 'divider3',                                                            divider: true },
  { id: 'estadisticas',     label: 'Estadísticas',      icon: 'estadisticas',         sectionId: 'seccionEstadisticas' },
  { id: 'docentes',         label: 'Docentes',          icon: 'docentes', maestra: true, sectionId: 'seccionDocentes' },
  { id: 'notas',            label: 'Notas',             icon: 'notas', sub: [
    { id: 'seccionNotas',               label: 'Registrar Notas',       icon: 'pencil' },
    { id: 'seccionConcentradorNotas',   label: 'Concentrador Académico', icon: 'abacus' },
  ]},
  { id: 'divider4',                                                            divider: true },
  { id: 'certificados',     label: 'Certificados',      icon: 'certificados', maestra: true, sub: [
    { id: 'seccionCertificados',        label: 'Generar Certificados',  icon: 'graduation-cap' },
  ]},
  { id: 'convivencia',      label: 'Convivencia',       icon: 'convivencia', sub: [
    { id: 'seccionConvivencia',            label: 'Reportar Convivencia',      icon: 'megaphone' },
    { id: 'seccionConsolidadoConvivencia', label: 'Consolidado de Convivencia', icon: 'balance-scale' },
    { id: 'seccionConsultaEstudiante',     label: 'Consultar Estudiante',      icon: 'magnifying-glass' },
  ]},
  { id: 'divider5',                                                            divider: true },
  { id: 'notificaciones',   label: 'Notificaciones',    icon: 'notificaciones', badge: true, sectionId: 'seccionNotificaciones' },
];

let currentSection = 'dashboard';
let notificationCount = 0;

// Render a thiings 3D icon as <img>, falling back to a bootstrap-icon glyph
function iconMarkup(key) {
  const url = ICON_URL[key];
  if (url) {
    return `<img src="${url}" alt="" class="sidebar-icon" width="24" height="24" loading="lazy" />`;
  }
  return `<i class="ti ti-${key}"></i>`;
}

function buildLabelMap() {
  const map = {};
  for (const s of SECTIONS) {
    if (s.divider) continue;
    const sectionId = s.sectionId || s.id;
    map[sectionId] = s.label;
    if (s.sub) {
      for (const sub of s.sub) {
        map[sub.id] = sub.label;
      }
    }
  }
  return map;
}
const LABEL_MAP = buildLabelMap();

function navigateTo(sectionId) {
  document.querySelectorAll('.content-section').forEach((el) => {
    el.classList.add('hidden');
  });
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.remove('hidden');
    currentSection = sectionId;
  }
  // Update active link
  document.querySelectorAll('.sidebar-link').forEach((el) => {
    el.classList.toggle('active', el.dataset.section === sectionId);
  });
  // Close sidebar on mobile when navigating
  if (window.innerWidth < 1024) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.remove();
  }
  // Log module access (fire-and-forget)
  const label = LABEL_MAP[sectionId] || sectionId;
  activity.logModuleAccess(sectionId, label).catch(() => {});
}

function renderUserProfile() {
  const user = auth.getUser();
  if (!user) return;
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-avatar-text');
  if (nameEl) nameEl.textContent = user.nombres || 'Usuario';
  if (roleEl) {
    if (auth.isMaestra()) roleEl.textContent = 'Maestra';
    else if (auth.isCoordinador()) roleEl.textContent = 'Coordinador';
    else roleEl.textContent = 'Docente';
  }
  if (avatarEl) avatarEl.textContent = (user.nombres || 'U').charAt(0).toUpperCase();
}

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  // Filter sections by access level
  const visibleSections = SECTIONS.filter((s) => {
    if (s.maestra && !auth.isMaestra()) return false;
    return true;
  });

  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Menú principal');
  nav.innerHTML = visibleSections.map((s) => {
    if (s.divider) {
      return '<div class="divider-gradient my-2"></div>';
    }
    if (s.sub) {
      const visibleSubs = s.sub.filter((sub) => !(sub.maestra && !auth.isMaestra()));
      if (visibleSubs.length === 0) return '';
      return `
        <div>
          <button class="sidebar-link w-full text-left" data-toggle-sub="${s.id}">
            ${iconMarkup(s.icon)}
            <span class="flex-1">${s.label}</span>
            <i class="bi bi-chevron-down sidebar-chevron text-xs transition-transform duration-200 ml-auto"></i>
          </button>
          <div class="ml-3 mt-1 space-y-0.5 hidden overflow-hidden transition-all duration-300" id="sub-${s.id}">
            ${visibleSubs.map((sub) => `
              <a href="#" class="sidebar-link sidebar-sublink text-sm" data-section="${sub.id}">
                ${sub.icon ? iconMarkup(sub.icon) : ''}
                <span class="flex-1">${sub.label}</span>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }
    const badge = s.badge && notificationCount > 0
      ? `<span class="badge ml-auto">${notificationCount}</span>`
      : '';
    return `
      <a href="#" class="sidebar-link ${currentSection === s.id ? 'active' : ''}"
         data-section="${s.sectionId || s.id}">
        ${iconMarkup(s.icon)}
        <span class="flex-1">${s.label}</span>
        ${badge}
      </a>
    `;
  }).join('');

  // Set initial active (handle both prefixed and non-prefixed section IDs)
  const sectionToMatch = currentSection === 'dashboard' ? 'seccionDashboard' : currentSection;
  const activeLink = nav.querySelector(`.sidebar-link[data-section="${sectionToMatch}"]`);
  if (activeLink) activeLink.classList.add('active');
}

function setupEvents() {
  // Section navigation
  delegate(document, 'click', '.sidebar-link[data-section]', (e, target) => {
    e.preventDefault();
    navigateTo(target.dataset.section);
  });

  // Submenu toggles
  delegate(document, 'click', '[data-toggle-sub]', (e, target) => {
    e.preventDefault();
    const sub = document.getElementById(`sub-${target.dataset.toggleSub}`);
    if (sub) {
      sub.classList.toggle('hidden');
      const chevron = target.querySelector('.sidebar-chevron');
      if (chevron) chevron.style.transform = sub.classList.contains('hidden') ? '' : 'rotate(180deg)';
    }
  });
}

async function updateNotificationBadge() {
  try {
    const res = await notifications.getUnreadCount();
    if (res.success) {
      notificationCount = res.data?.count || 0;
      const badge = document.querySelector('.sidebar-link[data-section="seccionNotificaciones"] .badge');
      if (badge) {
        badge.textContent = notificationCount;
        badge.style.display = notificationCount > 0 ? 'inline' : 'none';
      }
    }
  } catch { /* ignore */ }
}

let eventsInitialized = false;

export function initSidebar() {
  renderSidebar();
  renderUserProfile();
  if (!eventsInitialized) {
    setupEvents();
    eventsInitialized = true;
  }
  navigateTo('seccionDashboard');
  updateNotificationBadge();
  setInterval(updateNotificationBadge, 60000);
}

export function refreshSidebar() {
  renderSidebar();
  renderUserProfile();
  if (!eventsInitialized) {
    setupEvents();
    eventsInitialized = true;
  }
  updateNotificationBadge();
}

export function navigateToSection(sectionId) {
  navigateTo(sectionId);
}



