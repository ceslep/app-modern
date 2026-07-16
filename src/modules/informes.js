/**
 * Informes (Reports) Module
 *
 * La "Consulta rápida" carga los selects exactamente igual que
 * @consultas.js (servicio `filters` + cascada por sede→niveles→números).
 * El submit llama a @server/legacy/getEstudiantes.php mediante
 * `students.getByFilter()` (mapeado en el router a `students`).
 */
import { students } from '@services/students.js';
import { reports } from '@services/reports.js';
import { filters } from '@services/filters.js';
import { api } from '@services/api.js';
import { endpoint } from '@config/endpoints.js';
import { showModal, hideModal } from '@utils/modal.js';
import { alertSuccess, alertError, alertWarning, showLoading, closeLoading, showToast } from '@utils/alert.js';
import { showSkeleton, hideSkeleton } from '@components/skeleton.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';
import { formatDate, formatNumber } from '@utils/format.js';

class InformesModule {
  constructor() {
    this.currentFilter = { asignacion: '', nivel: '', numero: '', periodo: '' };
    this.currentStudents = [];
    this.currentYear = String(new Date().getFullYear());
    this._booted = false;
    this._grupos = [];

    // Marca el form como nuestro de forma SINCRÓNICA (al instanciar el
    // módulo) para que @filters.js lo vea en su boot() y NO duplique la
    // carga. Sin esto hay condición de carrera: filters.js corre su
    // listener de `app:authenticated` antes que el de informes.js porque
    // está importado antes en main.js, y al no encontrar el flag carga
    // los selects. Luego informes.js los sobreescribe.
    const form = document.getElementById('frmConsultar');
    if (form) form.dataset.loadedBy = 'informes';

    this.init();
  }

