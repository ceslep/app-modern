import { api } from '@services/api.js';
import { filters } from '@services/filters.js';
import { createChart, destroyChart, destroyAllCharts } from '@utils/chart.js';
import { showSkeleton, hideSkeleton } from '@components/skeleton.js';
import { alertError } from '@utils/alert.js';
import { $ } from '@utils/dom.js';

const SEL = {
  year: 'estYear',
  periodo: 'estPeriodo',
  sede: 'estSede',
  nivel: 'estNivel',
  numero: 'estNumero',
  asignatura: 'estAsignatura',
  container: 'contenedorEstadisticas',
  form: 'frmEstadisticas',
  chkTablas: 'chkTablas',
};

class EstadisticasModule {
  constructor() {
    this.data = null;
    this.init();
  }

  async init() {
    await this.loadYears();
    await this.loadPeriodos();
    await this.loadSedes();
    this.bindEvents();
    this.loadStats();
  }

  bindEvents() {
    $(SEL.form)?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.loadStats();
    });

    $(SEL.chkTablas)?.addEventListener('change', () => {
      this.toggleView($(SEL.chkTablas).checked);
    });

    $(SEL.year)?.addEventListener('change', () => {
      this.loadSedes();
      this.clearFrom(SEL.sede);
      this.loadStats();
    });

    $(SEL.sede)?.addEventListener('change', async () => {
      this.clearFrom(SEL.nivel);
      await this.loadNiveles();
      this.loadStats();
    });

    $(SEL.nivel)?.addEventListener('change', async () => {
      this.clearFrom(SEL.numero);
      await this.loadNumeros();
      this.loadStats();
    });

    $(SEL.numero)?.addEventListener('change', () => this.loadStats());
    $(SEL.asignatura)?.addEventListener('change', () => this.loadStats());
    $(SEL.periodo)?.addEventListener('change', () => this.loadStats());
  }

  clearFrom(fromId) {
    const order = [SEL.nivel, SEL.numero, SEL.asignatura];
    const start = order.indexOf(fromId);
    if (start >= 0) {
      order.slice(start).forEach((id) => {
        const el = $(id);
        if (el) { el.innerHTML = ''; el.disabled = true; }
      });
    }
  }

  getFilters() {
    return {
      year: $(SEL.year)?.value || new Date().getFullYear(),
      periodo: $(SEL.periodo)?.value || '',
      asignacion: $(SEL.sede)?.value || '',
      nivel: $(SEL.nivel)?.value || '',
      numero: $(SEL.numero)?.value || '',
      asignatura: $(SEL.asignatura)?.value || '',
    };
  }

  async loadYears() {
    try {
      const res = await filters.getYears();
      const years = Array.isArray(res) ? res : res?.data || [];
      const el = $(SEL.year);
      if (!el) return;
      const current = new Date().getFullYear();
      el.innerHTML = years
        .map((y) => {
          const val = y.year || y.value || y;
          const lbl = y.year || y.label || y.value || y;
          return `<option value="${val}" ${val == current ? 'selected' : ''}>${lbl}</option>`;
        })
        .join('');
    } catch { /* ignore */ }
  }

  async loadPeriodos() {
    const el = $(SEL.periodo);
    if (!el) return;
    try {
      const res = await filters.getPeriods();
      const periodos = Array.isArray(res) ? res : res?.data || [];
      const current = periodos.find((p) => p.selected === 'selected');
      el.innerHTML = '<option value="">Todos los periodos</option>' +
        periodos
          .map((p) => {
            const val = p.periodo || p.nombre || p.value || p;
            const lbl = p.nombre || p.periodo || val;
            const sel = current && val === (current.periodo || current.nombre) ? 'selected' : '';
            return `<option value="${val}" ${sel}>${lbl}</option>`;
          })
          .join('');
    } catch {
      el.innerHTML = '<option value="">Todos los periodos</option>';
    }
  }

  async loadSedes() {
    try {
      const res = await filters.getSedes();
      const sedes = Array.isArray(res) ? res : res?.data || [];
      const el = $(SEL.sede);
      if (!el) return;
      el.disabled = false;
      el.innerHTML = '<option value="">Todas las sedes</option>' +
        sedes
          .map((s) => {
            const val = s.value || s.ind || '';
            const lbl = s.label || s.sede || s.nombre || val;
            return `<option value="${val}">${lbl}</option>`;
          })
          .join('');
    } catch { /* ignore */ }
  }

  async loadNiveles() {
    const sede = $(SEL.sede)?.value;
    const year = $(SEL.year)?.value;
    const el = $(SEL.nivel);
    if (!el) return;
    if (!sede || !year) {
      el.innerHTML = '<option value="">Todos los niveles</option>';
      el.disabled = true;
      return;
    }
    try {
      const res = await filters.getNiveles(sede, year);
      const niveles = Array.isArray(res) ? res : res?.data || [];
      el.disabled = false;
      el.innerHTML = '<option value="">Todos los niveles</option>' +
        niveles
          .map((n) => {
            const val = n.nivel || n.value || n;
            return `<option value="${val}">${val}</option>`;
          })
          .join('');
    } catch {
      el.innerHTML = '<option value="">Error al cargar</option>';
    }
  }

  async loadNumeros() {
    const sede = $(SEL.sede)?.value;
    const nivel = $(SEL.nivel)?.value;
    const year = $(SEL.year)?.value;
    const el = $(SEL.numero);
    if (!el) return;
    if (!sede || !nivel) {
      el.innerHTML = '<option value="">Todos los grupos</option>';
      el.disabled = true;
      return;
    }
    try {
      const res = await api.post('numeros', { asignacion: sede, nivel, year });
      const numeros = Array.isArray(res) ? res : res?.data || [];
      el.disabled = false;
      el.innerHTML = '<option value="">Todos los grupos</option>' +
        numeros
          .map((n) => {
            const val = n.numero || n.value || n;
            return `<option value="${val}">${val}</option>`;
          })
          .join('');
    } catch {
      el.innerHTML = '<option value="">Error al cargar</option>';
    }
  }

  async loadStats() {
    showSkeleton(SEL.container, { variant: 'chart', height: 300 });
    try {
      const res = await api.post('reports/stats/full', this.getFilters());
      this.data = res && !res.error ? res : null;
      hideSkeleton(SEL.container);
      this.render();
    } catch (error) {
      hideSkeleton(SEL.container);
      alertError('Error', error.message);
    }
  }

  render() {
    const container = $(SEL.container);
    if (!container || !this.data) {
      if (container) container.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="bi bi-bar-chart text-4xl block mb-2"></i><span class="text-sm">Sin datos</span></div>';
      return;
    }

    const asignatura = $(SEL.asignatura)?.value;
    if (asignatura) {
      this.renderFiltered(asignatura);
    } else {
      this.renderFull();
    }
  }

  renderFull() {
    const container = $(SEL.container);
    if (!container) return;
    const d = this.data;
    const subs = d.asignaturas || [];
    const labels = subs.map((s) => s.asignatura);
    const values = subs.map((s) => parseFloat(s.valoracion) || 0);

    container.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Promedio General</div>
          <div class="text-2xl font-bold ${this.valColor(d.promedio_general)}">${d.promedio_general || '—'}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nota Mín / Máx</div>
          <div class="text-lg font-bold text-gray-700">${d.nota_minima || '—'} / ${d.nota_maxima || '—'}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Valoraciones</div>
          <div class="text-2xl font-bold text-gray-700">${(d.total_valoraciones || 0).toLocaleString()}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Asignaturas</div>
          <div class="text-2xl font-bold text-gray-700">${subs.length}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Promedio por Asignatura <span class="text-gray-400 font-normal">(clic en barra para filtrar)</span></div>
          <div class="p-4" style="height: 320px;"><canvas id="chBarras"></canvas></div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Distribución por Rangos</div>
          <div class="p-4" style="height: 320px;"><canvas id="chRangos"></canvas></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Rendimiento por Género</div>
          <div class="p-4" style="height: 280px;"><canvas id="chGenero"></canvas></div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Estadísticas Generales</div>
          <div class="p-4">
            <table class="w-full text-sm">
              <tbody>
                <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Mejor asignatura</td><td class="py-2 font-semibold text-right text-green-600">${d.mejor_asignatura || '—'} (${d.mejor_promedio || '—'})</td></tr>
                <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Asignatura con menor rendimiento</td><td class="py-2 font-semibold text-right text-red-600">${d.peor_asignatura || '—'} (${d.peor_promedio || '—'})</td></tr>
                <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Brecha (Máx - Mín)</td><td class="py-2 font-semibold text-right text-gray-700">${((d.nota_maxima || 0) - (d.nota_minima || 0)).toFixed(2)}</td></tr>
                <tr><td class="py-2 text-gray-500">Total registros analizados</td><td class="py-2 font-semibold text-right text-gray-700">${(d.total_valoraciones || 0).toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ${this.renderDescriptiveStats(d)}
      ${this.renderGroupChart(d)}
    `;

    this.createBarChart(subs, labels, values);
    this.createRangesChart(d.distribucion_rangos || []);
    this.createGenderChart(d.distribucion_genero || []);
    this.createGroupChart(d);
  }

  renderFiltered(asignatura) {
    const container = $(SEL.container);
    if (!container) return;
    const d = this.data;
    const subs = d.asignaturas || [];
    const subj = subs.find((s) => s.asignatura === asignatura);
    if (!subj) {
      container.innerHTML = `<div class="text-center py-12 text-gray-400"><i class="bi bi-search text-4xl block mb-2"></i><span class="text-sm">Sin datos para ${asignatura}</span></div>`;
      return;
    }

    const val = parseFloat(subj.valoracion) || 0;

    container.innerHTML = `
      <div class="flex items-center gap-2 mb-4">
        <button class="text-sm text-[#543391] hover:text-[#6f4ab3] flex items-center gap-1" id="btnBack"><i class="bi bi-arrow-left"></i> Volver</button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Asignatura</div>
          <div class="text-lg font-bold text-[#543391]">${asignatura}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Promedio</div>
          <div class="text-2xl font-bold ${this.valColor(val)}">${val.toFixed(2)}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Rendimiento</div>
          <div class="text-lg font-bold ${this.valColor(val)}">${val >= 3 ? (val >= 4 ? (val >= 4.5 ? 'Superior' : 'Alto') : 'Básico') : 'Bajo'}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Del promedio general</div>
          <div class="text-lg font-bold ${this.diffColor(val, d.promedio_general)}">${(val - (d.promedio_general || 0)).toFixed(2)}</div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Distribución por Rangos</div>
          <div class="p-4" style="height: 280px;"><canvas id="chFRangos"></canvas></div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Rendimiento por Género</div>
          <div class="p-4" style="height: 280px;"><canvas id="chFGenero"></canvas></div>
        </div>
      </div>
      ${this.renderDescriptiveStats(d)}
    `;

    container.querySelector('#btnBack')?.addEventListener('click', () => {
      const el = $(SEL.asignatura);
      if (el) { el.value = ''; }
      this.loadStats();
    });

    this.createRangesChart(d.distribucion_rangos || [], 'chFRangos');
    this.createGenderChart(d.distribucion_genero || [], 'chFGenero');
  }

  createBarChart(subs, labels, values) {
    const self = this;
    const colors = labels.map(() => `hsla(${Math.random() * 360}, 55%, 50%, 0.7)`);
    const borderColors = labels.map(() => `hsla(${Math.random() * 360}, 55%, 50%, 1)`);
    destroyChart('chBarras');
    createChart('chBarras', 'bar', {
      labels,
      datasets: [{
        label: 'Promedio',
        data: values,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 4,
      }, {
        label: 'Tendencia',
        data: values,
        borderColor: 'rgba(84, 51, 145, 0.8)',
        backgroundColor: 'rgba(84, 51, 145, 0.08)',
        borderWidth: 2,
        type: 'line',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(84, 51, 145, 0.8)',
      }],
    }, {
      scales: { y: { beginAtZero: true, max: 5 }, x: { ticks: { maxRotation: 45 } } },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } } },
      onClick: (_e, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          self.drillDown(labels[idx]);
        }
      },
    });
  }

  createRangesChart(ranges, canvasId = 'chRangos') {
    destroyChart(canvasId);
    if (!ranges.length) {
      const el = document.getElementById(canvasId);
      if (el) {
        const parent = el.parentElement;
        if (parent) parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm">Sin datos de rangos</div>';
      }
      return;
    }
    const rangeColors = {
      '1 - 2.9': 'rgba(239,68,68,0.8)',
      '3 - 3.9': 'rgba(245,158,11,0.8)',
      '4 - 4.4': 'rgba(59,130,246,0.8)',
      '4.5 - 5': 'rgba(16,185,129,0.8)',
    };
    const labels = ranges.map((r) => r.rango);
    const data = ranges.map((r) => parseInt(r.cantidad) || 0);
    createChart(canvasId, 'doughnut', {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((l) => rangeColors[l] || 'rgba(156,163,175,0.8)'),
        borderWidth: 2,
        borderColor: '#fff',
      }],
    }, {
      cutout: '55%',
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } },
      },
    });
  }

  createGenderChart(genderData, canvasId = 'chGenero') {
    destroyChart(canvasId);
    if (!genderData.length) {
      const el = document.getElementById(canvasId);
      if (el) {
        const parent = el.parentElement;
        if (parent) parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm">Sin datos de género</div>';
      }
      return;
    }
    createChart(canvasId, 'bar', {
      labels: genderData.map((g) => g.genero),
      datasets: [
        {
          label: 'Cantidad',
          data: genderData.map((g) => parseInt(g.cantidad) || 0),
          backgroundColor: ['rgba(59,130,246,0.7)', 'rgba(236,72,153,0.7)'],
          borderColor: ['rgba(59,130,246,1)', 'rgba(236,72,153,1)'],
          borderWidth: 1,
          borderRadius: 6,
          order: 2,
        },
        {
          label: 'Promedio',
          data: genderData.map((g) => parseFloat(g.promedio) || 0),
          type: 'line',
          borderColor: 'rgba(84,51,145,0.9)',
          backgroundColor: 'rgba(84,51,145,0.1)',
          borderWidth: 2,
          pointRadius: 6,
          pointBackgroundColor: 'rgba(84,51,145,0.9)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y1',
          order: 1,
        },
      ],
    }, {
      scales: {
        y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Estudiantes' } },
        y1: { beginAtZero: true, max: 5, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Promedio' } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } },
      },
    });
  }

  renderGroupChart(d) {
    if (!d.promedio_grupos || !d.promedio_grupos.length) return '';
    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Promedio por Grupo</div>
        <div class="p-4" style="height: 280px;"><canvas id="chGrupos"></canvas></div>
      </div>
    `;
  }

  createGroupChart(d) {
    if (!d.promedio_grupos || !d.promedio_grupos.length) return;
    destroyChart('chGrupos');
    createChart('chGrupos', 'bar', {
      labels: d.promedio_grupos.map((g) => `Grupo ${g.numero}`),
      datasets: [{
        label: 'Promedio',
        data: d.promedio_grupos.map((g) => parseFloat(g.promedio) || 0),
        backgroundColor: 'rgba(84,51,145,0.7)',
        borderColor: 'rgba(84,51,145,1)',
        borderWidth: 1,
        borderRadius: 6,
      }],
    }, {
      scales: { y: { beginAtZero: true, max: 5 } },
      plugins: { legend: { display: false } },
    });
  }

  renderDescriptiveStats(d) {
    const s = d.descriptivas;
    if (!s) return '';
    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Estadística Descriptiva</div>
        <div class="p-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div class="text-center p-3 bg-purple-50 rounded-lg">
              <div class="text-xs text-gray-500 uppercase tracking-wide">Media</div>
              <div class="text-lg font-bold ${this.valColor(s.media)}">${s.media ?? '—'}</div>
            </div>
            <div class="text-center p-3 bg-blue-50 rounded-lg">
              <div class="text-xs text-gray-500 uppercase tracking-wide">Mediana</div>
              <div class="text-lg font-bold text-blue-700">${s.mediana || '—'}</div>
            </div>
            <div class="text-center p-3 bg-green-50 rounded-lg">
              <div class="text-xs text-gray-500 uppercase tracking-wide">Moda</div>
              <div class="text-lg font-bold text-green-700">${s.moda != null ? s.moda : '—'}</div>
              <div class="text-xs text-gray-400">frec: ${(s.frecuencia_moda || 0).toLocaleString()}</div>
            </div>
            <div class="text-center p-3 bg-orange-50 rounded-lg">
              <div class="text-xs text-gray-500 uppercase tracking-wide">Desv. Estándar</div>
              <div class="text-lg font-bold text-orange-700">${s.desviacion_estandar || '—'}</div>
            </div>
          </div>
          <table class="w-full text-sm">
            <tbody>
              <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Varianza</td><td class="py-2 font-semibold text-right">${s.varianza || '—'}</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Rango</td><td class="py-2 font-semibold text-right">${s.rango || '—'}</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Q1 (25%)</td><td class="py-2 font-semibold text-right">${s.q1 || '—'}</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Q3 (75%)</td><td class="py-2 font-semibold text-right">${s.q3 || '—'}</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Rango Intercuartil (IQR)</td><td class="py-2 font-semibold text-right">${s.iqr || '—'}</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Coef. Variación</td><td class="py-2 font-semibold text-right">${s.coeficiente_variacion || 0}%</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Sesgo (Pearson)</td><td class="py-2 font-semibold text-right ${s.sesgo > 0.5 ? 'text-red-600' : s.sesgo < -0.5 ? 'text-red-600' : 'text-gray-700'}">${s.sesgo || 0}</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Aprobados (≥3)</td><td class="py-2 font-semibold text-right text-green-600">${(s.aprobados || 0).toLocaleString()} (${s.tasa_aprobacion || 0}%)</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 text-gray-500">Reprobados (&lt;3)</td><td class="py-2 font-semibold text-right text-red-600">${(s.reprobados || 0).toLocaleString()} (${(100 - (s.tasa_aprobacion || 0)).toFixed(1)}%)</td></tr>
              <tr><td class="py-2 text-gray-500">Distribución</td><td class="py-2 font-semibold text-right">${s.sesgo > 0.5 ? 'Sesgada izq. (cola derecha)' : s.sesgo < -0.5 ? 'Sesgada der. (cola izquierda)' : 'Aprox. simétrica'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  drillDown(asignatura) {
    const el = $(SEL.asignatura);
    if (!el) return;
    let opt = Array.from(el.options).find((o) => o.value === asignatura);
    if (!opt) {
      opt = document.createElement('option');
      opt.value = asignatura;
      opt.textContent = asignatura;
      el.appendChild(opt);
    }
    el.value = asignatura;
    this.loadStats();
  }

  valColor(v) {
    const val = parseFloat(v) || 0;
    if (val >= 4.5) return 'text-green-600';
    if (val >= 4) return 'text-blue-600';
    if (val >= 3) return 'text-yellow-600';
    return 'text-red-600';
  }

  diffColor(val, avg) {
    const diff = val - (parseFloat(avg) || 0);
    if (diff > 0.1) return 'text-green-600';
    if (diff < -0.1) return 'text-red-600';
    return 'text-gray-500';
  }

  toggleView(showCharts) {
    const charts = document.querySelectorAll(`#${SEL.container} canvas`);
    const tables = document.querySelectorAll(`#${SEL.container} .overflow-x-auto`);
    charts.forEach((c) => (c.parentElement.style.display = showCharts ? 'block' : 'none'));
    tables.forEach((t) => (t.style.display = showCharts ? 'none' : 'block'));
  }

  cleanup() {
    destroyAllCharts();
  }
}

new EstadisticasModule();
