import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { convivencia } from '@services/convivencia.js';
import { filters } from '@services/filters.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';

function decodeHtmlEntities(str) {
  if (!str) return '';
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}
import { showToast } from '@utils/alert.js';

const SECTION_ID = 'seccionConsolidadoConvivencia';
const CONTAINER_ID = 'contenedorConsolidadoConvivencia';

const TIPO_COLORS = {
  positivo: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Positivo' },
  tipo1: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Tipo I' },
  tipo2: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Tipo II' },
  tipo3: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Tipo III' },
};

class ConsolidadoConvivenciaModule {
  constructor() {
    this.currentPage = 1;
    this.perPage = 50;
    this.data = [];
    this.searchTerm = '';
    this.expandedStudent = null;
    this.studentDetail = null;
    this.studentDetailLoading = false;
    this.detailPage = 1;

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
    await this.loadFilters();
    this.query(1);
    this._loaded = true;
  }

  async loadFilters() {
    const yearSel = $('convConsYear');
    const sedeSel = $('convConsSede');
    if (!yearSel || !sedeSel) return;

    try {
      const years = await filters.getYears();
      const yearData = Array.isArray(years) ? years : (years?.data || []);
      const cur = new Date().getFullYear().toString();
      yearSel.innerHTML = '<option value="">Todos los años</option>';
      yearData.forEach((y) => {
        const v = String(y.value || y.year || '');
        if (!v) return;
        yearSel.innerHTML += `<option value="${escapeHtml(v)}"${v === cur ? ' selected' : ''}>${escapeHtml(v)}</option>`;
      });
    } catch {
      yearSel.innerHTML = '<option value="">Error al cargar</option>';
    }

    try {
      const sedes = await filters.getSedes();
      const sedeData = Array.isArray(sedes) ? sedes : (sedes?.data || []);
      sedeSel.innerHTML = '<option value="">Todas las sedes</option>';
      sedeData.forEach((s) => {
        const v = String(s.value || s.ind || '');
        const l = String(s.label || s.sede || '');
        if (!v || !l) return;
        sedeSel.innerHTML += `<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`;
      });
    } catch {
      sedeSel.innerHTML = '<option value="">Error al cargar</option>';
    }
  }

  async loadGrupos() {
    const year = $('convConsYear')?.value;
    const sede = $('convConsSede')?.value;
    const nivelSel = $('convConsNivel');
    const numeroSel = $('convConsNumero');
    if (!nivelSel || !numeroSel) return;

    nivelSel.innerHTML = '<option value="">Todos los niveles</option>';
    numeroSel.innerHTML = '<option value="">Todos los grupos</option>';

    if (!year || !sede) return;

    try {
      const niveles = await filters.getNiveles(sede, year);
      const nivelData = Array.isArray(niveles) ? niveles : (niveles?.data || []);
      nivelData.forEach((n) => {
        const v = String(n.value || n.nivel || n || '');
        if (!v) return;
        nivelSel.innerHTML += `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`;
      });
    } catch {
      /* silent */
    }
  }

  async loadNumeros() {
    const year = $('convConsYear')?.value;
    const sede = $('convConsSede')?.value;
    const nivel = $('convConsNivel')?.value;
    const numeroSel = $('convConsNumero');
    if (!numeroSel) return;

    numeroSel.innerHTML = '<option value="">Todos los grupos</option>';
    if (!year || !sede || !nivel) return;

    try {
      const res = await filters.getNumeros(sede, nivel, year);
      const numeroData = Array.isArray(res) ? res : (res?.data || []);
      const unicos = [...new Set(numeroData.map((g) => g.numero ?? g.value ?? g).filter((v) => v != null))].sort((a, b) => a - b);
      unicos.forEach((n) => {
        numeroSel.innerHTML += `<option value="${escapeHtml(String(n))}">${escapeHtml(String(n))}</option>`;
      });
    } catch {
      /* silent */
    }
  }

