import { escapeHtml, $ } from '@utils/dom.js';
import { alertError, alertWarning } from '@utils/alert.js';
import { endpoint } from '@config/endpoints.js';
import { showEmptyState } from '@components/empty-state.js';

const SELECT_STYLE = `w-full px-2 sm:px-3 py-1.5 sm:py-2 pr-6 sm:pr-8 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-white appearance-none focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-[length:12px] sm:bg-[length:14px] bg-[right_8px_center] sm:bg-[right_10px_center] bg-no-repeat`;

class ConcentradorModule {
  constructor() {
    this.currentYear = String(new Date().getFullYear());
    this.renderForm();
    this.initEvents();
  }

  renderForm() {
    const section = $('seccionConcentradorNotas');
    if (!section) return;

    const placeholder = section.querySelector('.glass-card');
    if (placeholder) placeholder.remove();

    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;width:100%;max-width:100%;min-width:0;overflow-x:hidden;';
    div.innerHTML = `
      <div class="glass-card p-3 sm:p-4 mb-3 sm:mb-4 min-w-0 max-w-full">
        <form id="frmConcentradorNotass">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <div>
              <label class="block text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Año</label>
              <select id="yearinConc" class="${SELECT_STYLE}"></select>
            </div>
            <div>
              <label class="block text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Asignación</label>
              <select id="asignacionNotass" name="Asignacion" class="${SELECT_STYLE}">
                <option value="">Seleccione...</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nivel</label>
              <select id="nivelNotass" name="nivel" class="${SELECT_STYLE}">
                <option value="">Seleccione...</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Número</label>
              <select id="numeroNotass" name="numero" class="${SELECT_STYLE}">
                <option value="">Seleccione...</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Período</label>
              <select id="periodosNotass" name="periodo" class="${SELECT_STYLE}">
                <option value="">Seleccione...</option>
              </select>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-3 sm:mt-6 pt-2 sm:pt-4 border-t border-gray-100">
            <button type="submit" class="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-[#543391] hover:bg-[#432977] text-white text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap flex-1 sm:flex-none">
              <i class="bi bi-card-list text-xs sm:text-sm"></i> Ver
            </button>
            <button type="button" id="btn-submit-consnotas" class="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap flex-1 sm:flex-none">
              <i class="bi bi-exclamation-triangle text-xs sm:text-sm"></i> Nota&lt;3
            </button>
          </div>
          <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-1.5 sm:gap-4 mt-2 sm:mt-3">
            <div class="flex items-center gap-2 sm:gap-4 flex-wrap">
              <label class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 cursor-pointer py-0.5">
                <input type="checkbox" id="switchAreas" class="w-3 h-3 sm:w-4 sm:h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391]">
                <span class="text-[11px] sm:text-sm">Áreas</span>
              </label>
              <label class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 cursor-pointer py-0.5">
                <input type="checkbox" id="switchActivos" checked class="w-3 h-3 sm:w-4 sm:h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391]">
                <span class="text-[11px] sm:text-sm">Activos</span>
              </label>
            </div>
            <div class="flex gap-1.5 sm:gap-2">
              <button type="button" id="btn-submit-concnotasd" class="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap">
                <i class="bi bi-download"></i> Descargar
              </button>
              <button type="button" id="btn-submit-concnotasd2" class="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap">
                <i class="bi bi-download"></i> Desc.Lista
              </button>
            </div>
          </div>
        </form>
      </div>
      <div class="glass-card p-3 sm:p-4 mb-3 sm:mb-4 overflow-x-auto min-w-0 max-w-full">
        <div id="contenedorConcentrador" class="min-w-0"></div>
      </div>
      <div id="contenedorConsolidado" class="hidden mt-4 min-w-0 max-w-full"></div>
    `;

    section.appendChild(div);
  }

