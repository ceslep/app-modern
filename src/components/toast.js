/**
 * Toast notification component
 */
import { showToast } from '../utils/alert.js';

/**
 * Show a success toast
 */
export function toastSuccess(message) {
  return showToast(message, 'success');
}

/**
 * Show an error toast
 */
export function toastError(message) {
  return showToast(message, 'error');
}

/**
 * Show a warning toast
 */
export function toastWarning(message) {
  return showToast(message, 'warning');
}

/**
 * Show an info toast
 */
export function toastInfo(message) {
  return showToast(message, 'info');
}

/**
 * Create an inline alert element
 */
const ALERT_STYLES = {
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  danger: 'bg-red-50 border-red-200 text-red-700',
  error: 'bg-red-50 border-red-200 text-red-700',
};

export function createAlert(message, type = 'info', dismissible = true) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `px-4 py-3 rounded-xl border text-sm ${ALERT_STYLES[type] || ALERT_STYLES.info} ${dismissible ? 'flex items-center justify-between' : ''}`;
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `<span>${message}</span>`;

  if (dismissible) {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'ml-3 text-current/60 hover:text-current/90 transition-colors';
    closeBtn.innerHTML = '<i class="bi bi-x-lg text-xs"></i>';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.addEventListener('click', () => {
      alertDiv.remove();
    });
    alertDiv.appendChild(closeBtn);
  }

  return alertDiv;
}

/**
 * Show an inline alert in a container
 */
export function showAlert(containerId, message, type = 'info') {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Remove existing alerts
  container.querySelectorAll('[role="alert"]').forEach((el) => el.remove());

  const alert = createAlert(message, type);
  container.prepend(alert);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (alert.parentNode) {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 150);
    }
  }, 5000);
}

/**
 * Show an inline error alert
 */
export function showError(containerId, message) {
  showAlert(containerId, message, 'danger');
}

/**
 * Show an inline success alert
 */
export function showSuccess(containerId, message) {
  showAlert(containerId, message, 'success');
}
