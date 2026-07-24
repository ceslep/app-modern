/**
 * Inasistencias (Attendance) Module — Concentrador de Inasistencias.
 *
 * Features:
 * - Cascading filter selects: Año → Sede → Nivel → Grupo → Periodo
 * - Toggle switches: Retardos (lateness) and Excusas (excuses)
 * - Concentrador table: students as rows, subjects as columns, attendance counts
 * - Clickable cells to see details
 * - "Ver" button to load data, "Descargar" button to export
 */
import { attendance } from '@services/attendance.js';
import { filters } from '@services/filters.js';
import { api } from '@services/api.js';
import { endpoint } from '@config/endpoints.js';
import { showToast } from '@utils/alert.js';
import { escapeHtml, $, delegate, debounce } from '@utils/dom.js';

const SECTION_ID = 'seccionInasistencias';
const CONTAINER_ID = 'contenedorInasistencias';

class InasistenciasModule {
  constructor() {
    this.currentFilter = {};
    this.attendanceData = [];
    this.students = [];
    this.subjects = [];
    this.busy = false;
    this.sedeNombre = '';
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
    if (this.busy) return;
    const container = $(CONTAINER_ID);
    if (!container) return;

    this.renderShell(container);
    await this.loadFilterOptions();
    this._loaded = true;
  }

  // ── Cascading filter helpers ────────────────────────────────────

