/**
 * Consultas Module — Modal-based group querying and report generation.
 *
 * Inspired by the parent project's modalConsultas + inforest flow:
 * 1. Open a modal with cascading filters (year, sede, grado, grupo, periodo)
 * 2. Fetch students matching the filters
 * 3. Display students with checkboxes for bulk selection
 * 4. Generate academic reports for selected students (with progress bar)
 */
import { auth } from '@services/auth.js';
import { filters } from '@services/filters.js';
import { students } from '@services/students.js';
import { endpoint } from '@config/endpoints.js';
import { showModal, hideModal } from '@utils/modal.js';
import { alertSuccess, alertError, alertWarning, showToast } from '@utils/alert.js';
import { escapeHtml, $, delegate, debounce } from '@utils/dom.js';

// Container IDs renamed to live inside #seccionInformes
const CONS_RESULTADOS = 'consResultados';
const CONS_HERRAMIENTAS = 'consHerramientas';
const CONS_DESCARGAR = 'consDescargar';
const CONS_WRAPPER = 'consWidgetWrapper';

class ConsultasModule {
  constructor() {
    this.currentStudents = [];
    this.currentFilter = {};
    this.sedeNombre = '';
    this.busy = false;
    this.activated = false;

    // Handle both initial load (register for event) and Vite HMR re-evaluation
    // (user already authenticated, event already fired)
    if (auth.getUser() && auth.getUser().id) {
      // User is already logged in — activate immediately (e.g. HMR reload)
      setTimeout(() => this.activate(), 0);
    }
    document.addEventListener('app:authenticated', () => this.activate());
  }

