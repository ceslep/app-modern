import { api } from '@services/api.js';
import { filters } from '@services/filters.js';
import { endpoint } from '@config/endpoints.js';
import { createPieChart, createDoughnutChart, destroyAllCharts } from '@utils/chart.js';
import { alertHtml, alertError, showToast } from '@utils/alert.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';

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
            <div class="w-8 h-8 border-4 border-[#543391] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
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

    delegate(container, 'click', '.ca-page-link:not([disabled])', (e, target) => {
      e.preventDefault();
      const p = parseInt(target.dataset.page);
      if (p && p !== this.currentPage) this.loadAll(p);
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
}

const controlAsistenciaModule = new ControlAsistenciaModule();
export default controlAsistenciaModule;
