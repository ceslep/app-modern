import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/main.css';

// Thinking-orb loaders: auto-mounts any [data-orb] element (incl. injected markup).
import './components/thinkingOrb.js';

// Legacy PHP preload — fires immediately (geolocaliza, getInfoDocentes, getasignacion, etc.)
import './services/preload.js';

import { initModals } from './utils/modal.js';
import { initNavbar, refreshNavbar } from './components/navbar.js';
import { refreshSidebar } from './components/sidebar.js';
import { loginModule } from './modules/login.js';
import { initIconSelect } from './components/icon-select.js';
import { initDevSwitcher, refreshDevSwitcher } from './components/dev-switcher.js';
import { auth } from '@services/auth.js';
import { api } from '@services/api.js';
import { devTagSections } from '@utils/devLabel.js';

// Dev-only: badge each section container with its source module (Alt+D toggles).
const DEV_SECTION_MAP = {
  seccionDashboard:                 'modules/dashboard/index.js',
  seccionInformes:                  'modules/informes.js',
  seccionDescargas:                 'modules/explorador.js',
  seccionDescripciones:             'modules/descripciones.js',
  seccionPuestos:                   'modules/puestos.js',
  seccionRegistroInasistencias:     'modules/registroInasistencias.js',
  seccionInasistencias:             'modules/inasistencias.js',
  seccionControlInasistencias:      'modules/control_asistencia.js',
  seccionConsolidadoInasistencias:  'modules/consolidadoInasistencias.js',
  seccionControlEstudiantes:        'modules/control_estudiantes.js',
  seccionAsignaciones:              'modules/asignaciones.js',
  seccionAdministracion:            'modules/administrativo.js',
  seccionEstadisticas:              'modules/estadisticas.js',
  seccionNotas:                     'modules/notas.js',
  seccionConcentradorNotas:         'modules/concentrador.js',
  seccionCertificados:              'modules/certificados.js',
  seccionConvivencia:               'modules/convivencia.js',
  seccionConsolidadoConvivencia:    'modules/consolidadoConvivencia.js',
  seccionNotificaciones:            'modules/notificaciones.js',
  // Persistent chrome components
  sidebar:                          'components/sidebar.js',
  navbar:                           'components/navbar.js',
};

// Session observer — detects expired sessions and shows cause
import './services/sessionObserver.js';

// Filter population (listens for app:authenticated)
import './modules/filters.js';

// Feature modules (auto-initialize on import)
import './modules/informes.js';
import './modules/notas.js';
import './modules/inasistencias.js';
import './modules/registroInasistencias.js';
import './modules/control_asistencia.js';
import './modules/convivencia.js';
import './modules/estadisticas.js';
import './modules/administrativo.js';
import './modules/certificados.js';
import './modules/notificaciones.js';
import './modules/concentrador.js';
import './modules/consultas.js';
import './modules/asignaciones.js';
import './modules/control_estudiantes.js';
import './modules/descripciones.js';
import './modules/explorador.js';
import './modules/puestos.js';
import './modules/consolidadoInasistencias.js';
import './modules/consolidadoConvivencia.js';

const HEALTH_CHECK_INTERVAL_MS = 60_000;
const HEALTH_CHECK_TIMEOUT_MS = 5_000;
const STORAGE_KEY_DISMISSED = 'maintenance-notice-dismissed';
const STORAGE_KEY_RELOAD_MARK = 'maintenance-notice-reload';

let healthCheckTimer = null;
let healthCheckAbort = null;

function showServiceRestoredToast() {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.className =
    'flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-300 ' +
    'text-emerald-900 rounded-xl shadow-lg min-w-[280px] max-w-sm';
  toast.innerHTML =
    '<i class="bi bi-check-circle-fill text-emerald-500 text-lg flex-shrink-0"></i>' +
    '<div class="flex-1 text-sm">' +
    '<p class="font-semibold">Servicio restablecido</p>' +
    '<p class="text-emerald-700/80 text-xs">Recargando la aplicación…</p>' +
    '</div>';
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 350);
  }, 1500);
}