  activate() {
    if (this.activated) return;
    // ── Access control: only Maestra users ──
    if (!auth.isMaestra()) {
      // Hide the Consultas widget inside Informes section
      const wrapper = $(CONS_WRAPPER);
      if (wrapper) wrapper.classList.add('hidden');
      return;
    }
    this.activated = true;

    // Update the badge to confirm the user is allowed
    const badge = $('consBadgeMaestra');
    if (badge) {
      badge.classList.remove('bg-[#543391]/10', 'text-[#543391]', 'border-[#543391]/20');
      badge.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
      const icon = badge.querySelector('i');
      if (icon) {
        icon.classList.remove('bi-shield-lock', 'text-[#543391]');
        icon.classList.add('bi-shield-check', 'text-emerald-600');
      }
      // Replace text node content (preserves the <i> icon child)
      Array.from(badge.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .forEach((n) => { n.textContent = ' Acceso Maestra'; });
    }

    // Open modal button
    const btnOpen = $('btnAbrirModalConsultas');
    if (btnOpen) {
      btnOpen.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    }

    // Modal: Cargar Estudiantes button
    const btnCargar = $('btnCargarEstudiantes');
    if (btnCargar) {
      btnCargar.addEventListener('click', (e) => {
        e.preventDefault();
        this.cargarEstudiantes();
      });
    }

    // Cascading selects in the modal
    this.setupCascadingSelects();

    // Generate reports button
    const btnGenerar = $('btnGenerarReportes');
    if (btnGenerar) {
      btnGenerar.addEventListener('click', (e) => {
        e.preventDefault();
        this.generarReportes();
      });
    }

    // Select all checkbox (delegated)
    delegate($(CONS_RESULTADOS), 'change', '#chkSeleccionarTodos', (e, target) => {
      const checked = target.checked;
      document.querySelectorAll(`#${CONS_RESULTADOS} .check-estudiante`).forEach((cb) => {
        cb.checked = checked;
      });
      this.actualizarSeleccion();
    });

    // Individual student checkbox count (delegated)
    delegate($(CONS_RESULTADOS), 'change', '.check-estudiante', () => {
      this.actualizarSeleccion();
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Cascading selects within the modal                              */
  /* ---------------------------------------------------------------- */

  async setupCascadingSelects() {
    const yearEl = $('consYear');
    const sedeEl = $('consAsignacion');
    const nivelEl = $('consNivel');
    const numeroEl = $('consNumero');
    const periodoEl = $('consPeriodo');

    if (!yearEl || !sedeEl) return;

    // Fill year
    try {
      const res = await filters.getYears();
      // legacy: [{year:"2024"}]   moderno: {data:[{value,label}]}
      const years = Array.isArray(res) ? res : (res?.data || []);
      const currentYear = String(new Date().getFullYear());
      let html = '<option value="">Seleccione...</option>';
      years.forEach((y) => {
        const value = y.value || y.year || '';
        const label = y.label || y.year || '';
        if (!value) return;
        const sel = String(value) === currentYear ? ' selected' : '';
        html += `<option value="${escapeHtml(value)}"${sel}>${escapeHtml(label)}</option>`;
      });
      yearEl.innerHTML = html;
    } catch {
      yearEl.innerHTML = '<option value="">Error al cargar años</option>';
    }

    // Fill sedes
    try {
      const res = await filters.getSedes();
      // legacy: [{ind, sede, ...}]   moderno: {data:[{value,label}]}
      const sedes = Array.isArray(res) ? res : (res?.data || []);
      let html = '<option value="">Seleccione...</option>';
      sedes.forEach((s) => {
        const value = s.value || s.ind || '';
        const label = s.label || s.sede || s.nombre || '';
        if (!value) return;
        html += `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
      });
      sedeEl.innerHTML = html;
    } catch {
      sedeEl.innerHTML = '<option value="">Error al cargar sedes</option>';
    }

    // Fill periods
    try {
      const res = await filters.getPeriods();
      // legacy: [{ind, nombre, periodo, selected}]   moderno: {data:[{value,label,current}]}
      const periods = Array.isArray(res) ? res : (res?.data || []);
      let html = '<option value="">Seleccione...</option>';
      const current = periods.find((p) => p.current || p.selected === 'selected');
      periods.forEach((p) => {
        const value = p.value || p.periodo || p.nombre || '';
        const label = p.label || p.periodo || p.nombre || '';
        if (!value) return;
        const isCurrent = p.current || p.selected === 'selected';
        const sel = current && (String(value) === String(current.value || current.periodo)) ? ' selected' : (isCurrent ? ' selected' : '');
        html += `<option value="${escapeHtml(value)}"${sel}>${escapeHtml(label)}</option>`;
      });
      periodoEl.innerHTML = html;
    } catch {
      periodoEl.innerHTML = '<option value="">Error al cargar periodos</option>';
    }

    // Sede change → load grados
    sedeEl.addEventListener('change', async () => {
      await this.onSedeChange(sedeEl.value, yearEl.value, nivelEl, numeroEl);
    });

    // Nivel change → filter grupos
    nivelEl.addEventListener('change', () => {
      this.onNivelChange(nivelEl.value, numeroEl);
    });
  }

  async onSedeChange(sede, year, nivelEl, numeroEl) {
    if (!sede) {
      nivelEl.innerHTML = '<option value="">Seleccione sede primero</option>';
      numeroEl.innerHTML = '<option value="">Seleccione grado primero</option>';
      this.sedeNombre = '';
      return;
    }

    // Get the sede display name
    const sedeEl = $('consAsignacion');
    if (sedeEl) {
      const opt = sedeEl.options[sedeEl.selectedIndex];
      this.sedeNombre = opt ? opt.text : sede;
    }

    nivelEl.innerHTML = '<option value="">Cargando...</option>';
    numeroEl.innerHTML = '<option value="">Seleccione grado primero</option>';

    try {
      // getNiveles envía {asignacion, year} — getNiveles.php espera $_GET['asignacion']
      const res = await filters.getNiveles(sede, year);
      // legacy getNiveles.php → [{nivel: 1}]  moderno → {data:[{nivel:1}]}
      const grupos = Array.isArray(res) ? res : (res?.data || []);
      const niveles = [...new Set(grupos.map((g) => g.nivel ?? g.value).filter((v) => v != null))].sort((a, b) => a - b);

      let html = '<option value="">Seleccione...</option>';
      niveles.forEach((n) => {
        html += `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`;
      });
      nivelEl.innerHTML = html;
    } catch {
      nivelEl.innerHTML = '<option value="">Error al cargar grados</option>';
    }
  }

  onNivelChange(nivel, numeroEl) {
    if (!nivel) {
      numeroEl.innerHTML = '<option value="">Seleccione grado primero</option>';
      return;
    }
    const sede = $('consAsignacion')?.value;
    const year = $('consYear')?.value;
    // We'll fetch the numeros from the cached grupos
    this.loadNumeros(sede, nivel, year, numeroEl);
  }

  async loadNumeros(sede, nivel, year, numeroEl) {
    numeroEl.innerHTML = '<option value="">Cargando...</option>';
    try {
      // getNumeros.php es POST y no está mapeado en el router; lo llamamos directo.
      const res = await fetch(endpoint('/getNumeros.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asignacion: sede,
          nivel,
          year: year || String(new Date().getFullYear()),
        }),
      });
      const numeros = await res.json();
      // legacy → [{numero: 1}]   moderno → {data:[{numero:1}]}
      const lista = Array.isArray(numeros) ? numeros : (numeros?.data || []);
      const unicos = [...new Set(lista.map((g) => g.numero ?? g.value).filter((v) => v != null))].sort((a, b) => a - b);

      let html = '<option value="">Seleccione...</option>';
      unicos.forEach((n) => {
        html += `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`;
      });
      numeroEl.innerHTML = html;
    } catch {
      numeroEl.innerHTML = '<option value="">Error al cargar grupos</option>';
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Open modal                                                      */
  /* ---------------------------------------------------------------- */

  openModal() {
    showModal('modalConsultas');
  }

  /* ---------------------------------------------------------------- */
  /*  Cargar Estudiantes                                              */
  /* ---------------------------------------------------------------- */

  async cargarEstudiantes() {
    if (this.busy) return;
    this.busy = true;

    const year = $('consYear')?.value;
    const asignacion = $('consAsignacion')?.value;
    const nivel = $('consNivel')?.value;
    const numero = $('consNumero')?.value;
    const periodo = $('consPeriodo')?.value;

    if (!asignacion || !nivel || !numero) {
      alertWarning('Debe seleccionar Sede, Grado y Grupo');
      this.busy = false;
      return;
    }

    // Show spinner
    const spn = $('spnCargarConsulta');
    if (spn) spn.classList.remove('hidden');

    this.currentFilter = { year, asignacion, nivel, numero, periodo };

    try {
      const response = await students.getByFilter(asignacion, nivel, numero);
      this.currentStudents = response?.data || [];

      if (this.currentStudents.length === 0) {
        alertWarning('No se encontraron estudiantes para los filtros seleccionados');
        this.renderEmpty();
      } else {
        this.renderStudentTable();
        this.showToolbar();
        showToast(`${this.currentStudents.length} estudiantes cargados`, 'success');
      }

      // Hide modal
      hideModal('modalConsultas');
    } catch (error) {
      alertError('Error', error.message || 'Error al cargar estudiantes');
    } finally {
      if (spn) spn.classList.add('hidden');
      this.busy = false;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render student table                                            */
  /* ---------------------------------------------------------------- */

  renderEmpty() {
    const container = $(CONS_RESULTADOS);
    if (!container) return;
    container.innerHTML = `
      <div class="text-center py-12">
        <i class="bi bi-inbox text-5xl text-gray-300 block mb-3"></i>
        <p class="text-gray-400">No se encontraron estudiantes</p>
      </div>
    `;
    $(CONS_HERRAMIENTAS)?.classList.add('hidden');
  }

  showToolbar() {
    const toolbar = $(CONS_HERRAMIENTAS);
    if (toolbar) {
      toolbar.classList.remove('hidden');
      // Update info
      const sedeNombre = this.sedeNombre || $('consAsignacion')?.options?.[$('consAsignacion')?.selectedIndex]?.text || '';
      const nivel = $('consNivel')?.value || '';
      const numero = $('consNumero')?.value || '';
      const periodo = $('consPeriodo')?.value || '';

      const infoEl = $('infoSeleccion');
      if (infoEl) {
        infoEl.textContent = `0 de ${this.currentStudents.length} seleccionados · ${sedeNombre} · ${nivel}-${numero} · P${periodo}`;
      }
    }
    this.actualizarSeleccion();
  }

  renderStudentTable() {
    const container = $(CONS_RESULTADOS);
    if (!container) return;

    const nivel = $('consNivel')?.value || '';
    const numero = $('consNumero')?.value || '';

    let html = `
      <div class="glass-card overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer select-none">
              <input type="checkbox" id="chkSeleccionarTodos"
                     class="w-4 h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391]">
              Seleccionar todos
            </label>
            <span class="text-xs text-gray-400">${this.currentStudents.length} estudiantes · ${nivel}-${numero}</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input type="search" id="filtroEstudiantes"
                     class="w-48 pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs
                            focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
                     placeholder="Filtrar estudiantes...">
            </div>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th class="text-center py-3 px-2 w-10"></th>
                <th class="text-left py-3 px-3">#</th>
                <th class="text-left py-3 px-3">Nombres</th>
                <th class="text-center py-3 px-3">Estado</th>
                <th class="text-center py-3 px-3 w-24">Acción</th>
              </tr>
            </thead>
            <tbody id="cuerpoTablaConsultas">
    `;

    this.currentStudents.forEach((est, i) => {
      const estadoIcon = est.estado === 'A' || est.estado === 'Activo'
        ? '<span class="inline-flex items-center gap-1 text-emerald-600"><i class="bi bi-check-circle-fill text-xs"></i> Activo</span>'
        : '<span class="inline-flex items-center gap-1 text-red-500"><i class="bi bi-x-circle-fill text-xs"></i> Inactivo</span>';

      html += `
        <tr class="border-t border-gray-50 hover:bg-[#543391]/[0.03] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}">
          <td class="text-center py-2.5 px-2">
            <input type="checkbox" class="check-estudiante w-4 h-4 rounded border-gray-300 text-[#543391]
                           focus:ring-[#543391]" data-index="${i}" data-id="${escapeHtml(est.estudiante || '')}">
          </td>
          <td class="py-2.5 px-3 text-gray-400 text-xs font-mono">${i + 1}</td>
          <td class="py-2.5 px-3">
            <button class="text-left text-[#543391] hover:text-[#7b5dc7] font-medium text-sm transition-colors
                           ver-informe-individual" data-id="${escapeHtml(est.estudiante || '')}"
                           data-nombres="${escapeHtml(est.nombres || '')}">
              ${escapeHtml(est.nombres || '')}
            </button>
          </td>
          <td class="text-center py-2.5 px-3">${estadoIcon}</td>
          <td class="text-center py-2.5 px-3">
            <button class="ver-informe-individual inline-flex items-center gap-1 px-2.5 py-1.5
                           bg-[#543391]/10 hover:bg-[#543391]/20 text-[#543391] text-xs font-medium
                           rounded-lg transition-colors"
                    data-id="${escapeHtml(est.estudiante || '')}"
                    data-nombres="${escapeHtml(est.nombres || '')}">
              <i class="bi bi-file-earmark-text"></i> Informe
            </button>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
        <div class="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-400">
          <span>${this.currentStudents.length} registro(s)</span>
          <span id="seleccionCount">0 seleccionados</span>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Wire up the "ver-informe-individual" buttons
    container.querySelectorAll('.ver-informe-individual').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        const nombres = btn.dataset.nombres;
        if (id) this.generarInformeIndividual(id, nombres);
      });
    });

    // Wire up the search filter
    const filtro = $('filtroEstudiantes');
    if (filtro) {
      filtro.addEventListener('input', debounce((e) => {
        this.filtrarTabla(e.target.value);
      }, 250));
    }
  }

  filtrarTabla(query) {
    const tbody = $('cuerpoTablaConsultas');
    if (!tbody) return;
    const q = query.toLowerCase().trim();
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = !q || text.includes(q) ? '' : 'none';
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Selection helpers                                               */
  /* ---------------------------------------------------------------- */

  actualizarSeleccion() {
    const checkboxes = document.querySelectorAll(`#${CONS_RESULTADOS} .check-estudiante`);
    const total = this.currentStudents.length;
    const selected = Array.from(checkboxes).filter((cb) => cb.checked).length;

    const infoEl = $('infoSeleccion');
    if (infoEl) {
      infoEl.textContent = `${selected} de ${total} seleccionados · ${this.getFilterLabel()}`;
    }

    // Update count in the table footer
    const countEl = $('seleccionCount');
    if (countEl) {
      countEl.textContent = selected > 0 ? `${selected} seleccionados` : '0 seleccionados';
    }

    // Enable/disable generate button
    const btnGen = $('btnGenerarReportes');
    if (btnGen) {
      btnGen.disabled = selected === 0;
      btnGen.classList.toggle('opacity-50', selected === 0);
      btnGen.classList.toggle('cursor-not-allowed', selected === 0);
    }

    // Update select-all checkbox
    const selectAll = $('chkSeleccionarTodos');
    if (selectAll) {
      selectAll.checked = selected === total && total > 0;
      selectAll.indeterminate = selected > 0 && selected < total;
    }
  }

  getFilterLabel() {
    const sedeNombre = this.sedeNombre || $('consAsignacion')?.options?.[$('consAsignacion')?.selectedIndex]?.text || '';
    const nivel = $('consNivel')?.value || '';
    const numero = $('consNumero')?.value || '';
    const periodo = $('consPeriodo')?.value || '';
    return `${sedeNombre} · ${nivel}-${numero} · P${periodo}`;
  }

  /* ---------------------------------------------------------------- */
  /*  Generate individual report                                      */
  /* ---------------------------------------------------------------- */

  async generarInformeIndividual(studentId, nombres) {
    if (!studentId) return;
    const estudianteData = this.currentStudents.find((s) => String(s.estudiante) === String(studentId));
    if (!estudianteData) {
      alertError('Error', 'Estudiante no encontrado en los datos cargados');
      return;
    }

    const periodo = $('consPeriodo')?.value || this.currentFilter.periodo || '';
    const sedeEl = $('consAsignacion');
    const establecimiento = this.sedeNombre || (sedeEl ? sedeEl.options[sedeEl.selectedIndex]?.text : '') || '';

    const payload = {
      estudiante:      estudianteData.estudiante,
      nombres:         estudianteData.nombres,
      codigo:          estudianteData.codigo || '',
      nivel:           estudianteData.nivel || this.currentFilter.nivel || '',
      numero:          estudianteData.numero || this.currentFilter.numero || '',
      asignacion:      estudianteData.asignacion || this.currentFilter.asignacion || '',
      year:            $('consYear')?.value || this.currentFilter.year || new Date().getFullYear(),
      periodo:         periodo,
      establecimiento: establecimiento,
      puesto_ie:       '',
      puesto_grupo:    '',
      promedio:        '',
      createFolder:    'S',
    };

    try {
      // Direct POST to router.php which maps reports/report-card → generaReporte.php
      const routerBase = '/app-modern/server/router.php';
      const params = new URLSearchParams();
      params.set('__api', 'reports/report-card');
      const url = `${routerBase}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.estado === 'ok') {
        showToast(`Informe generado: ${nombres}`, 'success');
        // Preview
        if (result.datoss) {
          this.showReportPreview({
            studentName: nombres,
            codigo: payload.codigo,
            grado: `${payload.nivel}-${payload.numero}`,
            year: payload.year,
            periodo: periodo,
            promedio: payload.promedio || 'N/A',
            puesto: payload.puesto_grupo || 'N/A',
            html: `<p class="text-green-600">✅ Informe generado exitosamente</p>`,
          });
        }
      } else {
        alertError('Error', result.mensaje || 'Error al generar informe');
      }
    } catch (error) {
      alertError('Error', error.message || 'Error al generar informe');
    }
  }

  showReportPreview(data) {
    const container = $(CONS_RESULTADOS);
    if (!container) return;

    // Insert a preview card after the table or replace empty state
    const existing = container.querySelector('.reporte-preview');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'reporte-preview mt-4';
    div.innerHTML = `
      <div class="glass-card overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white">
          <h5 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <i class="bi bi-file-earmark-text text-[#543391]"></i>
            Informe de ${escapeHtml(data.studentName || '')}
          </h5>
          <div class="flex items-center gap-2">
            <button class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg
                           text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors cerrar-preview">
              <i class="bi bi-x"></i> Cerrar
            </button>
          </div>
        </div>
        <div class="p-4 text-sm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
            <div>
              <span class="font-medium text-gray-600">Código:</span> ${escapeHtml(data.codigo || '')}<br>
              <span class="font-medium text-gray-600">Grado:</span> ${escapeHtml(data.grado || '')}<br>
              <span class="font-medium text-gray-600">Año:</span> ${data.year || ''}
            </div>
            <div>
              <span class="font-medium text-gray-600">Periodo:</span> ${escapeHtml(data.periodo || '')}<br>
              <span class="font-medium text-gray-600">Promedio:</span> ${data.promedio || 'N/A'}<br>
              <span class="font-medium text-gray-600">Puesto:</span> ${data.puesto || 'N/A'}
            </div>
          </div>
          <div class="report-content">
            ${data.html || '<p class="text-gray-400 text-center py-4">Sin datos disponibles para mostrar</p>'}
          </div>
        </div>
      </div>
    `;
    container.appendChild(div);

    // Close button
    div.querySelector('.cerrar-preview')?.addEventListener('click', () => div.remove());
  }

  /* ---------------------------------------------------------------- */
  /*  Bulk report generation                                          */
  /* ---------------------------------------------------------------- */

  async generarReportes() {
    const checkboxes = document.querySelectorAll(`#${CONS_RESULTADOS} .check-estudiante:checked`);
    const selected = Array.from(checkboxes).map((cb) => ({
      id: cb.dataset.id,
      index: parseInt(cb.dataset.index),
      data: this.currentStudents[parseInt(cb.dataset.index)],
    }));

    if (selected.length === 0) {
      alertWarning('Seleccione al menos un estudiante');
      return;
    }

    const total = selected.length;
    const periodo = $('consPeriodo')?.value || this.currentFilter.periodo || '';
    const anio = $('consYear')?.value || this.currentFilter.year || new Date().getFullYear();
    const sedeEl = $('consAsignacion');
    const establecimiento = this.sedeNombre || (sedeEl ? sedeEl.options[sedeEl.selectedIndex]?.text : '') || '';
    const autoDownload = $(CONS_DESCARGAR)?.checked || false;

    // Show progress
    const progressContainer = $('progressContainer');
    const progressBar = $('progressBar');
    const progressText = $('progressText');
    const spnGenerar = $('spnGenerar');
    const btnGen = $('btnGenerarReportes');

    if (progressContainer) progressContainer.classList.remove('hidden');
    if (spnGenerar) spnGenerar.classList.remove('hidden');
    if (btnGen) btnGen.disabled = true;

    // Router endpoint for report generation
    const routerBase = '/app-modern/server/router.php';
    const reportUrl = `${routerBase}?__api=reports/report-card`;

    let completed = 0;
    let errors = 0;
    let downloadUrls = [];

    for (let i = 0; i < selected.length; i++) {
      const sel = selected[i];
      const checkbox = checkboxes[i];
      const est = sel.data;

      const payload = {
        estudiante:      est.estudiante,
        nombres:         est.nombres,
        codigo:          est.codigo || '',
        nivel:           est.nivel || this.currentFilter.nivel || '',
        numero:          est.numero || this.currentFilter.numero || '',
        asignacion:      est.asignacion || this.currentFilter.asignacion || '',
        year:            String(anio),
        periodo:         periodo,
        establecimiento: establecimiento,
        puesto_ie:       '',
        puesto_grupo:    '',
        promedio:        '',
        createFolder:    'S',
      };

      try {
        const response = await fetch(reportUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (result.estado === 'ok') {
          completed++;
          if (autoDownload && result.href) {
            downloadUrls.push(result.href);
          }
          // Update the row state indicator
          const row = checkbox?.closest('tr');
          if (row) {
            const lastCell = row.querySelector('td:last-child');
            if (lastCell) {
              lastCell.innerHTML = `
                <span class="inline-flex items-center gap-1 text-emerald-600 text-xs">
                  <i class="bi bi-check-circle-fill"></i> Generado
                </span>
              `;
            }
          }
        } else {
          errors++;
        }
      } catch {
        errors++;
      }

      // Update progress
      const pct = Math.round(((completed + errors) / total) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressText) progressText.textContent = `${completed} de ${total} (${pct}%)`;
    }

    // Cleanup
    if (spnGenerar) spnGenerar.classList.add('hidden');
    if (btnGen) btnGen.disabled = false;

    // Report result
    if (errors === 0) {
      alertSuccess('Completado', `Se generaron ${completed} informe(s) exitosamente`);
    } else if (completed > 0) {
      alertWarning('Completado con errores', `${completed} generados, ${errors} con error`);
    } else {
      alertError('Error', 'No se pudo generar ningún informe');
    }

    // Hide progress after a moment
    setTimeout(() => {
      if (progressContainer) progressContainer.classList.add('hidden');
      if (progressBar) progressBar.style.width = '0%';
      if (progressText) progressText.textContent = '0%';
    }, 3000);
  }
}

// Initialize module
const consultasModule = new ConsultasModule();
export default consultasModule;