  async loadFilterOptions() {
    const yearSel = $('inasYear');
    const sedeSel = $('inasSede');
    const nivelSel = $('inasNivel');
    const numeroSel = $('inasNumero');
    const periodoSel = $('inasPeriodo');

    // Years
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

    // Sedes
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

    // Periods
    if (periodoSel) {
      try {
        const res = await filters.getPeriods();
        const periods = Array.isArray(res) ? res : (res?.data || []);
        let html = '<option value="">Seleccione...</option>';
        // Add TODOS option
        html += '<option value="TODOS">TODOS</option>';
        periods.forEach((p) => {
          const v = p.value || p.periodo || p.nombre || '';
          const l = p.label || p.nombre || v;
          if (!v) return;
          const cur = p.current || p.selected === 'selected';
          html += `<option value="${escapeHtml(v)}"${cur ? ' selected' : ''}>${escapeHtml(l)}</option>`;
        });
        periodoSel.innerHTML = html;
      } catch {
        periodoSel.innerHTML = '<option value="">Error</option>';
      }
    }

    // ── Cascading events ──
    sedeSel?.addEventListener('change', async () => {
      this.sedeNombre = sedeSel.options[sedeSel.selectedIndex]?.text || '';
      nivelSel.innerHTML = '<option value="">Cargando...</option>';
      numeroSel.innerHTML = '<option value="">Seleccione grado primero</option>';
      if (sedeSel.value && yearSel.value) {
        await this.loadNiveles(sedeSel.value, yearSel.value, nivelSel);
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
  }

  async loadNiveles(sede, year, nivelSel) {
    try {
      const res = await filters.getNiveles(sede, year);
      const grupos = Array.isArray(res) ? res : (res?.data || []);
      const niveles = [...new Set(grupos.map((g) => g.nivel ?? g.value).filter((v) => v != null))].sort((a, b) => a - b);
      let html = '<option value="">Seleccione...</option>';
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
      let html = '<option value="">Seleccione...</option>';
      unicos.forEach((n) => { html += `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`; });
      numeroSel.innerHTML = html;
    } catch {
      numeroSel.innerHTML = '<option value="">Error</option>';
    }
  }

  // ── Query attendance ────────────────────────────────────────────

  async queryConcentrador() {
    if (this.busy) return;
    const year = $('inasYear')?.value;
    const asignacion = $('inasSede')?.value;
    const nivel = $('inasNivel')?.value;
    const numero = $('inasNumero')?.value;
    const periodo = $('inasPeriodo')?.value;

    if (!asignacion || !nivel || !numero) {
      showToast('Seleccione Sede, Nivel y Grupo', 'warning');
      return;
    }

    this.busy = true;
    const resultsEl = $('inasResults');
    if (resultsEl) {
      resultsEl.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="text-center">
            <span data-orb="searching" data-orb-size="40" class="inline-block mx-auto mb-3" style="width:40px;height:40px"></span>
            <p class="text-sm text-gray-400">Cargando concentrador de inasistencias...</p>
          </div>
        </div>
      `;
    }

    this.currentFilter = { year, asignacion, nivel, numero, periodo };

    try {
      // 1. Get concentration HTML from the legacy endpoint via the router
      //    (route: attendance/concentration → getConcentradorInasistencias.php)
      const concentradorData = await api.post('attendance/concentration', {
        Asignacion: asignacion,
        nivel,
        numero,
        periodo: periodo || 'TODOS',
        year: year || String(new Date().getFullYear()),
        tipo: 'inasistencia',
      });
      const rawHtml = concentradorData?.html || '';

      // 2. Get individual attendance data (also via the router)
      const inasistenciasData = await api.post('attendance', {
        Asignacion: asignacion,
        nivel,
        numero,
        periodo: periodo || 'TODOS',
      });
      this.attendanceData = Array.isArray(inasistenciasData) ? inasistenciasData : (inasistenciasData?.data || []);
      if (!Array.isArray(this.attendanceData)) this.attendanceData = [];

      // 3. Inject attendance counts into the concentrador cells
      //    The PHP generates IDs: iestudiante_{estudianteId}_{materiaCode}
      const tmp = document.createElement('div');
      tmp.innerHTML = rawHtml;

      this.attendanceData.forEach((a) => {
        const code = a.asignat || a.materia;
        if (!code) return;
        const cellId = `iestudiante_${a.estudiante}_${code}`;
        const cell = tmp.querySelector(`#${CSS.escape(cellId)}`);
        if (cell) {
          const count = parseInt(a.cantidadInasistencias) || 0;
          cell.innerHTML = '';

          const span = document.createElement('span');
          span.className = 'conc-count-val';
          span.textContent = String(count);

          // color tier mirrors the legend in the concentrador footnote
          let tier = 'has-0';
          if (count >= 6) tier = 'has-high';
          else if (count >= 3) tier = 'has-mid';
          else if (count > 0) tier = 'has-low';

          cell.classList.add(tier);
          cell.appendChild(span);
        }
      });

      // 4. Wire the search filter exposed by the PHP template
      window.__filterConcentrador = (q) => {
        const needle = (q || '').toLowerCase().trim();
        tmp.querySelectorAll('.conc-table tbody tr').forEach((tr) => {
          const name = tr.querySelector('.conc-td-name')?.textContent?.toLowerCase() || '';
          tr.style.display = !needle || name.includes(needle) ? '' : 'none';
        });
      };

      // 5. Enable toggles and wrap in our shell
      const retardosToggle = $('inasRetardos');
      const excusasToggle = $('inasExcusas');
      if (retardosToggle) retardosToggle.disabled = false;
      if (excusasToggle) excusasToggle.disabled = false;

      this.renderResults(resultsEl, tmp);
    } catch (error) {
      if (resultsEl) {
        resultsEl.innerHTML = `
          <div class="glass-card p-12 text-center">
            <i class="bi bi-exclamation-circle text-5xl text-red-300 block mb-3"></i>
            <p class="text-gray-500 mb-2">Error al cargar inasistencias</p>
            <p class="text-xs text-gray-400 mb-4">${escapeHtml(error.message || '')}</p>
            <button class="inline-flex items-center gap-2 px-4 py-2 bg-[#543391] hover:bg-[#6f4ab3] text-white font-medium rounded-lg transition-all text-sm" id="btnReintentarInas">
              <i class="bi bi-arrow-clockwise"></i> Reintentar
            </button>
          </div>
        `;
        const retry = $('btnReintentarInas');
        if (retry) retry.addEventListener('click', () => this.queryConcentrador());
      }
    } finally {
      this.busy = false;
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  computeStatistics() {
    const stats = {
      totalInasistencias: 0,
      totalEstudiantes: 0,
      promedioPorEstudiante: 0,
      materiaMax: { nombre: '', cantidad: 0 }
    };

    if (!this.attendanceData || this.attendanceData.length === 0) {
      return stats;
    }

    let totalInasistencias = 0;
    const estudiantesSet = new Set();
    const materiasMap = new Map(); // materia -> total inasistencias

    for (const record of this.attendanceData) {
      const cantidad = parseInt(record.cantidadInasistencias) || 0;
      totalInasistencias += cantidad;
      estudiantesSet.add(record.estudiante);
      const materia = record.asignat || record.materia || '';
      const current = materiasMap.get(materia) || 0;
      materiasMap.set(materia, current + cantidad);
    }

    stats.totalInasistencias = totalInasistencias;
    stats.totalEstudiantes = estudiantesSet.size;

    if (estudiantesSet.size > 0) {
      stats.promedioPorEstudiante = (totalInasistencias / estudiantesSet.size).toFixed(2);
    }

    // Find materia with max inasistencias
    let maxMateria = { nombre: '', cantidad: 0 };
    for (const [materia, cantidad] of materiasMap.entries()) {
      if (cantidad > maxMateria.cantidad) {
        maxMateria = { nombre: materia, cantidad };
      }
    }
    stats.materiaMax = maxMateria;

    return stats;
  }

  renderShell(container) {
    container.innerHTML = `
      <!-- Filter form -->
      <div class="glass-card p-4 mb-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Año</label>
            <select id="inasYear"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Cargando...</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sede</label>
            <select id="inasSede"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Cargando...</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nivel</label>
            <select id="inasNivel"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Seleccione sede primero</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Grupo</label>
            <select id="inasNumero"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Seleccione grado primero</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Periodo</label>
            <select id="inasPeriodo"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
              <option value="">Cargando...</option>
            </select>
          </div>
        </div>

        <!-- All controls (left-aligned) -->
        <div class="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <div class="flex items-center gap-2">
            <button id="btnConsultarInas"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-[#543391] hover:bg-[#6f4ab3] text-white font-medium rounded-lg shadow-sm transition-all text-sm">
              <i class="bi bi-card-list"></i> Ver
            </button>
            <button id="btnDescargarInas"
                    class="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 hover:text-[#543391] hover:border-[#543391]/30 bg-white font-medium rounded-lg transition-all text-sm">
              <i class="bi bi-download"></i> Descargar
            </button>
          </div>
          <div class="h-6 w-px bg-gray-200 hidden sm:block" aria-hidden="true"></div>
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" id="inasRetardos" class="w-4 h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391]">
              <span>Retardos</span>
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" id="inasExcusas" class="w-4 h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391]">
              <span>Excusas</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Results area -->
      <div id="inasResults">
        <div class="glass-card p-12 text-center">
          <i class="bi bi-person-x text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400 font-medium">Concentrador de Inasistencias</p>
          <p class="text-xs text-gray-300 mt-1">Seleccione los filtros y presione "Ver" para cargar los datos</p>
        </div>
      </div>
    `;

    // Wire Ver button
    const consultBtn = $('btnConsultarInas');
    if (consultBtn) {
      consultBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.queryConcentrador();
      });
    }

    // Wire search delegation on results
    delegate(container, 'input', '#inasSearchInput', debounce((e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#inasTableContainer tbody tr').forEach((tr) => {
        const name = tr.querySelector('td:first-child')?.textContent?.toLowerCase() || '';
        tr.style.display = !q || name.includes(q) ? '' : 'none';
      });
    }, 250));

