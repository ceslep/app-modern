/**
 * Notificaciones (Notifications) Module
 */
import { notifications } from '@services/notifications.js';
import { showModal, hideModal } from '@utils/modal.js';
import { alertSuccess, alertError, alertWarning, alertConfirm, showLoading, closeLoading } from '@utils/alert.js';
import { showSkeleton, hideSkeleton } from '@components/skeleton.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';
import { formatDateTime } from '@utils/format.js';

class NotificacionesModule {
  constructor() {
    this.init();
  }

  init() {
    // Create notification form
    const form = $('frmNotificacion');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createNotification();
      });
    }

    // Show all notifications toggle
    const chkAll = $('mostrarTodasNotificaciones');
    if (chkAll) {
      chkAll.addEventListener('change', () => {
        this.loadNotifications(chkAll.checked);
      });
    }
  }

  async loadNotifications(showAll = false) {
    showSkeleton('contenedorNotificaciones', { variant: 'list', count: 5 });
    try {
      const response = await notifications.getAll({ all: showAll });
      this.renderNotifications(response.data || []);
    } catch (error) {
      alertError('Error', error.message);
      hideSkeleton('contenedorNotificaciones');
    }
  }

  renderNotifications(items) {
    const container = $('contenedorNotificaciones');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="text-center p-4 text-gray-400">
          <i class="bi bi-bell" style="font-size: 3rem;"></i>
          <p class="mt-2">No hay notificaciones</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="divide-y divide-gray-100">
        ${items.map((n) => `
          <div class="px-4 py-3 flex justify-between items-start ${n.leida ? 'bg-white' : 'bg-[#f5f3ff] border-l-4 border-l-[#543391]'}">
            <div class="mr-2">
              <div class="font-semibold">${escapeHtml(n.titulo || 'Notificación')}</div>
              <p class="text-sm text-gray-600">${escapeHtml(n.texto || n.mensaje || '')}</p>
              <small class="text-gray-400">${formatDateTime(n.fecha)}</small>
            </div>
            ${!n.leida ? `
              <button class="px-2 py-1 text-xs font-medium rounded-lg text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors btn-mark-read" data-id="${n.ind || n.id}">
                <i class="bi bi-check-lg"></i>
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;

    // Mark as read
    delegate(container, 'click', '.btn-mark-read', async (e, target) => {
      await this.markAsRead(target.dataset.id);
    });
  }

  async markAsRead(id) {
    try {
      await notifications.markAsRead(id);
      this.loadNotifications();
    } catch (error) {
      alertError('Error', error.message);
    }
  }

  async createNotification() {
    const form = $('frmNotificacion');
    if (!form) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    if (!data.tipo) {
      alertWarning('Seleccione el tipo de notificación');
      return;
    }
    if (!data.texto) {
      alertWarning('Ingrese el texto de la notificación');
      return;
    }

    showLoading('Enviando notificación...');
    try {
      await notifications.create(data);
      closeLoading();
      alertSuccess('Notificación enviada exitosamente');
      form.reset();
    } catch (error) {
      closeLoading();
      alertError('Error', error.message);
    }
  }
}

// Initialize module
new NotificacionesModule();
