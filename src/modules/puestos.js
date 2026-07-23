/**
 * Puestos Module — academic rankings/positions from the legacy PHP endpoints.
 *
 * Features:
 * - Cascading filter selects: Year → Sede → Nivel → Numero → Periodo
 * - Institution-wide ranking (when no group filters)
 * - Group-specific ranking (when nivel+numero are set)
 * - Top-3 medals and color-coded positions
 * - Search by student name
 * - Summary stats (total students, top/bottom average)
 * - Client-side pagination with configurable page size
 */
import { puestos } from '@services/puestos.js';
import { filters } from '@services/filters.js';
import { endpoint } from '@config/endpoints.js';
import { showToast } from '@utils/alert.js';
import { escapeHtml, $, delegate, debounce } from '@utils/dom.js';
import { auth } from '../services/auth.js';

const SECTION_ID = 'seccionPuestos';
const CONTAINER_ID = 'contenedorPuestos';
const PAGE_SIZES = [25, 50, 100, 200];

const MEDALS = {
  1: { icon: 'bi-trophy-fill', color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Oro' },
  2: { icon: 'bi-trophy-fill', color: 'text-gray-400', bg: 'bg-gray-50', label: 'Plata' },
  3: { icon: 'bi-trophy-fill', color: 'text-amber-700', bg: 'bg-amber-50', label: 'Bronce' },
};

function avgColor(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return 'text-gray-400';
  if (n >= 4.5) return 'text-emerald-600';
  if (n >= 4.0) return 'text-emerald-500';
  if (n >= 3.5) return 'text-sky-600';
  if (n >= 3.0) return 'text-amber-600';
  return 'text-red-500';
}

function avgBg(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return 'bg-gray-50';
  if (n >= 4.5) return 'bg-emerald-50';
  if (n >= 4.0) return 'bg-emerald-50/50';
  if (n >= 3.5) return 'bg-sky-50';
  if (n >= 3.0) return 'bg-amber-50';
  return 'bg-red-50';
}

class PuestosModule {
  constructor() {
    this.rankingData = [];
    this.filteredData = [];
    this.busy = false;
    this.searchTerm = '';
    this.isGroupView = false;
    this.sedeNombre = '';

    // Pagination
    this.currentPage = 1;
    this.pageSize = 50;

    this.filters = {
      year: '',
      asignacion: '',
      nivel: '',
      numero: '',
      periodo: '',
    };

    if (document.readyState !== 'loading') {
      this.setupListener();
    } else {
      document.addEventListener('DOMContentLoaded', () => this.setupListener());
    }
  }

  setupListener() {
    document.addEventListener('app:authenticated', () => this.watchNavigation());
    this.watchNavigation();
  }

  watchNavigation() {
    const section = $(SECTION_ID);
    if (!section) return;

    if (!section.classList.contains('hidden') && !this._loaded) {
      this.load();
    }

    if (!this._observer) {
      this._observer = new MutationObserver(() => {
        if (!section.classList.contains('hidden') && !this._loaded) {
          this.load();
        }
      });
      this._observer.observe(section, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // ── Pagination helpers ──────────────────────────────────────────

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
  }

  getPageData() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = Math.min(start + this.pageSize, this.filteredData.length);
    return this.filteredData.slice(start, end);
  }

  goToPage(page) {
    const target = Math.max(1, Math.min(page, this.totalPages));
    if (target === this.currentPage) return;
    this.currentPage = target;
    this.renderTable();
  }

  getPageWindow() {
    const total = this.totalPages;
    const current = this.currentPage;
    const size = 5;
    let start = Math.max(1, current - Math.floor(size / 2));
    let end = Math.min(total, start + size - 1);
    if (end - start + 1 < size) {
      start = Math.max(1, end - size + 1);
    }
    return { start, end };
  }

  getFooterText() {
    const total = this.filteredData.length;
    const start = total > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
    const end = Math.min(start + this.pageSize - 1, total);
    if (total === 0) return '0 de 0 registro(s)';
    return `${start}–${end} de ${total} registro(s)`;
  }

  renderPaginationControls() {
    const total = this.totalPages;
    if (total <= 1) return '';
    const current = this.currentPage;
    const { start, end } = this.getPageWindow();
    const pages = [];
    const btnBase = 'w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all';

    pages.push(`
      <button class="${btnBase} ${current <= 1 ? 'opacity-30 cursor-not-allowed' : 'text-gray-500 hover:bg-[#543391]/10 hover:text-[#543391] cursor-pointer'}"
              data-pagina-puesto="${current - 1}" ${current <= 1 ? 'disabled' : ''} title="Anterior">
        <i class="bi bi-chevron-left text-xs"></i>
      </button>
    `);

    if (start > 1) {
      pages.push(`
        <button class="${btnBase} text-gray-500 hover:bg-[#543391]/10 hover:text-[#543391] cursor-pointer"
                data-pagina-puesto="1">1</button>
      `);
      if (start > 2) pages.push('<span class="px-1 text-gray-300 select-none self-center">…</span>');
    }

    for (let i = start; i <= end; i++) {
      pages.push(`
        <button class="${btnBase} ${i === current ? 'bg-[#543391] text-white shadow-sm cursor-default' : 'text-gray-500 hover:bg-[#543391]/10 hover:text-[#543391] cursor-pointer'}"
                data-pagina-puesto="${i}">${i}</button>
      `);
    }

    if (end < total) {
      if (end < total - 1) pages.push('<span class="px-1 text-gray-300 select-none self-center">…</span>');
      pages.push(`
        <button class="${btnBase} text-gray-500 hover:bg-[#543391]/10 hover:text-[#543391] cursor-pointer"
                data-pagina-puesto="${total}">${total}</button>
      `);
    }

    pages.push(`
      <button class="${btnBase} ${current >= total ? 'opacity-30 cursor-not-allowed' : 'text-gray-500 hover:bg-[#543391]/10 hover:text-[#543391] cursor-pointer'}"
              data-pagina-puesto="${current + 1}" ${current >= total ? 'disabled' : ''} title="Siguiente">
        <i class="bi bi-chevron-right text-xs"></i>
      </button>
    `);

    return pages.join('');
  }

  renderTable() {
    const tbody = $('puestosTableBody');
    if (tbody) tbody.innerHTML = this.buildRows();

    const footerCount = $('puestosFooterCount');
    if (footerCount) footerCount.textContent = this.getFooterText();

    const paginationEl = $('puestosPagination');
    if (paginationEl) paginationEl.innerHTML = this.renderPaginationControls();

    const emptyState = $('puestosEmptyState');
    if (emptyState) emptyState.classList.toggle('hidden', this.filteredData.length > 0);
  }

  // ── Data loading ─────────────────────────────────────────────────

  async load() {
    if (this.busy) return;
    const container = $(CONTAINER_ID);
    if (!container) return;

    this.renderFilters(container);
    this.filters.year = new Date().getFullYear().toString();
    await this.loadFilterOptions();
    await this.queryRanking();
    this._loaded = true;
  }

  async loadFilterOptions() {
    const user = auth.getUser();
    const yearSelect = $('puestosYear');
    const sedeSelect = $('puestosSede');
    const nivelSelect = $('puestosNivel');
    const numeroSelect = $('puestosNumero');
    const periodoSelect = $('puestosPeriodo');

    if (yearSelect) {
      try {
        const res = await filters.getYears();
        const years = Array.isArray(res) ? res : (res?.data || []);
        let html = '<option value="">Seleccione...</option>';
        years.forEach((y) => {
          const value = y.value || y.year || '';
          const label = y.label || y.year || '';
          if (!value) return;
          const sel = String(value) === this.filters.year ? ' selected' : '';
          html += `<option value="${escapeHtml(value)}"${sel}>${escapeHtml(label)}</option>`;
        });
        yearSelect.innerHTML = html;
        if (yearSelect.value) this.filters.year = yearSelect.value;
      } catch {
        yearSelect.innerHTML = '<option value="">Error al cargar años</option>';
      }
    }

    if (sedeSelect) {
      try {
        const res = await filters.getSedes();
        const sedes = Array.isArray(res) ? res : (res?.data || []);
        let html = '<option value="">Seleccione...</option>';
        sedes.forEach((s) => {
          const value = String(s.ind ?? s.value ?? '');
          const label = s.nombre || s.sede || s.label || value;
          if (!value) return;
          const sel = value === (this.filters.asignacion || user?.asignacion) ? ' selected' : '';
          html += `<option value="${escapeHtml(value)}"${sel}>${escapeHtml(label)}</option>`;
        });
        sedeSelect.innerHTML = html;
        if (sedeSelect.value) {
          this.filters.asignacion = sedeSelect.value;
          this.sedeNombre = sedeSelect.options[sedeSelect.selectedIndex]?.text || '';
        }
      } catch {
        sedeSelect.innerHTML = '<option value="">Error al cargar sedes</option>';
      }
    }

    if (periodoSelect) {
      try {
        const res = await filters.getPeriods();
        const periods = Array.isArray(res) ? res : (res?.data || []);
        let html = '<option value="">Seleccione...</option>';
        const current = periods.find((p) => p.current || p.selected === 'selected');
        periods.forEach((p) => {
          const value = p.value || p.periodo || p.nombre || '';
          const label = p.label || p.nombre || value;
          if (!value) return;
          const isCurrent = p.current || p.selected === 'selected';
          const sel = current && String(value) === String(current.value || current.periodo) ? ' selected' : (isCurrent ? ' selected' : '');
          html += `<option value="${escapeHtml(value)}"${sel}>${escapeHtml(label)}</option>`;
        });
        periodoSelect.innerHTML = html;
        if (periodoSelect.value) this.filters.periodo = periodoSelect.value;
      } catch {
        periodoSelect.innerHTML = '<option value="">Error al cargar periodos</option>';
      }
    }

    if (sedeSelect) {
      sedeSelect.addEventListener('change', async () => {
        this.filters.asignacion = sedeSelect.value;
        this.sedeNombre = sedeSelect.options[sedeSelect.selectedIndex]?.text || '';
        nivelSelect.innerHTML = '<option value="">Cargando...</option>';
        numeroSelect.innerHTML = '<option value="">Seleccione grado primero</option>';
        this.filters.nivel = '';
        this.filters.numero = '';
        if (sedeSelect.value && yearSelect.value) {
          await this.loadNiveles(sedeSelect.value, yearSelect.value, nivelSelect);
        } else {
          nivelSelect.innerHTML = '<option value="">Seleccione sede primero</option>';
        }
      });
    }

    if (nivelSelect) {
      nivelSelect.addEventListener('change', () => {
        this.filters.nivel = nivelSelect.value;
        this.filters.numero = '';
        if (nivelSelect.value) {
          this.loadNumeros(sedeSelect?.value, nivelSelect.value, yearSelect?.value, numeroSelect);
        } else {
          numeroSelect.innerHTML = '<option value="">Seleccione grado primero</option>';
        }
      });
    }

    if (sedeSelect?.value && yearSelect?.value) {
      await this.loadNiveles(sedeSelect.value, yearSelect.value, nivelSelect);
    }
  }

  async loadNiveles(sede, year, nivelSelect) {
    try {
      const res = await filters.getNiveles(sede, year);
      const grupos = Array.isArray(res) ? res : (res?.data || []);
      const niveles = [...new Set(grupos.map((g) => g.nivel ?? g.value).filter((v) => v != null))].sort((a, b) => a - b);
      let html = '<option value="">Seleccione...</option>';
      niveles.forEach((n) => { html += `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`; });
      nivelSelect.innerHTML = html;
    } catch {
      nivelSelect.innerHTML = '<option value="">Error al cargar grados</option>';
    }
  }

  async loadNumeros(sede, nivel, year, numeroSelect) {
    numeroSelect.innerHTML = '<option value="">Cargando...</option>';
    try {
      const res = await fetch(endpoint('/getNumeros.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignacion: sede, nivel, year: year || String(new Date().getFullYear()) }),
      });
      const numeros = await res.json();
      const lista = Array.isArray(numeros) ? numeros : (numeros?.data || []);
      const unicos = [...new Set(lista.map((g) => g.numero ?? g.value).filter((v) => v != null))].sort((a, b) => a - b);
      let html = '<option value="">Seleccione...</option>';
      unicos.forEach((n) => { html += `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`; });
      numeroSelect.innerHTML = html;
    } catch {
      numeroSelect.innerHTML = '<option value="">Error al cargar grupos</option>';
    }
  }

  async queryRanking() {
    if (this.busy) return;
    this.busy = true;

    if (!this.filters.asignacion || !this.filters.year) {
      showToast('Seleccione año y sede', 'warning');
      this.busy = false;
      return;
    }

    const resultsContainer = $('puestosResults');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="text-center">
            <span data-orb="solving" data-orb-size="40" class="inline-block mx-auto mb-3" style="width:40px;height:40px"></span>
            <p class="text-sm text-gray-400">Calculando puestos...</p>
          </div>
        </div>
      `;
    }

    try {
      const isGroup = this.filters.nivel && this.filters.numero;
      let data;
      if (isGroup) {
        data = await puestos.getGroupRanking({
          asignacion: this.filters.asignacion,
          nivel: this.filters.nivel,
          numero: this.filters.numero,
          periodo: this.filters.periodo || 'UNO',
          year: this.filters.year,
        });
      } else {
        data = await puestos.getInstitutionRanking({
          asignacion: this.filters.asignacion,
          year: this.filters.year,
          periodo: this.filters.periodo || 'UNO',
        });
      }

      this.isGroupView = isGroup;
      this.rankingData = Array.isArray(data) ? data : [];
      this.filteredData = [...this.rankingData];
      this.currentPage = 1;
      this.searchTerm = '';
      this.renderResults(resultsContainer);
    } catch (error) {
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="glass-card p-12 text-center">
            <i class="bi bi-exclamation-circle text-5xl text-red-300 block mb-3"></i>
            <p class="text-gray-500 mb-2">Error al calcular puestos</p>
            <p class="text-xs text-gray-400 mb-4">${escapeHtml(error.message || '')}</p>
            <button class="inline-flex items-center gap-2 px-4 py-2 bg-[#543391] hover:bg-[#6f4ab3] text-white font-medium rounded-lg transition-all text-sm" id="btnReintentarPuestos">
              <i class="bi bi-arrow-clockwise"></i> Reintentar
            </button>
          </div>
        `;
        const retry = $('btnReintentarPuestos');
        if (retry) retry.addEventListener('click', () => this.queryRanking());
      }
    } finally {
      this.busy = false;
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  renderFilters(container) {
    container.innerHTML = `
      <div class="glass-card p-4 mb-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Año</label>
            <select id="puestosYear"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Cargando...</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sede</label>
            <select id="puestosSede"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Cargando...</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nivel</label>
            <select id="puestosNivel"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Seleccione sede primero</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Grupo</label>
            <select id="puestosNumero"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Seleccione grado primero</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Periodo</label>
            <select id="puestosPeriodo"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Cargando...</option>
            </select>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
          <div class="flex items-center gap-2 text-xs text-gray-400">
            <i class="bi bi-info-circle"></i>
            <span>Seleccione <strong>Nivel</strong> y <strong>Grupo</strong> para ver ranking por grupo, o déjelos vacíos para toda la sede</span>
          </div>
          <button id="btnConsultarPuestos"
                  class="inline-flex items-center gap-2 px-5 py-2 bg-[#543391] hover:bg-[#6f4ab3] text-white font-medium rounded-lg shadow-sm transition-all text-sm">
            <i class="bi bi-search"></i> Consultar
          </button>
        </div>
      </div>

      <div id="puestosResults">
        <div class="glass-card p-12 text-center">
          <i class="bi bi-trophy text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400 font-medium">Seleccione los filtros y consulte</p>
          <p class="text-xs text-gray-300 mt-1">Se mostrarán los puestos académicos ordenados por promedio</p>
        </div>
      </div>
    `;

    const consultBtn = $('btnConsultarPuestos');
    if (consultBtn) {
      consultBtn.addEventListener('click', () => {
        this.filters.year = $('puestosYear')?.value || '';
        this.filters.asignacion = $('puestosSede')?.value || '';
        this.filters.nivel = $('puestosNivel')?.value || '';
        this.filters.numero = $('puestosNumero')?.value || '';
        this.filters.periodo = $('puestosPeriodo')?.value || '';
        this.queryRanking();
      });
    }

    delegate(container, 'input', '#puestosSearchInput', debounce((e) => {
      this.searchTerm = e.target.value.toLowerCase().trim();
      this.currentPage = 1;
      this.renderTable();
    }, 250));

    // Delegate pagination clicks
    delegate(container, 'click', '[data-pagina-puesto]', (e, target) => {
      const page = parseInt(target.dataset.paginaPuesto);
      if (!isNaN(page)) this.goToPage(page);
    });

    // Delegate page size change
    delegate(container, 'change', '#puestosPageSize', (e, target) => {
      this.pageSize = parseInt(target.value) || 50;
      this.currentPage = 1;
      this.renderTable();
    });
  }

  renderResults(container) {
    if (!container) return;

    const total = this.rankingData.length;
    if (total === 0) {
      container.innerHTML = `
        <div class="glass-card p-12 text-center">
          <i class="bi bi-inbox text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400 font-medium">Sin resultados</p>
          <p class="text-xs text-gray-300 mt-1">No se encontraron estudiantes para los filtros seleccionados</p>
        </div>
      `;
      return;
    }

    const averages = this.rankingData.map(r => parseFloat(r.promedio)).filter(n => !isNaN(n));
    const maxAvg = averages.length ? Math.max(...averages) : 0;
    const minAvg = averages.length ? Math.min(...averages) : 0;

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full
                       ${this.isGroupView ? 'bg-violet-100 text-violet-700' : 'bg-[#543391]/10 text-[#543391]'}">
            <i class="bi ${this.isGroupView ? 'bi-people' : 'bi-building'}"></i>
            ${this.isGroupView ? 'Ranking por Grupo' : 'Ranking Institucional'}
          </span>
          <span class="text-xs text-gray-400">${total} estudiante(s)</span>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">
            <i class="bi bi-arrow-up-circle-fill"></i> ${maxAvg.toFixed(2)}
          </span>
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-700">
            <i class="bi bi-arrow-down-circle-fill"></i> ${minAvg.toFixed(2)}
          </span>
        </div>
      </div>

      <div class="glass-card p-3 mb-4">
        <div class="relative" role="search">
          <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input type="search" id="puestosSearchInput"
                 class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm
                        focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                 placeholder="Buscar estudiante por nombre..." autocomplete="off">
        </div>
      </div>

      <div class="glass-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th class="text-center py-3 px-4 w-16">#</th>
                <th class="text-left py-3 px-4">Estudiante</th>
                ${!this.isGroupView ? '<th class="text-center py-3 px-4 w-20">Grupo</th>' : ''}
                <th class="text-center py-3 px-4 w-28">Promedio</th>
              </tr>
            </thead>
            <tbody id="puestosTableBody">
              ${this.buildRows()}
            </tbody>
          </table>
        </div>

        <div id="puestosEmptyState" class="${this.filteredData.length > 0 ? 'hidden' : ''} text-center py-8">
          <i class="bi bi-search text-3xl text-gray-300 block mb-2"></i>
          <p class="text-xs text-gray-400">No se encontraron estudiantes con &quot;${escapeHtml(this.searchTerm)}&quot;</p>
        </div>

        <!-- Footer with pagination -->
        <div class="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-gray-400">
            <span>Mostrar</span>
            <select id="puestosPageSize"
                    class="px-2 py-1 border border-gray-200 rounded-md text-xs bg-white
                           focus:ring-1 focus:ring-[#543391] focus:border-transparent outline-none">
              ${PAGE_SIZES.map((s) => `<option value="${s}" ${s === this.pageSize ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <span id="puestosFooterCount">${this.getFooterText()}</span>
          </div>
          <div class="flex items-center gap-1" id="puestosPagination">
            ${this.renderPaginationControls()}
          </div>
        </div>
      </div>
    `;
  }

  buildRows() {
    const data = this.searchTerm
      ? this.rankingData.filter(r => (r.nombres || '').toLowerCase().includes(this.searchTerm))
      : this.rankingData;

    this.filteredData = data;
    const pageData = this.getPageData();
    if (pageData.length === 0) return '';

    const offset = (this.currentPage - 1) * this.pageSize;

    return pageData.map((r, i) => {
      const absIndex = offset + i;
      const puesto = parseInt(r.puesto) || absIndex + 1;
      const medal = MEDALS[puesto];
      const prom = parseFloat(r.promedio);
      const promStr = !isNaN(prom) ? prom.toFixed(2) : '—';

      return `
        <tr class="border-t border-gray-50 hover:bg-[#543391]/[0.03] transition-colors
                   ${absIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                   ${medal ? medal.bg : ''}">
          <td class="py-3 px-4 text-center">
            ${medal
              ? `<span class="inline-flex items-center justify-center gap-1 text-sm font-bold ${medal.color}"><i class="${medal.icon}"></i></span>`
              : `<span class="text-gray-400 text-xs font-mono">${absIndex + 1}</span>`
            }
          </td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              ${medal ? `<span class="w-6 h-6 rounded-full ${medal.bg} border ${medal.color.replace('text', 'border')}/30 flex items-center justify-center text-[10px] font-bold ${medal.color}">${absIndex + 1}</span>` : ''}
              <span class="${medal ? 'font-semibold text-gray-800' : 'text-gray-600'}">${escapeHtml(r.nombres || '')}</span>
            </div>
          </td>
          ${!this.isGroupView ? `
            <td class="py-3 px-4 text-center">
              <span class="px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-gray-600">${escapeHtml(r.grupo || '')}</span>
            </td>
          ` : ''}
          <td class="py-3 px-4 text-center">
            <span class="inline-flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-full ${avgColor(prom)} ${avgBg(prom)}">${promStr}</span>
          </td>
        </tr>
      `;
    }).join('');
  }
}

const puestosModule = new PuestosModule();
export default puestosModule;
