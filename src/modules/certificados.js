/**
 * Certificados (Certificates) Module
 */
import { certificates } from '@services/certificates.js';
import { students } from '@services/students.js';
import { showModal, hideModal } from '@utils/modal.js';
import { alertSuccess, alertError, alertWarning, alertConfirm, showLoading, closeLoading } from '@utils/alert.js';
import { showSkeleton, hideSkeleton } from '@components/skeleton.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';
import { forceDownload } from '@utils/download.js';

class CertificadosModule {
  constructor() {
    this.init();
  }

  init() {
    // Search student for certificate
    delegate($('seccionCertificados'), 'click', '#btnSearchStudent', () => {
      this.searchStudent();
    });

    // Generate certificate
    delegate($('seccionCertificados'), 'click', '#btnGenerateCert', () => {
      this.generateCertificate();
    });

    // Bulk generation
    delegate($('seccionCertificados'), 'click', '#btnBulkCert', () => {
      showModal('modalCertificadosBloque');
    });
  }

  async searchStudent() {
    const query = $('searchStudentCert')?.value?.trim();
    if (!query) {
      alertWarning('Ingrese un nombre o código de estudiante');
      return;
    }

    showSkeleton('certSearchResults', { variant: 'list', count: 4 });
    try {
      const response = await students.search(query);
      this.renderSearchResults(response.data || []);
    } catch (error) {
      alertError('Error', error.message);
      hideSkeleton('certSearchResults');
    }
  }

  renderSearchResults(students) {
    const container = $('certSearchResults');
    if (!container) return;

    if (students.length === 0) {
      container.innerHTML = '<p class="text-gray-400">No se encontraron estudiantes</p>';
      return;
    }

    container.innerHTML = `
      <div class="divide-y divide-gray-100">
        ${students.map((s) => `
          <button class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 btn-select-student"
                  data-id="${s.estudiante}" data-name="${escapeHtml(s.nombres)}">
            <strong>${escapeHtml(s.nombres)}</strong>
            <br><small class="text-gray-400">Código: ${escapeHtml(s.codigo || '')}</small>
          </button>
        `).join('')}
      </div>
    `;

    delegate(container, 'click', '.btn-select-student', (e, target) => {
      $('selectedStudentId').value = target.dataset.id;
      $('selectedStudentName').textContent = target.dataset.name;
    });
  }

  async generateCertificate() {
    const studentId = $('selectedStudentId')?.value;
    const template = $('certTemplate')?.value;

    if (!studentId) {
      alertWarning('Seleccione un estudiante');
      return;
    }
    if (!template) {
      alertWarning('Seleccione un tipo de certificado');
      return;
    }

    showLoading('Generando certificado...');
    try {
      const response = await certificates.generate(studentId, template);
      closeLoading();

      if (response.data?.url) {
        await forceDownload(response.data.url, `certificado_${studentId}.pdf`);
        alertSuccess('Certificado generado exitosamente');
      } else {
        alertSuccess('Certificado generado');
      }
    } catch (error) {
      closeLoading();
      alertError('Error', error.message);
    }
  }

  async generateBulk() {
    const template = $('bulkCertTemplate')?.value;
    if (!template) {
      alertWarning('Seleccione un tipo de certificado');
      return;
    }

    const checkboxes = document.querySelectorAll('.candidate-check:checked');
    const ids = [...checkboxes].map((cb) => cb.value);

    if (ids.length === 0) {
      alertWarning('Seleccione al menos un estudiante');
      return;
    }

    const confirmed = await alertConfirm(
      `¿Generar ${ids.length} certificados?`,
      'Esto puede tomar varios minutos'
    );
    if (!confirmed) return;

    showLoading('Generando certificados...');
    try {
      const response = await certificates.generateBulk(ids, template);
      closeLoading();
      alertSuccess(`${ids.length} certificados generados exitosamente`);
    } catch (error) {
      closeLoading();
      alertError('Error', error.message);
    }
  }
}

// Initialize module
new CertificadosModule();