async function checkBackend() {
  if (healthCheckAbort) {
    try { healthCheckAbort.abort(); } catch {}
  }
  healthCheckAbort = new AbortController();
  const timeoutId = setTimeout(() => {
    try { healthCheckAbort.abort(); } catch {}
  }, HEALTH_CHECK_TIMEOUT_MS);

  try {
    const res = await fetch(`${api.baseUrl}/years`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal: healthCheckAbort.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

function stopHealthCheck() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  if (healthCheckAbort) {
    try { healthCheckAbort.abort(); } catch {}
    healthCheckAbort = null;
  }
}

async function onBackendRestored() {
  stopHealthCheck();
  try { sessionStorage.setItem(STORAGE_KEY_RELOAD_MARK, '1'); } catch {}
  try { sessionStorage.removeItem(STORAGE_KEY_DISMISSED); } catch {}
  showServiceRestoredToast();
  setTimeout(() => {
    window.location.reload();
  }, 1200);
}

function startHealthCheck(notice) {
  if (healthCheckTimer) return;
  if (sessionStorage.getItem(STORAGE_KEY_RELOAD_MARK) === '1') {
    sessionStorage.removeItem(STORAGE_KEY_RELOAD_MARK);
  }

  const tick = async () => {
    if (document.hidden) return;
    if (!document.getElementById('maintenance-notice')) {
      stopHealthCheck();
      return;
    }
    const ok = await checkBackend();
    if (ok) {
      if (notice) {
        notice.style.transition = 'opacity 0.3s, transform 0.3s';
        notice.style.opacity = '0';
        notice.style.transform = 'translateY(-100%)';
        setTimeout(() => notice.remove(), 350);
      }
      document.body.style.paddingTop = '0px';
      onBackendRestored();
    }
  };

  healthCheckTimer = setInterval(tick, HEALTH_CHECK_INTERVAL_MS);

  // Primer chequeo rápido (a los 5s) para no esperar 60s si ya está caído
  setTimeout(tick, 5_000);
}

function setupMaintenanceNotice() {
  const notice = document.getElementById('maintenance-notice');
  const noticeClose = document.getElementById('maintenance-notice-close');
  if (!notice) return;

  // Si el usuario ya lo cerró en esta sesión, no lo volvemos a mostrar
  const dismissed = sessionStorage.getItem(STORAGE_KEY_DISMISSED) === '1';
  if (dismissed) {
    notice.remove();
    return;
  }

  // Mientras verificamos el backend, mantenemos el aviso oculto para
  // evitar falsos positivos cuando el sistema está en línea.
  notice.style.display = 'none';

  const showNotice = () => {
    if (!document.getElementById('maintenance-notice')) return;
    notice.style.display = '';

    const applyOffset = () => {
      if (document.getElementById('maintenance-notice')) {
        document.body.style.paddingTop = notice.offsetHeight + 'px';
      }
    };
    applyOffset();
    window.addEventListener('resize', applyOffset);

    const dismiss = () => {
      stopHealthCheck();
      document.body.style.paddingTop = '0px';
      notice.style.transition = 'opacity 0.25s, transform 0.25s';
      notice.style.opacity = '0';
      notice.style.transform = 'translateY(-100%)';
      setTimeout(() => notice.remove(), 280);
      try { sessionStorage.setItem(STORAGE_KEY_DISMISSED, '1'); } catch {}
    };

    if (noticeClose) noticeClose.addEventListener('click', dismiss);

    // Si el usuario lo deja abierto, sondeamos cada 60s y recargamos al
    // restablecerse el servicio.
    startHealthCheck(notice);
  };

  // Health check inicial rápido: si el backend responde, el aviso nunca
  // aparece; si falla, lo mostramos y activamos el polling de 60s.
  (async () => {
    const ok = await checkBackend();
    if (ok) {
      // Backend en línea: descartamos el aviso silenciosamente.
      notice.remove();
    } else {
      // Backend caído: mostramos el aviso y empezamos a sondear.
      showNotice();
    }
  })();
}

async function init() {
  console.log('I.E. de Occidente - Sistema Academico v2.0.0');

  setupMaintenanceNotice();

  initNavbar();
  initModals();

  initIconSelect('tipoFalta', { icon: 'bi-exclamation-triangle' });
  initIconSelect('certTemplate', { icon: 'bi-file-earmark-text' });
  initIconSelect('notificacionTipo', { icon: 'bi-bell' });

  await initDevSwitcher();

  await loginModule.start();

  // Si hay sesión cacheada, refrescar desde el servidor para obtener
  // campos nuevos (acceso_total, etc.) y refrescar el navbar.
  if (auth.getUser() && auth.getUser().id) {
    try {
      await auth.checkSession(true);
      refreshNavbar();
    } catch {}
  }

  window.addEventListener('app:authenticated', () => {
    refreshDevSwitcher();
    refreshNavbar();
    refreshSidebar();
  });

  window.location.hash = 'no-back-button';
  window.location.hash = 'Again-No-back-button';
  window.onhashchange = function () {
    window.location.hash = 'no-back-button';
  };

  devTagSections(DEV_SECTION_MAP);

  console.log('Aplicación inicializada correctamente');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
