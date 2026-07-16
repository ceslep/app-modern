/**
 * Convivencia (Behavior/Discipline) Module
 */
import { convivencia } from '@services/convivencia.js';
import { showModal, hideModal } from '@utils/modal.js';
import { alertSuccess, alertError, alertWarning, alertConfirm, showLoading, closeLoading } from '@utils/alert.js';
import { createDoughnutChart, destroyAllCharts } from '@utils/chart.js';
import { showSkeleton, hideSkeleton } from '@components/skeleton.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';
import { formatDate } from '@utils/format.js';
import { FAULT_TYPES } from '@config/constants.js';

class ConvivenciaModule {
  constructor() {
    this.currentStudent = null;
    this.signaturePad = null;
    this.init();
  }

  init() {
    // Save convivencia form
    delegate($('seccionConvivencia'), 'click', '#btnGuardarConvivencia', () => {
      this.saveConvivencia();
    });

    // Open signature pad
    delegate($('seccionConvivencia'), 'click', '.btn-firmar', () => {
      showModal('modalFirma');
    });
  }

  async saveConvivencia() {
    const form = $('frmConvivencia');
    if (!form) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Validation
    if (!data.tipoFalta) {
      alertWarning('Seleccione el tipo de falta');
      return;
    }
    if (!data.situaciones || data.situaciones.length === 0) {
      alertWarning('Seleccione al menos una situación');
      return;
    }
    if (!data.hora) {
      alertWarning('Seleccione la hora de la falta');
      return;
    }
    if (!data.fecha) {
      alertWarning('Seleccione la fecha');
      return;
    }
    if (!data.descripcion || data.descripcion.length < 20) {
      alertWarning('La descripción debe tener al menos 20 caracteres');
      return;
    }

    showLoading('Guardando registro de convivencia...');
    try {
      await convivencia.create(data);
      closeLoading();
      alertSuccess('Registro de convivencia guardado exitosamente');
      form.reset();
    } catch (error) {
      closeLoading();
      alertError('Error', error.message);
    }
  }

  async loadStudentConvivencia(studentId) {
    showSkeleton('contenedorConvivenciaEstudiante', { variant: 'list', count: 5 });
    try {
      const response = await convivencia.getByStudent(studentId);
      this.currentStudent = studentId;
      this.renderStudentConvivencia(response.data || []);
    } catch (error) {
      alertError('Error', error.message);
    } finally {
      hideSkeleton('contenedorConvivenciaEstudiante');
    }
  }

  renderStudentConvivencia(records) {
    const container = $('contenedorConvivenciaEstudiante');
    if (!container) return;

    if (records.length === 0) {
      container.innerHTML = `
        <div class="text-center p-4 text-gray-400">
          <i class="bi bi-check-circle" style="font-size: 3rem;"></i>
          <p class="mt-2">No hay registros de convivencia</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((r) => `
              <tr>
                <td>${formatDate(r.fecha)}</td>
                <td><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.tipoFalta === '3' ? 'bg-red-100 text-red-700' : r.tipoFalta === '2' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}"
                  ${escapeHtml(r.tipoFaltaLabel || r.tipoFalta)}
                </span></td>
                <td>${escapeHtml(r.descripcion || '')}</td>
                <td>${escapeHtml(r.estado || 'Pendiente')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  async loadStats(year, nivel, numero) {
    showSkeleton('contenedorEstadisticasConv', { variant: 'stats', count: 4 });
    try {
      const response = await convivencia.getStats(year, nivel, numero);
      this.renderStats(response.data || {});
    } catch (error) {
      alertError('Error', error.message);
    } finally {
      hideSkeleton('contenedorEstadisticasConv');
    }
  }

  renderStats(data) {
    const container = $('contenedorEstadisticasConv');
    if (!container) return;

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100">
            <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Distribución por Tipo de Falta</div>
            <div class="p-4">
              <canvas id="chartConvivencia" style="max-height: 300px;"></canvas>
            </div>
          </div>
        </div>
        <div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100">
            <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Resumen</div>
            <div class="p-4">
              <div class="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div class="text-lg font-bold text-blue-500">${data.leves || 0}</div>
                  <small>Leves</small>
                </div>
                <div>
                  <div class="text-lg font-bold text-amber-500">${data.graves || 0}</div>
                  <small>Graves</small>
                </div>
                <div>
                  <div class="text-lg font-bold text-red-500">${data.gravisimas || 0}</div>
                  <small>Gravísimas</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Create doughnut chart
    if (data.leves || data.graves || data.gravisimas) {
      createDoughnutChart('chartConvivencia', ['Leves', 'Graves', 'Gravísimas'], [
        data.leves || 0,
        data.graves || 0,
        data.gravisimas || 0,
      ]);
    }
  }

  cleanup() {
    destroyAllCharts();
  }
}

// Initialize module
new ConvivenciaModule();
