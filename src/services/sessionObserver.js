import { auth } from '@services/auth.js';
import { loginModule } from '@modules/login.js';
import { alertWarning } from '@utils/alert.js';
import Swal from 'sweetalert2';

// ── Global 401 interceptor ──
// Catch ALL fetch() calls (including direct fetch() that bypass api.js)
// so every 401 triggers the session-expired event.
const _origFetch = window.fetch;
window.fetch = async function (input, init) {
  const response = await _origFetch.call(window, input, init);
  if (response.status === 401 && !window._sessionExpiredDispatched) {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.includes('auth/session')) return response;
    window._sessionExpiredDispatched = true;
    try {
      const cloned = response.clone();
      const data = await cloned.json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent('auth:session-expired', {
        detail: { message: data?.error || 'Sesión expirada. Inicie sesión nuevamente.' },
      }));
    } catch {
      window.dispatchEvent(new CustomEvent('auth:session-expired', {
        detail: { message: 'Sesión expirada. Inicie sesión nuevamente.' },
      }));
    }
  }
  return response;
};

// ── Event handler ──
function handleSessionExpired(e) {
  const cause = e.detail?.message || 'Su sesión ha expirado por inactividad.';
  Swal.close();
  auth.clearSession();
  alertWarning('Sesión expirada', cause).then(() => {
    window._sessionExpiredDispatched = false;
    loginModule.gate();
  });
}

window.addEventListener('auth:session-expired', handleSessionExpired);
