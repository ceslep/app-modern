/**
 * Asignaciones Module — Admin CRUD para la tabla `asignacion_asignaturas`
 *
 * Solo visible para usuarios Maestra. Incluye:
 * - Filtros por año, sede, nivel, número, docente, asignatura
 * - Tabla Tabulator (editable inline vía modal)
 * - Modal de creación/edición con todos los campos
 * - Eliminación con confirmación
 */
import { asignaciones } from '@services/asignaciones.js';
import { auth } from '@services/auth.js';
import { escapeHtml, $, delegate, debounce } from '@utils/dom.js';
import { alertSuccess, alertError, alertWarning, alertConfirm, showLoading, closeLoading } from '@utils/alert.js';
import { showModal, hideModal } from '@utils/modal.js';

class AsignacionesModule {
  constructor() {
    this.table = null;
    this.currentFilters = {};
    this.activated = false;

    // ── 1) Listen for the global auth event (fresh login) ──
    document.addEventListener('app:authenticated', () => this._tryActivate());

    // ── 2) Watch the section element: activate when it becomes visible ──
    this._initObserver();

    // ── 3) Fallback: try once the DOM is fully ready ──
    if (document.readyState === 'complete') {
      setTimeout(() => this._tryActivate(), 100);
    } else {
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete') {
          setTimeout(() => this._tryActivate(), 100);
        }
      });
    }
  }

  /** Watch the section's `hidden` class to detect sidebar navigation. */
  _initObserver() {
    const section = document.getElementById('seccionAsignaciones');
    if (!section) {
      // Section might not be in DOM yet; retry after a tick
      setTimeout(() => this._initObserver(), 50);
      return;
    }
    this._observer = new MutationObserver(() => {
      if (!section.classList.contains('hidden')) {
        // Section became visible → try to activate
        this._tryActivate();
      }
    });
    this._observer.observe(section, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  activate() {
    this._tryActivate();
  }

  /** Try to activate if we have an authenticated Maestra user. */
  _tryActivate() {
    if (this.activated) return;

    // If no user yet, try to restore from cache
    if (!auth.getUser() || !auth.getUser().id) {
      auth.loadSession();
    }

    const user = auth.getUser();
    if (!user || !user.id) return; // still no session

    if (!auth.isMaestra()) {
      const section = $('seccionAsignaciones');
      if (section) section.classList.add('hidden');
      this.activated = true;
      return;
    }

    this.activated = true;
    this.setupUI();
    this.populateFilters();
    this.bindEvents();
  }



  /* ──────────────────────────────────────────────────────────────── */
  /*  UI SETUP                                                       */
  /* ──────────────────────────────────────────────────────────────── */

  setupUI() {
    const container = $('seccionAsignaciones');
    if (!container) return;

    container.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h2 class="section-heading mb-0">
          <i class="bi bi-diagram-3 text-[#543391]"></i> Asignación de Asignaturas
        </h2>
        <span class="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full
                     bg-[#543391]/10 text-[#543391] border border-[#543391]/20">
          <i class="bi bi-shield-lock"></i> Solo Maestra
        </span>
      </div>

      <!-- ── Filters ── -->
      <div class="glass-card p-4 mb-4">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Año</label>
            <select id="filtroAsigYear" class="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none"></select>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Sede</label>
            <select id="filtroAsigSede" class="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
              <option value="">Todas</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Nivel</label>
            <select id="filtroAsigNivel" class="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
              <option value="">Todos</option>
              ${Array.from({length: 12}, (_, i) => `<option value="${i}">${i}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Número</label>
            <select id="filtroAsigNumero" class="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
              <option value="">Todos</option>
              ${Array.from({length: 5}, (_, i) => `<option value="${i}">${i}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Asignatura</label>
            <input type="text" id="filtroAsigAsignatura" placeholder="Buscar..." class="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Visible</label>
            <select id="filtroAsigVisible" class="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
              <option value="">Todos</option>
              <option value="S">Sí</option>
              <option value="N">No</option>
            </select>
          </div>
          <div class="flex items-end gap-1">
            <button id="btnFiltrarAsig" class="flex-1 px-3 py-2 bg-[#543391] hover:bg-[#6f4ab3] text-white font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-1">
              <i class="bi bi-funnel"></i> Filtrar
            </button>
            <button id="btnLimpiarAsig" class="px-3 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-all text-sm" title="Limpiar filtros">
              <i class="bi bi-x-circle"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Toolbar ── -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500" id="asigTotalCount">0 registros</span>
        </div>
        <button id="btnNuevaAsignacion" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all text-sm">
          <i class="bi bi-plus-lg"></i> Nueva Asignación
        </button>
      </div>

      <!-- ── Table ── -->
      <div id="tablaAsignaciones" class="tabulator-glass-wrap"></div>
    `;
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  POPULATE FILTERS                                              */
  /* ──────────────────────────────────────────────────────────────── */

  async populateFilters() {
    // Years
    const yearSelect = $('filtroAsigYear');
    if (yearSelect) {
      const currentYear = new Date().getFullYear();
      for (let y = currentYear + 1; y >= currentYear - 5; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
      }
    }

    // Sedes
    try {
      const sedeRes = await asignaciones.getSedes();
      if (sedeRes.success && sedeRes.data) {
        const sedeSelect = $('filtroAsigSede');
        if (sedeSelect) {
          sedeRes.data.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.ind || s.value;
            opt.textContent = s.sede || s.label;
            sedeSelect.appendChild(opt);
          });
        }
      }
    } catch { /* ignore */ }
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  EVENTS                                                         */
  /* ──────────────────────────────────────────────────────────────── */

  bindEvents() {
    // Filter button
    delegate($('seccionAsignaciones'), 'click', '#btnFiltrarAsig', () => this.applyFilters());
    delegate($('seccionAsignaciones'), 'click', '#btnLimpiarAsig', () => this.clearFilters());

    // Enter key on search field
    const searchField = $('filtroAsigAsignatura');
    if (searchField) {
      searchField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.applyFilters();
      });
    }

    // New asignacion button
    delegate($('seccionAsignaciones'), 'click', '#btnNuevaAsignacion', () => this.openCreateModal());

    // Edit button (delegated from table)
    delegate($('seccionAsignaciones'), 'click', '.btn-editar-asig', (e, target) => {
      const rowData = this.table ? this.table.getRowData(target.dataset.row) : null;
      if (rowData) this.openEditModal(rowData);
    });

    // Delete button
    delegate($('seccionAsignaciones'), 'click', '.btn-eliminar-asig', (e, target) => {
      const ind = target.dataset.ind;
      if (ind) this.confirmDelete(ind);
    });

    // Auto-load on first render
    this.applyFilters();
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  FILTERS                                                        */
  /* ──────────────────────────────────────────────────────────────── */

  applyFilters() {
    this.currentFilters = {
      year: $('filtroAsigYear')?.value || '',
      sede: $('filtroAsigSede')?.value || '',
      nivel: $('filtroAsigNivel')?.value || '',
      numero: $('filtroAsigNumero')?.value || '',
      visible: $('filtroAsigVisible')?.value || '',
      search: $('filtroAsigAsignatura')?.value || '',
    };
    this.loadData();
  }

  clearFilters() {
    const selects = ['filtroAsigYear', 'filtroAsigSede', 'filtroAsigNivel', 'filtroAsigNumero', 'filtroAsigVisible'];
    selects.forEach(id => {
      const el = $(id);
      if (el) el.selectedIndex = 0;
    });
    const searchField = $('filtroAsigAsignatura');
    if (searchField) searchField.value = '';
    this.applyFilters();
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  DATA LOADING                                                   */
  /* ──────────────────────────────────────────────────────────────── */

  async loadData() {
    try {
      const res = await asignaciones.list(this.currentFilters);
      const data = res.data || [];
      this.renderTable(data);
      const counter = $('asigTotalCount');
      if (counter) counter.textContent = `${data.length} registros`;
    } catch (error) {
      alertError('Error al cargar datos', error.message);
    }
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  TABLE RENDERING                                                */
  /* ──────────────────────────────────────────────────────────────── */

  renderTable(data) {
    const container = 'tablaAsignaciones';

    if (this.table) {
      this.table.destroy();
      this.table = null;
    }

    const columns = [
      { formatter: 'rownum', hozAlign: 'center', width: 45, headerSort: false },
      {
        title: 'Año',
        field: 'year',
        width: 60,
        hozAlign: 'center',
      },
      {
        title: 'Sede',
        field: 'sede_nombre',
        width: 100,
        formatter: (cell) => escapeHtml(cell.getValue() || `Sede ${cell.getData().sede}`),
      },
      {
        title: 'Nivel',
        field: 'nivel',
        width: 60,
        hozAlign: 'center',
      },
      {
        title: 'No.',
        field: 'numero',
        width: 50,
        hozAlign: 'center',
      },
      {
        title: 'Asignatura',
        field: 'asignatura',
        width: 160,
        headerFilter: false,
      },
      {
        title: 'Materia',
        field: 'materia',
        width: 100,
      },
      {
        title: 'Abrev.',
        field: 'abreviatura',
        width: 80,
      },
      {
        title: 'Docente',
        field: 'docente_nombre',
        width: 180,
        formatter: (cell) => {
          const name = cell.getValue();
          return name ? escapeHtml(name) : `<span class="text-gray-400">Sin asignar</span>`;
        },
      },
      {
        title: 'Doc. ID',
        field: 'docente',
        width: 100,
        hozAlign: 'center',
      },
      {
        title: 'Visible',
        field: 'visible',
        width: 70,
        hozAlign: 'center',
        formatter: (cell) => cell.getValue() === 'S'
          ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Sí</span>'
          : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">No</span>',
      },
      {
        title: 'Orden',
        field: 'orden',
        width: 60,
        hozAlign: 'center',
      },
      {
        title: 'Acciones',
        width: 120,
        hozAlign: 'center',
        headerSort: false,
        formatter: (cell) => {
          const d = cell.getData();
          return `
            <div class="flex items-center justify-center gap-1">
              <button class="btn-editar-asig px-2 py-1 text-xs rounded-lg text-[#543391] hover:bg-[#543391]/10 border border-[#543391]/30 transition-all" data-row="${d.ind}" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn-eliminar-asig px-2 py-1 text-xs rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition-all" data-ind="${d.ind}" title="Eliminar">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          `;
        },
      },
    ];

    this.table = new Tabulator(`#${container}`, {
      data,
      columns,
      layout: 'fitColumns',
      placeholder: 'No se encontraron asignaciones',
      pagination: 'local',
      paginationSize: 25,
      paginationSizeSelector: [10, 25, 50, 100],
      paginationCounter: 'rows',
      selectable: false,
      movableColumns: true,
      resizableColumns: true,
      columnDefaults: {
        headerFilter: false,
        headerSort: true,
      },
    });
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  CREATE / EDIT MODAL                                            */
  /* ──────────────────────────────────────────────────────────────── */

  openCreateModal() {
    this._openFormModal(null);
  }

  openEditModal(rowData) {
    this._openFormModal(rowData);
  }

  async _openFormModal(existingData) {
    const isEdit = existingData !== null;
    const title = isEdit ? 'Editar Asignación' : 'Nueva Asignación';

    // Load teachers for dropdown
    let teachers = [];
    try {
      const res = await asignaciones.getTeachers();
      if (res.success && res.data) teachers = res.data;
    } catch { /* ignore */ }

    // Load sedes for dropdown
    let sedes = [];
    try {
      const res = await asignaciones.getSedes();
      if (res.success && res.data) sedes = res.data;
    } catch { /* ignore */ }

    const html = `
      <div id="modalAsignacion" class="fixed inset-0 z-[1056] flex items-center justify-center" style="display:none">
        <div class="relative z-[1060] w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                <i class="bi bi-diagram-3 text-sm"></i>
              </div>
              <h5 class="text-base font-semibold text-gray-800">${title}</h5>
            </div>
            <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all" data-modal-dismiss="modalAsignacion">
              <i class="bi bi-x-lg text-sm"></i>
            </button>
          </div>
          <div class="px-6 py-4">
            <form id="frmAsignacion" class="space-y-4">
              <input type="hidden" name="ind" value="${isEdit ? existingData.ind : ''}">

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Año *</label>
                  <select name="year" required class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                    ${(() => {
                      const cy = new Date().getFullYear();
                      const selYear = isEdit ? existingData.year : cy;
                      return Array.from({length: 8}, (_, i) => {
                        const y = cy + 1 - i;
                        return `<option value="${y}" ${y == selYear ? 'selected' : ''}>${y}</option>`;
                      }).join('');
                    })()}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sede *</label>
                  <select name="sede" required class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                    <option value="">Seleccione...</option>
                    ${sedes.map(s => `<option value="${s.ind || s.value}" ${isEdit && existingData.sede == (s.ind || s.value) ? 'selected' : ''}>${s.sede || s.label}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Docente</label>
                  <select name="docente" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                    <option value="">Sin asignar</option>
                    ${teachers.map(t => {
                      const id = t.identificacion || t.value;
                      const name = t.nombres || t.label;
                      return `<option value="${id}" ${isEdit && existingData.docente == id ? 'selected' : ''}>${name} (${id})</option>`;
                    }).join('')}
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Asignatura *</label>
                  <input type="text" name="asignatura" required value="${isEdit ? escapeHtml(existingData.asignatura) : ''}" placeholder="Ej: MATEMATICAS" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Materia</label>
                  <input type="text" name="materia" value="${isEdit ? escapeHtml(existingData.materia) : ''}" placeholder="Ej: MATEM" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nivel *</label>
                  <select name="nivel" required class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                    <option value="">Seleccione...</option>
                    ${Array.from({length: 12}, (_, i) =>
                      `<option value="${i}" ${isEdit && existingData.nivel == i ? 'selected' : ''}>${i}</option>`
                    ).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Número *</label>
                  <select name="numero" required class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                    <option value="">Seleccione...</option>
                    ${Array.from({length: 5}, (_, i) =>
                      `<option value="${i}" ${isEdit && existingData.numero == i ? 'selected' : ''}>${i}</option>`
                    ).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Abreviatura</label>
                  <input type="text" name="abreviatura" value="${isEdit ? escapeHtml(existingData.abreviatura) : ''}" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Código</label>
                  <input type="text" name="codigo" value="${isEdit ? escapeHtml(existingData.codigo) : ''}" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Banda</label>
                  <select name="banda" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                    <option value="">Ninguna</option>
                    <option value="S" ${isEdit && existingData.banda === 'S' ? 'selected' : ''}>Sí</option>
                    <option value="N" ${isEdit && existingData.banda === 'N' ? 'selected' : ''}>No</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Visible</label>
                  <select name="visible" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                    <option value="S" ${!isEdit || existingData.visible === 'S' ? 'selected' : ''}>Sí</option>
                    <option value="N" ${isEdit && existingData.visible === 'N' ? 'selected' : ''}>No</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Orden</label>
                  <input type="number" name="orden" step="0.1" value="${isEdit ? existingData.orden : 0}" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Grados</label>
                  <input type="text" name="grados" value="${isEdit ? escapeHtml(existingData.grados || '') : ''}" placeholder="Ej: 1-5" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" data-modal-dismiss="modalAsignacion" class="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all">
                  Cancelar
                </button>
                <button type="submit" class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#543391] hover:bg-[#6f4ab3] text-white font-medium rounded-xl shadow-sm transition-all text-sm">
                  <i class="bi bi-check-lg"></i> ${isEdit ? 'Actualizar' : 'Crear'}
                  <span class="spinner-border spinner-border-sm hidden" id="spnGuardarAsig"></span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Insert modal into DOM
    const existingModal = document.getElementById('modalAsignacion');
    if (existingModal) existingModal.remove();

    const temp = document.createElement('div');
    temp.innerHTML = html;
    const modalEl = temp.firstElementChild;
    document.body.appendChild(modalEl);

    // Wire events directly on the modal (it lives outside seccionAsignaciones,
    // so the section-level delegation in bindEvents() never reaches it).
    modalEl.querySelectorAll('[data-modal-dismiss]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal('modalAsignacion');
      });
    });
    const frm = modalEl.querySelector('#frmAsignacion');
    if (frm) frm.addEventListener('submit', (e) => this.saveAsignacion(e));

    showModal('modalAsignacion');
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  SAVE (CREATE / UPDATE)                                         */
  /* ──────────────────────────────────────────────────────────────── */

  async saveAsignacion(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Convert numeric fields
    data.sede = parseInt(data.sede) || 0;
    data.nivel = parseInt(data.nivel) || 0;
    data.numero = parseInt(data.numero) || 0;
    data.orden = parseFloat(data.orden) || 0;
    data.year = parseInt(data.year) || new Date().getFullYear();
    if (data.docente === '') data.docente = null;

    const isEdit = !!data.ind;

    showLoading(isEdit ? 'Actualizando asignación...' : 'Creando asignación...');

    try {
      if (isEdit) {
        await asignaciones.update(data);
      } else {
        delete data.ind;
        await asignaciones.create(data);
      }

      closeLoading();
      alertSuccess(isEdit ? 'Asignación actualizada exitosamente' : 'Asignación creada exitosamente');
      hideModal('modalAsignacion');
      this.loadData();
    } catch (error) {
      closeLoading();
      alertError('Error', error.message);
    }
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  DELETE                                                         */
  /* ──────────────────────────────────────────────────────────────── */

  async confirmDelete(ind) {
    const confirmed = await alertConfirm(
      'Eliminar asignación',
      '¿Está seguro de eliminar esta asignación? Esta acción no se puede deshacer.',
      'Eliminar',
      'Cancelar'
    );

    if (!confirmed) return;

    showLoading('Eliminando...');
    try {
      await asignaciones.delete(ind);
      closeLoading();
      alertSuccess('Asignación eliminada exitosamente');
      this.loadData();
    } catch (error) {
      closeLoading();
      alertError('Error', error.message);
    }
  }
}

// Instantiate on import
new AsignacionesModule();
