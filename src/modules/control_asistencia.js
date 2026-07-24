import { api } from '@services/api.js';
import { attendance } from '@services/attendance.js';
import { filters } from '@services/filters.js';
import { endpoint } from '@config/endpoints.js';
import { createPieChart, createDoughnutChart, destroyAllCharts } from '@utils/chart.js';
import { alertHtml, alertError, showToast } from '@utils/alert.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';
import { showModal, hideModal } from '@utils/modal.js';
import Swal from 'sweetalert2';

const SECTION_ID = 'seccionControlInasistencias';
const CONTAINER_ID = 'contenedorControlAsistencia';

class ControlAsistenciaModule {
  constructor() {
    this.busy = false;
    this.students = [];
    this.meta = null;
    this.currentPage = 1;
    this.perPage = 50;
    this.stats = null;

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
    await this.loadFilterOptions();
    this._loaded = true;
  }

  async loadFilterOptions() {
    const yearSel = $('caYear');
    const sedeSel = $('caSede');

    if (yearSel) {
      try {
        const res = await filters.getYears();
        const years = Array.isArray(res) ? res : (res?.data || []);
        const cur = new Date().getFullYear().toString();
        let html = '<option value="">Seleccione...</option>';
        years.forEach((y) => {
          const v = y.value || y.year || '';
          const l = y.label || y.year || '';
          if (!v) return;
          html += `<option value="${escapeHtml(v)}"${String(v) === cur ? ' selected' : ''}>${escapeHtml(l)}</option>`;
        });
        yearSel.innerHTML = html;
      } catch {
        yearSel.innerHTML = '<option value="">Error</option>';
      }
    }

    if (sedeSel) {
      try {
        const res = await filters.getSedes();
        const sedes = Array.isArray(res) ? res : (res?.data || []);
        let html = '<option value="">Seleccione...</option>';
        sedes.forEach((s) => {
          const v = String(s.ind ?? s.value ?? '');
          const l = s.nombre || s.sede || s.label || v;
          if (!v) return;
          html += `<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`;
        });
        sedeSel.innerHTML = html;
      } catch {
        sedeSel.innerHTML = '<option value="">Error</option>';
      }
    }

    const nivelSel = $('caNivel');
    const numeroSel = $('caNumero');

    sedeSel?.addEventListener('change', () => {
      numeroSel.innerHTML = '<option value="">Seleccione grado primero</option>';
      if (sedeSel.value && yearSel?.value) {
        this.loadNiveles(sedeSel.value, yearSel.value, nivelSel);
      } else {
        nivelSel.innerHTML = '<option value="">Seleccione sede primero</option>';
      }
    });

    nivelSel?.addEventListener('change', () => {
      if (nivelSel.value) {
        this.loadNumeros(sedeSel?.value, nivelSel.value, yearSel?.value, numeroSel);
      } else {
        numeroSel.innerHTML = '<option value="">Seleccione grado primero</option>';
      }
    });

    yearSel?.addEventListener('change', () => {
      if (sedeSel.value && yearSel.value) {
        this.loadNiveles(sedeSel.value, yearSel.value, nivelSel);
      }
    });
  }

  async loadNiveles(sede, year, nivelSel) {
    try {
      const res = await filters.getNiveles(sede, year);
      const grupos = Array.isArray(res) ? res : (res?.data || []);
      const niveles = [...new Set(grupos.map((g) => g.nivel ?? g.value).filter((v) => v != null))].sort((a, b) => a - b);
      let html = '<option value="">Todos</option>';
      niveles.forEach((n) => { html += `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`; });
      nivelSel.innerHTML = html;
    } catch {
      nivelSel.innerHTML = '<option value="">Error</option>';
    }
  }

  async loadNumeros(sede, nivel, year, numeroSel) {
    numeroSel.innerHTML = '<option value="">Cargando...</option>';
    try {
      const res = await fetch(endpoint('/getNumeros.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignacion: sede, nivel, year: year || String(new Date().getFullYear()) }),
      });
      const numeros = await res.json();
      const lista = Array.isArray(numeros) ? numeros : (numeros?.data || []);
      const unicos = [...new Set(lista.map((g) => g.numero ?? g.value).filter((v) => v != null))].sort((a, b) => a - b);
      let html = '<option value="">Todos</option>';
      unicos.forEach((n) => { html += `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`; });
      numeroSel.innerHTML = html;
    } catch {
      numeroSel.innerHTML = '<option value="">Error</option>';
    }
  }

