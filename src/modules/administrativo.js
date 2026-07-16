/**
 * Administrativo (Administrative) Module
 */
import { students } from '@services/students.js';
import { grades } from '@services/grades.js';
import { createTable, buildColumns, exportToCsv } from '@utils/table.js';
import { showModal, hideModal } from '@utils/modal.js';
import { alertSuccess, alertError, alertWarning, alertConfirm, showLoading, closeLoading } from '@utils/alert.js';
import { showSpinner, hideSpinner, withFullscreenSpinner } from '@components/spinner.js';
import { showSkeleton, hideSkeleton } from '@components/skeleton.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';
import { formatDate, formatNumber } from '@utils/format.js';
import { DOCUMENT_TYPES, GENDER_OPTIONS, BLOOD_TYPES, DISABILITY_TYPES, ETHNICITY_OPTIONS } from '@config/constants.js';

class AdministrativoModule {
  constructor() {
    this.table = null;
    this.currentFilter = {};
    this.init();
  }

  init() {
    // Student form submission
    const form = $('frmEstugrupos');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveStudent();
      });
    }

    // New student button
    delegate($('seccionAdministracion'), 'click', '#btnnewestugrupos', () => {
      this.showNewStudentForm();
    });

    // Student list button
    delegate($('seccionAdministracion'), 'click', '#btnnewestugruposLista', () => {
      showModal('modalCandidatos');
      this.loadCandidates();
    });

    // Load students button
    delegate($('seccionAdministracion'), 'click', '#btnsstugrupos', () => {
      this.loadStudents();
    });
  }

  async loadStudents() {
    const year = $('yearestugrupos')?.value;
    if (!year) {
      alertWarning('Seleccione un año');
      return;
    }

    showSkeleton('contenedorAdministracion', { variant: 'table', rows: 8, cols: 5 });
    try {
      const response = await students.getAll(year);
      this.renderStudentsTable(response.data || []);
    } catch (error) {
      alertError('Error', error.message);
      hideSkeleton('contenedorAdministracion');
    }
  }

  renderStudentsTable(data) {
    const container = $('contenedorAdministracion');
    if (!container) return;

    container.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <div class="flex gap-2">
          <input type="text" class="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all" id="searchEstugrupos"
                 placeholder="Buscar estudiante..." style="width: 250px;">
          <select class="custom-select custom-select-sm" id="yearestugrupos" style="width: 100px;">
          </select>
        </div>
        <button class="px-3 py-1.5 text-xs font-medium text-white bg-[#543391] hover:bg-[#432977] rounded-lg transition-colors" id="btnnewestugrupos">
          <i class="bi bi-plus-lg"></i> Nuevo Estudiante
        </button>
      </div>
      <div id="tableEstudiantes"></div>
    `;

    const columns = [
      { formatter: 'rownum', hozAlign: 'center', width: 40 },
      {
        title: 'Código',
        field: 'codigo',
        width: 100,
        headerFilter: 'input',
      },
      {
        title: 'Nombres',
        field: 'nombres',
        width: 200,
        headerFilter: 'input',
      },
      {
        title: 'Documento',
        field: 'documento',
        width: 120,
      },
      {
        title: 'Grado',
        field: 'grado',
        width: 100,
      },
      {
        title: 'Estado',
        field: 'estado',
        width: 100,
        formatter: (cell) => {
          const val = cell.getValue();
          return val === 'A' || val === 'Activo'
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Activo</span>'
            : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inactivo</span>';
        },
      },
      {
        title: 'Acciones',
        width: 120,
        formatter: (cell) => {
          const data = cell.getRow().getData();
          return `
            <div class="btn-group btn-group-sm">
              <button class="px-2 py-1 text-xs font-medium rounded-lg text-[#543391] hover:bg-[#543391]/5 border border-[#543391]/20 transition-colors btn-edit-student" data-id="${data.estudiante}" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="px-2 py-1 text-xs font-medium rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors btn-view-student" data-id="${data.estudiante}" title="Ver historial">
                <i class="bi bi-clock-history"></i>
              </button>
              <button class="px-2 py-1 text-xs font-medium rounded-lg text-amber-600 hover:bg-amber-50 border border-amber-200 transition-colors btn-change-group" data-id="${data.estudiante}" title="Cambiar grupo">
                <i class="bi bi-arrow-left-right"></i>
              </button>
            </div>
          `;
        },
      },
    ];

    this.table = createTable('tableEstudiantes', columns, data, {
      layout: 'fitDataFill',
      placeholder: 'No hay estudiantes',
    });

    // Search
    const searchInput = $('searchEstugrupos');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const val = searchInput.value.toLowerCase();
        this.table.setHeaderFilterValue('nombres', val);
      });
    }
  }

  async showNewStudentForm() {
    showModal('modalEstugrupos');
    const form = $('frmEstugrupos');
    if (form) form.reset();
  }

  async saveStudent() {
    const form = $('frmEstugrupos');
    if (!form) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    if (!data.eestudiante) {
      alertWarning('Ingrese el número de identificación del estudiante');
      return;
    }

    showLoading('Guardando estudiante...');
    try {
      if (data.editando === 'true') {
        await students.update(data.eestudiante, data);
      } else {
        await students.create(data);
      }
      closeLoading();
      alertSuccess('Estudiante guardado exitosamente');
      hideModal('modalEstugrupos');
    } catch (error) {
      closeLoading();
      alertError('Error', error.message);
    }
  }

  async loadCandidates() {
    showSkeleton('contenedorCandidatos', { variant: 'list', count: 6 });
    try {
      const { candidates } = await import('@services/candidates.js');
      const response = await candidates.getAll();
      this.renderCandidates(response.data || []);
    } catch (error) {
      alertError('Error', error.message);
    } finally {
      hideSkeleton('contenedorCandidatos');
    }
  }

  renderCandidates(data) {
    const container = $('contenedorCandidatos');
    if (!container) return;

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead>
            <tr>
              <th><input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391]" id="selectAllCandidates"></th>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((c) => `
              <tr>
                <td><input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391] candidate-check" value="${c.ind}"></td>
                <td>${escapeHtml(c.nombres || '')}</td>
                <td>${escapeHtml(c.documento || '')}</td>
                <td>
                  <button class="px-2 py-1 text-xs font-medium rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors btn-enroll-candidate" data-id="${c.ind}" title="Matricular">
                    <i class="bi bi-check-lg"></i>
                  </button>
                  <button class="px-2 py-1 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition-colors btn-delete-candidate" data-id="${c.ind}" title="Eliminar">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

// Initialize module
new AdministrativoModule();