  init() {
    // Form submission — hits @server/legacy/getEstudiantes.php via the
    // router (`students` → `getEstudiantes.php`).
    const form = $('frmConsultar');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.queryGroup();
      });
    }

    // Student selection (delegated)
    delegate($('seccionInformes'), 'click', '.btn-student', (e, target) => {
      const studentId = target.dataset.student;
      if (studentId) this.viewStudentReport(studentId);
    });

    // Load the form when the user authenticates
    document.addEventListener('app:authenticated', () => this.boot());
  }

  /**
   * Carga inicial del formulario. Usa el mismo servicio `filters` que
   * @consultas.js para que ambos formularios compartan la fuente de datos.
   */
  async boot() {
    if (this._booted) return;
    const form = $('frmConsultar');
    if (!form) return;

    // Doble seguridad: si el form ya tiene options cargados (por
    // filters.js o HMR), no recargar.
    const yearEl = $('year');
    if (yearEl && yearEl.options.length > 1) {
      this._booted = true;
      form.dataset.loadedBy = 'informes';
      return;
    }

    this._booted = true;
    form.dataset.loadedBy = 'informes';

    await this.setupCascadingSelects();
  }

  /**
   * Cascada: año → sede → nivel → número → período
   * Idéntico al patrón usado por @consultas.js.
   *
   * Los endpoints legacy (@server/legacy/getYearsData.php,
   * getasignacion.php, getPeriodos.php) devuelven formatos distintos al
   * moderno ({value,label}). Esta función normaliza ambos formatos.
   */
  async setupCascadingSelects() {
    const yearEl = $('year');
    const sedeEl = $('asignacion');
    const nivelEl = $('nivel');
    const numEl = $('numero');
    const periodoEl = $('periodo');

    if (!yearEl && !sedeEl) return;

    // Años
    try {
      const res = await filters.getYears();
      // legacy: [{year:"2024"}]   moderno: {data:[{value,label}]}
      const years = Array.isArray(res) ? res : (res?.data || []);
      let html = '<option value="">Seleccione...</option>';
      years.forEach((y) => {
        const value = y.value || y.year || '';
        const label = y.label || y.year || '';
        if (!value) return;
        const sel = String(value) === String(this.currentYear) ? ' selected' : '';
        html += `<option value="${escapeHtml(value)}"${sel}>${escapeHtml(label)}</option>`;
      });
      yearEl.innerHTML = html;
    } catch {
      yearEl.innerHTML = '<option value="">Error al cargar años</option>';
    }

    // Sedes
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

    // Períodos
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

    // Reset dependientes
    if (nivelEl) nivelEl.innerHTML = '<option value="">Seleccione sede primero</option>';
    if (numEl) numEl.innerHTML = '<option value="">Seleccione nivel primero</option>';

    // Sede change → load niveles
    if (sedeEl) {
      sedeEl.addEventListener('change', async () => {
        await this.onSedeChange(sedeEl.value, yearEl?.value, nivelEl, numEl);
      });
    }

    // Nivel change → filter numeros
    if (nivelEl) {
      nivelEl.addEventListener('change', () => {
        this.onNivelChange(nivelEl.value, numEl);
      });
    }
  }

  async onSedeChange(sede, year, nivelEl, numEl) {
    if (!nivelEl || !numEl) return;
    if (!sede) {
      nivelEl.innerHTML = '<option value="">Seleccione sede primero</option>';
      numEl.innerHTML = '<option value="">Seleccione nivel primero</option>';
      this._grupos = [];
      return;
    }
    nivelEl.innerHTML = '<option value="">Cargando...</option>';
    numEl.innerHTML = '<option value="">Seleccione nivel primero</option>';

    try {
      // getNiveles envía {asignacion, year} — getNiveles.php espera $_GET['asignacion']
      const res = await filters.getNiveles(sede, year || this.currentYear);
      // legacy getNiveles.php → [{nivel: 1}]  moderno → {data:[{nivel:1}]}
      const grupos = Array.isArray(res) ? res : (res?.data || []);
      this._grupos = grupos;
      const niveles = [...new Set(grupos.map((g) => g.nivel ?? g.value).filter((v) => v != null))].sort((a, b) => a - b);
      let html = '<option value="">Seleccione...</option>';
      niveles.forEach((n) => {
        html += `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`;
      });
      nivelEl.innerHTML = html;
    } catch (err) {
      nivelEl.innerHTML = '<option value="">Error al cargar grados</option>';
      alertError('Error', 'No se pudieron cargar los niveles: ' + err.message);
    }
  }

  onNivelChange(nivel, numEl) {
    if (!numEl) return;
    if (!nivel) {
      numEl.innerHTML = '<option value="">Seleccione nivel primero</option>';
      return;
    }
    const sede = $('asignacion')?.value;
    const year = $('year')?.value;
    this.loadNumeros(sede, nivel, year, numEl);
  }

  async loadNumeros(sede, nivel, year, numEl) {
    if (!numEl) return;
    numEl.innerHTML = '<option value="">Cargando...</option>';
    try {
      // getNumeros.php es POST y no está mapeado en el router; lo llamamos directo.
      const res = await fetch(endpoint('/getNumeros.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asignacion: sede,
          nivel,
          year: year || this.currentYear,
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
      numEl.innerHTML = html;
    } catch (err) {
      numEl.innerHTML = '<option value="">Error al cargar grupos</option>';
      alertError('Error', 'No se pudieron cargar los números: ' + err.message);
    }
  }

  /**
   * Submit handler — llama a @server/legacy/getEstudiantes.php.
   * Mismo flujo que @consultas.js (students.getByFilter → getEstudiantes.php).
   */
  async queryGroup() {
    const asignacion = $('asignacion')?.value;
    const nivel = $('nivel')?.value;
    const numero = $('numero')?.value;
    const periodo = $('periodo')?.value;

    if (!asignacion || !nivel || !numero) {
      alertWarning('Complete todos los filtros');
      return;
    }

    this.currentFilter = { asignacion, nivel, numero, periodo };

    showSkeleton('contenedorInformes', { variant: 'list', count: 6 });
    try {
      // students.getByFilter → api.get('students', …) → router → getEstudiantes.php
      const response = await students.getByFilter(asignacion, nivel, numero);
      this.currentStudents = response.data || [];

      // IMPORTANTE: ocultar el skeleton ANTES de renderizar, porque
      // hideSkeleton() hace container.innerHTML = '' y borraría los
      // estudiantes recién renderizados.
      hideSkeleton('contenedorInformes');
      this.renderStudentList();
    } catch (error) {
      hideSkeleton('contenedorInformes');
      alertError('Error', error.message);
    }
  }

  renderStudentList() {
    const container = $('contenedorInformes');
    if (!container) return;

    if (this.currentStudents.length === 0) {
      container.innerHTML = `
        <div class="text-center p-4 text-gray-400">
          <i class="bi bi-inbox" style="font-size: 3rem;"></i>
          <p class="mt-2">No se encontraron estudiantes para los filtros seleccionados</p>
        </div>
      `;
      return;
    }

    const total = this.currentStudents.length;
    const nivel = $('nivel')?.value || '';
    const numero = $('numero')?.value || '';

    container.innerHTML = `
      <div class="glass-card overflow-hidden">
        <!-- Toolbar -->
        <div class="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-white">
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer select-none">
              <input type="checkbox" id="chkSeleccionarTodos"
                     class="w-4 h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391] cursor-pointer">
              <span>Seleccionar todos</span>
            </label>
            <span class="text-xs text-gray-400">
              <span id="seleccionCountInfo">0</span> de ${total} seleccionados
              · ${nivel}-${numero}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button id="btnGenerarPdfs"
                    disabled
                    class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700
                           text-white text-xs font-medium rounded-lg transition-all opacity-50 cursor-not-allowed">
              <i class="bi bi-file-earmark-pdf-fill"></i>
              Generar PDFs
              <span class="spinner-border spinner-border-sm hidden" id="spnGenerarPdfs"></span>
            </button>
            <button id="btnGenerarInformes"
                    disabled
                    class="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700
                           text-white text-xs font-medium rounded-lg transition-all opacity-50 cursor-not-allowed">
              <i class="bi bi-file-earmark-arrow-down"></i>
              Generar Informes
              <span class="spinner-border spinner-border-sm hidden" id="spnGenerarInformes"></span>
            </button>
          </div>
        </div>

        <!-- Barra de progreso (oculta hasta iniciar generación) -->
        <div id="progressContainer" class="hidden px-4 py-3 bg-gradient-to-r from-[#543391]/5 to-emerald-50/40 border-b border-gray-100">
          <div class="flex items-center justify-between text-[11px] mb-1.5">
            <span class="flex items-center gap-1.5 text-gray-600">
              <i class="bi bi-arrow-repeat animate-spin text-[#543391]"></i>
              <span id="progressLabel">Generando informes...</span>
            </span>
            <span id="progressText" class="font-mono text-[#543391] font-semibold">0/0 (0%)</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
            <div id="progressBar"
                 class="bg-gradient-to-r from-[#543391] via-purple-500 to-emerald-500 h-2 rounded-full transition-all duration-300 ease-out"
                 style="width:0%"></div>
          </div>
        </div>

        <!-- Grid de cards -->
        <div class="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          ${this.currentStudents.map((s, i) => {
            const estado = s.estado;
            const activo = estado === 'A' || estado === 'Activo' || estado == null;
            const estadoBadge = activo
              ? '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><i class="bi bi-check-circle-fill"></i> Activo</span>'
              : '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-50 text-red-700 border border-red-200"><i class="bi bi-x-circle-fill"></i> Inactivo</span>';

            return `
              <div class="check-estudiante-wrapper relative bg-white border border-gray-200 rounded-xl p-2.5 hover:border-[#543391]/40 hover:shadow-sm transition-all"
                   data-index="${i}">
                <div class="flex items-start gap-2">
                  <input type="checkbox"
                         class="check-estudiante mt-0.5 w-4 h-4 rounded border-gray-300 text-[#543391]
                                focus:ring-[#543391] cursor-pointer flex-shrink-0"
                         data-index="${i}"
                         data-id="${escapeHtml(s.estudiante || '')}"
                         aria-label="Seleccionar ${escapeHtml(s.nombres || '')}">
                  <div class="flex-1 min-w-0">
                    <div class="text-[10px] text-gray-400 font-mono">${i + 1}</div>
                    <div class="text-sm font-semibold text-gray-800 truncate" title="${escapeHtml(s.nombres || '')}">
                      ${escapeHtml(s.nombres || '')}
                    </div>
                    <div class="text-[11px] text-gray-500 mt-0.5">Cód. ${escapeHtml(String(s.codigo || ''))}</div>
                    <div class="mt-1.5">${estadoBadge}</div>
                  </div>
                </div>
                <div class="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                  <button type="button"
                          class="ver-informe-individual flex-1 inline-flex items-center justify-center gap-1 px-2 py-1
                                 bg-[#543391]/10 hover:bg-[#543391]/20 text-[#543391] text-[11px] font-medium
                                 rounded-md transition-colors"
                          data-id="${escapeHtml(s.estudiante || '')}"
                          data-nombres="${escapeHtml(s.nombres || '')}"
                          title="Ver informe académico">
                    <i class="bi bi-file-earmark-text"></i> Informe
                  </button>
                  <button type="button"
                          class="ver-pdf-individual inline-flex items-center justify-center gap-1 px-2 py-1
                                 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-medium
                                 rounded-md transition-colors"
                          data-id="${escapeHtml(s.estudiante || '')}"
                          data-nombres="${escapeHtml(s.nombres || '')}"
                          title="Descargar PDF individual">
                    <i class="bi bi-file-earmark-pdf"></i> PDF
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Footer -->
        <div class="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
          <span>${total} registro(s)</span>
          <span id="seleccionCount">0 seleccionados</span>
        </div>
      </div>
    `;

    this._bindStudentCardEvents();
  }

  /**
   * Vincula los eventos de los checkboxes, botones individuales
   * y "seleccionar todos" / "generar informes" en bloque.
   */
  _bindStudentCardEvents() {
    const container = $('contenedorInformes');
    if (!container) return;

    // Checkbox individual → actualiza contador y estado del botón generar
    container.addEventListener('change', (e) => {
      const t = e.target;
      if (t.classList && t.classList.contains('check-estudiante')) {
        this._updateSelection();
      } else if (t.id === 'chkSeleccionarTodos') {
        const checked = t.checked;
        container.querySelectorAll('.check-estudiante').forEach((cb) => {
          cb.checked = checked;
        });
        this._updateSelection();
      }
    });

    // Botones "Informe" individual — usa data-index del wrapper para
    // recuperar el estudiante completo de this.currentStudents y armar
    // el payload de 9 campos que requiere generaReporte.php
    container.querySelectorAll('.ver-informe-individual').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('.check-estudiante-wrapper');
        const idx = card ? parseInt(card.dataset.index, 10) : -1;
        const est = idx >= 0 ? this.currentStudents[idx] : null;
        if (est) this.viewStudentReport(est);
      });
    });

    // Botones "PDF" individual
    container.querySelectorAll('.ver-pdf-individual').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('.check-estudiante-wrapper');
        const idx = card ? parseInt(card.dataset.index, 10) : -1;
        const est = idx >= 0 ? this.currentStudents[idx] : null;
        if (est) this.generarPdfIndividual(est);
      });
    });

    // Botón "Generar Informes" (XLSX) - bloque
    const btnGenerar = $('btnGenerarInformes');
    if (btnGenerar) {
      btnGenerar.addEventListener('click', (e) => {
        e.preventDefault();
        this.generarReportesSeleccionados();
      });
    }

    // Botón "Generar PDFs" (PDF) - bloque
    const btnGenerarPdfs = $('btnGenerarPdfs');
    if (btnGenerarPdfs) {
      btnGenerarPdfs.addEventListener('click', (e) => {
        e.preventDefault();
        this.generarPdfsSeleccionados();
      });
    }
  }

  _updateSelection() {
    const container = $('contenedorInformes');
    if (!container) return;
    const checks = container.querySelectorAll('.check-estudiante');
    const total = checks.length;
    const selected = Array.from(checks).filter((cb) => cb.checked).length;

    const infoEl = $('seleccionCountInfo');
    if (infoEl) infoEl.textContent = String(selected);
    const footerEl = $('seleccionCount');
    if (footerEl) footerEl.textContent = `${selected} seleccionados`;

    const btnGen = $('btnGenerarInformes');
    const btnPdf = $('btnGenerarPdfs');
    const chkAll = $('chkSeleccionarTodos');
    const setEnabled = (btn) => {
      if (!btn) return;
      btn.disabled = selected === 0;
      btn.classList.toggle('opacity-50', selected === 0);
      btn.classList.toggle('cursor-not-allowed', selected === 0);
    };
    setEnabled(btnGen);
    setEnabled(btnPdf);
    if (chkAll) {
      chkAll.checked = selected === total && total > 0;
      chkAll.indeterminate = selected > 0 && selected < total;
    }
  }

  /**
   * Genera los informes de los estudiantes seleccionados en bloque.
   * Llama a reports/report-card por cada uno (igual que @consultas.js).
   */
  /**
   * Genera los informes de TODOS los estudiantes seleccionados con
   * barra de progreso en tiempo real. Marca cada card con ring
   * verde al terminar y muestra resumen al final.
   */
  async generarReportesSeleccionados() {
    const container = $('contenedorInformes');
    if (!container) return;
    const checks = Array.from(container.querySelectorAll('.check-estudiante:checked'));
    if (checks.length === 0) {
      alertWarning('Seleccione al menos un estudiante');
      return;
    }

    const total   = checks.length;
    const reportUrl = '/app-modern/server/router.php?__api=reports/report-card';

    // Bloquear controles durante el proceso
    const btnGen = $('btnGenerarInformes');
    const spn = $('spnGenerarInformes');
    const progressContainer = $('progressContainer');
    const progressBar = $('progressBar');
    const progressText = $('progressText');
    if (btnGen) btnGen.disabled = true;
    if (spn) spn.classList.remove('hidden');
    if (progressContainer) progressContainer.classList.remove('hidden');

    let ok = 0;
    let fail = 0;
    let current = '';
    const errores = [];
    const startTime = performance.now();

    // Helper para actualizar la UI de progreso
    const updateProgress = () => {
      const done = ok + fail;
      const pct = Math.round((done / total) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressText) {
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
        progressText.textContent = `${done}/${total} (${pct}%) · ${ok}✓/${fail}✗ · ${elapsed}s`;
      }
    };
    updateProgress();

    // Procesar en serie para no saturar el server
    for (const cb of checks) {
      const idx = parseInt(cb.dataset.index, 10);
      const est = this.currentStudents[idx];
      if (!est) { fail++; updateProgress(); continue; }

      current = est.nombres || `Estudiante ${idx + 1}`;
      const progressLabel = $('progressLabel');
      if (progressLabel) progressLabel.textContent = `Generando: ${current}`;
      updateProgress();

      const payload = {
        ...this.buildReportPayload(est),
        puesto_ie: '',
        puesto_grupo: '',
        promedio: '',
        createFolder: 'S',
      };

      try {
        const res = await fetch(reportUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.estado === 'ok' || result.success) {
          ok++;
          // Marcar card con ring verde + check
          const card = cb.closest('.check-estudiante-wrapper');
          if (card) {
            card.classList.add('ring-2', 'ring-emerald-400', 'border-emerald-300', 'bg-emerald-50/30');
            card.dataset.generated = '1';
            // Reemplazar el checkbox con un check verde
            const check = card.querySelector('.check-estudiante');
            if (check) {
              check.disabled = true;
              check.nextElementSibling?.querySelector?.('.text-emerald-700') || null;
            }
          }
        } else {
          fail++;
          errores.push({ estudiante: est.nombres, msg: result.mensaje || result.error || 'Error' });
          const card = cb.closest('.check-estudiante-wrapper');
          if (card) {
            card.classList.add('ring-2', 'ring-red-300', 'border-red-300', 'bg-red-50/30');
          }
        }
      } catch (err) {
        fail++;
        errores.push({ estudiante: est.nombres, msg: err.message || 'Error de red' });
        const card = cb.closest('.check-estudiante-wrapper');
        if (card) {
          card.classList.add('ring-2', 'ring-red-300', 'border-red-300', 'bg-red-50/30');
        }
      }
      updateProgress();
      // Yield al browser para que pinte la UI
      await new Promise((r) => setTimeout(r, 0));
    }

    current = '';
    const progressLabel = $('progressLabel');
    if (progressLabel) progressLabel.textContent = 'Generación completada';
    updateProgress();

    // Restaurar controles
    if (spn) spn.classList.add('hidden');
    if (btnGen) btnGen.disabled = false;
    if (progressContainer) {
      // Mantener la barra visible 1.5s para que se vea el 100% antes de alertar
      setTimeout(() => progressContainer.classList.add('hidden'), 1500);
    }

    // Resumen final
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    const titulo = `Generación de informes — ${elapsed}s`;
    if (fail === 0) {
      alertSuccess(titulo, `${ok} de ${total} informes generados correctamente.`);
    } else if (ok > 0) {
      const detalle = errores.slice(0, 3).map((e) => `• ${escapeHtml(e.estudiante)}: ${escapeHtml(e.msg)}`).join('\n');
      const extra = errores.length > 3 ? `\n... y ${errores.length - 3} más` : '';
      alertWarning(titulo, `${ok} generados, ${fail} con error.\n\n${detalle}${extra}`);
    } else {
      const detalle = errores.slice(0, 3).map((e) => `• ${escapeHtml(e.estudiante)}: ${escapeHtml(e.msg)}`).join('\n');
      alertError(titulo, `No se pudo generar ningún informe.\n\n${detalle}`);
    }

    this._updateSelection();
  }

  /**
   * Genera los PDFs de TODOS los estudiantes seleccionados con
   * barra de progreso en tiempo real. Cada card se marca con ring
   * rojo al terminar y muestra resumen al final.
   */
  async generarPdfsSeleccionados() {
    const container = $('contenedorInformes');
    if (!container) return;
    const checks = Array.from(container.querySelectorAll('.check-estudiante:checked'));
    if (checks.length === 0) {
      alertWarning('Seleccione al menos un estudiante');
      return;
    }

    const total    = checks.length;
    const reportUrl = '/app-modern/server/router.php?__api=reports%2Freport-pdf';

    // Bloquear controles durante el proceso
    const btnPdf = $('btnGenerarPdfs');
    const btnXlsx = $('btnGenerarInformes');
    const spn = $('spnGenerarPdfs');
    const progressContainer = $('progressContainer');
    const progressBar = $('progressBar');
    const progressText = $('progressText');
    if (btnPdf)  btnPdf.disabled = true;
    if (btnXlsx) btnXlsx.disabled = true;
    if (spn) spn.classList.remove('hidden');
    if (progressContainer) progressContainer.classList.remove('hidden');

    let ok = 0;
    let fail = 0;
    let current = '';
    const errores = [];
    const startTime = performance.now();

    // Helper para actualizar la UI de progreso
    const updateProgress = () => {
      const done = ok + fail;
      const pct = Math.round((done / total) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressText) {
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
        progressText.textContent = `${done}/${total} (${pct}%) · ${ok}✓/${fail}✗ · ${elapsed}s`;
      }
    };
    updateProgress();

    // Procesar en serie
    for (const cb of checks) {
      const idx = parseInt(cb.dataset.index, 10);
      const est = this.currentStudents[idx];
      if (!est) { fail++; updateProgress(); continue; }

      current = est.nombres || `Estudiante ${idx + 1}`;
      const progressLabel = $('progressLabel');
      if (progressLabel) progressLabel.textContent = `Generando PDF: ${current}`;
      updateProgress();

      const payload = {
        ...this.buildReportPayload(est),
        createFolder: 'S',
        format: 'pdf',
      };

      try {
        const res = await fetch(reportUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.estado === 'ok' || result.success) {
          ok++;
          const card = cb.closest('.check-estudiante-wrapper');
          if (card) {
            card.classList.add('ring-2', 'ring-red-400', 'border-red-300', 'bg-red-50/30');
            card.dataset.pdfGenerated = '1';
          }
        } else {
          fail++;
          errores.push({ estudiante: est.nombres, msg: result.mensaje || result.error || 'Error' });
          const card = cb.closest('.check-estudiante-wrapper');
          if (card) {
            card.classList.add('ring-2', 'ring-red-300', 'border-red-300', 'bg-red-50/30');
          }
        }
      } catch (err) {
        fail++;
        errores.push({ estudiante: est.nombres, msg: err.message || 'Error de red' });
        const card = cb.closest('.check-estudiante-wrapper');
        if (card) {
          card.classList.add('ring-2', 'ring-red-300', 'border-red-300', 'bg-red-50/30');
        }
      }
      updateProgress();
      // Yield al browser para que pinte la UI
      await new Promise((r) => setTimeout(r, 0));
    }

    current = '';
    const progressLabel = $('progressLabel');
    if (progressLabel) progressLabel.textContent = 'Generación de PDFs completada';
    updateProgress();

    // Restaurar controles
    if (spn) spn.classList.add('hidden');
    if (progressContainer) {
      setTimeout(() => progressContainer.classList.add('hidden'), 1500);
    }

    // Resumen final
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    const titulo = `Generación de PDFs — ${elapsed}s`;
    if (fail === 0) {
      alertSuccess(titulo, `${ok} de ${total} PDFs generados correctamente.`);
    } else if (ok > 0) {
      const detalle = errores.slice(0, 3).map((e) => `• ${escapeHtml(e.estudiante)}: ${escapeHtml(e.msg)}`).join('\n');
      const extra = errores.length > 3 ? `\n... y ${errores.length - 3} más` : '';
      alertWarning(titulo, `${ok} generados, ${fail} con error.\n\n${detalle}${extra}`);
    } else {
      const detalle = errores.slice(0, 3).map((e) => `• ${escapeHtml(e.estudiante)}: ${escapeHtml(e.msg)}`).join('\n');
      alertError(titulo, `No se pudo generar ningún PDF.\n\n${detalle}`);
    }

    this._updateSelection();
  }

  /**
   * Construye el payload completo (9 campos) que requiere
   * @server/legacy/generaReporte.php. Mezcla los datos del estudiante
   * con los valores actuales del formulario.
   */
  buildReportPayload(est) {
    const sedeEl    = $('asignacion');
    const nivelSel  = $('nivel')?.value || '';
    const numeroSel = $('numero')?.value || '';
    const periodo   = $('periodo')?.value || this.currentFilter.periodo || '';
    const year      = $('year')?.value || String(new Date().getFullYear());
    const establecimiento = sedeEl ? (sedeEl.options[sedeEl.selectedIndex]?.text || '') : '';

    return {
      codigo:           String(est.codigo || ''),
      estudiante:       String(est.estudiante || ''),
      nombres:          String(est.nombres || ''),
      nivel:            String(est.nivel ?? nivelSel ?? ''),
      numero:           String(est.numero ?? numeroSel ?? ''),
      asignacion:       String(est.asignacion ?? sedeEl?.value ?? ''),
      establecimiento,
      periodo,
      year:             String(year),
    };
  }

  /**
   * Genera el PDF individual del estudiante (sin abrir vista).
   * Usa reports/report-pdf → generaReportePDF.php (Mpdf + HTML/CSS,
   * pixel-perfect en comparación con la conversión PhpSpreadsheet).
   * Acepta el mismo payload de 9 campos que generaReporte.php.
   */
  async generarPdfIndividual(est) {
    if (!est || !est.estudiante) {
      alertError('Error', 'Estudiante no encontrado');
      return;
    }
    const Swal = (await import('sweetalert2')).default;

    const payload = {
      ...this.buildReportPayload(est),
      puesto_ie: '',
      puesto_grupo: '',
      promedio: '',
      createFolder: 'S',
      format: 'pdf',
    };

    showLoading('Generando PDF…');
    try {
      // Endpoint dedicado a PDF (generaReportePDF.php) — usa Mpdf + HTML/CSS
      // en lugar de la conversión PhpSpreadsheet→Mpdf del endpoint /report-card.
      const res = await fetch('/app-modern/server/router.php?__api=reports%2Freport-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      closeLoading();
      if ((result.estado === 'ok' || result.success) && result.href) {
        // Ventana informativa de generación completada con opciones
        Swal.fire({
          icon: 'success',
          title: 'PDF generado correctamente',
          html: `
            <div class="text-left text-sm space-y-1.5">
              <p>El informe de <strong>${escapeHtml(est.nombres || '')}</strong> se generó correctamente.</p>
              <p class="text-gray-500 text-xs mt-2">
                <i class="bi bi-folder2-open"></i>
                <code class="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">${escapeHtml(result.folder || '')}</code>
              </p>
            </div>
          `,
          iconColor: '#10b981',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: '<i class="bi bi-file-earmark-pdf"></i> Abrir PDF',
          denyButtonText: '<i class="bi bi-folder2"></i> Carpeta',
          cancelButtonText: 'Cerrar',
          confirmButtonColor: '#543391',
          denyButtonColor: '#6b7280',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-lg text-sm',
            denyButton: 'rounded-lg text-sm',
            cancelButton: 'rounded-lg text-sm',
          },
        }).then((swalResult) => {
          if (swalResult.isConfirmed) {
            window.open(result.href, '_blank', 'noopener');
          } else if (swalResult.isDenied) {
            // Ir a la carpeta padre
            const folder = result.href.substring(0, result.href.lastIndexOf('/'));
            if (folder) window.open(folder, '_blank', 'noopener');
          }
        });
      } else {
        alertError('Error', result.mensaje || result.error || 'No se pudo generar el PDF');
      }
    } catch (err) {
      closeLoading();
      alertError('Error', err.message || 'No se pudo generar el PDF');
    }
  }

  /**
   * Muestra el informe individual en un modal con visor.
   * Envía el payload de 9 campos a generaReporte.php y muestra los
   * `datoss` como tabla, más un botón para abrir el XLSX.
   */
  async viewStudentReport(est) {
    if (!est || !est.estudiante) return;

    showLoading('Generando informe...');
    try {
      const payload = this.buildReportPayload(est);
      const response = await api.post('reports/report-card', payload);
      closeLoading();

      if (!response || (response.estado && response.estado !== 'ok' && !response.success)) {
        alertError('Error', response?.mensaje || response?.error || 'Sin datos');
        return;
      }

      const datoss  = response.datoss || response.data?.datoss || [];
      const href    = response.href || '';
      const filename = response.filename || href;
      const periodoLabel = payload.periodo === 'CINCO' ? 'FINAL' : payload.periodo;
      const promedio = response.data?.promedio ?? payload.promedio ?? '';
      const puesto   = response.data?.puesto_grupo ?? response.data?.puesto ?? '';

      // Tabla de asignaturas a partir de datoss
      const rowsHtml = datoss.length
        ? datoss.map((d, i) => `
            <tr class="${i % 2 ? 'bg-gray-50/40' : 'bg-white'} hover:bg-[#543391]/[0.04]">
              <td class="px-3 py-1.5 text-xs text-gray-500 font-mono">${i + 1}</td>
              <td class="px-3 py-1.5 text-sm font-medium text-gray-800">${escapeHtml(d.asig || '')}</td>
              <td class="px-3 py-1.5 text-center">
                <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold
                             ${parseFloat(d.val) >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                               parseFloat(d.val) >= 3 ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                                 'bg-red-50 text-red-700 border border-red-200'}">
                  ${escapeHtml(String(d.des || ''))}
                </span>
              </td>
              <td class="px-3 py-1.5 text-center text-sm font-bold text-[#543391]">${escapeHtml(String(d.val || ''))}</td>
              <td class="px-3 py-1.5 text-center text-xs text-gray-500">${escapeHtml(String(d.porc || ''))}%</td>
              <td class="px-3 py-1.5 text-center text-xs text-gray-400 font-mono">${escapeHtml(String(d.fila || ''))}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="6" class="text-center py-8 text-gray-400 text-sm">
             <i class="bi bi-inbox text-3xl block mb-2"></i>
             No se encontraron notas para este estudiante en el período seleccionado.
           </td></tr>`;

      const modalHtml = `
        <div class="relative z-[1060] w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#543391]/5 to-transparent">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-lg bg-[#543391] text-white flex items-center justify-center shrink-0">
                <i class="bi bi-file-earmark-spreadsheet text-xl"></i>
              </div>
              <div class="min-w-0">
                <h5 class="text-base font-semibold text-gray-800 truncate">${escapeHtml(est.nombres || '')}</h5>
                <p class="text-[11px] text-gray-500 mt-0.5">
                  Cód. ${escapeHtml(String(payload.codigo || ''))} ·
                  <span class="font-medium text-[#543391]">${escapeHtml(payload.nivel)}-${escapeHtml(payload.numero)}</span> ·
                  ${escapeHtml(payload.establecimiento || '')} ·
                  ${escapeHtml(String(payload.year || ''))} ·
                  Período <span class="font-semibold">${escapeHtml(periodoLabel || '')}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <a href="${escapeHtml(href)}" target="_blank" rel="noopener"
                 class="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors ${href ? '' : 'pointer-events-none opacity-50'}">
                <i class="bi bi-download"></i> Abrir XLSX
              </a>
              <button data-modal-dismiss="modalInforme" class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <i class="bi bi-x-lg text-sm"></i>
              </button>
            </div>
          </div>
          <div class="px-5 py-3 bg-gray-50/50 border-b border-gray-100 grid grid-cols-3 gap-3 text-xs">
            <div class="flex items-center gap-2">
              <i class="bi bi-bar-chart text-[#543391]"></i>
              <span class="text-gray-500">Promedio:</span>
              <span class="font-bold text-gray-800">${escapeHtml(String(promedio || 'N/A'))}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="bi bi-trophy text-[#543391]"></i>
              <span class="text-gray-500">Puesto:</span>
              <span class="font-bold text-gray-800">${escapeHtml(String(puesto || 'N/A'))}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="bi bi-list-check text-[#543391]"></i>
              <span class="text-gray-500">Asignaturas:</span>
              <span class="font-bold text-gray-800">${datoss.length}</span>
            </div>
          </div>
          <div class="flex-1 overflow-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 sticky top-0 z-10">
                <tr class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th class="px-3 py-2.5 text-left w-10">#</th>
                  <th class="px-3 py-2.5 text-left">Asignatura</th>
                  <th class="px-3 py-2.5 text-center w-40">Desempeño</th>
                  <th class="px-3 py-2.5 text-center w-20">Nota</th>
                  <th class="px-3 py-2.5 text-center w-20">%</th>
                  <th class="px-3 py-2.5 text-center w-16">Fila</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">${rowsHtml}</tbody>
            </table>
          </div>
          <div class="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[11px] text-gray-500">
            <span><i class="bi bi-file-earmark"></i> Archivo: <code class="text-[#543391]">${escapeHtml(filename || '')}</code></span>
            <button data-modal-dismiss="modalInforme" class="text-gray-500 hover:text-gray-800">Cerrar</button>
          </div>
        </div>`;

      // Modal manejado manualmente: backdrop + listeners directos en los
      // botones [data-modal-dismiss]. No dependemos de initModals/showModal
      // porque el listener global de dismiss a veces no se registra.
      const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        modal.style.display = 'none';
        const bd = document.getElementById('modalInformeBackdrop');
        if (bd) bd.remove();
        document.body.style.overflow = '';
      };

      let modal = $('modalInforme');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalInforme';
        modal.className = 'hidden';
        modal.style.cssText = 'position:fixed;inset:0;z-index:1056;display:none;align-items:center;justify-content:center;padding:1rem;';
        document.body.appendChild(modal);
      }
      modal.innerHTML = `<div id="modalInformeBackdrop" data-modal-dismiss="modalInforme"
        style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1055;"></div>${modalHtml}`;
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';

      // Listeners directos para cierre (no dependemos de initModals)
      modal.querySelectorAll('[data-modal-dismiss="modalInforme"]').forEach((btn) => {
        btn.onclick = (e) => { e.preventDefault(); closeModal(); };
      });
      // Escape para cerrar
      const onKey = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); } };
      document.addEventListener('keydown', onKey);
    } catch (error) {
      closeLoading();
      alertError('Error', error.message);
    }
  }

  renderReport(data) {
    const container = $('contenedorInformeDetalle');
    if (!container) return;

    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h5 class="text-sm font-semibold text-gray-700">Informe de ${escapeHtml(data.studentName)}</h5>
          <button class="px-2 py-1 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition-colors" onclick="window.print()">
            <i class="bi bi-printer"></i> Imprimir
          </button>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <strong>Código:</strong> ${escapeHtml(data.codigo || '')}<br>
              <strong>Grado:</strong> ${escapeHtml(data.grado || '')}<br>
              <strong>Año:</strong> ${data.year || ''}
            </div>
            <div>
              <strong>Periodo:</strong> ${escapeHtml(data.periodo || '')}<br>
              <strong>Promedio General:</strong> ${formatNumber(data.promedio)}<br>
              <strong>Puesto:</strong> ${data.puesto || ''}
            </div>
          </div>
          <div id="reportContent">
            ${data.html || '<p class="text-gray-400">Sin datos disponibles</p>'}
          </div>
        </div>
      </div>
    `;
  }
}

// Initialize module
new InformesModule();