  initEvents() {
    const sec = $('seccionConcentradorNotas');
    if (!sec) return;

    this._injectGridCSS();

    const asignEl = $('asignacionNotass');
    const nivelEl = $('nivelNotass');

    if (asignEl) {
      asignEl.addEventListener('change', () => {
        this.onAsignacionChange(asignEl.value);
      });
    }
    if (nivelEl) {
      nivelEl.addEventListener('change', () => {
        this.onNivelChange(asignEl?.value || '', nivelEl.value);
      });
    }

    const form = $('frmConcentradorNotass');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.onSubmit();
      });
    }

    sec.addEventListener('click', (e) => {
      const id = e.target.id || e.target.closest('[id]')?.id;
      if (id === 'btn-submit-consnotas') { this.onNotaMenosTres(); }
      else if (id === 'btn-submit-concnotasd') { this.onDescargar(); }
      else if (id === 'btn-submit-concnotasd2') { this.onDescargarLista(); }
    });

    this.loadYears();
    this.loadSedes();
    this.loadPeriods();
  }

  async loadYears() {
    const el = $('yearinConc');
    if (!el) return;
    let html = '';
    for (let y = parseInt(this.currentYear); y >= 2021; y--) {
      html += `<option value="${y}"${y === parseInt(this.currentYear) ? ' selected' : ''}>${y}</option>`;
    }
    el.innerHTML = html;
  }

  async loadSedes() {
    const el = $('asignacionNotass');
    if (!el) return;
    try {
      const res = await fetch(endpoint('/getasignacion.php'));
      const data = await res.json();
      el.innerHTML = '<option value="">Seleccione...</option>' +
        (data || []).map((s) => `<option value="${s.ind}">${escapeHtml(s.sede || s.nombre)}</option>`).join('');
    } catch {
      el.innerHTML = '<option value="">Seleccione...</option>';
    }
  }

  async loadPeriods() {
    const el = $('periodosNotass');
    if (!el) return;
    try {
      const res = await fetch(endpoint('/getPeriodos.php'));
      const data = await res.json();
      el.innerHTML = '<option value="">Seleccione...</option>' +
        (data || []).map((p) => {
          const sel = p.selected === 'selected' ? ' selected' : '';
          return `<option value="${p.periodo}"${sel}>${p.periodo}</option>`;
        }).join('');
    } catch {
      el.innerHTML = '<option value="">Seleccione...</option>' +
        'UNO,DOS,TRES,CUATRO,CINCO'.split(',').map((p) =>
          `<option value="${p}"${p === 'TRES' ? ' selected' : ''}>${p}</option>`
        ).join('');
    }
  }

  async onAsignacionChange(asignacion) {
    const nivelEl = $('nivelNotass');
    const numEl = $('numeroNotass');
    if (!nivelEl || !numEl) return;
    nivelEl.innerHTML = '<option value="">Seleccione...</option>';
    numEl.innerHTML = '<option value="">Seleccione...</option>';
    if (!asignacion) return;

    try {
      const res = await fetch(endpoint('/getNiveles.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignacion, year: $('yearinConc')?.value || this.currentYear }),
      });
      const niveles = await res.json();
      nivelEl.innerHTML = '<option value="">Seleccione...</option>' +
        (niveles || []).map((n) => `<option value="${n.nivel}">${n.nivel}</option>`).join('');
    } catch (err) {
      alertError('Error', 'No se pudieron cargar los niveles: ' + err.message);
    }
  }

  async onNivelChange(asignacion, nivel) {
    const numEl = $('numeroNotass');
    if (!numEl) return;
    numEl.innerHTML = '<option value="">Seleccione...</option>';
    if (!asignacion || !nivel) return;

    try {
      const res = await fetch(endpoint('/getNumeros.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignacion, nivel, year: $('yearinConc')?.value || this.currentYear }),
      });
      const numeros = await res.json();
      numEl.innerHTML = '<option value="">Seleccione...</option>' +
        (numeros || []).map((n) => `<option value="${n.numero}">${n.numero}</option>`).join('');
    } catch (err) {
      alertError('Error', 'No se pudieron cargar los numeros: ' + err.message);
    }
  }

  _injectGridCSS() {
    if (document.getElementById('conc-grid-css')) return;
    const style = document.createElement('style');
    style.id = 'conc-grid-css';
    style.textContent = `
      #frmConcentradorNotass { container-type: inline-size; }
      #frmConcentradorNotass .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      @container (min-width: 500px) { #frmConcentradorNotass .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
      @container (min-width: 750px) { #frmConcentradorNotass .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
      @container (min-width: 1000px) { #frmConcentradorNotass .grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
      .conc-search {
        display:flex; align-items:center; gap:.4rem;
        padding:.4rem .65rem; margin-bottom:.65rem;
        background:rgba(255,255,255,.72); border:1px solid rgba(84,51,145,.18);
        border-radius:10px; backdrop-filter:blur(8px);
        -webkit-backdrop-filter:blur(8px);
      }
      .conc-search > i.bi-search {
        position:absolute; left:.85rem; color:#9ca3af; font-size:.95rem; pointer-events:none;
      }
      .conc-search { position:relative; }
      .conc-search input {
        flex:1; min-width:0; border:none; background:transparent;
        font-size:.9rem; padding:.5rem .5rem .5rem 1.85rem; outline:none; color:#1f2937;
      }
      .conc-search input::placeholder { color:#9ca3af; }
      .conc-search input:focus { color:#111827; }
      .conc-search-clear {
        flex:0 0 auto; width:28px; height:28px; border:none; background:transparent;
        color:#6b7280; cursor:pointer; border-radius:14px;
        display:flex; align-items:center; justify-content:center;
        font-size:1.1rem; line-height:1; padding:0;
      }
      .conc-search-clear:hover { background:rgba(0,0,0,.06); color:#1f2937; }
      .conc-search-clear[hidden] { display:none; }
      .conc-search-count {
        flex:0 0 auto; font-size:.72rem; color:#6b7280; white-space:nowrap;
        border-left:1px solid #e5e7eb; margin-left:.15rem; padding:0 .55rem 0 .65rem;
        font-variant-numeric:tabular-nums;
      }
      .conc-empty { text-align:center; padding:2rem 1rem; color:#9ca3af; font-size:.9rem; }
      /* ---- Vista mobile (cards) ---- */
      .conc-cards { display:flex; flex-direction:column; gap:.55rem; }
      .conc-cards .conc-card {
        background:#fff; border:1px solid #e5e7eb; border-radius:12px;
        box-shadow:0 1px 3px rgba(0,0,0,.06); overflow:hidden;
      }
      .conc-cards .conc-card-head {
        display:flex; align-items:center; gap:.6rem;
        padding:.65rem .85rem;
        background:linear-gradient(135deg, #543391 0%, #6b46c1 100%);
        color:#fff;
      }
      .conc-cards .conc-card-avatar {
        flex:0 0 auto; width:32px; height:32px; border-radius:50%;
        background:rgba(255,255,255,.18); display:flex; align-items:center; justify-content:center;
        font-weight:700; font-size:.85rem;
      }
      .conc-cards .conc-card-name {
        flex:1; min-width:0; font-weight:600; font-size:.9rem; line-height:1.2;
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      }
      .conc-cards .conc-card-def {
        flex:0 0 auto; min-width:42px; padding:0 .55rem; height:30px; border-radius:15px;
        display:inline-flex; align-items:center; justify-content:center;
        font-weight:700; font-variant-numeric:tabular-nums; font-size:.95rem;
        background:rgba(255,255,255,.18);
      }
      .conc-cards .conc-card-body { padding:0; }
      .conc-cards .conc-card-asig {
        display:flex; align-items:center; gap:.5rem; min-height:44px;
        padding:.55rem .85rem; border-bottom:1px solid #f3f4f6; cursor:pointer;
        position:relative;
      }
      .conc-cards .conc-card-asig:last-child { border-bottom:none; }
      .conc-cards .conc-card-asig:active { background:#f9fafb; }
      .conc-cards .conc-card-asig-name {
        flex:1; min-width:0; font-size:.85rem; color:#374151;
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      }
      .conc-cards .conc-card-asig-val {
        flex:0 0 auto; min-width:48px; padding:0 .6rem; height:30px; border-radius:15px;
        display:inline-flex; align-items:center; justify-content:center;
        font-weight:700; font-variant-numeric:tabular-nums; font-size:.9rem;
      }
      .conc-cards .conc-card-asig-val.ok    { background:#d1fae5; color:#065f46; }
      .conc-cards .conc-card-asig-val.low   { background:#fee2e2; color:#991b1b; }
      .conc-cards .conc-card-asig-val.empty { background:#f3f4f6; color:#9ca3af; }
      .conc-cards .conc-card-asig-menu {
        position:absolute; right:.4rem; top:50%; transform:translateY(-50%);
        width:28px; height:28px; border:none; background:transparent;
        color:#9ca3af; cursor:pointer; border-radius:14px;
        display:flex; align-items:center; justify-content:center; font-size:.85rem;
      }
      .conc-cards .conc-card-asig-menu:hover { background:rgba(84,51,145,.1); color:#543391; }
      .conc-cards .conc-card-asig-menu.active { background:#543391; color:#fff; }
      .conc-cards .conc-card-asig-menu-pop {
        position:absolute; right:.5rem; top:calc(100% - 2px); z-index:30;
        background:#fff; border:1px solid #e5e7eb; border-radius:10px;
        box-shadow:0 10px 25px -5px rgba(0,0,0,.18);
        padding:.25rem; min-width:160px; display:flex; flex-direction:column;
      }
      .conc-cards .conc-card-asig-pop-item {
        display:flex; align-items:center; gap:.5rem; padding:.55rem .65rem;
        font-size:.8rem; color:#374151; cursor:pointer; border-radius:7px;
        text-align:left; background:transparent; border:none; width:100%;
      }
      .conc-cards .conc-card-asig-pop-item:hover { background:#f3f4f6; color:#543391; }
      .conc-cards .conc-card-asig-pop-item i { color:#543391; }
      @media (max-width:640px) {
        .conc-search { padding:.35rem .55rem; }
        .conc-search input { font-size:.95rem; min-height:40px; padding:.55rem .5rem .55rem 1.95rem; }
        .conc-search-clear { width:34px; height:34px; }
        .conc-search-count { display:none; }
        /* Tabla se oculta en mobile, se muestran cards */
        #concTableWrap > #tableconcentrador { display:none; }
        #concTableWrap > .conc-cards { display:flex; }
      }
      @media (min-width:641px) {
        #concTableWrap > #tableconcentrador { display:table; }
        #concTableWrap > .conc-cards { display:none; }
      }
    `;
    document.head.appendChild(style);
  }

  async onSubmit() {
    document.getElementById('app-layout')?.classList.add('sidebar-collapsed');
    document.getElementById('sidebar')?.classList.add('-translate-x-full');
    document.getElementById('sidebar-backdrop')?.remove();
    const data = {
      Asignacion: $('asignacionNotass')?.value || '',
      nivel: $('nivelNotass')?.value || '',
      numero: $('numeroNotass')?.value || '',
      periodo: $('periodosNotass')?.value || '',
      year: $('yearinConc')?.value || this.currentYear,
      activos: $('switchActivos')?.checked ? 'true' : 'false',
      tipo: '',
    };

    const container = $('contenedorConcentrador');
    const consolContainer = $('contenedorConsolidado');
    consolContainer.classList.add('hidden');
    container.innerHTML = `<div class="flex justify-center my-8"><span data-orb="working" data-orb-size="36" class="inline-block" style="width:36px;height:36px"></span></div>`;

    try {
      const resp = await fetch(endpoint('/getConcentrador.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await resp.json();
      if (!result.asignaturas || !result.asignaturas.length || !result.estudiantes || !result.estudiantes.length) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">No hay datos para mostrar</p>';
        return;
      }
      this._lastResult = result;
      this._lastData = data;
      this.renderConcentrador(result, container);
    } catch (err) {
      container.innerHTML = '<p class="text-center text-gray-400 py-8">Error al cargar datos</p>';
      alertError('Error', err.message);
    }
  }

  renderConcentrador(result, container) {
    const { asignaturas, estudiantes, periodo } = result;
    const colSpan = asignaturas.length;
    const formData = this._lastData || {};
    const minColWidth = 48; // ancho mínimo legible por columna de asignatura
    const minTableWidth = 130 + colSpan * minColWidth;

    // Construir las cards para mobile (mismo set de datos)
    const cardsHtml = `
      <div class="conc-cards" id="concCards">
        ${estudiantes.map((e) => {
          // Calcular promedio del estudiante (Def global)
          const allVals = asignaturas
            .map((a) => {
              const g = (e.notas?.[a.asignatura] || []).find((x) => x.periodo === periodo);
              return g ? parseFloat(g.valoracion) : null;
            })
            .filter((v) => v != null && !isNaN(v));
          const def = allVals.length ? (allVals.reduce((s, v) => s + v, 0) / allVals.length).toFixed(1) : '–';
          const defNum = parseFloat(def);
          const defCls = isNaN(defNum) ? 'empty' : (defNum >= 3 ? 'ok' : 'low');
          return `
            <div class="conc-card" data-student-name="${escapeHtml(e.nombres)}" data-student-id="${escapeHtml(String(e.estudiante))}">
              <div class="conc-card-head">
                <span class="conc-card-avatar">${escapeHtml((e.nombres || '?').charAt(0).toUpperCase())}</span>
                <span class="conc-card-name" title="${escapeHtml(e.nombres)}">${escapeHtml(e.nombres)}</span>
                <span class="conc-card-def conc-card-def-${defCls}">${escapeHtml(def)}</span>
              </div>
              <div class="conc-card-body">
                ${asignaturas.map((a) => {
                  const grades = e.notas?.[a.asignatura] || [];
                  const val = grades.find((g) => g.periodo === periodo);
                  const displayVal = val ? parseFloat(val.valoracion).toFixed(1) : '';
                  const num = parseFloat(displayVal);
                  const hasVal = displayVal !== '' && !isNaN(num);
                  const isLow = hasVal && num < 3;
                  const valCls = !hasVal ? 'empty' : (isLow ? 'low' : 'ok');
                  const detalleData = {
                    estudiante: e.estudiante,
                    nombres: e.nombres,
                    asignatura: a.asignatura,
                    docente: a.docente,
                    periodo,
                  };
                  const subjData = { ...formData, asignatura: a.asignatura, docente: a.docente };
                  return `
                    <div class="conc-card-asig" data-detalle='${escapeHtml(JSON.stringify(detalleData))}' data-action="ver-detalle">
                      <span class="conc-card-asig-name" title="${escapeHtml(a.asignatura)}">${escapeHtml(a.abreviatura || a.asignatura)}</span>
                      <span class="conc-card-asig-val conc-card-asig-val-${valCls}">${hasVal ? escapeHtml(displayVal) : '–'}</span>
                      <button type="button" class="conc-card-asig-menu" data-asignatura='${escapeHtml(JSON.stringify(subjData))}' data-docente="${escapeHtml(a.docente || '')}" data-asignatura-simple="${escapeHtml(a.asignatura)}" data-nivel="${escapeHtml(formData.nivel || '')}" data-numero="${escapeHtml(formData.numero || '')}" data-asignacion="${escapeHtml(formData.Asignacion || '')}" aria-label="Más acciones para ${escapeHtml(a.asignatura)}">
                        <i class="bi bi-three-dots-vertical"></i>
                      </button>
                    </div>`;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const searchHtml = `
      <div class="conc-search" role="search">
        <i class="bi bi-search"></i>
        <input type="search" id="concStudentFilter" placeholder="Buscar estudiante por nombre o ID..." aria-label="Buscar estudiante" autocomplete="off" />
        <button type="button" class="conc-search-clear" id="concStudentFilterClear" aria-label="Limpiar filtro" title="Limpiar">×</button>
        <span class="conc-search-count" id="concStudentFilterCount">${estudiantes.length} estudiante${estudiantes.length === 1 ? '' : 's'}</span>
      </div>
      <div class="rounded-xl border border-gray-200 max-w-full overflow-x-auto" id="concTableWrap">
        <table id="tableconcentrador" class="text-[11px] sm:text-xs" style="table-layout:fixed;width:100%;min-width:${minTableWidth}px">
          <colgroup>
            <col style="width:130px">
            <col span="${asignaturas.length}">
          </colgroup>
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              <th class="sticky left-0 bg-gray-50 z-10 px-2 sm:px-3 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Estudiantes</th>
              ${asignaturas.map((a) => {
                const subjData = { ...formData, asignatura: a.asignatura };
                const abrev = (a.abreviatura || a.asignatura);
                const shortAbrev = abrev.length > 6 ? abrev.substring(0, 5) + '…' : abrev;
                return `
                <th class="px-0.5 sm:px-1 py-1.5 sm:py-2 text-center">
                  <div class="conc-dropdown relative inline-block">
                    <button type="button" class="conc-dropdown-btn text-[10px] sm:text-xs font-semibold text-[#543391] cursor-pointer hover:text-[#6b46c1] flex items-center justify-center gap-0.5 w-full px-0.5 sm:px-1" data-asignatura='${escapeHtml(JSON.stringify(subjData))}' data-docente="${escapeHtml(a.docente || '')}" data-asignatura-simple="${escapeHtml(a.asignatura)}" data-nivel="${escapeHtml(formData.nivel || '')}" data-numero="${escapeHtml(formData.numero || '')}" data-asignacion="${escapeHtml(formData.Asignacion || '')}" title="${escapeHtml(abrev)}">
                      <span class="hidden sm:inline">${escapeHtml(abrev)}</span>
                      <span class="sm:hidden">${escapeHtml(shortAbrev)}</span>
                      <i class="bi bi-chevron-down text-[8px] sm:text-[9px] opacity-50"></i>
                    </button>
                    <div class="conc-dropdown-menu hidden absolute z-50 bg-white shadow-lg rounded-lg border border-gray-200 py-1 min-w-[150px] sm:min-w-[170px] right-0 text-left">
                      <a href="#" class="conc-dd-item block px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs text-gray-700 hover:bg-gray-100" data-action="estadisticas">
                        <i class="bi bi-bar-chart-fill mr-1.5 text-[#543391]"></i><span class="hidden sm:inline">Estadísticas</span><span class="sm:hidden">Stats</span>
                      </a>
                      <a href="#" class="conc-dd-item block px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs text-gray-700 hover:bg-gray-100" data-action="planilla">
                        <i class="bi bi-table mr-1.5 text-[#543391]"></i><span class="hidden sm:inline">Planilla de Notas</span><span class="sm:hidden">Planilla</span>
                      </a>
                    </div>
                  </div>
                </th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100" id="concTableBody">
            ${estudiantes.map((e, i) => `
              <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#f5f3ff] transition-colors" data-student-name="${escapeHtml(e.nombres)}" data-student-id="${escapeHtml(String(e.estudiante))}">
                <td class="sticky left-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} z-10 px-2 sm:px-3 py-1.5 sm:py-2 font-medium text-gray-700 text-xs sm:text-sm truncate" title="${escapeHtml(e.nombres)}">
                  <span class="inline-flex items-center gap-1 sm:gap-1.5">
                    <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#543391]/10 text-[#543391] flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">${escapeHtml(e.nombres.charAt(0))}</span>
                    <span class="truncate">${escapeHtml(e.nombres)}</span>
                  </span>
                </td>
                ${asignaturas.map((a) => {
                  const grades = e.notas?.[a.asignatura] || [];
                  const val = grades.find((g) => g.periodo === periodo);
                  const displayVal = val ? parseFloat(val.valoracion).toFixed(1) : '';
                  const isLow = displayVal !== '' && parseFloat(displayVal) < 3;
                  const detalleData = {
                    estudiante: e.estudiante,
                    nombres: e.nombres,
                    asignatura: a.asignatura,
                    docente: a.docente,
                    periodo,
                  };
                  const hasVal = displayVal !== '';
                  return `
                    <td class="px-1 sm:px-2 py-1.5 sm:py-2 text-center overflow-hidden">
                      <span class="inline-flex items-center justify-center w-7 h-6 sm:w-8 sm:h-7 rounded text-[10px] sm:text-xs font-semibold cursor-pointer hover:ring-2 hover:ring-[#543391]/30 transition-all ${isLow ? 'bg-red-50 text-red-600' : (hasVal ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300')}" data-action="ver-detalle" data-detalle='${escapeHtml(JSON.stringify(detalleData))}' ${hasVal ? '' : 'style="pointer-events:none;"'}>${displayVal}</span>
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${cardsHtml}
        <div id="concNoResults" class="hidden"></div>
      </div>
    `;

    container.innerHTML = searchHtml;
    this._initDropdowns();
    this._initCardMenus();
    this._attachStudentFilter();
  }

  _initDropdowns() {
    if (!this._dropdownDocBound) {
      this._dropdownDocBound = true;
      document.addEventListener('click', (e) => {
        // Handle dropdown item clicks
        const item = e.target.closest('.conc-dd-item');
        if (item) {
          e.preventDefault();
          const menu = item.closest('.conc-dropdown-menu');
          if (menu) menu.classList.add('hidden');
          const btn = menu?.parentElement?.querySelector('.conc-dropdown-btn');
          const subjData = JSON.parse(btn?.dataset?.asignatura || '{}');
          subjData.docente = btn?.dataset?.docente || '';
          if (item.dataset.action === 'estadisticas') this._showEstadisticas(subjData);
          else if (item.dataset.action === 'planilla') this._showPlanillaNotas(subjData);
          return;
        }
        // Handle individual grade cell click
        const detalle = e.target.closest('[data-action="ver-detalle"]');
        if (detalle) {
          e.preventDefault();
          const detalleData = JSON.parse(detalle.dataset.detalle || '{}');
          this._showDetalleNotas(detalleData);
          return;
        }
        // Close dropdowns on outside click
        document.querySelectorAll('.conc-dropdown-menu:not(.hidden)').forEach((m) => {
          if (!m.parentElement.contains(e.target)) m.classList.add('hidden');
        });
      });
    }
    document.querySelectorAll('.conc-dropdown-btn').forEach((btn) => {
      btn.removeEventListener('click', this._toggleDropdown);
      btn.addEventListener('click', this._toggleDropdown);
    });
  }

  _toggleDropdown(e) {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.conc-dropdown-menu').forEach((m) => {
      if (m !== this.nextElementSibling) m.classList.add('hidden');
    });
    const menu = this.nextElementSibling;
    if (menu) menu.classList.toggle('hidden');
  }

  // --- Filtro de estudiantes por nombre o ID ----------------------------------

  _attachStudentFilter() {
    const input = $('concStudentFilter');
    const clear = $('concStudentFilterClear');
    if (!input) return;
    input.addEventListener('input', (e) => {
      this._filterStudents(e.target.value);
    });
    input.addEventListener('search', (e) => {
      // 'search' se dispara al limpiar con la × nativa del input
      this._filterStudents(e.target.value);
    });
    if (clear) {
      clear.addEventListener('click', () => {
        input.value = '';
        this._filterStudents('');
        input.focus();
      });
    }
  }

  // Normaliza acentos para que "angel" matchee "Ángel" y "ANGEL"
  _normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  _filterStudents(query) {
    const q = this._normalizeText(String(query || '').trim());
    const matches = (name, id) => {
      if (!q) return true;
      return this._normalizeText(name).includes(q) || String(id || '').includes(q);
    };

    // Aplicar a filas de la tabla
    const rows = document.querySelectorAll('#tableconcentrador tbody tr');
    const cards = document.querySelectorAll('#concCards .conc-card');
    let visible = 0;
    rows.forEach((row) => {
      const show = matches(row.dataset.studentName, row.dataset.studentId);
      row.hidden = !show;
      if (show) visible++;
    });
    cards.forEach((card) => {
      const show = matches(card.dataset.studentName, card.dataset.studentId);
      card.hidden = !show;
      if (show) visible++;
    });

    // Actualizar contador
    const countEl = $('concStudentFilterCount');
    if (countEl) {
      const total = rows.length;
      countEl.textContent = q
        ? `${visible} de ${total} estudiante${total === 1 ? '' : 's'}`
        : `${total} estudiante${total === 1 ? '' : 's'}`;
    }

    // Mostrar/ocultar botón clear
    const clear = $('concStudentFilterClear');
    if (clear) clear.hidden = !q;

    // Mensaje "sin resultados" + ocultar thead
    const empty = $('concNoResults');
    const wrap = $('concTableWrap');
    if (empty && wrap) {
      if (q && visible === 0) {
        empty.classList.remove('hidden');
        showEmptyState(empty, { icon: 'search', title: 'Sin resultados', desc: 'No se encontraron estudiantes con ese criterio.' });
        const thead = wrap.querySelector('thead');
        if (thead) thead.style.display = 'none';
      } else {
        empty.classList.add('hidden');
        const thead = wrap.querySelector('thead');
        if (thead) thead.style.display = '';
      }
    }
  }

  // Wire del menú "⋯" en cada asignatura de las cards (mobile)
  _initCardMenus() {
    if (this._cardMenusBound) return;
    this._cardMenusBound = true;
    document.addEventListener('click', (e) => {
      // Click en el botón "⋯" de una asignatura
      const menuBtn = e.target.closest('.conc-card-asig-menu');
      if (menuBtn) {
        e.preventDefault();
        e.stopPropagation();
        this._toggleCardMenu(menuBtn);
        return;
      }
      // Click en una opción del menú popover
      const popItem = e.target.closest('.conc-card-asig-pop-item');
      if (popItem) {
        e.preventDefault();
        const subjData = JSON.parse(popItem.dataset.subj || '{}');
        if (popItem.dataset.action === 'estadisticas') this._showEstadisticas(subjData);
        else if (popItem.dataset.action === 'planilla') this._showPlanillaNotas(subjData);
        this._closeAllCardMenus();
        return;
      }
      // Click en una asignatura de la card → abre detalle
      const cardAsig = e.target.closest('.conc-card-asig');
      if (cardAsig) {
        // Si el click fue en el botón "⋯" ya se manejó arriba
        if (e.target.closest('.conc-card-asig-menu')) return;
        e.preventDefault();
        const detalleData = JSON.parse(cardAsig.dataset.detalle || '{}');
        this._showDetalleNotas(detalleData);
        return;
      }
      // Click fuera de cualquier menú → cerrar todos
      this._closeAllCardMenus();
    });
  }

  _toggleCardMenu(btn) {
    this._closeAllCardMenus();
    const card = btn.closest('.conc-card');
    if (!card) return;
    let pop = card.querySelector('.conc-card-asig-menu-pop');
    if (pop) {
      // Ya existe, alternar
      if (pop.classList.contains('hidden')) {
        pop.classList.remove('hidden');
        btn.classList.add('active');
      } else {
        pop.classList.add('hidden');
        btn.classList.remove('active');
      }
    } else {
      // Crear el popover
      const subjData = JSON.parse(btn.dataset.asignatura || '{}');
      subjData.docente = btn.dataset.docente || '';
      subjData.asignatura = btn.dataset.asignaturaSimple || subjData.asignatura;
      subjData.nivel = btn.dataset.nivel || '';
      subjData.numero = btn.dataset.numero || '';
      subjData.Asignacion = btn.dataset.asignacion || '';
      pop = document.createElement('div');
      pop.className = 'conc-card-asig-menu-pop';
      pop.innerHTML = `
        <button type="button" class="conc-card-asig-pop-item" data-action="estadisticas" data-subj='${escapeHtml(JSON.stringify(subjData))}'>
          <i class="bi bi-bar-chart-fill"></i><span>Estadísticas</span>
        </button>
        <button type="button" class="conc-card-asig-pop-item" data-action="planilla" data-subj='${escapeHtml(JSON.stringify(subjData))}'>
          <i class="bi bi-table"></i><span>Planilla de Notas</span>
        </button>
      `;
      btn.parentElement.appendChild(pop);
      btn.classList.add('active');
    }
  }

  _closeAllCardMenus() {
    document.querySelectorAll('.conc-card-asig-menu-pop').forEach((p) => p.classList.add('hidden'));
    document.querySelectorAll('.conc-card-asig-menu').forEach((b) => b.classList.remove('active'));
  }

  async _showEstadisticas(subjData) {
    const { asignatura, docente, periodo } = subjData;
    const { nivel, numero, Asignacion, year } = this._lastData || {};
    document.querySelectorAll('.conc-dropdown-menu').forEach((m) => m.classList.add('hidden'));

    const payload = { Asignacion: Asignacion || '', nivel: nivel || '', numero: numero || '', asignatura, docente, periodo: periodo || '', year: year || new Date().getFullYear() };
    const endpoints = [
      endpoint('/getDataGraphAsignatura.php'),
      endpoint('/getDataGraphAsignatura2.php'),
      endpoint('/getDataGraphAsignatura3.php'),
      endpoint('/getDataGraphAsignatura4.php'),
    ];

    const Swal = (await import('sweetalert2')).default;

    Swal.fire({
      title: `Estadísticas: ${asignatura}`,
      html: `<div class="flex items-center justify-center py-12"><span data-orb="solving" data-orb-size="36" class="inline-block" style="width:36px;height:36px"></span><span class="ml-3 text-gray-500 text-sm">Cargando estadísticas...</span></div>`,
      width: '800px',
      showCloseButton: false,
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: async () => {
        try {
          const results = await Promise.all(endpoints.map((url) =>
            fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json())
          ));
          const [studentAvg, dist02, desempeno, dist05] = results;

          const totalEst = desempeno.reduce((s, d) => s + parseInt(d.cantidad || 0), 0);
          const nivelColors = { 'Superior': '#22c55e', 'Alto': '#3b82f6', 'Básico': '#f59e0b', 'Bajo': '#ef4444' };

          const bar = (label, value, max, bg, pct) =>
            `<div class="flex items-center gap-2 text-xs mb-1.5">
              <span class="w-16 text-right text-gray-600 shrink-0">${label}</span>
              <div class="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" style="width:${Math.min(pct || (max ? value / max * 100 : 0), 100)}%;background:${bg}"></div>
              </div>
              <span class="w-12 text-center font-semibold text-gray-700 shrink-0">${value}</span>
              <span class="w-14 text-right text-gray-400 shrink-0">${pct != null ? pct : (max ? (value / max * 100).toFixed(1) : 0)}%</span>
            </div>`;

          const perfBars = desempeno.map((d) => {
            const maxVal = Math.max(...desempeno.map((x) => parseInt(x.cantidad || 0)), 1);
            return bar(d.intervalo.split(' - ')[0], d.cantidad, maxVal, nivelColors[d.intervalo.split(' - ')[0]] || '#6b7280', d.porcentaje);
          }).join('');

          const dist05Max = Math.max(...dist05.map((d) => parseInt(d.cantidad || 0)), 1);
          const dist05Bars = dist05.map((d) =>
            bar(d.intervalo, d.cantidad, dist05Max, '#543391', d.porcentaje)
          ).join('');

          const dist02Max = Math.max(...dist02.map((d) => parseInt(d.cantidad || 0)), 1);
          const dist02Bars = dist02.map((d) =>
            bar(d.intervalo, d.cantidad, dist02Max, '#8b5cf6', d.porcentaje)
          ).join('');

          const studAvg = parseFloat(studentAvg.reduce((s, r) => s + parseFloat(r.valoracion || 0), 0) / (studentAvg.length || 1)).toFixed(2);
          const minAvg = studentAvg.length ? Math.min(...studentAvg.map((r) => parseFloat(r.valoracion || 0))).toFixed(1) : '—';
          const maxAvg = studentAvg.length ? Math.max(...studentAvg.map((r) => parseFloat(r.valoracion || 0))).toFixed(1) : '—';
          const aprobados = studentAvg.filter((r) => parseFloat(r.valoracion || 0) >= 3).length;
          const reprobados = studentAvg.length - aprobados;

          const html = `
            <div class="text-left space-y-5 max-h-[70vh] overflow-y-auto pr-1">
              <div class="grid grid-cols-4 gap-2">
                <div class="bg-gray-50 rounded-lg p-2.5 text-center">
                  <div class="text-lg font-bold text-[#543391]">${studentAvg.length}</div>
                  <div class="text-[10px] text-gray-500 uppercase tracking-wider">Estudiantes</div>
                </div>
                <div class="bg-green-50 rounded-lg p-2.5 text-center">
                  <div class="text-lg font-bold text-green-600">${aprobados}</div>
                  <div class="text-[10px] text-gray-500 uppercase tracking-wider">Aprobados</div>
                </div>
                <div class="bg-red-50 rounded-lg p-2.5 text-center">
                  <div class="text-lg font-bold text-red-600">${reprobados}</div>
                  <div class="text-[10px] text-gray-500 uppercase tracking-wider">Reprobados</div>
                </div>
                <div class="bg-purple-50 rounded-lg p-2.5 text-center">
                  <div class="text-lg font-bold text-[#543391]">${studAvg}</div>
                  <div class="text-[10px] text-gray-500 uppercase tracking-wider">Promedio</div>
                </div>
              </div>

              <div>
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Desempeño</h4>
                ${perfBars}
              </div>

              <div>
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Distribución (c/0.5)</h4>
                ${dist05Bars}
              </div>

              <div>
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Distribución detallada (c/0.2)</h4>
                <div class="max-h-48 overflow-y-auto">${dist02Bars}</div>
              </div>
            </div>`;

          Swal.update({
            title: `Estadísticas: ${asignatura}`,
            html,
            width: '800px',
            showCloseButton: true,
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#543391',
            allowOutsideClick: true,
            grow: false,
          });
        } catch (err) {
          Swal.update({ icon: 'error', title: 'Error', html: 'No se pudieron cargar las estadísticas: ' + err.message, showCloseButton: true, showConfirmButton: true, confirmButtonColor: '#543391', allowOutsideClick: true });
        }
      },
    });
  }

  async _showDetalleNotas(detalleData) {
    const { estudiante, nombres, asignatura, docente, periodo } = detalleData;
    const formData = this._lastData || {};

    const Swal = (await import('sweetalert2')).default;

    Swal.fire({
      title: `Detalle: ${asignatura}`,
      html: `<div class="flex items-center justify-center py-12"><span data-orb="working" data-orb-size="36" class="inline-block" style="width:36px;height:36px"></span><span class="ml-3 text-gray-500 text-sm">Cargando notas...</span></div>`,
      width: '700px',
      showCloseButton: false,
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: async () => {
        try {
          const resp = await fetch(endpoint('/getNotas.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              docente,
              nivel: formData.nivel || '',
              numero: formData.numero || '',
              asignatura,
              periodo: periodo || '',
              asignacion: formData.Asignacion || '',
              year: formData.year || new Date().getFullYear(),
            }),
          });
          const data = await resp.json();
          if (!data || !data.length) {
            Swal.update({ icon: 'warning', title: 'Sin datos', html: 'No hay notas para este estudiante', showCloseButton: true, showConfirmButton: true, confirmButtonColor: '#543391', allowOutsideClick: true });
            return;
          }

          const row = data.find((r) => String(r.estudiante) === String(estudiante));
          if (!row) {
            Swal.update({ icon: 'warning', title: 'Sin datos', html: 'No se encontraron notas para este estudiante', showCloseButton: true, showConfirmButton: true, confirmButtonColor: '#543391', allowOutsideClick: true });
            return;
          }

          const notas = [];
          for (let i = 1; i <= 11; i++) {
            const n = row[`N${i}`];
            if (n != null && n !== ' ') {
              notas.push({
                num: i,
                nota: n,
                aspecto: row[`aspecto${i}`] || '',
                porcentaje: row[`porcentaje${i}`] || '',
              });
            }
          }

          const grupos = [
            { label: 'SABER 35%', indices: [1,2,3], bg: '#e7ffe7' },
            { label: 'HACER 35%', indices: [4,5,6], bg: '#ffeee1' },
            { label: 'SER 20%', indices: [7,8,9], bg: '#f0f5ff' },
            { label: 'AUTOEV 5%', indices: [10], bg: '#ffd5d6' },
            { label: 'COEV 5%', indices: [11], bg: '#fffad6' },
          ];

          const rowsHtml = grupos.map((g) => {
            const items = notas.filter((n) => g.indices.includes(n.num));
            if (!items.length) return '';
            return items.map((item) => {
              const notaNum = parseFloat(item.nota);
              const isLow = !isNaN(notaNum) && notaNum < 3;
              return `
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="px-3 py-1.5 text-xs font-medium text-gray-600" style="background:${g.bg}">N${item.num}</td>
                  <td class="px-3 py-1.5 text-xs text-center font-semibold ${isLow ? 'text-red-600' : 'text-gray-800'}">${escapeHtml(String(item.nota))}</td>
                  <td class="px-3 py-1.5 text-xs text-gray-600 max-w-[200px] truncate" title="${escapeHtml(item.aspecto)}">${escapeHtml(item.aspecto || '—')}</td>
                  <td class="px-3 py-1.5 text-xs text-center text-gray-500">${item.porcentaje ? escapeHtml(String(item.porcentaje)) : '—'}</td>
                </tr>`;
            }).join('');
          }).filter(Boolean).join('');

          if (!rowsHtml) {
            Swal.update({ icon: 'info', title: 'Sin notas parciales', html: `No hay notas detalladas para ${escapeHtml(nombres)} en ${asignatura}`, showCloseButton: true, showConfirmButton: true, confirmButtonColor: '#543391', allowOutsideClick: true });
            return;
          }

          const html = `
            <div class="text-left mb-3 text-sm text-gray-500">
              <strong class="text-gray-700">${escapeHtml(nombres)}</strong> — ${asignatura}
            </div>
            <div class="overflow-x-auto rounded-lg border border-gray-200">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="bg-gray-100">
                    <th class="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase">Nota</th>
                    <th class="px-3 py-1.5 text-center text-xs font-semibold text-gray-500 uppercase w-14">Valor</th>
                    <th class="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase">Aspecto</th>
                    <th class="px-3 py-1.5 text-center text-xs font-semibold text-gray-500 uppercase w-16">%</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  ${rowsHtml}
                  <tr class="bg-gray-50 font-bold">
                    <td class="px-3 py-1.5 text-xs text-[#543391]">Definitiva</td>
                    <td class="px-3 py-1.5 text-xs text-center text-[#543391]">${escapeHtml(String(row.Val || '—'))}</td>
                    <td class="px-3 py-1.5 text-xs text-gray-400" colspan="2">Valoración final</td>
                  </tr>
                </tbody>
              </table>
            </div>`;

          Swal.update({
            title: `Detalle: ${asignatura}`,
            html,
            width: '700px',
            showCloseButton: true,
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#543391',
            allowOutsideClick: true,
          });
        } catch (err) {
          Swal.update({ icon: 'error', title: 'Error', html: 'No se pudo cargar el detalle: ' + err.message, showCloseButton: true, showConfirmButton: true, confirmButtonColor: '#543391', allowOutsideClick: true });
        }
      },
    });
  }

  async _showPlanillaNotas(subjData) {
    const { docente, nivel, numero, asignatura, Asignacion, year, periodo } = subjData;
    document.querySelectorAll('.conc-dropdown-menu').forEach((m) => m.classList.add('hidden'));

    const Swal = (await import('sweetalert2')).default;

    Swal.fire({
      title: `Planilla: ${asignatura}`,
      html: `<div class="flex items-center justify-center py-12"><span data-orb="working" data-orb-size="36" class="inline-block" style="width:36px;height:36px"></span><span class="ml-3 text-gray-500 text-sm">Cargando notas...</span></div>`,
      width: '95%',
      showCloseButton: false,
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: async () => {
        try {
          const resp = await fetch(endpoint('/getNotas.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              docente,
              nivel,
              numero,
              asignatura,
              periodo: periodo || '',
              asignacion: Asignacion || '',
              year: year || new Date().getFullYear(),
            }),
          });
          const data = await resp.json();
          if (!data || !data.length) {
            Swal.update({ icon: 'warning', title: 'Sin datos', html: 'No hay notas para esta asignatura', showCloseButton: true, showConfirmButton: true, confirmButtonColor: '#543391', allowOutsideClick: true });
            return;
          }

          const colKeys = Object.keys(data[0]).filter((k) => /^N\d+$/.test(k) || k === 'Val');
          const groups = [
            { label: 'SABER 35%', cols: ['N1','N2','N3'], bg: '#e7ffe7' },
            { label: 'HACER 35%', cols: ['N4','N5','N6'], bg: '#ffeee1' },
            { label: 'SER 20%', cols: ['N7','N8','N9'], bg: '#f0f5ff' },
            { label: 'AUTOEV 5%', cols: ['N10'], bg: '#ffd5d6' },
            { label: 'COEV 5%', cols: ['N11'], bg: '#fffad6' },
          ];

          const colWidths = {};
          const colGroups = {};
          colKeys.forEach((k) => {
            colWidths[k] = 'w-11';
            colGroups[k] = '';
          });
          groups.forEach((g) => {
            g.cols.forEach((c) => {
              if (colKeys.includes(c)) {
                const span = g.cols.filter((x) => colKeys.includes(x)).length;
                colGroups[c] = { label: g.label, bg: g.bg, span };
              }
            });
          });
          if (colKeys.includes('Val')) {
            colGroups['Val'] = { label: 'DEF', bg: '#f3e8ff', span: 1 };
            colWidths['Val'] = 'w-12';
          }

          const visibleGroups = [];
          const added = new Set();
          groups.forEach((g) => {
            const active = g.cols.filter((c) => colKeys.includes(c));
            if (active.length) {
              visibleGroups.push({ label: g.label, bg: g.bg, count: active.length });
              active.forEach((c) => added.add(c));
            }
          });
          if (colKeys.includes('Val')) {
            visibleGroups.push({ label: 'DEF', bg: '#f3e8ff', count: 1 });
          }

          const headerGroupRow = visibleGroups.map((g) =>
            `<th colspan="${g.count}" class="px-1 py-1 text-center text-[10px] font-bold uppercase tracking-wider" style="background:${g.bg};color:#333">${g.label}</th>`
          ).join('');

          const headerColRow = colKeys.map((k) => {
            const g = colGroups[k];
            const bg = g && g.bg ? g.bg : '#f9fafb';
            const isVal = k === 'Val';
            return `<th class="px-1 py-1 text-center text-xs font-semibold ${colWidths[k]} ${isVal ? 'text-[#543391]' : 'text-gray-600'}" style="background:${bg}">${k}</th>`;
          }).join('');

          const rowsHtml = data.map((row, i) => {
            const nombre = escapeHtml(String(row.Nombres || row.estudiante || ''));
            const bgRow = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
            return `
              <tr class="${bgRow} hover:bg-gray-100 transition-colors">
                <td class="sticky left-0 ${bgRow} px-2 py-1 text-gray-800 text-xs font-medium truncate border-r border-gray-200 text-left max-w-[130px]" title="${nombre}">${nombre}</td>
                ${colKeys.map((k) => {
                  const val = row[k];
                  const num = parseFloat(val);
                  const isLow = val != null && val !== ' ' && !isNaN(num) && num < 3;
                  const display = val != null && val !== ' ' ? val : '';
                  const isVal = k === 'Val';
                  const txtCls = isVal ? 'font-bold text-[#543391]' : (isLow ? 'text-red-600 font-semibold' : 'text-gray-700');
                  return `<td class="px-1 py-1 text-center text-xs ${txtCls}">${escapeHtml(String(display))}</td>`;
                }).join('')}
              </tr>`;
          }).join('');

          const html = `
            <div class="overflow-x-auto max-h-[75vh] rounded-lg border border-gray-200">
              <table class="w-full text-xs border-collapse">
                <thead class="sticky top-0 z-10">
                  <tr>
                    <th rowspan="2" class="sticky left-0 z-20 px-2 py-1.5 text-left text-xs font-bold text-gray-600 uppercase bg-gray-100 border-r border-gray-200 max-w-[130px] truncate">Estudiante</th>
                    ${headerGroupRow}
                  </tr>
                  <tr>
                    ${headerColRow}
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  ${rowsHtml}
                </tbody>
              </table>
            </div>`;

          Swal.update({
            html,
            width: '95%',
            showCloseButton: true,
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#543391',
            allowOutsideClick: true,
          });
        } catch (err) {
          Swal.update({ icon: 'error', title: 'Error', html: 'No se pudo cargar la planilla: ' + err.message, showCloseButton: true, showConfirmButton: true, confirmButtonColor: '#543391', allowOutsideClick: true });
        }
      },
    });
  }

  async onNotaMenosTres() {
    const data = {
      Asignacion: $('asignacionNotass')?.value || '',
      nivel: $('nivelNotass')?.value || '',
      numero: $('numeroNotass')?.value || '',
      periodo: $('periodosNotass')?.value || '',
      year: $('yearinConc')?.value || this.currentYear,
    };

    const container = $('contenedorConsolidado');
    container.classList.remove('hidden');
    container.innerHTML = `<div class="flex justify-center my-4"><span data-orb="working" data-orb-size="28" class="inline-block" style="width:28px;height:28px"></span></div>`;

    try {
      const resp = await fetch(endpoint('/consolidadoPerdidas.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await resp.json();

      if (!result.consolidado || !result.consolidado.length) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">No se encontraron estudiantes con notas menores a 3</p>';
        return;
      }

      let html = '<div class="glass-card p-4"><h4 class="text-sm font-semibold text-gray-700 mb-3">Estudiantes con nota &lt; 3</h4><div class="overflow-x-auto"><table class="w-full text-sm text-left"><thead><tr class="border-b border-gray-200">';
      const info = result.infoConsolidado || [];
      info.forEach((h) => {
        html += `<th class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">${escapeHtml(h.asignatura || h)}</th>`;
      });
      html += '</tr></thead><tbody>';
      result.consolidado.forEach((row) => {
        html += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
        info.forEach((h) => {
          const key = h.asignatura || h;
          const val = row[key] || '';
          html += `<td class="px-3 py-2 text-sm">${escapeHtml(String(val))}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table></div></div>';
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = '';
      alertError('Error', err.message);
    }
  }

  async onDescargar() {
    const table = document.getElementById('tableconcentrador');
    if (!table) {
      alertWarning('Primero debe cargar el concentrador');
      return;
    }
    try {
      const html = `<html><meta charset="UTF-8"><body>${table.outerHTML}</body></html>`;
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `concentrador_${$('yearinConc')?.value || this.currentYear}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alertError('Error', 'No se pudo generar el archivo Excel');
    }
  }

  async onDescargarLista() {
    const data = {
      Asignacion: $('asignacionNotass')?.value || '',
      nivel: $('nivelNotass')?.value || '',
      numero: $('numeroNotass')?.value || '',
      periodo: $('periodosNotass')?.value || '',
      year: $('yearinConc')?.value || this.currentYear,
    };

    try {
      const resp = await fetch(endpoint('/generaLista.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await resp.json();
      if (result.estado === 'ok') {
        const a = document.createElement('a');
        a.href = result.href;
        a.download = result.filename || 'lista.xlsx';
        a.click();
      } else {
        alertError('Error', result.mensaje || 'No se pudo generar la lista');
      }
    } catch (err) {
      alertError('Error', err.message);
    }
  }
}

new ConcentradorModule();