  async loadAll(page = 1) {
    if (this.busy) return;
    this.currentPage = page;

    const year      = $('caYear')?.value || '';
    const sede      = $('caSede')?.value || '';
    const nivel     = $('caNivel')?.value || '';
    const numero    = $('caNumero')?.value || '';
    const criterio  = ($('caCriterio')?.value || '').trim();

    this.busy = true;
    const resultsEl = $('caResults');
    const statsEl = $('caStats');
    if (resultsEl) {
      resultsEl.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="text-center">
            <span data-orb="searching" data-orb-size="40" class="inline-block mx-auto mb-3" style="width:40px;height:40px"></span>
            <p class="text-sm text-gray-400">Cargando...</p>
          </div>
        </div>
      `;
    }
    if (statsEl) statsEl.classList.add('hidden');

    try {
      const params = { criterio, page, per_page: this.perPage, year, asignacion: sede, nivel, numero };

      const [searchRes, statsRes] = await Promise.allSettled([
        api.post('students/control-search', params),
        api.post('students/control-stats', params),
      ]);

      const searchData = searchRes.status === 'fulfilled' ? searchRes.value : null;
      const statsData = statsRes.status === 'fulfilled' ? statsRes.value : null;

      this.students = Array.isArray(searchData?.data) ? searchData.data : (Array.isArray(searchData) ? searchData : []);
      this.meta = searchData?.meta || null;
      this.stats = statsData?.data || null;

      if (statsData) this.renderStats(statsEl);
      this.renderResults(resultsEl);
    } catch (error) {
      if (resultsEl) {
        resultsEl.innerHTML = `
          <div class="glass-card p-12 text-center">
            <i class="bi bi-exclamation-circle text-5xl text-red-300 block mb-3"></i>
            <p class="text-gray-500 mb-2">Error al cargar datos</p>
            <p class="text-xs text-gray-400">${escapeHtml(error.message || '')}</p>
          </div>
        `;
      }
    } finally {
      this.busy = false;
    }
  }

  renderStats(container) {
    if (!container || !this.stats) return;
    container.classList.remove('hidden');

    const { total, por_genero, por_nivel, por_sede, por_rango_nota, estadisticas } = this.stats;

    const cards = [
      { icon: 'bi-people', label: 'Total Estudiantes', value: total || 0, color: 'text-[#543391]', bg: 'bg-[#543391]/10' },
      { icon: 'bi-gender-male', label: 'Hombres', value: por_genero?.M || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
      { icon: 'bi-gender-female', label: 'Mujeres', value: por_genero?.F || 0, color: 'text-pink-600', bg: 'bg-pink-50' },
      { icon: 'bi-mortarboard', label: 'Promedio Nota', value: estadisticas?.promedio_nota != null ? Number(estadisticas.promedio_nota).toFixed(2) : '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    if (por_rango_nota) {
      cards.push({ icon: 'bi-bar-chart', label: 'Rango 1.0–2.9', value: por_rango_nota.r1 || 0, color: 'text-red-600', bg: 'bg-red-50' });
      cards.push({ icon: 'bi-bar-chart', label: 'Rango 3.0–3.9', value: por_rango_nota.r2 || 0, color: 'text-amber-600', bg: 'bg-amber-50' });
      cards.push({ icon: 'bi-bar-chart', label: 'Rango 4.0–4.4', value: por_rango_nota.r3 || 0, color: 'text-lime-600', bg: 'bg-lime-50' });
      cards.push({ icon: 'bi-bar-chart', label: 'Rango 4.5–5.0', value: por_rango_nota.r4 || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' });
    }

    const cardHtml = cards.map((c) => `
      <div class="glass-card p-4 text-center">
        <div class="inline-flex items-center justify-center w-10 h-10 rounded-full ${c.bg} mb-2">
          <i class="bi ${c.icon} ${c.color} text-lg"></i>
        </div>
        <p class="text-2xl font-bold text-gray-800">${c.value}</p>
        <p class="text-xs text-gray-400 mt-1">${c.label}</p>
      </div>
    `).join('');

    let chartHtml = '';
    if (por_genero) {
      chartHtml += `
        <div class="glass-card p-4">
          <h4 class="text-sm font-semibold text-gray-600 mb-3">Distribución por Género</h4>
          <div class="h-48"><canvas id="caChartGenero"></canvas></div>
        </div>
      `;
    }
    if (por_rango_nota) {
      chartHtml += `
        <div class="glass-card p-4">
          <h4 class="text-sm font-semibold text-gray-600 mb-3">Distribución por Rango de Nota</h4>
          <div class="h-48"><canvas id="caChartRangoNota"></canvas></div>
        </div>
      `;
    }
    if (por_nivel && por_nivel.length) {
      chartHtml += `
        <div class="glass-card p-4">
          <h4 class="text-sm font-semibold text-gray-600 mb-3">Distribución por Nivel</h4>
          <div class="h-48"><canvas id="caChartNivel"></canvas></div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        ${cardHtml}
      </div>
      ${chartHtml ? `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">${chartHtml}</div>` : ''}
      ${estadisticas ? `
        <div class="glass-card p-4 mb-4">
          <h4 class="text-sm font-semibold text-gray-600 mb-2">Estadísticas Descriptivas</h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span class="text-gray-400">Total:</span> <strong>${total || 0}</strong></div>
            <div><span class="text-gray-400">Hombres:</span> <strong>${por_genero?.M || 0}</strong> (${total ? ((por_genero?.M || 0) / total * 100).toFixed(1) : 0}%)</div>
            <div><span class="text-gray-400">Mujeres:</span> <strong>${por_genero?.F || 0}</strong> (${total ? ((por_genero?.F || 0) / total * 100).toFixed(1) : 0}%)</div>
            <div><span class="text-gray-400">Prom. Nota:</span> <strong>${Number(estadisticas.promedio_nota || 0).toFixed(2)}</strong></div>
            <div><span class="text-gray-400">Nota Mín:</span> <strong>${Number(estadisticas.min_nota || 0).toFixed(1)}</strong></div>
            <div><span class="text-gray-400">Nota Máx:</span> <strong>${Number(estadisticas.max_nota || 0).toFixed(1)}</strong></div>
          </div>
        </div>
      ` : ''}
    `;

    this.renderCharts();
  }

  renderCharts() {
    const { por_genero, por_rango_nota, por_nivel } = this.stats || {};

    if (por_genero) {
      createPieChart('caChartGenero', ['Hombres', 'Mujeres'], [por_genero.M || 0, por_genero.F || 0]);
    }
    if (por_rango_nota) {
      createDoughnutChart('caChartRangoNota',
        ['1.0–2.9', '3.0–3.9', '4.0–4.4', '4.5–5.0'],
        [por_rango_nota.r1 || 0, por_rango_nota.r2 || 0, por_rango_nota.r3 || 0, por_rango_nota.r4 || 0]
      );
    }
    if (por_nivel && por_nivel.length) {
      const labels = por_nivel.map((n) => `Nivel ${n.nivel}`);
      const values = por_nivel.map((n) => n.count);
      createPieChart('caChartNivel', labels, values);
    }
  }

  async contactGuardian(estudiante, btn) {
    const icon = btn?.querySelector('i');
    const original = icon?.className;
    if (icon) icon.className = 'bi bi-arrow-repeat animate-spin';
    if (btn) btn.disabled = true;

    try {
      const data = await api.post('students/guardian', { estudiante });
      const rows = Array.isArray(data) ? data : (data?.data || []);
      if (!rows.length) {
        showToast('Sin datos de acudiente', 'warning');
        return;
      }
      const g = rows[0];
      const tel = (n) => n
        ? `<a class="text-[#543391] font-medium" href="tel:+57${escapeHtml(String(n))}">${escapeHtml(String(n))}</a>`
        : '<span class="text-gray-400">—</span>';
      const html = `
        <div class="text-left space-y-2">
          <p class="text-sm"><span class="text-gray-400">Acudiente:</span> <strong>${escapeHtml(g.acudiente || '—')}</strong></p>
          <p class="text-sm"><span class="text-gray-400">Teléfono 1:</span> ${tel(g.telefono1)}</p>
          <p class="text-sm"><span class="text-gray-400">Teléfono 2:</span> ${tel(g.telefono2)}</p>
        </div>
      `;
      alertHtml('Contacto', html);
    } catch (error) {
      alertError('Error', error.message || 'No se pudo obtener el contacto');
    } finally {
      if (icon && original) icon.className = original;
      if (btn) btn.disabled = false;
    }
  }

  async viewAttendance(estudiante, nombres, btn) {
    const icon = btn?.querySelector('i');
    const original = icon?.className;
    if (icon) icon.className = 'bi bi-arrow-repeat animate-spin';
    if (btn) btn.disabled = true;

    try {
      const data = await api.get('attendance/detail', { estudiante });
      const records = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

      if (!records.length) {
        showToast('Sin registros de inasistencia', 'info');
        return;
      }

      const rows = records.map((r) => {
        const horas = r.horas === 't' ? '6' : (r.horas || '');
        const excusa = r.excusa
          ? '<span class="text-emerald-600 font-semibold">Sí</span>'
          : '<span class="text-gray-400">No</span>';
        return `
          <tr class="border-t border-gray-50 hover:bg-gray-50/50">
            <td class="py-2 px-3 text-sm text-gray-700">${escapeHtml(r.fecha || '')}</td>
            <td class="py-2 px-3 text-sm text-gray-600">${escapeHtml(r.materia || '')}</td>
            <td class="py-2 px-3 text-sm text-center font-medium text-gray-700">${escapeHtml(horas)}</td>
            <td class="py-2 px-3 text-sm text-center">${excusa}</td>
            <td class="py-2 px-3 text-sm text-gray-500 max-w-[200px] truncate">${escapeHtml(r.detalle || '')}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <div class="text-left max-h-[400px] overflow-y-auto">
          <p class="text-sm font-semibold text-gray-700 mb-3">${escapeHtml(nombres)}</p>
          <table class="w-full text-xs">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="text-left py-2 px-3 font-semibold text-gray-500 uppercase">Fecha</th>
                <th class="text-left py-2 px-3 font-semibold text-gray-500 uppercase">Materia</th>
                <th class="text-center py-2 px-3 font-semibold text-gray-500 uppercase">Horas</th>
                <th class="text-center py-2 px-3 font-semibold text-gray-500 uppercase">Excusa</th>
                <th class="text-left py-2 px-3 font-semibold text-gray-500 uppercase">Detalle</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p class="text-xs text-gray-400 mt-2">${records.length} registro(s)</p>
        </div>
      `;
      alertHtml(`Inasistencias - ${escapeHtml(nombres)}`, html);
    } catch (error) {
      alertError('Error', error.message || 'No se pudieron cargar las inasistencias');
    } finally {
      if (icon && original) icon.className = original;
      if (btn) btn.disabled = false;
    }
  }

  renderShell(container) {
    container.innerHTML = `
      <div class="glass-card p-4 mb-4">
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Año</label>
            <select id="caYear"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Cargando...</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sede</label>
            <select id="caSede"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Cargando...</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nivel</label>
            <select id="caNivel"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Seleccione sede primero</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Grupo</label>
            <select id="caNumero"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Seleccione grado primero</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Buscar</label>
            <div class="relative" role="search">
              <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="search" id="caCriterio" autocomplete="off"
                     class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm
                            focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                     placeholder="Código o nombre...">
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 pt-3 border-t border-gray-100">
          <button type="button" id="caBuscarBtn"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-[#543391] hover:bg-[#6f4ab3] text-white font-medium rounded-lg shadow-sm transition-all text-sm">
            <i class="bi bi-search"></i> Cargar
          </button>
          <button type="button" id="caLimpiarBtn"
                  class="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 rounded-lg transition-all text-sm">
            <i class="bi bi-x-lg"></i> Limpiar
          </button>
          <button type="button" id="caPrintCodesBtn"
                  class="inline-flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-all text-sm">
            <i class="bi bi-printer"></i> Imprimir Códigos
          </button>
        </div>
      </div>

      <div id="caStats" class="hidden"></div>

      <div id="caResults">
        <div class="glass-card p-12 text-center">
          <i class="bi bi-clipboard-check text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400 font-medium">Control de Asistencia</p>
          <p class="text-xs text-gray-300 mt-1">Seleccione filtros y presione Cargar</p>
        </div>
      </div>
    `;

    const buscar = $('caBuscarBtn');
    if (buscar) {
      buscar.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadAll(1);
      });
    }

    const limpiar = $('caLimpiarBtn');
    if (limpiar) {
      limpiar.addEventListener('click', () => {
        ['caCriterio', 'caNivel', 'caNumero'].forEach((id) => {
          const el = $(id);
          if (el) el.value = '';
        });
        ['caYear', 'caSede'].forEach((id) => {
          const el = $(id);
          if (el) el.value = el?.querySelector('option')?.value || '';
        });
        this.loadAll(1);
      });
    }

    const criterio = $('caCriterio');
    if (criterio) {
      criterio.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.loadAll(1);
      });
    }

    delegate(container, 'click', '[data-guardian]', (e, target) => {
      e.preventDefault();
      this.contactGuardian(target.dataset.guardian, target);
    });

    delegate(container, 'click', '[data-attendance]', (e, target) => {
      e.preventDefault();
      this.viewAttendance(target.dataset.attendance, target.dataset.nombres, target);
    });

    delegate(container, 'click', '[data-excuse]', (e, target) => {
      e.preventDefault();
      this._openExcuseModal(target.dataset.excuse, target.dataset.excuseNombres);
    });

    delegate(container, 'click', '.ca-page-link:not([disabled])', (e, target) => {
      e.preventDefault();
      const p = parseInt(target.dataset.page);
      if (p && p !== this.currentPage) this.loadAll(p);
    });

    const printBtn = $('caPrintCodesBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => this._openPrintCodesModal());
    }

    delegate(document, 'click', '#caPrintGenerateBtn', (e, target) => {
      this._generateBulkPDF();
    });
  }

  renderResults(container) {
    if (!container) return;

    if (!this.students.length) {
      container.innerHTML = `
        <div class="glass-card p-12 text-center">
          <i class="bi bi-inbox text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400 font-medium">Sin resultados</p>
          <p class="text-xs text-gray-300 mt-1">No se encontraron estudiantes para esos filtros</p>
        </div>
      `;
      return;
    }

    const total = this.meta?.total || this.students.length;
    const totalPages = this.meta?.total_pages || 1;
    const page = this.meta?.page || 1;

    const items = this.students.map((est) => {
      const { nombres, nivel, numero, estudiante, asignacion, genero } = est;
      const genIcon = genero === 'M' ? 'bi-gender-male text-blue-400' : genero === 'F' ? 'bi-gender-female text-pink-400' : '';
      return `
        <div class="flex items-center gap-2 px-4 py-3 border-t border-gray-50 hover:bg-[#543391]/[0.03] transition-colors first:border-t-0">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              ${genIcon ? `<i class="bi ${genIcon} text-xs"></i>` : ''}
              <p class="font-medium text-gray-700 truncate">${escapeHtml(nombres || '')}</p>
              <span class="text-xs text-emerald-600 font-semibold whitespace-nowrap">${escapeHtml(String(nivel ?? ''))}-${escapeHtml(String(numero ?? ''))}</span>
            </div>
            <p class="text-xs text-[#543391] truncate">${escapeHtml(asignacion || '')}</p>
            <p class="text-xs text-gray-400">${escapeHtml(estudiante || '')}</p>
          </div>
          <button type="button" data-attendance="${escapeHtml(estudiante || '')}" data-nombres="${escapeHtml(nombres || '')}"
                  title="Ver inasistencias"
                  class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-[#543391] hover:bg-[#543391]/10 hover:border-[#543391]/30 transition-all">
            <i class="bi bi-eye"></i>
          </button>
          <button type="button" data-guardian="${escapeHtml(estudiante || '')}"
                  title="Contactar acudiente"
                  class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all">
            <i class="bi bi-telephone-forward"></i>
          </button>
          <button type="button" data-excuse="${escapeHtml(estudiante || '')}" data-excuse-nombres="${escapeHtml(nombres || '')}"
                  title="Control excusas"
                  class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-all">
            <i class="bi bi-clipboard-check"></i>
          </button>
        </div>
      `;
    }).join('');

    const pagination = this.buildPagination(totalPages, page);

    container.innerHTML = `
      <div class="flex items-center gap-3 mb-4">
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#543391]/10 text-[#543391]">
          <i class="bi bi-people"></i> Estudiantes
        </span>
        <span class="text-xs text-gray-400">${total} resultado(s) · Pág. ${page}/${totalPages}</span>
      </div>
      <div class="glass-card overflow-hidden">${items}</div>
      ${totalPages > 1 ? `<div class="mt-3 flex justify-center">${pagination}</div>` : ''}
    `;
  }

  buildPagination(totalPages, currentPage) {
    const maxVisible = 7;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    let html = '<div class="flex items-center gap-1">';

    html += `
      <button class="ca-page-link px-3 py-1.5 text-xs rounded-lg border border-gray-200 transition-all
        ${currentPage <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-[#543391] hover:text-white hover:border-[#543391]'}"
        data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>
        <i class="bi bi-chevron-left"></i>
      </button>
    `;

    if (start > 1) {
      html += `<button class="ca-page-link px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-[#543391] hover:text-white hover:border-[#543391] transition-all" data-page="1">1</button>`;
      if (start > 2) html += '<span class="px-2 text-gray-400 text-xs">...</span>';
    }

    for (let p = start; p <= end; p++) {
      html += `
        <button class="ca-page-link px-3 py-1.5 text-xs rounded-lg border transition-all
          ${p === currentPage
            ? 'bg-[#543391] text-white border-[#543391] font-semibold'
            : 'border-gray-200 text-gray-600 hover:bg-[#543391] hover:text-white hover:border-[#543391]'}"
          data-page="${p}">${p}</button>
      `;
    }

    if (end < totalPages) {
      if (end < totalPages - 1) html += '<span class="px-2 text-gray-400 text-xs">...</span>';
      html += `<button class="ca-page-link px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-[#543391] hover:text-white hover:border-[#543391] transition-all" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `
      <button class="ca-page-link px-3 py-1.5 text-xs rounded-lg border border-gray-200 transition-all
        ${currentPage >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-[#543391] hover:text-white hover:border-[#543391]'}"
        data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>
        <i class="bi bi-chevron-right"></i>
      </button>
    `;

    html += '</div>';
    return html;
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  PRINT CODES MODAL                                              */
  /* ──────────────────────────────────────────────────────────────── */

  _injectPrintModals() {
    if (this._printModalsInjected) return;
    this._printModalsInjected = true;
    const modalEl = document.getElementById('modal-container');
    if (!modalEl) return;
    modalEl.insertAdjacentHTML('beforeend', this._printCodesModalHTML());
    modalEl.insertAdjacentHTML('beforeend', this._printCodesPreviewHTML());
  }

  _printCodesModalHTML() {
    return `
<div id="caPrintCodesModal" class="modal fixed inset-0 z-[1056] flex items-center justify-center hidden p-3 sm:p-6"
     onclick="if(event.target===this)event.target.classList.add('hidden')">
  <div class="relative z-[1060] w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100" style="background:linear-gradient(135deg,#323130 0%,#201f1e 100%)">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
          <i class="bi bi-printer text-sm"></i>
        </div>
        <div>
          <h5 class="text-base font-semibold text-white">Imprimir Códigos</h5>
          <p class="text-xs text-white/70" id="caPrintCount">0 estudiantes seleccionados</p>
        </div>
      </div>
      <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" onclick="document.getElementById('caPrintCodesModal')?.classList.add('hidden')">
        <i class="bi bi-x-lg text-sm"></i>
      </button>
    </div>
    <div class="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50/50">
      <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <input type="checkbox" id="caPrintSelectAll" class="w-4 h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391]">
        Seleccionar todos
      </label>
      <span class="text-xs text-gray-400" id="caPrintVisibleCount">0 visible(s)</span>
    </div>
    <div id="caPrintStudentList" class="flex-1 overflow-y-auto p-4 space-y-2"></div>
    <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
      <button type="button" class="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
              onclick="document.getElementById('caPrintCodesModal')?.classList.add('hidden')">
        Cancelar
      </button>
      <button type="button" id="caPrintGenerateBtn"
              class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style="background:linear-gradient(135deg,#d97706,#f59e0b)" disabled>
        <i class="bi bi-filetype-pdf"></i> Generar PDF
      </button>
    </div>
  </div>
</div>`;
  }

  _printCodesPreviewHTML() {
    return `
<div id="caPrintPreviewModal" class="modal fixed inset-0 z-[1056] flex items-center justify-center hidden p-3 sm:p-6"
     onclick="if(event.target===this)event.target.classList.add('hidden')">
  <div class="relative z-[1060] w-full max-w-5xl bg-white rounded-3xl shadow-2xl h-[90vh] flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100" style="background:linear-gradient(135deg,#323130 0%,#201f1e 100%)">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
          <i class="bi bi-filetype-pdf text-sm"></i>
        </div>
        <div>
          <h5 class="text-base font-semibold text-white">Vista Previa</h5>
          <p class="text-xs text-white/70" id="caPrintPreviewInfo">—</p>
        </div>
      </div>
      <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" onclick="document.getElementById('caPrintPreviewModal')?.classList.add('hidden')">
        <i class="bi bi-x-lg text-sm"></i>
      </button>
    </div>
    <div class="flex-1 bg-gray-100 p-4 min-h-0 relative">
      <div id="caPrintPreviewLoading" class="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
        <div class="text-center">
          <span data-orb="working" data-orb-size="44" class="inline-block mx-auto" style="width:44px;height:44px"></span>
          <p class="text-sm text-gray-500 mt-3">Generando PDF...</p>
        </div>
      </div>
      <iframe id="caPrintPreviewIframe" class="w-full h-full rounded-xl bg-white shadow-inner" style="border:none;"></iframe>
    </div>
    <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
      <button type="button" class="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
              onclick="document.getElementById('caPrintPreviewModal')?.classList.add('hidden')">
        Cerrar
      </button>
    </div>
  </div>
</div>`;
  }

  _openPrintCodesModal() {
    this._injectPrintModals();
    const list = $('caPrintStudentList');
    const count = $('caPrintCount');
    const visible = $('caPrintVisibleCount');
    const selectAll = $('caPrintSelectAll');
    const generateBtn = $('caPrintGenerateBtn');
    if (!list) return;

    if (!this.students.length) {
      list.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="bi bi-inbox text-3xl block mb-2"></i>No hay estudiantes cargados</div>';
      if (count) count.textContent = '0 estudiantes seleccionados';
      if (visible) visible.textContent = '0 visible(s)';
      if (generateBtn) generateBtn.disabled = true;
      showModal('caPrintCodesModal');
      return;
    }

    const pageStudents = this.students;

    if (visible) visible.textContent = `${pageStudents.length} visible(s)`;

    list.innerHTML = pageStudents.map((est) => {
      const label = `${escapeHtml(est.nombres || '')} <span class="text-[#543391]">${escapeHtml(est.estudiante || '')}</span> <span class="text-gray-400">${escapeHtml(String(est.nivel ?? ''))}-${escapeHtml(String(est.numero ?? ''))}</span>`;
      return `
        <label class="ca-print-row flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:border-[#543391]/30 hover:bg-[#543391]/[0.03] transition-all cursor-pointer">
          <input type="checkbox" class="ca-print-check w-4 h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391] shrink-0"
                 data-estudiante="${escapeHtml(est.estudiante || '')}" data-codigo="${escapeHtml(est.codigo || '')}" data-nombres="${escapeHtml(est.nombres || '')}" checked>
          <span class="flex-1 min-w-0 text-sm text-gray-700 truncate">${label}</span>
        </label>`;
    }).join('');

    if (selectAll) selectAll.checked = true;
    this._updatePrintCount();
    if (generateBtn) generateBtn.disabled = false;

    // Bind list/selectAll handlers once (modal is reused across opens)
    if (!this._printModalBound) {
      this._printModalBound = true;

      selectAll?.addEventListener('change', () => {
        list.querySelectorAll('.ca-print-check').forEach(cb => cb.checked = selectAll.checked);
        this._updatePrintCount();
      });

      list.addEventListener('change', (e) => {
        if (e.target.classList.contains('ca-print-check')) {
          this._updatePrintCount();
        }
      });
    }

    showModal('caPrintCodesModal');
  }

  _updatePrintCount() {
    const checked = document.querySelectorAll('#caPrintStudentList .ca-print-check:checked').length;
    const count = $('caPrintCount');
    if (count) count.textContent = `${checked} estudiantes seleccionados`;
    const generateBtn = $('caPrintGenerateBtn');
    if (generateBtn) generateBtn.disabled = checked === 0;
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  EXCUSE MODAL                                                    */
  /* ──────────────────────────────────────────────────────────────── */

  _injectExcuseModal() {
    if (this._excuseModalInjected) return;
    this._excuseModalInjected = true;
    const container = $('modal-container');
    if (!container) return;
    container.insertAdjacentHTML('beforeend', this._excuseModalHTML());

    const form = $('frmControlInasistencia');
    if (form) {
      form.addEventListener('submit', (e) => this._handleExcuseSubmit(e));
    }

    const closeX = $('excuseCloseX');
    if (closeX) {
      closeX.addEventListener('click', () => hideModal('modalControlInasistencias'));
    }

    const closeBtn = $('excuseCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => hideModal('modalControlInasistencias'));
    }
  }

  _excuseModalHTML() {
    return `
<div id="modalControlInasistencias" class="modal fixed inset-0 z-[1056] flex items-center justify-center hidden p-3 sm:p-6">
  <div class="relative z-[1060] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
       style="background:rgba(255,255,255,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(84,51,145,0.18),0 0 0 1px rgba(84,51,145,0.06);">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 shrink-0"
         style="background:linear-gradient(135deg,#543391 0%,#6f4ab3 100%)">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
          <i class="bi bi-clipboard-check text-lg"></i>
        </div>
        <div>
          <h5 class="text-base font-semibold text-white tracking-tight">Control Excusas</h5>
          <p class="text-xs text-white/70" id="excuseStudentLabel">&mdash;</p>
        </div>
      </div>
      <button type="button" id="excuseCloseX"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-all">
        <i class="bi bi-x-lg text-sm"></i>
      </button>
    </div>
    <!-- Form -->
    <form id="frmControlInasistencia" class="flex-1 overflow-y-auto">
      <input type="hidden" name="periodoControl" id="excusePeriodo">
      <input type="hidden" name="estudianteControl" id="excuseEstudiante">
      <input type="hidden" name="horasControl" id="excuseHoras">
      <div class="p-6 space-y-5">
        <!-- Sección: Fecha y Motivo -->
        <div>
          <p class="text-[10px] font-bold text-[#543391] uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <i class="bi bi-calendar3 text-xs"></i> Registro
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="relative">
              <label class="block text-[11px] font-medium text-gray-500 mb-1">Fecha</label>
              <input type="date" name="fecha" id="fechaControlinasistencia"
                     class="w-full px-3 py-2.5 bg-white/60 border border-gray-200/80 rounded-xl text-sm text-gray-700
                            focus:ring-2 focus:ring-[#543391]/30 focus:border-[#543391]/50 outline-none transition-all">
            </div>
            <div>
              <label class="block text-[11px] font-medium text-gray-500 mb-1">Motivo Excusa / Inasistencia</label>
              <select name="motivo_excusa" id="motivo_excusa"
                      class="w-full px-3 py-2.5 bg-white/60 border border-gray-200/80 rounded-xl text-sm text-gray-700
                             focus:ring-2 focus:ring-[#543391]/30 focus:border-[#543391]/50 outline-none transition-all appearance-none
                             bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8"
                      required>
                <option value="">&nbsp;</option>
                <option value="LLEGADA TARDE">Llegada tarde</option>
                <option value="ENFERMEDAD">Enfermedad</option>
                <option value="VIAJE">Viaje</option>
                <option value="CITA MEDICA">Cita medica</option>
                <option value="CALAMIDAD DOMESTICA">Calamidad domestica</option>
                <option value="ASUNTO FAMILIAR">Asunto familiar</option>
                <option value="PERMISO INSTITUCIONAL">Permiso institucional</option>
                <option value="OTROS">Otros</option>
                <option value="NO APLICA">No aplica</option>
              </select>
            </div>
          </div>
        </div>
        <!-- Sección: Permiso y Hora -->
        <div>
          <p class="text-[10px] font-bold text-[#543391] uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <i class="bi bi-clock-history text-xs"></i> Permiso
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-gray-500 mb-1">Tipo de permiso / solicitud</label>
              <select name="motivo_permiso" id="motivo_permiso"
                      class="w-full px-3 py-2.5 bg-white/60 border border-gray-200/80 rounded-xl text-sm text-gray-700
                             focus:ring-2 focus:ring-[#543391]/30 focus:border-[#543391]/50 outline-none transition-all appearance-none
                             bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8"
                      required>
                <option value="">&nbsp;</option>
                <option value="ENFERMEDAD">Enfermedad</option>
                <option value="VIAJE">Viaje</option>
                <option value="CITA MEDICA">Cita medica</option>
                <option value="CALAMIDAD DOMESTICA">Calamidad domestica</option>
                <option value="ASUNTO FAMILIAR">Asunto familiar</option>
                <option value="PERMISO INSTITUCIONAL">Permiso institucional</option>
                <option value="OTROS">Otros</option>
                <option value="NO APLICA">No aplica</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-medium text-gray-500 mb-1">Hora de salida</label>
              <select id="hora_salida" name="hora_salida"
                      class="w-full px-3 py-2.5 bg-white/60 border border-gray-200/80 rounded-xl text-sm text-gray-700
                             focus:ring-2 focus:ring-[#543391]/30 focus:border-[#543391]/50 outline-none transition-all appearance-none
                             bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8"
                      required>
                <option value="">&nbsp;</option>
                <option value="Primera Hora">Primera hora</option>
                <option value="Segunda Hora">Segunda hora</option>
                <option value="Tercera Hora">Tercera hora</option>
                <option value="Cuarta Hora">Cuarta hora</option>
                <option value="Quinta Hora">Quinta hora</option>
                <option value="Sexta Hora">Sexta hora</option>
                <option value="Septima Hora">Septima hora</option>
                <option value="Permiso por todo el d&iacute;a">Todo el d&iacute;a</option>
                <option value="Permiso por varios d&iacute;as">Varios d&iacute;as</option>
                <option value="NO APLICA">No aplica</option>
              </select>
            </div>
          </div>
        </div>
        <!-- Sección: Detalle -->
        <div>
          <p class="text-[10px] font-bold text-[#543391] uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <i class="bi bi-text-left text-xs"></i> Detalle
          </p>
          <div>
            <label class="block text-[11px] font-medium text-gray-500 mb-1">Otra informaci&oacute;n</label>
            <textarea class="w-full px-3 py-2.5 bg-white/60 border border-gray-200/80 rounded-xl text-sm text-gray-700
                           focus:ring-2 focus:ring-[#543391]/30 focus:border-[#543391]/50 outline-none transition-all resize-none"
                      name="otros_excusa" id="otros_excusa" rows="2" placeholder="Describa la situaci&oacute;n"></textarea>
          </div>
        </div>
        <!-- Sección: Acudiente -->
        <div>
          <p class="text-[10px] font-bold text-[#543391] uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <i class="bi bi-person-lines-fill text-xs"></i> Acudiente
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div class="sm:col-span-3">
              <label class="block text-[11px] font-medium text-gray-500 mb-1">Nombre</label>
              <input type="text" name="acudienteControl" id="acudienteControl"
                     class="w-full px-3 py-2.5 bg-white/60 border border-gray-200/80 rounded-xl text-sm text-gray-700
                            focus:ring-2 focus:ring-[#543391]/30 focus:border-[#543391]/50 outline-none transition-all"
                     placeholder="Nombre completo">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[11px] font-medium text-gray-500 mb-1">Tel&eacute;fono</label>
              <input type="tel" name="telacudienteControl" id="telacudienteControl"
                     class="w-full px-3 py-2.5 bg-white/60 border border-gray-200/80 rounded-xl text-sm text-gray-700
                            focus:ring-2 focus:ring-[#543391]/30 focus:border-[#543391]/50 outline-none transition-all"
                     placeholder="Celular">
            </div>
          </div>
        </div>
      </div>
      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100/60 shrink-0"
           style="background:rgba(249,250,251,0.6)">
        <button type="button" id="excuseCloseBtn"
                class="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-white/80 rounded-xl border border-gray-200/60 transition-all">
          Cerrar
        </button>
        <button type="submit" id="excuseSubmitBtn"
                class="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style="background:linear-gradient(135deg,#543391,#6f4ab3)">
          <i class="bi bi-check-lg text-base"></i> Guardar
          <span class="spinner-border spinner-border-sm spncontrolinas hidden" role="status"></span>
        </button>
      </div>
    </form>
  </div>
</div>`;
  }

  async _handleExcuseSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = $('excuseSubmitBtn');
    const spinner = form.querySelector('.spncontrolinas');

    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');

    try {
      const data = Object.fromEntries(new FormData(form));

      // Map form fields to API payload
      const payload = {
        estudiante: data.estudianteControl,
        fecha: data.fecha,
        periodo: data.periodoControl,
        horas: data.horasControl,
        motivo_excusa: data.motivo_excusa,
        motivo_permiso: data.motivo_permiso,
        hora_salida: data.hora_salida,
        acudiente: data.acudienteControl,
        telefono_acudiente: data.telacudienteControl,
        otros_excusa: data.otros_excusa,
      };

      await attendance.createExcuse(payload);

      await Swal.fire({
        title: 'Registro de Excusa',
        text: 'Se registr\u00f3 la excusa correctamente',
        confirmButtonText: 'Aceptar',
        customClass: { popup: 'rounded-2xl' },
      });

      $('modalControlInasistencias')?.classList.add('hidden');
      hideModal('modalControlInasistencias');
      form.reset();
    } catch (error) {
      alertError('Error', error.message || 'No se pudo registrar la excusa');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (spinner) spinner.classList.add('hidden');
    }
  }

  _openExcuseModal(estudiante, nombres) {
    this._injectExcuseModal();

    const estudianteEl = $('excuseEstudiante');
    const labelEl = $('excuseStudentLabel');
    const fechaEl = $('fechaControlinasistencia');
    const periodoEl = $('excusePeriodo');
    const horasEl = $('excuseHoras');

    if (estudianteEl) estudianteEl.value = estudiante;
    if (labelEl) labelEl.textContent = `${nombres} — ${estudiante}`;
    if (fechaEl) fechaEl.value = new Date().toISOString().slice(0, 10);
    if (periodoEl) periodoEl.value = this._currentPeriodo || '1';
    if (horasEl) horasEl.value = '1';

    // Load existing excuse data for this student
    this._loadExcuseData(estudiante);

    showModal('modalControlInasistencias');
  }

  async _loadExcuseData(estudiante) {
    try {
      const res = await attendance.getExcuses(estudiante);
      const excusas = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      if (!excusas.length) return;

      // Pre-fill from most recent excuse
      const latest = excusas[0];
      const setVal = (id, val) => { const el = $(id); if (el && val) el.value = val; };
      setVal('motivo_excusa', latest.motivo);
      setVal('motivo_permiso', latest.motivo_permiso);
      setVal('hora_salida', latest.hora_salida);
      setVal('acudienteControl', latest.acudiente);
      setVal('telacudienteControl', latest.telefono_acudiente);
      setVal('otros_excusa', latest.otros);
    } catch {
      // Silently ignore — form stays empty
    }
  }

  _generateBulkPDF() {
    const checked = document.querySelectorAll('#caPrintStudentList .ca-print-check:checked');
    if (!checked.length) {
      showToast('Seleccione al menos un estudiante', 'warning');
      return;
    }

    const year = $('caYear')?.value || new Date().getFullYear();
    const codigos = Array.from(checked).map(cb => cb.dataset.codigo).filter(Boolean);
    if (!codigos.length) {
      showToast('Los estudiantes seleccionados no tienen código', 'warning');
      return;
    }

    const pdfUrl = `/app-modern/server/router.php?__api=matriculaReport/pdf-bulk&codigos=${encodeURIComponent(codigos.join(','))}&year=${encodeURIComponent(year)}`;
    const loading = $('caPrintPreviewLoading');
    const iframe = $('caPrintPreviewIframe');
    const info = $('caPrintPreviewInfo');

    if (loading) loading.classList.remove('hidden');
    if (info) info.textContent = `${codigos.length} estudiante(s)`;
    if (iframe) {
      iframe.onload = () => { if (loading) loading.classList.add('hidden'); };
      iframe.src = pdfUrl;
    }

    showModal('caPrintPreviewModal');
  }
}

const controlAsistenciaModule = new ControlAsistenciaModule();
export default controlAsistenciaModule;
