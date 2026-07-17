import { delegate } from '../utils/dom.js';
import { notifications } from '../services/notifications.js';
import { auth } from '../services/auth.js';

const SECTIONS = [
  { id: 'dashboard',        label: 'Dashboard',         icon: 'bi-speedometer2',     sectionId: 'seccionDashboard' },
  { id: 'informes',         label: 'Informes',          icon: 'bi-file-earmark-text', sectionId: 'seccionInformes' },
  { id: 'descargas',        label: 'Descargas',         icon: 'bi-download',          sectionId: 'seccionDescargas' },
  { id: 'descripciones',    label: 'Descripciones',     icon: 'bi-card-text',         sectionId: 'seccionDescripciones' },
  { id: 'puestos',          label: 'Puestos',           icon: 'bi-trophy',            sectionId: 'seccionPuestos' },
  { id: 'divider1',                                                            divider: true },
  { id: 'inasistencias',    label: 'Inasistencias',     icon: 'bi-person-x', sub: [
    { id: 'seccionRegistroInasistencias',  label: 'Registrar Inasistencia' },
    { id: 'seccionInasistencias',          label: 'Inasistencias' },
    { id: 'seccionControlInasistencias',   label: 'Control Asistencia' },
    { id: 'seccionObservador',             label: 'Observador' },
    { id: 'seccionConsolidadoInasistencias', label: 'Consolidado Inasistencias' },
  ]},
  { id: 'divider2',                                                            divider: true },
  { id: 'administrativo',   label: 'Admin.',            icon: 'bi-gear', sub: [
    { id: 'seccionControlEstudiantes',    label: 'Estudiantes' },
    { id: 'seccionAsignaciones',          label: 'Asignación Asig.', maestra: true },
    { id: 'seccionSubirNotas',            label: 'Subir Notas' },
    { id: 'seccionTiemposDocentes',       label: 'Tiempos Docentes' },
    { id: 'seccionHistoricoDocentes',     label: 'Histórico Docentes' },
    { id: 'seccionMensajeNotas',          label: 'Mensaje Notas' },
    { id: 'seccionCerrarNotas',           label: 'Cerrar Notas' },
    { id: 'seccionActivarNotas',          label: 'Activar Notas' },
    { id: 'seccionCantidades',            label: 'Consultar Cantidades' },
    { id: 'seccionVerificarFinales',      label: 'Verificar Finales' },
    { id: 'seccionLog',                   label: 'Log del Sistema' },
  ]},
  { id: 'divider3',                                                            divider: true },
  { id: 'estadisticas',     label: 'Estadísticas',      icon: 'bi-bar-chart',         sectionId: 'seccionEstadisticas' },
  { id: 'docentes',         label: 'Docentes',          icon: 'bi-person-badge',      sectionId: 'seccionDocentes' },
  { id: 'notas',            label: 'Notas',             icon: 'bi-journal-text', sub: [
    { id: 'seccionNotas',               label: 'Registrar Notas' },
    { id: 'seccionConcentradorNotas',   label: 'Concentrador Académico' },
  ]},
  { id: 'divider4',                                                            divider: true },
  { id: 'certificados',     label: 'Certificados',      icon: 'bi-award', sub: [
    { id: 'seccionCertificados',        label: 'Generar Certificados' },
  ]},
  { id: 'convivencia',      label: 'Convivencia',       icon: 'bi-people', sub: [
    { id: 'seccionConvivencia',            label: 'Reportar Convivencia' },
    { id: 'seccionConsolidadoConvivencia', label: 'Consolidado de Convivencia' },
    { id: 'seccionConsultaEstudiante',     label: 'Consultar Estudiante' },
  ]},
  { id: 'divider5',                                                            divider: true },
  { id: 'notificaciones',   label: 'Notificaciones',    icon: 'bi-bell', badge: true, sectionId: 'seccionNotificaciones' },
];

let currentSection = 'dashboard';
let notificationCount = 0;

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
            <i class="bi ${s.icon}"></i>
            <span class="flex-1">${s.label}</span>
            <i class="bi bi-chevron-down text-xs transition-transform duration-200 ml-auto"></i>
          </button>
          <div class="ml-3 mt-1 space-y-0.5 hidden overflow-hidden transition-all duration-300" id="sub-${s.id}">
            ${visibleSubs.map((sub) => `
              <a href="#" class="sidebar-link text-sm pl-10" data-section="${sub.id}">
                ${sub.label}
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
        <i class="bi ${s.icon}"></i>
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
      const chevron = target.querySelector('.bi-chevron-down');
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
