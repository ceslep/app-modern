/**
 * Preload all original PHP endpoints, exactly as the legacy app does.
 * These fire immediately when the module is imported (before login).
 */
import { alertError } from '@utils/alert.js';
import { endpoint } from '@config/endpoints.js';

// Shared data store — other modules read from here
export const preloaded = {
  sedes: null,
  docentes: null,
  years: null,
  periodosNotas: null,
  geolocation: null,
  notificaciones: null,
  concentrador: null,
};

// -------------------------------------------------------------------
// 1. Geolocation check — blocks access if not Colombia
// -------------------------------------------------------------------
(async function checkGeolocation() {
  try {
    const res = await fetch(endpoint('/geolocaliza.php'));
    const data = await res.json();
    preloaded.geolocation = data;
    if (data.co === 'nodisponible' || data.co === 'nodisponible con proxy') {
      await alertError('Acceso restringido', 'App solo disponible para Colombia');
      window.location.href = 'https://www.google.com';
    }
  } catch {
    // Silently fail — geolocation is a soft check
  }
})();

// -------------------------------------------------------------------
// 2. Docentes list
// -------------------------------------------------------------------
(async function loadDocentes() {
  try {
    const res = await fetch(endpoint('/getInfoDocentes.php'));
    preloaded.docentes = await res.json();
  } catch { /* ignore */ }
})();

// -------------------------------------------------------------------
// 3. Sedes / asignaciones
// -------------------------------------------------------------------
(async function loadSedes() {
  try {
    const res = await fetch(endpoint('/getasignacion.php'));
    preloaded.sedes = await res.json();
  } catch { /* ignore */ }
})();

// -------------------------------------------------------------------
// 4. Years
// -------------------------------------------------------------------
(async function loadYears() {
  try {
    const res = await fetch(endpoint('/getYearsData.php'));
    preloaded.years = await res.json();
  } catch { /* ignore */ }
})();

// -------------------------------------------------------------------
// 5. PeriodosNotas (periods for grade entry)
// -------------------------------------------------------------------
(async function loadPeriodosNotas() {
  try {
    const res = await fetch(endpoint('/getPeriodosNotas.php'));
    preloaded.periodosNotas = await res.json();
  } catch { /* ignore */ }
})();

// -------------------------------------------------------------------
// 6. Notificaciones (requires auth; called lazily via getter)
// -------------------------------------------------------------------
export async function loadNotificaciones() {
  if (preloaded.notificaciones) return preloaded.notificaciones;
  try {
    const res = await fetch(endpoint('/getNotificaciones.php'));
    preloaded.notificaciones = await res.json();
  } catch { /* ignore */ }
  return preloaded.notificaciones;
}

// -------------------------------------------------------------------
// 7. Concentrador (requires auth; called lazily via getter)
// -------------------------------------------------------------------
export async function loadConcentrador(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint('/getConcentrador.php')}?${query}` : endpoint('/getConcentrador.php');
    const res = await fetch(url);
    preloaded.concentrador = await res.json();
  } catch { /* ignore */ }
  return preloaded.concentrador;
}

// -------------------------------------------------------------------
// Helper: wait for a specific preload to complete
// -------------------------------------------------------------------
export function waitFor(key) {
  return new Promise((resolve) => {
    if (preloaded[key] !== null) return resolve(preloaded[key]);
    const check = setInterval(() => {
      if (preloaded[key] !== null) {
        clearInterval(check);
        resolve(preloaded[key]);
      }
    }, 50);
  });
}
