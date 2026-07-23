import { attendance } from '@services/attendance.js';
import { filters } from '@services/filters.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';
import { showToast } from '@utils/alert.js';

const SECTION_ID = 'seccionConsolidadoInasistencias';
const CONTAINER_ID = 'contenedorConsolidadoInasistencias';

class ConsolidadoInasistenciasModule {
  constructor() {
    this.currentPage = 1;
    this.perPage = 50;
    this.data = [];
    this.meta = null;
    this.searchTerm = '';

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

  async load() {
    const container = $(CONTAINER_ID);
    if (!container) return;

    this.renderShell(container);
    await this.loadYears();
    this.query(1);
    this._loaded = true;
  }

  async loadYears() {
    const yearSel = $('consolidadoInasYear');
    if (!yearSel) return;
    try {
      const res = await filters.getYears();
      const years = Array.isArray(res) ? res : (res?.data || []);
      const cur = new Date().getFullYear().toString();
      let html = '<option value="">Seleccione...</option>';
      years.forEach((y) => {
        const v = y.value || y.year || '';
        if (!v) return;
        html += `<option value="${escapeHtml(v)}"${String(v) === cur ? ' selected' : ''}>${escapeHtml(v)}</option>`;
      });
      yearSel.innerHTML = html;
    } catch {
      yearSel.innerHTML = '<option value="">Error</option>';
    }
  }

  async query(page = 1) {
    const year = $('consolidadoInasYear')?.value;
    if (!year) {
      showToast('Seleccione un año', 'warning');
      return;
    }

    const search = $('consolidadoInasSearch')?.value?.trim() || '';

    this.currentPage = page;
    this.searchTerm = search;

    const resultsEl = $('consolidadoInasResults');
    if (resultsEl) {
      resultsEl.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="text-center">
            <span data-orb="searching" data-orb-size="40" class="inline-block mx-auto mb-3" style="width:40px;height:40px"></span>
            <p class="text-sm text-gray-400">Cargando consolidado...</p>
          </div>
        </div>
      `;
    }

    try {
      const params = { year, page, per_page: this.perPage };
      if (search) params.estudiante = search;

      const res = await attendance.getConsolidation(params);
      this.data = Array.isArray(res?.data) ? res.data : [];
      this.meta = res?.meta || null;

      this.renderResults(resultsEl);
    } catch (error) {
      if (resultsEl) {
        resultsEl.innerHTML = `
          <div class="glass-card p-12 text-center">
            <i class="bi bi-exclamation-circle text-5xl text-red-300 block mb-3"></i>
            <p class="text-gray-500 mb-2">Error al cargar consolidado</p>
            <p class="text-xs text-gray-400">${escapeHtml(error.message || '')}</p>
          </div>
        `;
      }
    }
  }

  renderShell(container) {
    container.innerHTML = `
      <div class="glass-card p-4 mb-4">
        <div class="flex flex-wrap items-end gap-3">
          <div class="w-40">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Año</label>
            <select id="consolidadoInasYear"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Cargando...</option>
            </select>
          </div>
          <div class="flex-1 min-w-[200px]">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Buscar estudiante</label>
            <input type="text" id="consolidadoInasSearch"
                   class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                          focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                   placeholder="ID o nombre del estudiante (opcional)">
          </div>
          <div>
            <button id="btnConsolidadoInasConsultar"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-[#543391] hover:bg-[#6f4ab3] text-white font-medium rounded-lg shadow-sm transition-all text-sm">
              <i class="bi bi-search"></i> Consultar
            </button>
          </div>
        </div>
      </div>

      <div id="consolidadoInasResults">
        <div class="glass-card p-12 text-center">
          <i class="bi bi-bar-chart-line text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400 font-medium">Consolidado de Inasistencias</p>
          <p class="text-xs text-gray-300 mt-1">Seleccione año y presione "Consultar"</p>
        </div>
      </div>
    `;

    const consultBtn = $('btnConsolidadoInasConsultar');
    if (consultBtn) {
      consultBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.query(1);
      });
    }

    const searchInput = $('consolidadoInasSearch');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.query(1);
      });
    }
  }

  renderResults(container) {
    if (!container) return;

    if (this.data.length === 0) {
      container.innerHTML = `
        <div class="glass-card p-12 text-center">
          <i class="bi bi-inbox text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400 font-medium">Sin datos</p>
          <p class="text-xs text-gray-300 mt-1">No hay inasistencias registradas para este año</p>
        </div>
      `;
      return;
    }

    const total = this.meta?.total || 0;
    const totalPages = this.meta?.total_pages || 1;
    const page = this.meta?.page || 1;

    const hasDetail = this.data[0]?.materia && this.data[0].materia !== 'Varias';

    let thead;
    if (hasDetail) {
      thead = `
        <tr>
          <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estudiante</th>
          <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grupo</th>
          <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sede</th>
          <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Materia</th>
          <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Horas</th>
        </tr>
      `;
    } else {
      thead = `
        <tr>
          <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
          <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estudiante</th>
          <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grupo</th>
          <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sede</th>
          <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Horas</th>
        </tr>
      `;
    }

    const rows = this.data.map((r, i) => {
      const num = hasDetail ? '' : `<td class="py-2 px-3 text-gray-400 text-xs">${(page - 1) * this.perPage + i + 1}</td>`;
      const estudiante = `<td class="py-2 px-3 font-medium text-gray-700 text-sm">${escapeHtml(r.nombres || '')}</td>`;
      const grupo = `<td class="py-2 px-3 text-gray-600 text-sm">${escapeHtml(r.grupo || '')}</td>`;
      const sede = `<td class="py-2 px-3 text-gray-600 text-sm">${escapeHtml(r.sede || '')}</td>`;
      const materia = hasDetail ? `<td class="py-2 px-3 text-gray-600 text-sm">${escapeHtml(r.materia || '')}</td>` : '';
      const total = `<td class="text-center py-2 px-3 font-semibold ${Number(r.total) >= 6 ? 'text-red-500' : Number(r.total) >= 3 ? 'text-amber-500' : 'text-gray-700'} text-sm">${escapeHtml(r.total || '0')}</td>`;

      return `<tr class="border-t border-gray-50 hover:bg-[#543391]/[0.03] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}">
        ${num}${estudiante}${grupo}${sede}${materia}${total}
      </tr>`;
    }).join('');

    const pagination = this.buildPagination(totalPages, page);

    container.innerHTML = `
      <div class="glass-card overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <span class="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <i class="bi bi-person-x text-[#543391]"></i>
            <span class="font-medium text-gray-700">${total}</span> registro(s)
          </span>
          <span class="text-xs text-gray-400">Página ${page} de ${totalPages}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">${thead}</thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          ${pagination}
        </div>
      </div>
    `;

    this.wirePagination();
  }

  buildPagination(totalPages, currentPage) {
    if (totalPages <= 1) return '';

    const maxVisible = 7;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    let html = '<div class="flex items-center justify-center gap-1">';

    // Previous
    html += `
      <button class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 ${currentPage <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-[#543391] hover:text-white hover:border-[#543391]'} transition-all page-link"
              data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>
        <i class="bi bi-chevron-left"></i>
      </button>
    `;

    if (start > 1) {
      html += `<button class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-[#543391] hover:text-white hover:border-[#543391] transition-all page-link" data-page="1">1</button>`;
      if (start > 2) html += '<span class="px-2 text-gray-400 text-xs">...</span>';
    }

    for (let p = start; p <= end; p++) {
      html += `
        <button class="px-3 py-1.5 text-xs rounded-lg border transition-all page-link
          ${p === currentPage
            ? 'bg-[#543391] text-white border-[#543391] font-semibold'
            : 'border-gray-200 text-gray-600 hover:bg-[#543391] hover:text-white hover:border-[#543391]'}"
          data-page="${p}">${p}</button>
      `;
    }

    if (end < totalPages) {
      if (end < totalPages - 1) html += '<span class="px-2 text-gray-400 text-xs">...</span>';
      html += `<button class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-[#543391] hover:text-white hover:border-[#543391] transition-all page-link" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next
    html += `
      <button class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 ${currentPage >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-[#543391] hover:text-white hover:border-[#543391]'} transition-all page-link"
              data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>
        <i class="bi bi-chevron-right"></i>
      </button>
    `;

    html += '</div>';
    return html;
  }

  wirePagination() {
    delegate($(CONTAINER_ID), 'click', '.page-link:not([disabled])', (e, target) => {
      const page = parseInt(target.dataset.page);
      if (page && page !== this.currentPage) {
        this.query(page);
      }
    });
  }
}

const consolidadoInasistenciasModule = new ConsolidadoInasistenciasModule();
export default consolidadoInasistenciasModule;
