/**
 * Descripciones Module — displays performance descriptions from the legacy
 * getDescripciones.php endpoint.
 *
 * Features:
 * - Fetches all descriptions on section activation
 * - Filterable search across all fields (asignatura, docente, desempeno,
 *   grado, descripcion, nombres, periodo, nivel, numero)
 * - Per-column filter modal (asignatura, docente, periodo, nivel, numero)
 * - Detailed row expansion to see full description text
 * - Color-coded desempeño badges with icons
 * - Client-side pagination with configurable page size
 * - Refresh button to reload data
 */
import { descripciones } from '@services/descripciones.js';
import { auth } from '@services/auth.js';
import { alertSuccess, alertError, alertWarning, showLoading, closeLoading, showToast } from '@utils/alert.js';

import { escapeHtml, $, delegate, debounce } from '@utils/dom.js';
import { formatDateTime } from '@utils/format.js';

const SECTION_ID = 'seccionDescripciones';
const CONTAINER_ID = 'contenedorDescripciones';
const MODAL_ID = 'modalDescFiltros';
const NEW_DESC_MODAL_ID = 'modalNuevaDescripcion';

// Map desempeño → display badge config
const DESEMPENO_BADGES = {
  SUPERIOR: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  ALTO:     { bg: 'bg-sky-100',     text: 'text-sky-800',     border: 'border-sky-300' },
  BASICO:   { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300' },
  BAJO:     { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-300' },
};

const PAGE_SIZES = [25, 50, 100, 200];

class DescripcionesModule {
  constructor() {
    this.allData = [];
    this.filteredData = [];
    this.busy = false;
    this.expandedRows = new Set();
    this.docenteFilter = null; // null = Maestra (see all); otherwise scoped to docente id

    // Pagination state
    this.currentPage = 1;
    this.pageSize = 25;

    // Column filters: empty string = no filter
    this.columnFilters = {
      asignatura: '',
      docente: '',
      periodo: '',
      nivel: '',
      numero: '',
    };

    // Auto-activate on auth
    if (document.readyState !== 'loading') {
      this.setupListener();
    } else {
      document.addEventListener('DOMContentLoaded', () => this.setupListener());
    }
  }

  setupListener() {
    document.addEventListener('app:authenticated', () => {
      this.watchNavigation();
    });
    this.watchNavigation();
  }

  watchNavigation() {
    const section = $(SECTION_ID);
    if (!section) return;

    if (!section.classList.contains('hidden') && this.allData.length === 0) {
      this.load();
    }

    if (!this._observer) {
      this._observer = new MutationObserver(() => {
        if (!section.classList.contains('hidden') && this.allData.length === 0) {
          this.load();
        }
      });
      this._observer.observe(section, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // ── Pagination helpers ──────────────────────────────────────────────

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
  }

  /** Returns the slice of filteredData for the current page. */
  getPageData() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = Math.min(start + this.pageSize, this.filteredData.length);
    return this.filteredData.slice(start, end);
  }

  /** Navigate to a specific page (clamped to valid range). */
  goToPage(page) {
    const target = Math.max(1, Math.min(page, this.totalPages));
    if (target === this.currentPage) return;
    this.currentPage = target;
    this.expandedRows.clear();
    this.renderTable();
    const wrapper = $('descTableWrapper');
    if (wrapper) wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Build a page-number window around the current page. */
  getPageWindow() {
    const total = this.totalPages;
    const current = this.currentPage;
    const windowSize = 5;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    let end = Math.min(total, start + windowSize - 1);
    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }
    return { start, end };
  }

  // ── Column helpers ──────────────────────────────────────────────────

  /** Count how many column filters have an active value. */
  getActiveColumnFilterCount() {
    return Object.values(this.columnFilters).filter((v) => v !== '').length;
  }

  /** Extract unique sorted values for a given field from allData. */
  getUniqueValues(field) {
    const values = new Set(
      this.allData.map((d) => String(d[field] ?? '')).filter((v) => v !== '')
    );
    return [...values].sort((a, b) => a.localeCompare(b, 'es'));
  }

  /** Get a human-readable label for a column filter key. */
  getFilterLabel(key) {
    const labels = {
      asignatura: 'Asignatura',
      docente: 'Docente',
      periodo: 'Periodo',
      nivel: 'Nivel',
      numero: 'Número',
    };
    return labels[key] || key;
  }

  // ── Data lifecycle ─────────────────────────────────────────────────

  async load() {
    if (this.busy) return;
    this.busy = true;

    const container = $(CONTAINER_ID);
    if (!container) { this.busy = false; return; }

    // Show a small inline spinner next to the refresh button (keeps the
    // toolbar and its handlers alive while loading).
    const refreshBtn = $('btnRefrescarDesc');
    if (refreshBtn) {
      refreshBtn.dataset._prevHtml = refreshBtn.innerHTML;
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<span class="inline-block w-3 h-3 border-2 border-[#543391] border-t-transparent rounded-full animate-spin"></span> Cargando...';
    }

    try {
      const user = auth.getUser();
      // Non-Maestra users only see their own descriptions and the
      // asignatura filter is scoped to their assignments.
      const docenteFilter = (user && !auth.isMaestra()) ? (user.identificacion || user.id) : null;
      this.docenteFilter = docenteFilter;

      const data = await descripciones.getAll(docenteFilter);
      this.allData = data;
      this.filteredData = [...data];
      this.currentPage = 1;
      this.expandedRows.clear();
      this.render();
      showToast(`${data.length} descripciones cargadas`, 'success');
    } catch (error) {
      container.innerHTML = `
        <div class="glass-card p-12 text-center">
          <i class="bi bi-exclamation-circle text-5xl text-red-300 block mb-3"></i>
          <p class="text-gray-500 mb-2">Error al cargar descripciones</p>
          <p class="text-xs text-gray-400 mb-4">${escapeHtml(error.message || '')}</p>
          <button class="inline-flex items-center gap-2 px-4 py-2 bg-[#543391] hover:bg-[#6f4ab3]
                         text-white font-medium rounded-lg transition-all text-sm" data-action="refresh-desc">
            <i class="bi bi-arrow-clockwise"></i> Reintentar
          </button>
        </div>
      `;
    } finally {
      // Restore refresh button.
      const btn = $('btnRefrescarDesc');
      if (btn && btn.dataset._prevHtml !== undefined) {
        btn.innerHTML = btn.dataset._prevHtml;
        delete btn.dataset._prevHtml;
        btn.disabled = false;
      }
      this.busy = false;
    }
  }

  // ── Modal injection ────────────────────────────────────────────────

  injectModal() {
    if (document.getElementById(MODAL_ID)) return;

    const modalHtml = `
      <div id="${MODAL_ID}" class="hidden fixed inset-0 z-[1056] flex items-center justify-center" style="display:none">
        <div class="relative z-[1060] w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600
                          flex items-center justify-center text-white">
                <i class="bi bi-funnel text-sm"></i>
              </div>
              <div>
                <h5 class="text-base font-semibold text-gray-800">Filtros de Columna</h5>
                <p class="text-xs text-gray-400">Filtre los resultados por cada columna</p>
              </div>
            </div>
            <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg
                                        text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                    data-modal-dismiss="${MODAL_ID}">
              <i class="bi bi-x-lg text-sm"></i>
            </button>
          </div>
          <!-- Body -->
          <div class="px-6 py-4 space-y-4">
            <!-- Asignatura -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Asignatura</label>
              <select id="colFiltroAsignatura"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                             focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
                <option value="">Todas las asignaturas</option>
              </select>
            </div>
            <!-- Docente -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Docente</label>
              <div class="relative">
                <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input type="text" id="colFiltroDocente"
                       class="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm
                              focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                       placeholder="Buscar docente..."
                       autocomplete="off">
              </div>
            </div>
            <!-- Periodo -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Periodo</label>
              <select id="colFiltroPeriodo"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                             focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
                <option value="">Todos los periodos</option>
              </select>
            </div>
            <!-- Nivel + Numero side-by-side -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nivel</label>
                <input type="number" id="colFiltroNivel" min="0" max="15"
                       class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                              focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                       placeholder="Ej: 1">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Número</label>
                <input type="number" id="colFiltroNumero" min="0" max="15"
                       class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                              focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                       placeholder="Ej: 1">
              </div>
            </div>
          </div>
          <!-- Footer -->
          <div class="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <button type="button" id="btnLimpiarFiltrosCol"
                    class="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                           text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all">
              <i class="bi bi-x-circle"></i> Limpiar filtros
            </button>
            <div class="flex items-center gap-2">
              <button type="button" data-modal-dismiss="${MODAL_ID}"
                      class="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800
                             hover:bg-gray-100 rounded-xl transition-all">
                Cancelar
              </button>
              <button type="button" id="btnAplicarFiltrosCol"
                      class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#543391] hover:bg-[#6f4ab3]
                             text-white font-medium rounded-xl shadow-sm transition-all text-sm">
                <i class="bi bi-check-lg"></i> Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = $('modal-container');
    if (container) {
      container.insertAdjacentHTML('beforeend', modalHtml);
    }
  }

  /** Populate modal selects with unique values from current data, preserving current filter values. */
  populateModalSelects() {
    const asignaturaEl = $('colFiltroAsignatura');
    const periodoEl = $('colFiltroPeriodo');

    if (asignaturaEl) {
      const current = this.columnFilters.asignatura;
      asignaturaEl.innerHTML =
        '<option value="">Todas las asignaturas</option>' +
        this.getUniqueValues('asignatura')
          .map((v) => `<option value="${escapeHtml(v)}"${v === current ? ' selected' : ''}>${escapeHtml(v)}</option>`)
          .join('');
    }

    if (periodoEl) {
      const current = this.columnFilters.periodo;
      periodoEl.innerHTML =
        '<option value="">Todos los periodos</option>' +
        this.getUniqueValues('periodo')
          .map((v) => `<option value="${escapeHtml(v)}"${v === current ? ' selected' : ''}>${escapeHtml(v)}</option>`)
          .join('');
    }

    // Text inputs: restore current values
    const docenteEl = $('colFiltroDocente');
    if (docenteEl) docenteEl.value = this.columnFilters.docente;

    const nivelEl = $('colFiltroNivel');
    if (nivelEl) nivelEl.value = this.columnFilters.nivel;

    const numEl = $('colFiltroNumero');
    if (numEl) numEl.value = this.columnFilters.numero;
  }

  /** Open the column filter modal with backdrop and Escape handling. */
  openModal() {
    this.injectModal();
    const modalEl = $(MODAL_ID);
    if (!modalEl || modalEl.classList.contains('show')) return;

    this.populateModalSelects();

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'scrim fixed inset-0 z-[1055] bg-black/40 transition-opacity duration-300';
    backdrop.style.opacity = '0';
    document.body.appendChild(backdrop);
    void backdrop.offsetHeight;
    backdrop.style.opacity = '1';

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Show modal
    modalEl.classList.remove('hidden');
    modalEl.style.display = 'flex';
    modalEl.style.opacity = '0';
    modalEl.classList.add('show');
    void modalEl.offsetHeight;
    modalEl.style.transition = 'opacity 0.3s ease';
    modalEl.style.opacity = '1';

    // Backdrop click → close
    const onBackdropClick = (e) => {
      if (e.target === backdrop) this.closeModal();
    };
    backdrop.addEventListener('click', onBackdropClick);

    // Escape key → close
    const onKeydown = (e) => {
      if (e.key === 'Escape') this.closeModal();
    };
    document.addEventListener('keydown', onKeydown);

    // Store references for cleanup
    this._modalBackdrop = backdrop;
    this._modalBackdropHandler = onBackdropClick;
    this._modalKeydownHandler = onKeydown;
  }

  /** Close the column filter modal and clean up. */
  closeModal() {
    const modalEl = $(MODAL_ID);
    if (!modalEl || !modalEl.classList.contains('show')) return;

    // Fade out modal
    modalEl.style.opacity = '0';
    modalEl.style.transition = 'opacity 0.2s ease';

    // Remove backdrop
    if (this._modalBackdrop) {
      this._modalBackdrop.style.opacity = '0';
      this._modalBackdrop.removeEventListener('click', this._modalBackdropHandler);
      setTimeout(() => {
        if (this._modalBackdrop?.parentNode) this._modalBackdrop.remove();
        this._modalBackdrop = null;
      }, 300);
    }

    // Remove keydown handler
    if (this._modalKeydownHandler) {
      document.removeEventListener('keydown', this._modalKeydownHandler);
      this._modalKeydownHandler = null;
    }

    // Restore scroll
    document.body.style.overflow = '';

    // Complete modal hide after animation
    setTimeout(() => {
      modalEl.classList.add('hidden');
      modalEl.style.display = '';
      modalEl.style.opacity = '';
      modalEl.style.transition = '';
      modalEl.classList.remove('show');
    }, 200);
  }

  /** Read the current modal values and apply them as column filters. */
  applyModalFilters() {
    const readVal = (id) => {
      const el = $(id);
      return el ? el.value.trim() : '';
    };

    this.columnFilters = {
      asignatura: readVal('colFiltroAsignatura'),
      docente: readVal('colFiltroDocente'),
      periodo: readVal('colFiltroPeriodo'),
      nivel: readVal('colFiltroNivel'),
      numero: readVal('colFiltroNumero'),
    };

    this.closeModal();

    // Re-run full filter with current search + desempeño
    this.filter($('filtroDescripciones')?.value || '', $('filtroDesempeno')?.value || '');
  }

  /** Clear all column filters. */
  clearColumnFilters() {
    this.columnFilters = {
      asignatura: '',
      docente: '',
      periodo: '',
      nivel: '',
      numero: '',
    };

    // Clear modal inputs
    ['colFiltroAsignatura', 'colFiltroDocente', 'colFiltroPeriodo', 'colFiltroNivel', 'colFiltroNumero'].forEach((id) => {
      const el = $(id);
      if (el) el.value = '';
    });

    // Re-run filter
    this.filter($('filtroDescripciones')?.value || '', $('filtroDesempeno')?.value || '');
  }

  /** Wire modal internal buttons (dismiss, apply, clear) — runs once. */
  wireModalEvents() {
    const modalEl = $(MODAL_ID);
    if (!modalEl) return;

    // Dismiss buttons (X, Cancel)
    modalEl.querySelectorAll('[data-modal-dismiss]').forEach((btn) => {
      if (btn.dataset._wired) return;
      btn.dataset._wired = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeModal();
      });
    });

    // Apply button
    const applyBtn = $('btnAplicarFiltrosCol');
    if (applyBtn && !applyBtn.dataset._wired) {
      applyBtn.dataset._wired = '1';
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.applyModalFilters();
      });
    }

    // Clear button
    const clearBtn = $('btnLimpiarFiltrosCol');
    if (clearBtn && !clearBtn.dataset._wired) {
      clearBtn.dataset._wired = '1';
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearColumnFilters();
        this.closeModal();
      });
    }
  }

  // ── "Nueva descripción" modal ──────────────────────────────────────

  /** Inject the create-description modal once. */
  injectNewDescModal() {
    if (document.getElementById(NEW_DESC_MODAL_ID)) return;

    const html = `
      <div id="${NEW_DESC_MODAL_ID}" class="hidden fixed inset-0 z-[1056] flex items-center justify-center" style="display:none">
        <div class="relative z-[1060] w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600
                          flex items-center justify-center text-white">
                <i class="bi bi-journal-plus text-sm"></i>
              </div>
              <div>
                <h5 class="text-base font-semibold text-gray-800">Nueva descripción</h5>
                <p class="text-xs text-gray-400">Registre una descripción de desempeño</p>
              </div>
            </div>
            <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg
                                        text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                    data-modal-dismiss="${NEW_DESC_MODAL_ID}">
              <i class="bi bi-x-lg text-sm"></i>
            </button>
          </div>
          <form id="frmNuevaDescripcion" class="px-6 py-4 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Docente</label>
              <input type="text" name="docente" id="ndDocente" required
                     class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50
                            focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                     placeholder="Identificación del docente" readonly>
              <p class="text-[11px] text-gray-400 mt-1">Identificación del docente que registra</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Asignatura</label>
              <select name="asignatura" id="ndAsignatura" required
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                             focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all">
                <option value="">Seleccione una asignatura...</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nivel</label>
                <select name="nivel" id="ndNivel" required
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                               focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all">
                  <option value="">—</option>
                  ${Array.from({length: 12}, (_, i) => `<option value="${i}">${i}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Número</label>
                <select name="numero" id="ndNumero" required
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                               focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all">
                  <option value="">—</option>
                  ${Array.from({length: 5}, (_, i) => `<option value="${i}">${i}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Periodo</label>
                <select name="periodo" id="ndPeriodo" required
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                               focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all">
                  <option value="">—</option>
                  <option value="UNO">UNO</option>
                  <option value="DOS">DOS</option>
                  <option value="TRES">TRES</option>
                  <option value="CUATRO">CUATRO</option>
                  <option value="CINCO">CINCO (FINAL)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Desempeño</label>
                <select name="desempeno" id="ndDesempeno" required
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                               focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all">
                  <option value="">—</option>
                  <option value="SUPERIOR">SUPERIOR</option>
                  <option value="ALTO">ALTO</option>
                  <option value="BASICO">BÁSICO</option>
                  <option value="BAJO">BAJO</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descripción</label>
              <textarea name="descripcion" id="ndDescripcion" required rows="4"
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                               focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                        placeholder="Texto de la descripción..."></textarea>
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" data-modal-dismiss="${NEW_DESC_MODAL_ID}"
                      class="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800
                             hover:bg-gray-100 rounded-xl transition-all">
                Cancelar
              </button>
              <button type="submit"
                      class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700
                             text-white font-medium rounded-xl shadow-sm transition-all text-sm">
                <i class="bi bi-check-lg"></i> Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const container = $('modal-container');
    if (container) container.insertAdjacentHTML('beforeend', html);
    else document.body.insertAdjacentHTML('beforeend', html);
  }

  /**
   * Open the "Nueva descripción" modal.
   * When user is not Maestra, the docente field is locked to the logged-in
   * user and the asignatura select only shows that docente's assignments.
   */
  async openNewDescModal() {
    this.injectNewDescModal();

    const user = auth.getUser();
    if (!user) {
      alertWarning('No hay sesión activa');
      return;
    }

    const isMaestra = auth.isMaestra();
    const docenteId = user.identificacion || user.id || '';

    const docenteInput = $('ndDocente');
    if (docenteInput) {
      docenteInput.value = docenteId;
      docenteInput.readOnly = !isMaestra;
      docenteInput.classList.toggle('bg-gray-50', !isMaestra);
      docenteInput.classList.toggle('bg-white', isMaestra);
    }

    // Build the asignatura options.
    const asigSelect = $('ndAsignatura');
    if (asigSelect) {
      asigSelect.innerHTML = '<option value="">Seleccione una asignatura...</option>';
      let asignaturas = [];
      if (isMaestra) {
        // Show every unique asignatura from loaded data (already includes all
        // assignments since data isn't filtered for Maestra).
        asignaturas = this.getUniqueValues('asignatura');
      } else {
        // Non-Maestra: dropdown is limited to the docente's own asignaturas.
        // allData is already filtered to this docente, so its unique
        // asignatura values ARE the docente's assignments (covers the
        // common case). If the docente has no descriptions yet, the
        // dropdown will be empty — they need an assignment set up via the
        // "Asignación Asig." admin page first.
        asignaturas = this.getUniqueValues('asignatura');
      }
      asigSelect.insertAdjacentHTML(
        'beforeend',
        asignaturas.map((a) => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('')
      );
    }

    // Reset other fields.
    ['ndNivel', 'ndNumero', 'ndPeriodo', 'ndDesempeno', 'ndDescripcion'].forEach((id) => {
      const el = $(id);
      if (el) el.value = '';
    });

    // Wire form submit (one-time per modal lifecycle).
    const form = $('frmNuevaDescripcion');
    if (form && !form.dataset._wired) {
      form.dataset._wired = '1';
      form.addEventListener('submit', (e) => this.saveNewDesc(e));
    }

    // Wire dismiss buttons (one-time).
    document.querySelectorAll(`[data-modal-dismiss="${NEW_DESC_MODAL_ID}"]`).forEach((btn) => {
      if (btn.dataset._wired) return;
      btn.dataset._wired = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeNewDescModal();
      });
    });

    // Show modal with the same pattern used in the column-filter modal
    // (so the styling matches: fixed overlay, fade-in, scroll-lock, escape).
    const modalEl = $(NEW_DESC_MODAL_ID);
    if (!modalEl) return;

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[1055] bg-black/40 transition-opacity duration-300';
    backdrop.style.opacity = '0';
    document.body.appendChild(backdrop);
    void backdrop.offsetHeight;
    backdrop.style.opacity = '1';
    document.body.style.overflow = 'hidden';

    modalEl.classList.remove('hidden');
    modalEl.style.display = 'flex';
    modalEl.style.opacity = '0';
    void modalEl.offsetHeight;
    modalEl.style.transition = 'opacity 0.3s ease';
    modalEl.style.opacity = '1';

    this._newDescBackdrop = backdrop;
    this._newDescKeydown = (e) => {
      if (e.key === 'Escape') this.closeNewDescModal();
    };
    document.addEventListener('keydown', this._newDescKeydown);
  }

  closeNewDescModal() {
    const modalEl = $(NEW_DESC_MODAL_ID);
    if (!modalEl) return;

    modalEl.style.opacity = '0';
    modalEl.style.transition = 'opacity 0.2s ease';

    if (this._newDescBackdrop) {
      this._newDescBackdrop.style.opacity = '0';
      setTimeout(() => this._newDescBackdrop?.remove(), 300);
      this._newDescBackdrop = null;
    }
    if (this._newDescKeydown) {
      document.removeEventListener('keydown', this._newDescKeydown);
      this._newDescKeydown = null;
    }
    document.body.style.overflow = '';

    setTimeout(() => {
      modalEl.classList.add('hidden');
      modalEl.style.display = '';
      modalEl.style.opacity = '';
      modalEl.style.transition = '';
    }, 200);
  }

  async saveNewDesc(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    data.nivel = parseInt(data.nivel, 10);
    data.numero = parseInt(data.numero, 10);

    if (!data.docente || !data.asignatura || !data.periodo ||
        isNaN(data.nivel) || isNaN(data.numero) ||
        !data.desempeno || !data.descripcion) {
      alertWarning('Complete todos los campos obligatorios');
      return;
    }

    showLoading('Guardando descripción...');
    try {
      await descripciones.create(data);
      closeLoading();
      alertSuccess('Descripción guardada correctamente');
      this.closeNewDescModal();
      this.load();
    } catch (error) {
      closeLoading();
      alertError('Error al guardar', error.message);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

  render() {
    const container = $(CONTAINER_ID);
    if (!container) return;

    const total = this.allData.length;
    const activeColFilters = this.getActiveColumnFilterCount();
    const hasActiveFilters = activeColFilters > 0;

    container.innerHTML = `
      <!-- Toolbar -->
      <div class="glass-card p-4 mb-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="relative" role="search">
              <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="search" id="filtroDescripciones"
                     class="w-44 sm:w-56 lg:w-72 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm
                            focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                     placeholder="Buscar en descripciones..."
                     autocomplete="off">
            </div>
            <select id="filtroDesempeno"
                    class="px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Todos los desempeños</option>
              <option value="SUPERIOR">Superior</option>
              <option value="ALTO">Alto</option>
              <option value="BASICO">Básico</option>
              <option value="BAJO">Bajo</option>
            </select>

            <!-- Column filters button -->
            <button id="btnColFiltros"
                    class="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg transition-all text-sm bg-white
                           ${hasActiveFilters
                             ? 'border-[#543391]/40 text-[#543391] bg-[#543391]/5 shadow-sm'
                             : 'border-gray-200 text-gray-600 hover:text-[#543391] hover:border-[#543391]/30'}">
              <i class="bi bi-funnel${hasActiveFilters ? '-fill' : ''}"></i>
              Columnas
              ${hasActiveFilters
                ? `<span class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                               text-[10px] font-bold text-white bg-[#543391] rounded-full">${activeColFilters}</span>`
                : ''}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400" id="descCountInfo">${total} registro(s)</span>
            <button id="btnNuevaDescripcion" data-action="nueva-desc"
                    class="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700
                           text-white font-medium rounded-lg transition-all text-sm">
              <i class="bi bi-plus-lg"></i> Nueva descripción
            </button>
            <button id="btnRefrescarDesc" data-action="refresh-desc"
                    class="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200
                           text-gray-600 hover:text-[#543391] hover:border-[#543391]/30
                           rounded-lg transition-all text-sm bg-white">
              <i class="bi bi-arrow-clockwise"></i> Refrescar
            </button>
          </div>
        </div>

        <!-- Active column filter chips -->
        <div id="descFilterChips" class="${hasActiveFilters ? 'flex' : 'hidden'} flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          ${Object.entries(this.columnFilters)
            .filter(([, v]) => v !== '')
            .map(([key, val]) => `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
                           bg-[#543391]/10 text-[#543391] border border-[#543391]/20 rounded-full">
                <span class="opacity-70">${this.getFilterLabel(key)}:</span>
                ${escapeHtml(val)}
                <button class="inline-flex items-center justify-center w-4 h-4 rounded-full
                               hover:bg-[#543391]/20 transition-colors desc-remove-chip"
                        data-filter-key="${key}" title="Quitar filtro">
                  <i class="bi bi-x text-[10px]"></i>
                </button>
              </span>
            `).join('')}
          <button id="btnLimpiarTodosFiltros"
                  class="text-xs text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2">
            Limpiar todo
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="glass-card overflow-hidden" id="descTableWrapper">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th class="text-left py-3 px-4 w-10">#</th>
                <th class="text-left py-3 px-4">Estudiante</th>
                <th class="text-left py-3 px-4">Asignatura</th>
                <th class="text-center py-3 px-4">Grado</th>
                <th class="text-center py-3 px-4">P</th>
                <th class="text-center py-3 px-4">Desempeño</th>
                <th class="text-left py-3 px-4">Docente</th>
                <th class="text-center py-3 px-4 w-16">Detalle</th>
              </tr>
            </thead>
            <tbody id="descTableBody">
              ${this.buildRows()}
            </tbody>
          </table>
        </div>
        <!-- Empty state -->
        <div id="descEmptyState" class="${this.filteredData.length > 0 ? 'hidden' : ''} text-center py-12">
          <i class="bi bi-inbox text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400">No se encontraron descripciones</p>
          <p class="text-xs text-gray-300 mt-1">Intente con otros filtros de búsqueda</p>
        </div>
        <!-- Footer with pagination -->
        <div class="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-gray-400">
            <span>Mostrar</span>
            <select id="descPageSize"
                    class="px-2 py-1 border border-gray-200 rounded-md text-xs bg-white
                           focus:ring-1 focus:ring-[#543391] focus:border-transparent outline-none">
              ${PAGE_SIZES.map((s) => `
                <option value="${s}" ${s === this.pageSize ? 'selected' : ''}>${s}</option>
              `).join('')}
            </select>
            <span id="descFooterCount">${this.getFooterText()}</span>
          </div>
          <div class="flex items-center gap-1" id="descPagination">
            ${this.renderPaginationControls()}
          </div>
        </div>
      </div>
    `;

    // Wire up search
    const searchInput = $('filtroDescripciones');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        this.filter(e.target.value, $('filtroDesempeno')?.value || '');
      }, 250));
    }

    // Wire up desempeño filter
    const desempenoFilter = $('filtroDesempeno');
    if (desempenoFilter) {
      desempenoFilter.addEventListener('change', () => {
        this.filter(searchInput?.value || '', desempenoFilter.value);
      });
    }

    // Wire up column filters button
    const btnFiltros = $('btnColFiltros');
    if (btnFiltros) {
      btnFiltros.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    }

    // Wire up refresh (delegated to survive re-renders, no re-bind needed)
    delegate($(CONTAINER_ID), 'click', '[data-action="refresh-desc"]', () => this.load());

    // Wire up "Nueva descripción" button (delegated)
    delegate($(CONTAINER_ID), 'click', '[data-action="nueva-desc"]', () => this.openNewDescModal());

    // Wire up page size selector
    const pageSizeEl = $('descPageSize');
    if (pageSizeEl) {
      pageSizeEl.addEventListener('change', () => {
        this.pageSize = parseInt(pageSizeEl.value) || 25;
        this.currentPage = 1;
        this.expandedRows.clear();
        this.renderTable();
      });
    }

    // Delegate: chip remove button
    delegate($(CONTAINER_ID), 'click', '.desc-remove-chip', (e, target) => {
      const key = target.dataset.filterKey;
      if (key && this.columnFilters[key] !== undefined) {
        this.columnFilters[key] = '';
        const searchInput = $('filtroDescripciones');
        const desempenoFilter = $('filtroDesempeno');
        this.filter(searchInput?.value || '', desempenoFilter?.value || '');
      }
    });

    // Delegate: clear all filters
    delegate($(CONTAINER_ID), 'click', '#btnLimpiarTodosFiltros', () => {
      this.columnFilters = { asignatura: '', docente: '', periodo: '', nivel: '', numero: '' };
      const searchInput = $('filtroDescripciones');
      const desempenoFilter = $('filtroDesempeno');
      this.filter(searchInput?.value || '', desempenoFilter?.value || '');
    });

    // Delegate pagination button clicks
    delegate($(CONTAINER_ID), 'click', '[data-desc-page]', (e, target) => {
      const page = parseInt(target.dataset.descPage);
      if (!isNaN(page)) this.goToPage(page);
    });

    // Delegate expand/collapse clicks
    delegate($(CONTAINER_ID), 'click', '.btn-expand-desc', (e, target) => {
      const index = parseInt(target.dataset.index);
      this.toggleRow(index);
    });

    // Wire modal events (after injection, on first open)
    this.injectModal();
    this.wireModalEvents();
  }

  /** Re-render only the table body, pagination, and filter chips. */
  renderTable() {
    const tbody = $('descTableBody');
    if (tbody) tbody.innerHTML = this.buildRows();

    // Update footer count
    const footerCount = $('descFooterCount');
    if (footerCount) footerCount.textContent = this.getFooterText();

    // Update empty state
    const emptyState = $('descEmptyState');
    if (emptyState) {
      emptyState.classList.toggle('hidden', this.filteredData.length > 0);
    }

    // Re-render pagination controls
    const paginationEl = $('descPagination');
    if (paginationEl) paginationEl.innerHTML = this.renderPaginationControls();

    // Update filter button badge and chips
    this.updateFilterUI();
  }

  /** Update the filter button badge and the chips row without a full re-render. */
  updateFilterUI() {
    const activeColFilters = this.getActiveColumnFilterCount();
    const hasActiveFilters = activeColFilters > 0;

    const btnFiltros = $('btnColFiltros');
    if (btnFiltros) {
      btnFiltros.className =
        'inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg transition-all text-sm bg-white' +
        (hasActiveFilters
          ? ' border-[#543391]/40 text-[#543391] bg-[#543391]/5 shadow-sm'
          : ' border-gray-200 text-gray-600 hover:text-[#543391] hover:border-[#543391]/30');

      btnFiltros.innerHTML =
        `<i class="bi bi-funnel${hasActiveFilters ? '-fill' : ''}"></i> Columnas` +
        (hasActiveFilters
          ? `<span class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                        text-[10px] font-bold text-white bg-[#543391] rounded-full">${activeColFilters}</span>`
          : '');
    }

    // Chips
    const chipsRow = $('descFilterChips');
    if (chipsRow) {
      const entries = Object.entries(this.columnFilters).filter(([, v]) => v !== '');
      chipsRow.className = `flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 ${entries.length > 0 ? 'flex' : 'hidden'}`;
      chipsRow.innerHTML = entries.map(([key, val]) => `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
                     bg-[#543391]/10 text-[#543391] border border-[#543391]/20 rounded-full">
          <span class="opacity-70">${this.getFilterLabel(key)}:</span>
          ${escapeHtml(val)}
          <button class="inline-flex items-center justify-center w-4 h-4 rounded-full
                         hover:bg-[#543391]/20 transition-colors desc-remove-chip"
                  data-filter-key="${key}" title="Quitar filtro">
            <i class="bi bi-x text-[10px]"></i>
          </button>
        </span>
      `).join('') + `
        <button id="btnLimpiarTodosFiltros"
                class="text-xs text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2">
          Limpiar todo
        </button>
      `;
    }
  }

  getFooterText() {
    const total = this.filteredData.length;
    const start = total > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
    const end = Math.min(start + this.pageSize - 1, total);
    if (total === 0) return `0 de 0 registro(s)`;
    return `${start}–${end} de ${total} registro(s)`;
  }

  // ── Pagination controls HTML ──────────────────────────────────────

  renderPaginationControls() {
    const total = this.totalPages;
    if (total <= 1) return '';

    const current = this.currentPage;
    const { start, end } = this.getPageWindow();
    const pages = [];

    const btnBase = 'desc-page-btn w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all';

    pages.push(`
      <button class="${btnBase} ${current <= 1 ? 'opacity-30 cursor-not-allowed' : 'text-gray-500 hover:bg-[#543391]/10 hover:text-[#543391] cursor-pointer'}"
              data-desc-page="${current - 1}" ${current <= 1 ? 'disabled' : ''}
              title="Anterior">
        <i class="bi bi-chevron-left text-xs"></i>
      </button>
    `);

    if (start > 1) {
      pages.push(`
        <button class="${btnBase} text-gray-500 hover:bg-[#543391]/10 hover:text-[#543391] cursor-pointer"
                data-desc-page="1">1</button>
      `);
      if (start > 2) {
        pages.push('<span class="px-1 text-gray-300 select-none self-center">…</span>');
      }
    }

    for (let i = start; i <= end; i++) {
      const isActive = i === current;
      pages.push(`
        <button class="${btnBase} ${isActive
          ? 'bg-[#543391] text-white shadow-sm cursor-default'
          : 'text-gray-500 hover:bg-[#543391]/10 hover:text-[#543391] cursor-pointer'}"
                data-desc-page="${i}">${i}</button>
      `);
    }

    if (end < total) {
      if (end < total - 1) {
        pages.push('<span class="px-1 text-gray-300 select-none self-center">…</span>');
      }
      pages.push(`
        <button class="${btnBase} text-gray-500 hover:bg-[#543391]/10 hover:text-[#543391] cursor-pointer"
                data-desc-page="${total}">${total}</button>
      `);
    }

    pages.push(`
      <button class="${btnBase} ${current >= total ? 'opacity-30 cursor-not-allowed' : 'text-gray-500 hover:bg-[#543391]/10 hover:text-[#543391] cursor-pointer'}"
              data-desc-page="${current + 1}" ${current >= total ? 'disabled' : ''}
              title="Siguiente">
        <i class="bi bi-chevron-right text-xs"></i>
      </button>
    `);

    return pages.join('');
  }

  // ── Table rows ────────────────────────────────────────────────────

  buildRows() {
    const pageData = this.getPageData();
    if (pageData.length === 0) return '';

    const offset = (this.currentPage - 1) * this.pageSize;

    return pageData.map((d, i) => {
      const absIndex = offset + i;
      const desempeno = (d.desempeno || '').toUpperCase();
      const badge = DESEMPENO_BADGES[desempeno] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
      const isExpanded = this.expandedRows.has(i);

      return `
        <tr class="border-t border-gray-50 hover:bg-[#543391]/[0.03] transition-colors
                   ${absIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}">
          <td class="py-3 px-4 text-gray-400 text-xs font-mono">${absIndex + 1}</td>
          <td class="py-3 px-4 font-medium text-gray-800">${escapeHtml(d.nombres || '')}</td>
          <td class="py-3 px-4 text-gray-600">${escapeHtml(d.asignatura || '')}</td>
          <td class="py-3 px-4 text-center text-gray-600">${escapeHtml(d.grado || '')}</td>
          <td class="py-3 px-4 text-center">
            <span class="px-2 py-0.5 text-xs font-semibold rounded-md
                         bg-violet-100 text-violet-700">${escapeHtml(d.periodo || '')}</span>
          </td>
          <td class="py-3 px-4 text-center">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full
                         border ${badge.bg} ${badge.text} ${badge.border}">
              ${desempeno === 'SUPERIOR' ? '<i class="bi bi-star-fill text-[10px]"></i>' : ''}
              ${desempeno === 'ALTO' ? '<i class="bi bi-arrow-up-circle-fill text-[10px]"></i>' : ''}
              ${desempeno === 'BASICO' ? '<i class="bi bi-dash-circle-fill text-[10px]"></i>' : ''}
              ${desempeno === 'BAJO' ? '<i class="bi bi-arrow-down-circle-fill text-[10px]"></i>' : ''}
              ${escapeHtml(desempeno || '')}
            </span>
          </td>
          <td class="py-3 px-4 text-gray-500 text-xs">${escapeHtml(d.docente || '')}</td>
          <td class="py-3 px-4 text-center">
            <button class="btn-expand-desc w-8 h-8 flex items-center justify-center rounded-lg
                           text-gray-400 hover:text-[#543391] hover:bg-[#543391]/10 transition-all"
                    data-index="${i}">
              <i class="bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} text-sm transition-transform duration-200"></i>
            </button>
          </td>
        </tr>
        ${isExpanded ? `
        <tr class="bg-[#543391]/[0.02] border-t border-[#543391]/10">
          <td colspan="8" class="py-4 px-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</span>
                <p class="mt-1 text-gray-700 leading-relaxed">${escapeHtml(d.descripcion || '')}</p>
              </div>
              <div class="space-y-2">
                <div>
                  <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actualizado</span>
                  <p class="mt-1 text-gray-600">${escapeHtml(d.updatedat || '—')}</p>
                </div>
                <div>
                  <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nivel / Número</span>
                  <p class="mt-1 text-gray-600">${escapeHtml(String(d.nivel ?? ''))} — ${escapeHtml(String(d.numero ?? ''))}</p>
                </div>
              </div>
            </div>
          </td>
        </tr>
        ` : ''}
      `;
    }).join('');
  }

  // ── Combined filtering ────────────────────────────────────────────

  /**
   * Apply all active filters: text search + desempeño dropdown + column filters.
   * Resets to page 1 and clears expansions after filtering.
   */
  filter(searchTerm, desempenoFilter) {
    const q = (searchTerm || '').toLowerCase().trim();

    this.filteredData = this.allData.filter((d) => {
      // ── 1. Desempeño dropdown ──
      if (desempenoFilter && (d.desempeno || '').toUpperCase() !== desempenoFilter) {
        return false;
      }

      // ── 2. Column filters ──
      const cf = this.columnFilters;

      if (cf.asignatura && (d.asignatura || '') !== cf.asignatura) return false;
      if (cf.periodo && (d.periodo || '') !== cf.periodo) return false;

      if (cf.docente && !(d.docente || '').toLowerCase().includes(cf.docente.toLowerCase())) {
        return false;
      }

      if (cf.nivel && String(d.nivel ?? '') !== cf.nivel) return false;
      if (cf.numero && String(d.numero ?? '') !== cf.numero) return false;

      // ── 3. Text search ──
      if (!q) return true;

      return (
        (d.asignatura || '').toLowerCase() === q ||
        (d.docente || '').toLowerCase().includes(q) ||
        (d.desempeno || '').toLowerCase().includes(q) ||
        (d.grado || '').toLowerCase() === q ||
        (d.descripcion || '').toLowerCase().includes(q) ||
        (d.nombres || '').toLowerCase().includes(q) ||
        (d.periodo || '').toLowerCase() === q ||
        String(d.nivel ?? '') === q ||
        String(d.numero ?? '') === q
      );
    });

    // Reset page + expansions
    this.currentPage = 1;
    this.expandedRows.clear();

    // Update count info
    const countInfo = $('descCountInfo');
    if (countInfo) countInfo.textContent = `${this.allData.length} registro(s)`;

    this.renderTable();
  }

  // ── Expand / Collapse ─────────────────────────────────────────────

  toggleRow(pageRelativeIndex) {
    if (this.expandedRows.has(pageRelativeIndex)) {
      this.expandedRows.delete(pageRelativeIndex);
    } else {
      this.expandedRows.add(pageRelativeIndex);
    }

    const tbody = $('descTableBody');
    if (tbody) tbody.innerHTML = this.buildRows();

    if (this.expandedRows.has(pageRelativeIndex)) {
      let rowCount = 0;
      const pageData = this.getPageData();
      const rows = tbody?.querySelectorAll('tr');
      if (rows) {
        for (let i = 0; i < pageData.length; i++) {
          const isExp = this.expandedRows.has(i);
          if (i === pageRelativeIndex) {
            const detailIdx = rowCount + 1;
            if (detailIdx < rows.length) {
              rows[detailIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            break;
          }
          rowCount += isExp ? 2 : 1;
        }
      }
    }
  }
}

// Initialize module (auto-instantiates on import)
const descripcionesModule = new DescripcionesModule();
export default descripcionesModule;