  async query(page = 1) {
    const year = $('convConsYear')?.value;
    const sede = $('convConsSede')?.value;
    const nivel = $('convConsNivel')?.value;
    const numero = $('convConsNumero')?.value;
    const search = $('convConsSearch')?.value?.trim() || '';

    this.currentPage = page;
    this.searchTerm = search;

    const resultsEl = $('convConsResults');
    if (resultsEl) {
      resultsEl.innerHTML = `
        <div class="flex items-center justify-center py-16">
          <div class="text-center">
            <span data-orb="searching" data-orb-size="48" class="inline-block mx-auto mb-4" style="width:48px;height:48px"></span>
            <p class="text-sm text-gray-400 font-medium">Cargando consolidado de convivencia...</p>
          </div>
        </div>
      `;
    }

    try {
      const params = {};
      if (year) params.year = year;
      if (sede) params.asignacion = sede;
      if (nivel) params.nivel = nivel;
      if (numero) params.numero = numero;
      if (search) params.estudiante = search;

      const res = await convivencia.getConsolidation(params);
      this.data = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      this.expandedStudent = null;
      this.studentDetail = null;
      this.detailPage = 1;

      this.renderResults(resultsEl);
    } catch (error) {
      if (resultsEl) {
        resultsEl.innerHTML = `
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 flex items-center justify-center">
              <i class="bi bi-exclamation-triangle text-2xl text-rose-400"></i>
            </div>
            <p class="text-gray-500 font-medium mb-1">Error al cargar consolidado</p>
            <p class="text-xs text-gray-400">${escapeHtml(error.message || 'Verifique su conexión e intente nuevamente')}</p>
          </div>
        `;
      }
    }
  }

  renderShell(container) {
    container.innerHTML = `
      <div class="space-y-5">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label class="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Año</label>
              <select id="convConsYear"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                             focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
                <option value="">Cargando...</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Sede</label>
              <select id="convConsSede"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                             focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
                <option value="">Cargando...</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Nivel</label>
              <select id="convConsNivel"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                             focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
                <option value="">Todos los niveles</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Grupo</label>
              <select id="convConsNumero"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                             focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
                <option value="">Todos los grupos</option>
              </select>
            </div>
            <div class="sm:col-span-2 lg:col-span-1">
              <label class="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Estudiante</label>
              <input type="text" id="convConsSearch"
                     class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                            focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                     placeholder="ID o nombre">
            </div>
            <div class="flex items-end">
              <button id="btnConvConsConsultar"
                      class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#543391] hover:bg-[#6f4ab3] text-white font-semibold rounded-xl shadow-sm transition-all text-sm">
                <i class="bi bi-search"></i> Consultar
              </button>
            </div>
          </div>
        </div>

        <div id="convConsStats"></div>

        <div id="convConsResults">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">
              <i class="bi bi-bar-chart-line text-2xl text-[#543391]"></i>
            </div>
            <p class="text-gray-500 font-medium">Consolidado de Convivencia</p>
            <p class="text-xs text-gray-400 mt-1">Seleccione filtros y presione "Consultar"</p>
          </div>
        </div>

        <div id="convConsDetail"></div>
      </div>
    `;

    this.wireShellEvents();
  }