    // Wire download button
    const downloadBtn = $('btnDescargarInas');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.downloadData();
      });
    }
  }

  renderResults(container, tmp) {
    if (!container) return;

    const table = tmp?.querySelector('table');
    if (!table) {
      container.innerHTML = `
        <div class="glass-card p-12 text-center">
          <i class="bi bi-inbox text-5xl text-gray-300 block mb-3"></i>
          <p class="text-gray-400 font-medium">Sin datos</p>
          <p class="text-xs text-gray-300 mt-1">No hay información de inasistencias para estos filtros</p>
        </div>
      `;
      return;
    }

    // Count rows/cols
    const totalRows = table.querySelectorAll('tbody tr').length;
    const totalCols = table.querySelectorAll('thead th').length - 1;

    // Style the PHP-generated table with our theme classes
    table.className = 'w-full text-xs';
    table.querySelectorAll('thead th').forEach((th, i) => {
      if (i === 0) {
        th.className = 'text-left py-2.5 px-3 sticky left-0 bg-gray-50 z-10 min-w-[180px] text-xs font-semibold text-gray-500 uppercase tracking-wide';
      } else {
        th.className = 'text-center py-2.5 px-2 min-w-[55px] text-xs font-semibold text-gray-500 uppercase tracking-wide';
      }
    });

    table.querySelectorAll('tbody tr').forEach((tr, i) => {
      tr.className = `border-t border-gray-50 hover:bg-[#543391]/[0.03] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`;
      tr.querySelectorAll('td').forEach((td, j) => {
        if (j === 0) {
          td.className = 'py-2 px-3 font-medium text-gray-700 sticky left-0 bg-white border-r border-gray-50';
        } else {
          td.className = 'text-center py-1.5 px-1';
        }
      });
    });

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#543391]/10 text-[#543391]">
            <i class="bi bi-person-x"></i> Concentrador Inasistencias
          </span>
          <span class="text-xs text-gray-400">${totalRows} estudiante(s) · ${totalCols} materia(s)</span>
        </div>
        <div class="relative">
          <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input type="search" id="inasSearchInput"
                 class="w-44 pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs
                        focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                 placeholder="Buscar estudiante...">
        </div>
      </div>
      <div class="glass-card overflow-hidden">
        <div class="overflow-x-auto" id="inasTableContainer">
          ${table.outerHTML}
        </div>
        <div class="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-400">
          <span>${totalRows} estudiante(s) · ${totalCols} materia(s)</span>
          <span class="flex items-center gap-3">
            <span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-100"></span> ≥6</span>
            <span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-100"></span> 3-5</span>
            <span class="inline-flex items-center gap-1"><span class="w-3 h-3 rounded bg-sky-100"></span> 1-2</span>
          </span>
        </div>
      </div>
    `;
  }

  // ── Download ─────────────────────────────────────────────────────

  downloadData() {
    if (this.attendanceData.length === 0) {
      showToast('No hay datos para descargar', 'warning');
      return;
    }

    // Build CSV
    const headers = ['Estudiante', 'Asignatura', 'Cantidad', 'Periodo'];
    const rows = this.attendanceData.map((a) => [
      a.nombres || '',
      a.asignatura || a.asignat || '',
      a.cantidadInasistencias || '0',
      this.currentFilter.periodo || '',
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach((r) => {
      csv += r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inasistencias_${this.currentFilter.nivel || ''}-${this.currentFilter.numero || ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Archivo descargado', 'success');
  }
}

const inasistenciasModule = new InasistenciasModule();
export default inasistenciasModule;