  wireShellEvents() {
    const consultBtn = $('btnConvConsConsultar');
    if (consultBtn) {
      consultBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.query(1);
      });
    }

    const searchInput = $('convConsSearch');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.query(1);
      });
    }

    const yearSel = $('convConsYear');
    const sedeSel = $('convConsSede');
    const nivelSel = $('convConsNivel');

    if (sedeSel) {
      sedeSel.addEventListener('change', () => {
        this.loadGrupos();
      });
    }

    if (yearSel) {
      yearSel.addEventListener('change', () => {
        if ($('convConsSede')?.value) this.loadGrupos();
      });
    }

    if (nivelSel) {
      nivelSel.addEventListener('change', () => {
        this.loadNumeros();
      });
    }
  }

  renderStats(resultsEl) {
    if (this.data.length === 0) {
      $('convConsStats').innerHTML = '';
      return;
    }

    let totalPositivo = 0;
    let totalTipo1 = 0;
    let totalTipo2 = 0;
    let totalTipo3 = 0;

    this.data.forEach((r) => {
      totalPositivo += Number(r.positivo || r.POSITIVO || 0);
      totalTipo1 += Number(r.tipo1 || r.TIPO1 || r['TIPO I'] || 0);
      totalTipo2 += Number(r.tipo2 || r.TIPO2 || r['TIPO II'] || 0);
      totalTipo3 += Number(r.tipo3 || r.TIPO3 || r['TIPO III'] || 0);
    });
    const totalGeneral = totalPositivo + totalTipo1 + totalTipo2 + totalTipo3;

    const cards = [
      { label: 'Total Registros', value: totalGeneral, color: 'gray', icon: 'bi-journal' },
      { label: 'Positivos', value: totalPositivo, color: 'emerald', icon: 'bi-star' },
      { label: 'Tipo I', value: totalTipo1, color: 'blue', icon: 'bi-exclamation-circle' },
      { label: 'Tipo II', value: totalTipo2, color: 'amber', icon: 'bi-exclamation-triangle' },
      { label: 'Tipo III', value: totalTipo3, color: 'rose', icon: 'bi-shield-exclamation' },
    ];

    const colorMap = {
      gray: 'bg-gray-50 border-gray-200 text-gray-700',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700',
      rose: 'bg-rose-50 border-rose-200 text-rose-700',
    };
    const iconColorMap = {
      gray: 'text-gray-400',
      emerald: 'text-emerald-500',
      blue: 'text-blue-500',
      amber: 'text-amber-500',
      rose: 'text-rose-500',
    };

    const statsHtml = `<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      ${cards.map((c) => `
        <div class="${colorMap[c.color]} rounded-xl border p-4 transition-all hover:shadow-sm">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-semibold uppercase tracking-wider opacity-70">${c.label}</span>
            <i class="bi ${c.icon} ${iconColorMap[c.color]} text-sm"></i>
          </div>
          <span class="text-2xl font-black">${c.value}</span>
        </div>
      `).join('')}
    </div>`;

    $('convConsStats').innerHTML = statsHtml;
  }

  renderResults(container) {
    if (!container) return;

    this.renderStats();

    if (this.data.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
            <i class="bi bi-inbox text-2xl text-gray-300"></i>
          </div>
          <p class="text-gray-400 font-medium">Sin registros de convivencia</p>
          <p class="text-xs text-gray-300 mt-1">No se encontraron datos con los filtros seleccionados</p>
        </div>
      `;
      return;
    }

    const total = this.data.length;
    const totalPages = Math.max(1, Math.ceil(total / this.perPage));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const page = this.currentPage;
    const pageData = this.data.slice((page - 1) * this.perPage, page * this.perPage);

    const thead = `
      <tr>
        <th class="text-left py-3 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">#</th>
        <th class="text-left py-3 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Estudiante</th>
        <th class="text-left py-3 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Grupo</th>
        <th class="text-left py-3 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sede</th>
        <th class="text-center py-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Positivo</span>
        </th>
        <th class="text-center py-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> T.I</span>
        </th>
        <th class="text-center py-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> T.II</span>
        </th>
        <th class="text-center py-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> T.III</span>
        </th>
        <th class="text-center py-3 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</th>
        <th class="text-center py-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider"></th>
      </tr>
    `;

    const rows = pageData.map((r, i) => {
      const idx = (page - 1) * this.perPage + i + 1;
      const name = r.nombres || '';
      const grupo = r.grupo || (r.nivel && r.numero ? `${r.nivel}-${r.numero}` : '');
      const sede = r.sede || '';
      const estudianteId = r.estudiante || '';
      const p = Number(r.positivo || r.POSITIVO || 0);
      const t1 = Number(r.tipo1 || r.TIPO1 || r['TIPO I'] || 0);
      const t2 = Number(r.tipo2 || r.TIPO2 || r['TIPO II'] || 0);
      const t3 = Number(r.tipo3 || r.TIPO3 || r['TIPO III'] || 0);
      const totalRow = p + t1 + t2 + t3;

      const badgeClass = totalRow === 0 ? 'text-gray-400' :
        t3 > 0 ? 'text-rose-600 font-bold' :
        t2 > 0 ? 'text-amber-600 font-bold' :
        t1 > 0 ? 'text-blue-600 font-semibold' :
        'text-emerald-600';

      return `
        <tr class="border-t border-gray-50 hover:bg-[#543391]/[0.02] transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : 'bg-white'}">
          <td class="py-3 px-4 text-xs text-gray-400">${idx}</td>
          <td class="py-3 px-4">
            <span class="text-sm font-medium text-gray-700">${escapeHtml(name)}</span>
          </td>
          <td class="py-3 px-4 text-sm text-gray-500">${escapeHtml(grupo)}</td>
          <td class="py-3 px-4 text-sm text-gray-500">${escapeHtml(sede)}</td>
          <td class="text-center py-3 px-3">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${p > 0 ? 'bg-emerald-50 text-emerald-600' : 'text-gray-300'}">${p}</span>
          </td>
          <td class="text-center py-3 px-3">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${t1 > 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-300'}">${t1}</span>
          </td>
          <td class="text-center py-3 px-3">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${t2 > 0 ? 'bg-amber-50 text-amber-600' : 'text-gray-300'}">${t2}</span>
          </td>
          <td class="text-center py-3 px-3">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${t3 > 0 ? 'bg-rose-50 text-rose-600' : 'text-gray-300'}">${t3}</span>
          </td>
          <td class="text-center py-3 px-4">
            <span class="inline-flex items-center justify-center min-w-[2rem] text-sm font-black ${badgeClass}">${totalRow}</span>
          </td>
          <td class="text-center py-3 px-3">
            <button type="button" class="convConsExpand p-1.5 rounded-lg hover:bg-[#543391]/10 text-gray-400 hover:text-[#543391] transition-all"
                    data-student="${escapeHtml(estudianteId)}" data-name="${escapeHtml(name)}" title="Ver detalle">
              <i class="bi bi-chevron-down text-sm"></i>
            </button>
            <button type="button" class="convConsPdf p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-all"
                    data-student="${escapeHtml(estudianteId)}" data-name="${escapeHtml(name)}" title="Descargar PDF individual">
              <i class="bi bi-filetype-pdf text-sm"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const pagination = this.buildPagination(totalPages, page);

    container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <i class="bi bi-people text-[#543391]"></i>
              <span class="font-semibold text-gray-700">${total}</span> estudiante(s)
            </span>
            <span class="text-[10px] text-gray-300">|</span>
            <span class="text-xs text-gray-400">Pág. ${page} de ${totalPages}</span>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" id="convConsExportPdf"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all">
              <i class="bi bi-filetype-pdf"></i> Exportar todo
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50/80">${thead}</thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          ${pagination}
        </div>
      </div>
    `;

    this.wireTableEvents();
    this.wirePagination();
  }

  renderDetailRow(estudianteId, nombre) {
    if (this.studentDetailLoading) {
      return `
        <div class="flex items-center justify-center py-8">
          <span data-orb="working" data-orb-size="28" class="inline-block" style="width:28px;height:28px"></span>
          <span class="ml-3 text-sm text-gray-400">Cargando detalle...</span>
        </div>
      `;
    }
    if (!this.studentDetail) {
      return `
        <div class="p-6 text-center text-sm text-gray-400">
          <i class="bi bi-inbox block text-2xl mb-2"></i>
          No hay información detallada disponible
        </div>
      `;
    }
    const records = Array.isArray(this.studentDetail) ? this.studentDetail : [];
    if (records.length === 0) {
      return `
        <div class="p-6 text-center text-sm text-gray-400">
          <i class="bi bi-inbox block text-2xl mb-2"></i>
          Sin registros individuales
        </div>
      `;
    }

    const detailPage = this.detailPage || 1;
    const detailPerPage = 20;
    const detailTotal = records.length;
    const detailTotalPages = Math.max(1, Math.ceil(detailTotal / detailPerPage));
    if (detailPage > detailTotalPages) this.detailPage = detailTotalPages;
    const dp = this.detailPage;
    const pageRecords = records.slice((dp - 1) * detailPerPage, dp * detailPerPage);

    const items = pageRecords.map((rec) => {
      const tipo = (rec.tipoFalta || rec.tipo || '').toLowerCase();
      const color = tipo.includes('positivo') ? 'emerald' :
                    tipo.includes('tipo1') || tipo.includes('tipo i') ? 'blue' :
                    tipo.includes('tipo2') || tipo.includes('tipo ii') ? 'amber' :
                    tipo.includes('tipo3') || tipo.includes('tipo iii') ? 'rose' : 'gray';
      const colorMap = {
        emerald: 'border-l-emerald-500 bg-emerald-50/50',
        blue: 'border-l-blue-500 bg-blue-50/50',
        amber: 'border-l-amber-500 bg-amber-50/50',
        rose: 'border-l-rose-500 bg-rose-50/50',
        gray: 'border-l-gray-400 bg-gray-50',
      };
      const tipoBadge = tipo.includes('positivo') ? 'bg-emerald-100 text-emerald-700' :
        tipo.includes('tipo1') || tipo.includes('tipo i') ? 'bg-blue-100 text-blue-700' :
        tipo.includes('tipo2') || tipo.includes('tipo ii') ? 'bg-amber-100 text-amber-700' :
        tipo.includes('tipo3') || tipo.includes('tipo iii') ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600';
      const idx = (dp - 1) * detailPerPage + pageRecords.indexOf(rec) + 1;
      return `
        <div class="border-l-4 ${colorMap[color]} rounded-r-xl px-4 py-3 text-sm" data-conv-ind="${rec.ind || ''}">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-[10px] text-gray-400 font-mono shrink-0">#${idx}</span>
              <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${tipoBadge}">${escapeHtml(decodeHtmlEntities(rec.tipoFalta || rec.tipo || ''))}</span>
              ${rec.asignatura ? `<span class="text-[10px] text-gray-400 truncate">${escapeHtml(decodeHtmlEntities(rec.asignatura))}</span>` : ''}
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] text-gray-400">${escapeHtml(decodeHtmlEntities(rec.fecha || ''))} ${rec.hora ? escapeHtml(decodeHtmlEntities(rec.hora)) : ''}</span>
              <button type="button" class="convConsPrint p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#543391] transition-all"
                      data-ind="${escapeHtml(String(rec.ind || ''))}" data-estudiante="${escapeHtml(String(rec.estudiante || estudianteId))}"
                      title="Imprimir registro">
                <i class="bi bi-printer text-sm"></i>
              </button>
            </div>
          </div>
          ${rec.descripcionSituacion ? `<p class="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">${escapeHtml(decodeHtmlEntities(rec.descripcionSituacion))}</p>` : ''}
          ${rec.faltas ? `<p class="text-[10px] text-gray-400 mt-1"><span class="font-medium">Faltas:</span> ${escapeHtml(decodeHtmlEntities(rec.faltas))}</p>` : ''}
        </div>
      `;
    }).join('');

    let paginationHtml = '';
    if (detailTotalPages > 1) {
      paginationHtml = '<div class="flex items-center justify-center gap-1 mt-3">';
      paginationHtml += `<button class="convDetailPage px-2 py-1 text-[10px] rounded border border-gray-200 ${dp <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-purple-50'}" data-page="${dp - 1}" ${dp <= 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>`;
      for (let p = 1; p <= detailTotalPages; p++) {
        paginationHtml += `<button class="convDetailPage px-2 py-1 text-[10px] rounded border transition-all ${p === dp ? 'bg-[#543391] text-white border-[#543391]' : 'border-gray-200 text-gray-500 hover:bg-purple-50'}" data-page="${p}">${p}</button>`;
      }
      paginationHtml += `<button class="convDetailPage px-2 py-1 text-[10px] rounded border border-gray-200 ${dp >= detailTotalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-purple-50'}" data-page="${dp + 1}" ${dp >= detailTotalPages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>`;
      paginationHtml += `<span class="text-[10px] text-gray-400 ml-2">${detailTotal} registros</span>`;
      paginationHtml += '</div>';
    }

    return `
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-sm font-bold text-gray-700">Registros de ${escapeHtml(nombre)}</h4>
          <button type="button" class="convConsPdf px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                  data-student="${escapeHtml(estudianteId)}" data-name="${escapeHtml(nombre)}">
            <i class="bi bi-filetype-pdf mr-1"></i> PDF
          </button>
        </div>
        <div class="space-y-2">${items}</div>
        ${paginationHtml}
      </div>
    `;
  }

  async loadStudentDetail(estudianteId) {
    const alreadyExpanded = this.expandedStudent === estudianteId;
    if (alreadyExpanded) {
      this.expandedStudent = null;
      this.studentDetail = null;
      this.detailPage = 1;
      this.toggleDetailRow(null);
      return;
    }

    this.expandedStudent = estudianteId;
    this.studentDetail = null;
    this.detailPage = 1;
    this.studentDetailLoading = true;
    this.toggleDetailRow(estudianteId);

    try {
      const res = await convivencia.getStudentDetail(estudianteId);
      this.studentDetail = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    } catch {
      this.studentDetail = [];
    }

    this.studentDetailLoading = false;
    this.renderDetailContent(estudianteId);
  }

  toggleDetailRow(estudianteId) {
    const container = $(CONTAINER_ID);
    if (!container) return;
    const existingRow = container.querySelector('.convConsDetailRow');
    if (existingRow) existingRow.remove();

    if (!estudianteId) {
      const expandBtn = container.querySelector(`[data-student="${estudianteId}"]`);
      if (expandBtn) {
        const icon = expandBtn.querySelector('i');
        if (icon) { icon.className = 'bi bi-chevron-down text-sm'; }
      }
      return;
    }

    const row = document.createElement('tr');
    row.className = 'convConsDetailRow bg-purple-50/30';
    row.innerHTML = `<td colspan="10" class="p-0">${this.renderDetailRow(estudianteId, '')}</td>`;

    const expandBtn = container.querySelector(`.convConsExpand[data-student="${estudianteId}"]`);
    if (expandBtn) {
      const tr = expandBtn.closest('tr');
      if (tr && tr.parentNode) {
        tr.parentNode.insertBefore(row, tr.nextSibling);
      }
      const icon = expandBtn.querySelector('i');
      if (icon) { icon.className = 'bi bi-chevron-up text-sm'; }
    }

    this.wireDetailEvents(estudianteId);
  }

  renderDetailContent(estudianteId) {
    const container = $(CONTAINER_ID);
    if (!container) return;
    const detailRow = container.querySelector('.convConsDetailRow');
    if (!detailRow) return;
    const td = detailRow.querySelector('td');
    if (td) {
      const nombre = this.data.find(r => String(r.estudiante) === String(estudianteId))?.nombres || '';
      td.innerHTML = this.renderDetailRow(estudianteId, nombre);
      this.wireDetailEvents(estudianteId);
    }
  }

  wireDetailEvents(estudianteId) {
    delegate($(CONTAINER_ID), 'click', '.convDetailPage:not([disabled])', (e, target) => {
      const page = parseInt(target.dataset.page);
      if (page && page !== this.detailPage) {
        this.detailPage = page;
        this.renderDetailContent(estudianteId);
      }
    });

    delegate($(CONTAINER_ID), 'click', '.convConsPrint', (e, target) => {
      const ind = target.dataset.ind;
      const estId = target.dataset.estudiante;
      const rec = (this.studentDetail || []).find(r => String(r.ind) === String(ind));
      if (rec) this.printRecord(rec, estId);
    });
  }

  async printRecord(rec, estudianteId) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = 0;

    let escudoDataUrl = null;
    try {
      const resp = await fetch('escudohd.png');
      const blob = await resp.blob();
      escudoDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (_) { /* escudo not available */ }

    if (escudoDataUrl) {
      let escudoFmt = 'JPEG';
      if (escudoDataUrl.startsWith('data:image/png') || escudoDataUrl.includes(';base64,iVBOR')) escudoFmt = 'PNG';
      else if (escudoDataUrl.startsWith('data:image/webp') || escudoDataUrl.includes(';base64,UklGR')) escudoFmt = 'WEBP';
      doc.addImage(escudoDataUrl, escudoFmt, 15, 5, 16, 20);
    }

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Convivencia', escudoDataUrl ? 36 : pageW / 2, 12, escudoDataUrl ? { align: 'left' } : { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('I.E. de Occidente', escudoDataUrl ? 36 : pageW / 2, 19, escudoDataUrl ? { align: 'left' } : { align: 'center' });
    doc.text(`Ano: ${rec.year || new Date().getFullYear()}`, escudoDataUrl ? 36 : pageW / 2, 24, escudoDataUrl ? { align: 'left' } : { align: 'center' });

    doc.setDrawColor(84, 51, 145).setLineWidth(0.5).line(margin, 30, pageW - margin, 30);

    y = 40;

    const addText = (text, fontSize, fontStyle = 'normal', maxWidth = contentW) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      const lines = doc.splitTextToSize(text || '', maxWidth);
      lines.forEach(line => {
        if (y > pageH - 20) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += fontSize * 0.5 + 1;
      });
    };

    const addSection = (label, value) => {
      if (!value) return;
      if (y > pageH - 30) { doc.addPage(); y = 20; }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(label, margin, y);
      y += 4;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(value, contentW);
      lines.forEach(line => {
        if (y > pageH - 20) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 5;
      });
      y += 2;
    };

    const addSeparator = () => {
      if (y > pageH - 20) { doc.addPage(); y = 20; }
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
    };

    doc.setTextColor(30, 30, 30);
    addSection('Estudiante', decodeHtmlEntities(rec.nombres || ''));
    addSection('ID', String(rec.estudiante || ''));
    addSection('Grupo', rec.grupo || '');
    addSection('Sede', rec.sede || '');

    addSeparator();

    addSection('Reportado por (Docente)', decodeHtmlEntities(rec.docente || ''));
    addSection('Asignatura', decodeHtmlEntities(rec.asignatura || ''));
    addSection('Fecha del Reporte', rec.fecha || '');
    addSection('Hora del Reporte', rec.hora || (rec.fechahora ? rec.fechahora.slice(11, 19) : ''));

    addSeparator();

    const tipoLabel = (rec.tipoFalta || '').toUpperCase().includes('POSITIVO') ? 'Tipo de Situación' : 'Tipo de Falta';
    addSection(tipoLabel, rec.tipoFalta || '');

    addSeparator();

    addSection('Faltas al manual de convivencia', decodeHtmlEntities(rec.faltas || ''));
    addSection('Descripcion de la Situacion', decodeHtmlEntities(rec.descripcionSituacion || ''));
    addSection('Descargos del estudiante', decodeHtmlEntities(rec.descargosEstudiante || ''));
    addSection('Otras Observaciones', decodeHtmlEntities(rec.positivos || ''));

    const drawSignature = (imgBase64, label, x, w) => {
      if (y > pageH - 40) { doc.addPage(); y = 20; }
      if (imgBase64) {
        try {
          let raw = imgBase64;
          let fmt = 'JPEG';
          if (raw.startsWith('/9j/')) {
            fmt = 'JPEG';
          } else if (raw.startsWith('iVBOR')) {
            fmt = 'PNG';
          } else if (raw.startsWith('UklGR')) {
            fmt = 'WEBP';
          }
          if (!raw.startsWith('data:')) raw = `data:image/${fmt.toLowerCase()};base64,${raw}`;
          doc.addImage(raw, fmt, x, y, w, 20);
        } catch { /* invalid image, skip */ }
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(label, x + w / 2, y + 25, { align: 'center' });
    };

    y += 10;
    const sigW = (contentW - 10) / 2;
    drawSignature(rec.firma || '', 'Firma del Docente', margin, sigW);
    drawSignature(rec.firmaAcudiente || '', 'Firma del Acudiente', margin + sigW + 10, sigW);

    const nombre = (rec.nombres || 'estudiante').replace(/\s+/g, '_');
    const fileName = `Convivencia_${nombre}_${rec.fecha || 'reporte'}.pdf`;
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);

    const modal = document.createElement('div');
    modal.id = 'convPdfModal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl w-[90vw] max-w-[900px] h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <h3 class="font-semibold text-gray-800 truncate">${fileName}</h3>
          <div class="flex gap-2 shrink-0">
            <button id="convPdfDownload" class="px-3 py-1.5 bg-[#543391] text-white text-sm rounded-lg hover:bg-[#3d2570] flex items-center gap-1.5">
              <i class="bi bi-download"></i> Descargar
            </button>
            <button id="convPdfClose" class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500">
              <i class="bi bi-x-lg text-lg"></i>
            </button>
          </div>
        </div>
        <iframe src="${url}" class="flex-1 w-full border-0"></iframe>
      </div>
    `;
    document.body.appendChild(modal);

    const cleanup = () => { URL.revokeObjectURL(url); modal.remove(); };
    modal.querySelector('#convPdfClose').addEventListener('click', cleanup);
    modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });
    modal.querySelector('#convPdfDownload').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    });

    showToast('Vista previa del PDF', 'success');
  }

  wireTableEvents() {
    delegate($(CONTAINER_ID), 'click', '.convConsExpand', (e, target) => {
      const id = target.dataset.student;
      this.loadStudentDetail(id);
    });

    delegate($(CONTAINER_ID), 'click', '.convConsPdf', (e, target) => {
      const id = target.dataset.student;
      const name = target.dataset.name;
      this.exportStudentPdf(id, name);
    });

    const exportAllBtn = $('convConsExportPdf');
    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', () => this.exportAllPdf());
    }
  }

  buildPagination(totalPages, currentPage) {
    if (totalPages <= 1) return '';

    const maxVisible = 7;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    let html = '<div class="flex items-center justify-center gap-1 flex-wrap">';

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
        this.currentPage = page;
        this.renderResults($('convConsResults'));
      }
    });
  }

  async exportStudentPdf(estudianteId, nombre) {
    try {
      const res = await convivencia.getByStudent(estudianteId);
      const records = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();

      let escudoDataUrl = null;
      try {
        const resp = await fetch('escudohd.png');
        const blob = await resp.blob();
        escudoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (_) { /* escudo not available */ }

      if (escudoDataUrl) {
        doc.addImage(escudoDataUrl, 'PNG', 14, 5, 16, 20);
      }

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Consolidado de Convivencia', escudoDataUrl ? 36 : pageW / 2, 18, escudoDataUrl ? { align: 'left' } : { align: 'center' });

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Estudiante: ${decodeHtmlEntities(nombre)}`, 14, 42);
      doc.text(`ID: ${estudianteId}`, 14, 50);

      if (records.length === 0) {
        doc.setFontSize(10);
        doc.text('Sin registros de convivencia', 14, 65);
      } else {
        const tableData = records.map((r) => [
          r.fecha || r.fechahora || '',
          decodeHtmlEntities(r.tipoFalta || r.tipo || ''),
          decodeHtmlEntities(r.asignatura || ''),
          decodeHtmlEntities((r.descripcionSituacion || '').substring(0, 60)),
        ]);
        doc.autoTable({
          startY: 58,
          head: [['Fecha', 'Tipo', 'Asignatura', 'Descripción']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [84, 51, 145] },
          styles: { fontSize: 8 },
          margin: { top: 50 },
        });
      }

      doc.save(`Convivencia_${nombre.replace(/\s+/g, '_')}.pdf`);
      showToast(`PDF generado: ${nombre}`, 'success');
    } catch (error) {
      showToast('Error al generar PDF', 'error');
    }
  }

  async exportAllPdf() {
    if (this.data.length === 0) {
      showToast('No hay datos para exportar', 'warning');
      return;
    }

    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();

      let escudoDataUrl = null;
      try {
        const resp = await fetch('escudohd.png');
        const blob = await resp.blob();
        escudoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (_) { /* escudo not available */ }

      if (escudoDataUrl) {
        doc.addImage(escudoDataUrl, 'PNG', 10, 3, 14, 18);
      }

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Consolidado General de Convivencia', escudoDataUrl ? 30 : pageW / 2, 14, escudoDataUrl ? { align: 'left' } : { align: 'center' });

      const year = $('convConsYear')?.value || 'Todos';
      const sede = $('convConsSede')?.selectedOptions?.[0]?.text || 'Todas';
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.text(`Año: ${year}  |  Sede: ${sede}  |  Total estudiantes: ${this.data.length}`, pageW / 2, 34, { align: 'center' });

      const tableData = this.data.map((r, i) => {
        const p = Number(r.positivo || r.POSITIVO || 0);
        const t1 = Number(r.tipo1 || r.TIPO1 || r['TIPO I'] || 0);
        const t2 = Number(r.tipo2 || r.TIPO2 || r['TIPO II'] || 0);
        const t3 = Number(r.tipo3 || r.TIPO3 || r['TIPO III'] || 0);
        return [
          (i + 1).toString(),
          r.nombres || '',
          r.grupo || '',
          r.sede || '',
          p.toString(),
          t1.toString(),
          t2.toString(),
          t3.toString(),
          (p + t1 + t2 + t3).toString(),
        ];
      });

      doc.autoTable({
        startY: 40,
        head: [['#', 'Estudiante', 'Grupo', 'Sede', 'Positivo', 'Tipo I', 'Tipo II', 'Tipo III', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [84, 51, 145], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 50 },
          2: { cellWidth: 15 },
          3: { cellWidth: 30 },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 15, halign: 'center' },
          8: { cellWidth: 15, halign: 'center' },
        },
        margin: { top: 40 },
      });

      doc.save(`Consolidado_Convivencia_${year}.pdf`);
      showToast('PDF general generado exitosamente', 'success');
    } catch (error) {
      showToast('Error al generar PDF general', 'error');
    }
  }
}

const consolidadoConvivenciaModule = new ConsolidadoConvivenciaModule();
export default consolidadoConvivenciaModule;
