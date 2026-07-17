/**
 * Control de Estudiantes Module — Gestión completa de estudiantes
 *
 * Adaptado del módulo legacy controlEstudiantes con:
 * - Toolbar: buscar, nuevo, lista, códigos, imprimir
 * - Selector de año con botón "Ir"
 * - Filtros: estado (activo/inactivo/desertor/banda/HED), sede, grado
 * - Búsqueda con debounce + filtros encadenados
 * - Tabla sortable con datos completos del estudiante
 * - Badges de estado: activo, inactivo, HED
 * - Modales para editar, historial, cambiar grupo e imprimir códigos
 */
import { filters } from '@services/filters.js';
import { auth } from '@services/auth.js';
import { estudiantes } from '@services/estudiantes.js';
import { escapeHtml, $, delegate } from '@utils/dom.js';
import { alertSuccess, alertWarning, alertInfo, alertError, alertConfirm, showLoading, closeLoading } from '@utils/alert.js';
import { showModal, hideModal } from '@utils/modal.js';

class ControlEstudiantesModule {
  constructor() {
    this.activated = false;
    this.students = [];
    this.filteredStudents = [];
    this.sedes = [];
    this.grupos = [];
    this.currentYear = new Date().getFullYear();
    this.activeFilters = { status: null, sede: null, grado: null };
    this.sortState = { column: null, direction: 'asc' };
    this.searchTerm = '';
    this._modalsInjected = false;
    this.editando = false;
    this.page = 1;
    this.pageSize = 50;

    // Activation via visibility observer (like asignaciones module)
    document.addEventListener('app:authenticated', () => this._tryActivate());
    this._initObserver();

    if (document.readyState === 'complete') {
      setTimeout(() => this._tryActivate(), 100);
    } else {
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete') {
          setTimeout(() => this._tryActivate(), 100);
        }
      });
    }
  }

  _initObserver(retries = 0) {
    if (retries > 40) return; // max ~2s
    const section = document.getElementById('seccionControlEstudiantes');
    if (!section) {
      setTimeout(() => this._initObserver(retries + 1), 50);
      return;
    }
    this._observer = new MutationObserver(() => {
      if (!section.classList.contains('hidden')) {
        this._tryActivate();
      }
    });
    this._observer.observe(section, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  _tryActivate() {
    if (this.activated) return;

    if (!auth.getUser() || !auth.getUser().id) {
      auth.loadSession();
    }
    const user = auth.getUser();
    if (!user || !user.id) return;

    this.activated = true;
    this._buildUI();
    this._injectModals();
    this._loadSedes();
    this._loadGrupos();
    this._bindEvents();
    // Carga automática del año actual al abrir el módulo
    this.loadStudents(this.currentYear);
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  MODAL INJECTION                                                  */
  /* ──────────────────────────────────────────────────────────────── */

  /** Estilos del modal de estudiante — Soft-UI Evolution, marca #543391. */
  _injectStyles() {
    if (document.getElementById('estu-modal-css')) return;
    const style = document.createElement('style');
    style.id = 'estu-modal-css';
    style.textContent = `
      .estu-modal{ --brand:#543391; --brand-2:#7c5cc4; --accent:#059669; --ink:#0f172a; --muted:#64748b;
        --line:#e6e2f2; --field:#f7f6fb; }
      .estu-modal .estu-card{
        box-shadow:0 40px 90px -30px rgba(48,29,89,.55), 0 12px 30px -12px rgba(48,29,89,.28);
        animation:estuCardIn .42s cubic-bezier(.2,.9,.25,1) both;
        border:1px solid rgba(124,92,196,.18);
      }
      @keyframes estuCardIn{ from{ opacity:0; transform:translateY(18px) scale(.975); } to{ opacity:1; transform:none; } }
      @media (prefers-reduced-motion:reduce){ .estu-modal .estu-card{ animation:none; } .estu-modal *{ animation:none!important; transition:none!important; } }

      /* Header */
      .estu-modal .estu-header{ background:linear-gradient(120deg,#4a2d84 0%,#543391 45%,#6d49b8 100%); overflow:hidden; }
      .estu-modal .estu-header-glow{ position:absolute; inset:0;
        background:radial-gradient(120% 140% at 88% -20%, rgba(255,255,255,.28), transparent 55%),
                   radial-gradient(90% 120% at 8% 120%, rgba(5,150,105,.35), transparent 60%);
        pointer-events:none; }
      .estu-modal .estu-avatar{ width:56px; height:56px; border-radius:18px;
        display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.5rem; color:#fff;
        background:linear-gradient(140deg, rgba(255,255,255,.28), rgba(255,255,255,.08));
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.35), 0 8px 20px -8px rgba(0,0,0,.5);
        text-shadow:0 1px 2px rgba(0,0,0,.25); }
      .estu-modal .estu-chip{ display:inline-flex; align-items:center; gap:.35rem; font-size:.72rem; font-weight:600;
        color:#fff; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.22);
        padding:.2rem .6rem; border-radius:999px; backdrop-filter:blur(6px); max-width:15rem; }
      .estu-modal .estu-chip span{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .estu-modal .estu-chip-soft{ background:rgba(5,150,105,.28); border-color:rgba(255,255,255,.25); }
      .estu-modal .estu-close{ width:40px; height:40px; border-radius:12px; color:#fff;
        display:flex; align-items:center; justify-content:center; font-size:1rem;
        background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); transition:all .2s ease; }
      .estu-modal .estu-close:hover{ background:rgba(255,255,255,.24); transform:rotate(90deg); }

      /* Body layout */
      .estu-modal .estu-body{ background:#fff; }

      /* Step rail */
      .estu-modal .estu-rail{ display:flex; flex-direction:column; gap:.35rem; padding:1.25rem .9rem;
        width:15.5rem; flex:0 0 auto; background:linear-gradient(180deg,#faf9fe,#f3f0fb);
        border-right:1px solid var(--line); }
      .estu-modal .estu-step{ position:relative; display:flex; align-items:center; gap:.75rem; width:100%;
        padding:.7rem .8rem; border-radius:14px; text-align:left; color:var(--muted); background:transparent;
        border:1px solid transparent; transition:all .22s cubic-bezier(.2,.9,.25,1); cursor:pointer; }
      .estu-modal .estu-step:hover{ background:#fff; color:var(--ink); box-shadow:0 4px 14px -8px rgba(84,51,145,.4); }
      .estu-modal .estu-step-ic{ width:38px; height:38px; border-radius:11px; flex:0 0 auto;
        display:flex; align-items:center; justify-content:center; font-size:1.05rem;
        background:#ece7f8; color:var(--brand); transition:all .22s ease; }
      .estu-modal .estu-step-tx{ display:flex; flex-direction:column; line-height:1.15; min-width:0; }
      .estu-modal .estu-step-t{ font-weight:600; font-size:.85rem; }
      .estu-modal .estu-step-s{ font-size:.7rem; opacity:.7; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .estu-modal .estu-step[data-active="true"]{ color:#fff;
        background:linear-gradient(130deg,var(--brand),var(--brand-2));
        box-shadow:0 12px 24px -12px rgba(84,51,145,.75); border-color:rgba(255,255,255,.25); }
      .estu-modal .estu-step[data-active="true"] .estu-step-ic{ background:rgba(255,255,255,.22); color:#fff; }
      .estu-modal .estu-step[data-active="true"] .estu-step-s{ opacity:.85; }

      /* Content */
      .estu-modal .estu-content{ padding:1.5rem 1.75rem; background:#fff; }
      .estu-modal .estu-pane-in{ animation:estuPane .32s cubic-bezier(.2,.9,.25,1) both; }
      @keyframes estuPane{ from{ opacity:0; transform:translateY(8px); } to{ opacity:1; transform:none; } }
      .estu-modal fieldset{ background:transparent!important; border-left:none!important; padding:0!important; margin:0!important; }
      .estu-modal legend{ margin-bottom:1.1rem!important; }

      /* Fields — floating soft-ui */
      .estu-modal label{ letter-spacing:.02em; }
      .estu-modal input,.estu-modal select,.estu-modal textarea{
        background:var(--field)!important; border:1px solid transparent!important; border-radius:12px!important;
        box-shadow:inset 0 1px 2px rgba(48,29,89,.06); transition:all .18s ease; }
      .estu-modal input:hover,.estu-modal select:hover,.estu-modal textarea:hover{ background:#f2effa!important; }
      .estu-modal input:focus,.estu-modal select:focus,.estu-modal textarea:focus{
        background:#fff!important; border-color:var(--brand)!important;
        box-shadow:0 0 0 4px rgba(84,51,145,.14)!important; }
      .estu-modal input[readonly]{ background:#eef1f6!important; color:#64748b; cursor:not-allowed;
        box-shadow:none; }

      /* Footer */
      .estu-modal .estu-footer{ background:linear-gradient(180deg,#faf9fe,#f3f0fb); border-top:1px solid var(--line); }
      .estu-modal .estu-foot-hint{ align-items:center; gap:.4rem; font-size:.75rem; color:var(--muted); }
      .estu-modal .estu-save{ position:relative; overflow:hidden; display:inline-flex; align-items:center; gap:.5rem;
        padding:.7rem 1.35rem; font-size:.875rem; font-weight:600; color:#fff; border-radius:14px; cursor:pointer;
        background:linear-gradient(130deg,var(--brand),var(--brand-2));
        box-shadow:0 12px 26px -10px rgba(84,51,145,.7); transition:transform .15s ease, box-shadow .2s ease; }
      .estu-modal .estu-save:hover{ transform:translateY(-1px); box-shadow:0 16px 32px -10px rgba(84,51,145,.85); }
      .estu-modal .estu-save:active{ transform:translateY(0) scale(.98); }
      .estu-modal .estu-save-sheen{ position:absolute; top:0; left:-120%; width:60%; height:100%;
        background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent); transform:skewX(-18deg);
        transition:left .55s ease; }
      .estu-modal .estu-save:hover .estu-save-sheen{ left:140%; }

      /* Mobile: rail becomes top scroller */
      @media (max-width:767px){
        .estu-modal .estu-rail{ flex-direction:row; width:auto; overflow-x:auto; gap:.5rem;
          padding:.75rem .9rem; border-right:none; border-bottom:1px solid var(--line); }
        .estu-modal .estu-step{ flex-direction:column; align-items:center; gap:.35rem; min-width:5.5rem; padding:.6rem .5rem; }
        .estu-modal .estu-step-s{ display:none; }
        .estu-modal .estu-step-t{ font-size:.72rem; }
        .estu-modal .estu-content{ padding:1.1rem 1.1rem; }
      }
    `;
    document.head.appendChild(style);
  }

  _injectModals() {
    if (this._modalsInjected) return;
    this._modalsInjected = true;

    const container = document.getElementById('modal-container');
    if (!container) return;

    this._injectStyles();
    container.insertAdjacentHTML('beforeend', this._editModalHTML());
    container.insertAdjacentHTML('beforeend', this._historyModalHTML());
    container.insertAdjacentHTML('beforeend', this._changeGroupModalHTML());
    container.insertAdjacentHTML('beforeend', this._printCodesModalHTML());
  }

  _editModalHTML() {
    return `
<div id="modalEstugrupos" class="estu-modal modal fixed inset-0 z-[1056] flex items-center justify-center hidden p-3 sm:p-6">
  <div class="estu-card relative z-[1060] w-full max-w-5xl bg-white rounded-3xl overflow-hidden flex flex-col max-h-[94vh]">
    <!-- Header -->
    <div class="estu-header relative px-6 sm:px-8 py-5 sm:py-6">
      <div class="estu-header-glow"></div>
      <div class="relative flex items-center justify-between gap-4">
        <div class="flex items-center gap-4 min-w-0">
          <div class="estu-avatar shrink-0" id="estuAvatarInitial">E</div>
          <div class="min-w-0">
            <h5 class="text-lg sm:text-xl font-semibold text-white leading-tight truncate" id="estuModalName">Información del Estudiante</h5>
            <div class="flex items-center gap-2 mt-1">
              <span class="estu-chip" id="estuModalId"><i class="bi bi-hash"></i><span>—</span></span>
              <span class="estu-chip estu-chip-soft" id="estuModalGrado"><i class="bi bi-mortarboard-fill"></i><span>—</span></span>
            </div>
          </div>
        </div>
        <button type="button" class="estu-close shrink-0" data-modal-dismiss="modalEstugrupos" id="btnCloseModalEstu" aria-label="Cerrar">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="estu-body flex-1 flex flex-col md:flex-row min-h-0">

      <form id="frmEstugrupos" class="needs-validation contents" novalidate>
        <input type="hidden" id="eind">
        <input type="hidden" id="eeditando" value="false">

        <!-- Step rail -->
        <nav class="estu-rail" role="tablist" aria-label="Secciones del formulario">
          <button type="button" class="tab-btn estu-step" data-tab="datose" data-active="true" role="tab" aria-selected="true" aria-controls="tab-datose">
            <span class="estu-step-ic"><i class="bi bi-person-vcard"></i></span>
            <span class="estu-step-tx"><span class="estu-step-t">Estudiante</span><span class="estu-step-s">Datos personales</span></span>
          </button>
          <button type="button" class="tab-btn estu-step" data-tab="datosacademicos" role="tab" aria-selected="false" aria-controls="tab-datosacademicos">
            <span class="estu-step-ic"><i class="bi bi-mortarboard"></i></span>
            <span class="estu-step-tx"><span class="estu-step-t">Académica</span><span class="estu-step-s">Grupo y estado</span></span>
          </button>
          <button type="button" class="tab-btn estu-step" data-tab="datospadres" role="tab" aria-selected="false" aria-controls="tab-datospadres">
            <span class="estu-step-ic"><i class="bi bi-people"></i></span>
            <span class="estu-step-tx"><span class="estu-step-t">Familia</span><span class="estu-step-s">Padres y acudiente</span></span>
          </button>
          <button type="button" class="tab-btn estu-step" data-tab="referencial" role="tab" aria-selected="false" aria-controls="tab-referencial">
            <span class="estu-step-ic"><i class="bi bi-clipboard-data"></i></span>
            <span class="estu-step-tx"><span class="estu-step-t">Referencial</span><span class="estu-step-s">Datos sociales</span></span>
          </button>
        </nav>

        <!-- Tab Content -->
        <div class="tab-content-wrapper estu-content flex-1 overflow-y-auto">
          <!-- Tab 1: Datos del Estudiante -->
          <div class="tab-pane active" id="tab-datose">
            <fieldset class="border-0 rounded-xl p-5 mb-4" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #0078D4;">
              <legend class="text-sm font-semibold text-[#0078D4] flex items-center gap-2 mb-3 px-2">
                <i class="bi bi-person-badge"></i> Información de Identificación
              </legend>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label for="ecodigo" class="block text-xs font-medium text-gray-600 mb-1">Código</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed outline-none transition-all" id="ecodigo" placeholder="Código" readonly>
                </div>
                <div>
                  <label for="eestudiante" class="block text-xs font-medium text-gray-600 mb-1">Identificación</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed outline-none transition-all" id="eestudiante" placeholder="Identificación" readonly>
                </div>
                <div>
                  <label for="etdei" class="block text-xs font-medium text-gray-600 mb-1">Tipo de Documento</label>
                  <select id="etdei" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all">
                    <option value="">Seleccione...</option>
                    <option value="RC">Registro Civil</option>
                    <option value="TI">Tarjeta de Identidad</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PA">Pasaporte</option>
                    <option value="NES">Número Establecido por Secretaría</option>
                    <option value="PPT">Permiso de Permanencia Temporal</option>
                  </select>
                </div>
                <div>
                  <label for="eyear" class="block text-xs font-medium text-gray-600 mb-1">Año</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed outline-none transition-all" id="eyear" placeholder="Año" readonly>
                </div>
              </div>
              <div class="mb-4">
                <label for="enombres" class="block text-xs font-medium text-gray-600 mb-1">Nombres</label>
                <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="enombres" placeholder="Ingrese los nombres">
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label for="egenero" class="block text-xs font-medium text-gray-600 mb-1">Género</label>
                  <select id="egenero" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all">
                    <option value="">Seleccione...</option>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                    <option value="No binario">No binario</option>
                    <option value="Género fluido">Género fluido</option>
                    <option value="Prefiere no decir">Prefiere no decir</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label for="efecnac" class="block text-xs font-medium text-gray-600 mb-1">Fecha Nacimiento</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="efecnac" placeholder="AAAA-MM-DD">
                </div>
                <div>
                  <label for="etipoSangre" class="block text-xs font-medium text-gray-600 mb-1">Tipo de sangre</label>
                  <select id="etipoSangre" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all">
                    <option value="">Seleccione...</option>
                    <option value="NO REPORTA">NO REPORTA</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label for="eeps" class="block text-xs font-medium text-gray-600 mb-1">EPS</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="eeps" placeholder="EPS">
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label for="elugarNacimiento" class="block text-xs font-medium text-gray-600 mb-1">Lugar Nacimiento</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="elugarNacimiento" placeholder="Municipio">
                </div>
                <div>
                  <label for="elugarExpedicion" class="block text-xs font-medium text-gray-600 mb-1">Lugar Expedición</label>
                  <input type="text" list="expediList" id="elugarExpedicion" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" placeholder="Municipio">
                  <datalist id="expediList"></datalist>
                </div>
                <div>
                  <label for="efechaExpedicion" class="block text-xs font-medium text-gray-600 mb-1">Fecha Expedición</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="efechaExpedicion" placeholder="AAAA-MM-DD">
                </div>
                <div>
                  <label for="eemail_estudiante" class="block text-xs font-medium text-gray-600 mb-1">Email Estudiante</label>
                  <input type="email" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="eemail_estudiante" placeholder="email@ejemplo.com">
                </div>
              </div>
            </fieldset>
          </div>

          <!-- Tab 2: Información Académica -->
          <div class="tab-pane hidden" id="tab-datosacademicos">
            <fieldset class="border-0 rounded-xl p-5 mb-4" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #107C10;">
              <legend class="text-sm font-semibold text-[#107C10] flex items-center gap-2 mb-3 px-2">
                <i class="bi bi-book"></i> Información Académica
              </legend>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label for="enivel" class="block text-xs font-medium text-gray-600 mb-1">Nivel</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed outline-none transition-all" id="enivel" readonly>
                </div>
                <div>
                  <label for="enumero" class="block text-xs font-medium text-gray-600 mb-1">Número</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed outline-none transition-all" id="enumero" readonly>
                </div>
                <div>
                  <label for="egrado" class="block text-xs font-medium text-gray-600 mb-1">Grado</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed outline-none transition-all" id="egrado" readonly>
                </div>
                <div>
                  <label for="esede" class="block text-xs font-medium text-gray-600 mb-1">Sede</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed outline-none transition-all" id="esede" readonly>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label for="eactivo" class="block text-xs font-medium text-gray-600 mb-1">Activo</label>
                  <select id="eactivo" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#107C10]/20 focus:border-[#107C10] outline-none transition-all">
                    <option value="S">Sí</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label for="ebanda" class="block text-xs font-medium text-gray-600 mb-1">Banda</label>
                  <select id="ebanda" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#107C10]/20 focus:border-[#107C10] outline-none transition-all">
                    <option value="">Ninguna</option>
                    <option value="S">Sí</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label for="eHED" class="block text-xs font-medium text-gray-600 mb-1">HED</label>
                  <select id="eHED" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#107C10]/20 focus:border-[#107C10] outline-none transition-all">
                    <option value="">No</option>
                    <option value="S">Sí</option>
                  </select>
                </div>
                <div>
                  <label for="edesertor" class="block text-xs font-medium text-gray-600 mb-1">Desertor</label>
                  <select id="edesertor" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#107C10]/20 focus:border-[#107C10] outline-none transition-all">
                    <option value="">No</option>
                    <option value="S">Sí</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="einstitucion_externa" class="block text-xs font-medium text-gray-600 mb-1">Institución Externa</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#107C10]/20 focus:border-[#107C10] outline-none transition-all" id="einstitucion_externa" placeholder="Institución de procedencia">
                </div>
                <div>
                  <label for="eestado" class="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#107C10]/20 focus:border-[#107C10] outline-none transition-all" id="eestado" placeholder="Estado">
                </div>
              </div>
            </fieldset>
          </div>

          <!-- Tab 3: Padres y Acudientes -->
          <div class="tab-pane hidden" id="tab-datospadres">
            <fieldset class="border-0 rounded-xl p-5 mb-4" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #8764B8;">
              <legend class="text-sm font-semibold text-[#8764B8] flex items-center gap-2 mb-3 px-2">
                <i class="bi bi-person-heart"></i> Datos del Acudiente
              </legend>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label for="eacudiente" class="block text-xs font-medium text-gray-600 mb-1">Nombre del Acudiente</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="eacudiente" placeholder="Nombre">
                </div>
                <div>
                  <label for="eidacudiente" class="block text-xs font-medium text-gray-600 mb-1">Documento Acudiente</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="eidacudiente" placeholder="N° documento">
                </div>
                <div>
                  <label for="eparentesco" class="block text-xs font-medium text-gray-600 mb-1">Parentesco</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="eparentesco" placeholder="Ej: Madre, Padre, Tío">
                </div>
                <div>
                  <label for="etelefono_acudiente" class="block text-xs font-medium text-gray-600 mb-1">Teléfono Acudiente</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="etelefono_acudiente" placeholder="Teléfono">
                </div>
                <div>
                  <label for="eemail_acudiente" class="block text-xs font-medium text-gray-600 mb-1">Email Acudiente</label>
                  <input type="email" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="eemail_acudiente" placeholder="email@ejemplo.com">
                </div>
                <div>
                  <label for="edireccion" class="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="edireccion" placeholder="Dirección de residencia">
                </div>
                <div>
                  <label for="etelefono1" class="block text-xs font-medium text-gray-600 mb-1">Teléfono 1</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="etelefono1" placeholder="Teléfono">
                </div>
                <div>
                  <label for="etelefono2" class="block text-xs font-medium text-gray-600 mb-1">Teléfono 2</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] outline-none transition-all" id="etelefono2" placeholder="Teléfono alterno">
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                <!-- Padre -->
                <div class="bg-white/60 rounded-lg p-4 border border-gray-100">
                  <h6 class="text-xs font-semibold text-[#8764B8] uppercase tracking-wide mb-3 flex items-center gap-1.5"><i class="bi bi-person"></i> Padre</h6>
                  <div class="space-y-3">
                    <div>
                      <label for="epadre" class="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                      <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8764B8]/20 focus:border-[#8764B8] outline-none transition-all" id="epadre" placeholder="Nombre del padre">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label for="epadreid" class="block text-xs font-medium text-gray-600 mb-1">Documento</label>
                        <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8764B8]/20 focus:border-[#8764B8] outline-none transition-all" id="epadreid" placeholder="N° doc.">
                      </div>
                      <div>
                        <label for="etelefonopadre" class="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                        <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8764B8]/20 focus:border-[#8764B8] outline-none transition-all" id="etelefonopadre" placeholder="Teléfono">
                      </div>
                    </div>
                    <div>
                      <label for="eocupacionpadre" class="block text-xs font-medium text-gray-600 mb-1">Ocupación</label>
                      <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8764B8]/20 focus:border-[#8764B8] outline-none transition-all" id="eocupacionpadre" placeholder="Ocupación">
                    </div>
                  </div>
                </div>
                <!-- Madre -->
                <div class="bg-white/60 rounded-lg p-4 border border-gray-100">
                  <h6 class="text-xs font-semibold text-[#8764B8] uppercase tracking-wide mb-3 flex items-center gap-1.5"><i class="bi bi-person"></i> Madre</h6>
                  <div class="space-y-3">
                    <div>
                      <label for="emadre" class="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                      <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8764B8]/20 focus:border-[#8764B8] outline-none transition-all" id="emadre" placeholder="Nombre de la madre">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label for="emadreid" class="block text-xs font-medium text-gray-600 mb-1">Documento</label>
                        <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8764B8]/20 focus:border-[#8764B8] outline-none transition-all" id="emadreid" placeholder="N° doc.">
                      </div>
                      <div>
                        <label for="etelefonomadre" class="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                        <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8764B8]/20 focus:border-[#8764B8] outline-none transition-all" id="etelefonomadre" placeholder="Teléfono">
                      </div>
                    </div>
                    <div>
                      <label for="eocupacionmadre" class="block text-xs font-medium text-gray-600 mb-1">Ocupación</label>
                      <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8764B8]/20 focus:border-[#8764B8] outline-none transition-all" id="eocupacionmadre" placeholder="Ocupación">
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>

          <!-- Tab 4: Información Referencial -->
          <div class="tab-pane hidden" id="tab-referencial">
            <fieldset class="border-0 rounded-xl p-5 mb-4" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #D83B01;">
              <legend class="text-sm font-semibold text-[#D83B01] flex items-center gap-2 mb-3 px-2">
                <i class="bi bi-info-circle"></i> Información Referencial
              </legend>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label for="eetnia" class="block text-xs font-medium text-gray-600 mb-1">Etnia</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D83B01]/20 focus:border-[#D83B01] outline-none transition-all" id="eetnia" placeholder="Etnia">
                </div>
                <div>
                  <label for="ediscapacidad" class="block text-xs font-medium text-gray-600 mb-1">Discapacidad</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D83B01]/20 focus:border-[#D83B01] outline-none transition-all" id="ediscapacidad" placeholder="Discapacidad (si aplica)">
                </div>
                <div>
                  <label for="eestrato" class="block text-xs font-medium text-gray-600 mb-1">Estrato</label>
                  <select id="eestrato" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#D83B01]/20 focus:border-[#D83B01] outline-none transition-all">
                    <option value="">Seleccione...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </div>
                <div>
                  <label for="esisben" class="block text-xs font-medium text-gray-600 mb-1">SISBEN</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D83B01]/20 focus:border-[#D83B01] outline-none transition-all" id="esisben" placeholder="Grupo SISBEN">
                </div>
                <div>
                  <label for="evictimaConflicto" class="block text-xs font-medium text-gray-600 mb-1">Víctima Conflicto</label>
                  <select id="evictimaConflicto" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#D83B01]/20 focus:border-[#D83B01] outline-none transition-all">
                    <option value="">No</option>
                    <option value="S">Sí</option>
                  </select>
                </div>
                <div>
                  <label for="elugarDesplazamiento" class="block text-xs font-medium text-gray-600 mb-1">Lugar Desplazamiento</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D83B01]/20 focus:border-[#D83B01] outline-none transition-all" id="elugarDesplazamiento" placeholder="Lugar">
                </div>
                <div>
                  <label for="efechaDesplazamiento" class="block text-xs font-medium text-gray-600 mb-1">Fecha Desplazamiento</label>
                  <input type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D83B01]/20 focus:border-[#D83B01] outline-none transition-all" id="efechaDesplazamiento" placeholder="AAAA-MM-DD">
                </div>
              </div>
              <div>
                <label for="eotraInformacion" class="block text-xs font-medium text-gray-600 mb-1">Otra Información</label>
                <textarea id="eotraInformacion" rows="3" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D83B01]/20 focus:border-[#D83B01] outline-none transition-all" placeholder="Observaciones adicionales"></textarea>
              </div>
            </fieldset>
          </div>
        </div>
      </form>
    </div>

    <!-- Footer -->
    <div class="estu-footer flex items-center justify-between gap-3 px-6 sm:px-8 py-4">
      <span class="estu-foot-hint hidden sm:flex"><i class="bi bi-shield-lock"></i> Los cambios se guardan al confirmar</span>
      <div class="flex items-center gap-3 ml-auto">
      <button type="button" data-modal-dismiss="modalEstugrupos"
              class="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all">
        Cancelar
      </button>
      <button type="button" id="btnSaveEstudiante" class="estu-save">
        <span class="estu-save-sheen"></span>
        <i class="bi bi-check-lg"></i> <span>Guardar Cambios</span>
      </button>
      </div>
    </div>
  </div>
</div>`;
  }

  _historyModalHTML() {
    return `
<div id="modalHgrupos" class="modal fixed inset-0 z-[1056] flex items-center justify-center hidden">
  <div class="relative z-[1060] w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100" style="background: linear-gradient(135deg, #107C10 0%, #0D6B0D 100%);">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
          <i class="bi bi-clock-history text-sm"></i>
        </div>
        <div>
          <h5 class="text-base font-semibold text-white">Historial del Estudiante</h5>
          <p class="text-xs text-white/70" id="historialStudentName">Cargando...</p>
        </div>
      </div>
      <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" data-modal-dismiss="modalHgrupos">
        <i class="bi bi-x-lg text-sm"></i>
      </button>
    </div>
    <div class="overflow-y-auto p-6 bg-gray-50 flex-1">
      <div id="histgrupos" class="overflow-x-auto">
        <div class="flex justify-center py-12">
          <div class="w-10 h-10 border-4 border-[#107C10] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
      <button type="button" data-modal-dismiss="modalHgrupos"
              class="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all">
        Cerrar
      </button>
    </div>
  </div>
</div>`;
  }

  _changeGroupModalHTML() {
    return `
<div id="modalCHGgrupos" class="modal fixed inset-0 z-[1056] flex items-center justify-center hidden">
  <div class="relative z-[1060] w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100" style="background: linear-gradient(135deg, #D83B01 0%, #B32D00 100%);">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
          <i class="bi bi-shuffle text-sm"></i>
        </div>
        <div>
          <h5 class="text-base font-semibold text-white">Cambiar Grupo</h5>
          <p class="text-xs text-white/70" id="chgest">Seleccione un nuevo grupo</p>
        </div>
      </div>
      <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" data-modal-dismiss="modalCHGgrupos">
        <i class="bi bi-x-lg text-sm"></i>
      </button>
    </div>
    <div class="p-6">
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nuevo Grupo</label>
          <select id="nuevo_grado" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#D83B01]/30 focus:border-[#D83B01] outline-none transition-all">
            <option value="">Cargando grados disponibles...</option>
          </select>
        </div>
        <div class="flex items-center gap-2 mt-4">
          <input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-[#D83B01] focus:ring-[#D83B01]" id="chkChangeGroupConfirm">
          <label class="text-sm text-gray-600" for="chkChangeGroupConfirm">Confirmar cambio de grupo</label>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
      <button type="button" data-modal-dismiss="modalCHGgrupos"
              class="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all">
        Cancelar
      </button>
      <button type="button" id="btnConfirmChangeGroup"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D83B01] hover:bg-[#B32D00] text-white font-medium rounded-xl shadow-sm transition-all text-sm"
              disabled>
        <i class="bi bi-shuffle"></i> Cambiar Grupo
        <span class="spinner-border spinner-border-sm hidden"></span>
      </button>
    </div>
  </div>
</div>`;
  }

  _printCodesModalHTML() {
    return `
<div id="modalPrtCodigos" class="modal fixed inset-0 z-[1056] flex items-center justify-center hidden">
  <div class="relative z-[1060] w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl h-[80vh] flex flex-col">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100" style="background: linear-gradient(135deg, #323130 0%, #201f1e 100%);">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
          <i class="bi bi-printer text-sm"></i>
        </div>
        <div>
          <h5 class="text-base font-semibold text-white">Código QR</h5>
          <p class="text-xs text-white/70" id="codigoStudentLabel">Código del estudiante</p>
        </div>
      </div>
      <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" data-modal-dismiss="modalPrtCodigos">
        <i class="bi bi-x-lg text-sm"></i>
      </button>
    </div>
    <div class="flex-1 bg-gray-100 p-4">
      <iframe id="ifrmprtcodigo" class="w-full h-full rounded-xl bg-white shadow-inner" style="border:none;"></iframe>
    </div>
    <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
      <button type="button" data-modal-dismiss="modalPrtCodigos"
              class="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all">
        Cerrar
      </button>
    </div>
  </div>
</div>`;
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  UI CONSTRUCTION                                                */
  /* ──────────────────────────────────────────────────────────────── */

  _buildUI() {
    const container = $('seccionControlEstudiantes');
    if (!container) return;

    const currentYear = this.currentYear;

    container.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h2 class="section-heading mb-0">
          <i class="bi bi-people-fill text-[#543391]"></i> Control de Estudiantes
        </h2>
      </div>

      <!-- ── Toolbar ── -->
      <div class="glass-card p-3 mb-4">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-1">
            <button id="btnSearchEstu" class="px-3 py-2 bg-[#543391] hover:bg-[#6f4ab3] text-white rounded-lg transition-all text-sm flex items-center gap-1" title="Buscar">
              <i class="bi bi-search"></i>
            </button>
            <button id="btnNewEstu" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-sm flex items-center gap-1" title="Nuevo estudiante">
              <i class="bi bi-lightbulb"></i>
            </button>
            <button id="btnListEstu" class="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-all text-sm flex items-center gap-1" title="Lista de matriculación">
              <i class="bi bi-download"></i>
            </button>
            <button id="btnCodesEstu" class="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all text-sm flex items-center gap-1" title="Códigos">
              <i class="bi bi-qr-code"></i>
            </button>
            <button id="btnPrintCodes" class="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all text-sm flex items-center gap-1" title="Imprimir códigos">
              <i class="bi bi-printer"></i>
            </button>
          </div>

          <div class="flex items-center gap-1">
            <select id="yearControlEstu" class="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#543391] outline-none">
              ${Array.from({length: 8}, (_, i) => {
                const y = currentYear + 1 - i;
                return `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
              }).join('')}
            </select>
            <button id="btnGoYear" class="px-3 py-2 bg-[#543391] hover:bg-[#6f4ab3] text-white rounded-lg transition-all text-sm">Ir</button>
          </div>

          <div class="flex items-center gap-1">
            <div class="relative">
              <button id="btnFilterStatus" class="px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm flex items-center gap-1 transition-all">
                <i class="bi bi-funnel"></i> <span id="filterStatusLabel">Filtros</span>
              </button>
              <div id="filterStatusDropdown" class="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[160px] hidden overflow-hidden">
                <a class="block px-4 py-2 text-sm hover:bg-[#543391]/5 cursor-pointer" data-filter="f0">Activos</a>
                <a class="block px-4 py-2 text-sm hover:bg-[#543391]/5 cursor-pointer" data-filter="f1">Inactivos</a>
                <a class="block px-4 py-2 text-sm hover:bg-[#543391]/5 cursor-pointer" data-filter="f2">Desertores</a>
                <a class="block px-4 py-2 text-sm hover:bg-[#543391]/5 cursor-pointer" data-filter="f3">Banda</a>
                <a class="block px-4 py-2 text-sm hover:bg-[#543391]/5 cursor-pointer" data-filter="f4">HED</a>
                <hr class="my-1 border-gray-100">
                <a class="block px-4 py-2 text-sm hover:bg-[#543391]/5 cursor-pointer text-red-500" data-filter="fb">Borrar Filtro</a>
              </div>
            </div>

            <div class="relative">
              <button id="btnFilterSede" class="px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm flex items-center gap-1 transition-all">
                <i class="bi bi-building"></i> <span id="filterSedeLabel">Sede</span>
              </button>
              <div id="filterSedeDropdown" class="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[180px] hidden overflow-hidden">
                <div id="filterSedeList"></div>
                <hr class="my-1 border-gray-100">
                <a class="block px-4 py-2 text-sm hover:bg-[#543391]/5 cursor-pointer text-red-500" data-sede="fb">Borrar Filtro</a>
              </div>
            </div>

            <div class="relative">
              <button id="btnFilterGrado" class="px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm flex items-center gap-1 transition-all">
                <i class="bi bi-mortarboard"></i> <span id="filterGradoLabel">Grados</span>
              </button>
              <div id="filterGradoDropdown" class="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[160px] hidden overflow-hidden">
                <div id="filterGradoList"></div>
                <hr class="my-1 border-gray-100">
                <a class="block px-4 py-2 text-sm hover:bg-[#543391]/5 cursor-pointer text-red-500" data-grado="fb">Borrar Filtro</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Search bar ── -->
      <div class="glass-card p-3 mb-4">
        <div class="relative" role="search">
          <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input type="text" id="searchControlEstu" placeholder="Buscar estudiantes por nombre, código, sede..."
                 class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all bg-white">
        </div>
      </div>

      <!-- ── Table ── -->
      <div class="glass-card p-0 overflow-hidden">
        <div class="overflow-x-auto" id="tableControlEstuWrapper">
          <table class="w-full text-sm" id="tableControlEstu">
            <thead>
              <tr class="bg-gray-50 border-b-2 border-gray-200">
                <th class="text-center px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="index">#</th>
                <th class="text-center px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider" colspan="4">Acciones</th>
                <th class="px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="codigo">
                  <i class="bi bi-qr-code text-[#543391] mr-1"></i>Código
                </th>
                <th class="px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="estudiante">
                  <i class="bi bi-person-badge text-[#543391] mr-1"></i>Estudiante
                </th>
                <th class="px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="nombres">
                  <i class="bi bi-type text-[#543391] mr-1"></i>Nombres
                </th>
                <th class="px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="sede">
                  <i class="bi bi-building text-emerald-600 mr-1"></i>Sede
                </th>
                <th class="text-center px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="genero">
                  <i class="bi bi-gender-ambiguous text-purple-500 mr-1"></i>Género
                </th>
                <th class="text-center px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="edad">
                  <i class="bi bi-calendar-check text-amber-600 mr-1"></i>Edad
                </th>
                <th class="text-center px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="grado">
                  <i class="bi bi-mortarboard text-[#543391] mr-1"></i>Grado
                </th>
                <th class="text-center px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="year">
                  <i class="bi bi-calendar3 mr-1"></i>Año
                </th>
                <th class="text-center px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="activo">
                  <i class="bi bi-toggle-on text-emerald-600 mr-1"></i>Activo
                </th>
                <th class="text-center px-3 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100" data-col="hed">
                  <i class="bi bi-heart-pulse text-red-500 mr-1"></i>HED
                </th>
              </tr>
            </thead>
            <tbody id="controlEstuBody">
              <tr><td colspan="15" class="text-center py-12 text-gray-400">
                <i class="bi bi-inbox text-4xl block mb-2"></i>
                Seleccione un año y presione "Ir" para cargar estudiantes
              </td></tr>
            </tbody>
          </table>
        </div>
        <div id="controlEstuSpinner" class="hidden flex justify-center py-6">
          <div class="w-10 h-10 border-4 border-[#543391] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <!-- ── Pagination ── -->
        <div id="controlEstuPager" class="hidden flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/60">
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span id="pagerInfo">—</span>
            <select id="pagerSize" class="ml-2 px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#543391] outline-none">
              <option value="25">25 / pág.</option>
              <option value="50" selected>50 / pág.</option>
              <option value="100">100 / pág.</option>
              <option value="200">200 / pág.</option>
            </select>
          </div>
          <div class="flex items-center gap-1" id="pagerControls"></div>
        </div>
      </div>
    `;
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  DATA LOADING                                                   */
  /* ──────────────────────────────────────────────────────────────── */

  async _loadSedes() {
    try {
      const res = await filters.getSedes();
      this.sedes = Array.isArray(res) ? res : (res?.data || []);
      this._renderSedeFilters();
    } catch { /* ignore */ }
  }

  async _loadGrupos() {
    try {
      const res = await filters.getNiveles('', this.currentYear);
      this.grupos = Array.isArray(res) ? res : (res?.data || []);
    } catch { /* ignore */ }
  }

  async loadStudents(year) {
    const spinner = $('controlEstuSpinner');
    const tbody = $('controlEstuBody');
    if (!tbody) return;
    if (spinner) spinner.classList.remove('hidden');

    tbody.innerHTML = '<tr><td colspan="15" class="text-center py-8"><div class="w-8 h-8 border-4 border-[#543391] border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>';

    try {
      const allStudents = await this._fetchAllStudents(year);
      this.students = allStudents;
      this.page = 1;
      this._applyFiltersAndRender();
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="15" class="text-center py-8 text-red-500">
        <i class="bi bi-exclamation-triangle text-2xl block mb-2"></i>
        Error al cargar estudiantes: ${escapeHtml(error.message)}
      </td></tr>`;
    } finally {
      if (spinner) spinner.classList.add('hidden');
    }
  }

  async _fetchAllStudents(year) {
    return estudiantes.getGroup(year);
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  SEDE / GRADO FILTER POPULATION                                 */
  /* ──────────────────────────────────────────────────────────────── */

  _renderSedeFilters() {
    const list = $('filterSedeList');
    if (!list) return;
    list.innerHTML = this.sedes.map(s =>
      `<a class="block px-4 py-2 text-sm hover:bg-[#543391]/5 cursor-pointer" data-sede="${s.ind || s.value}" data-nsede="${s.sede || s.label}">${s.sede || s.label}</a>`
    ).join('');
  }

  _renderGradoFilters(sedeId, nsede) {
    const list = $('filterGradoList');
    if (!list) return;

    const grados = this.grupos.filter(g => g.asignacion == sedeId || g.sede == sedeId);
    if (grados.length === 0) {
      list.innerHTML = '<div class="px-4 py-2 text-sm text-gray-400">Sin grados para esta sede</div>';
      return;
    }
    list.innerHTML = grados.map(g => {
      const grado = `${g.nivel}-${g.numero}`;
      return `<a class="block px-4 py-2 text-sm hover:bg-[#543391]/5 cursor-pointer" data-grado="${grado}" data-nivel="${g.nivel}" data-numero="${g.numero}">${grado}</a>`;
    }).join('');
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  FILTERS + SORT + SEARCH                                        */
  /* ──────────────────────────────────────────────────────────────── */

  _applyFiltersAndRender() {
    // Cualquier cambio de filtro/orden vuelve a la primera página
    this.page = 1;
    let filtered = [...this.students];

    // Status filter
    const sf = this.activeFilters.status;
    if (sf === 'f0') filtered = filtered.filter(s => s.activo === 'S' || s.activo === '1');
    else if (sf === 'f1') filtered = filtered.filter(s => s.activo === 'N' || s.activo === '0');
    else if (sf === 'f2') filtered = filtered.filter(s => s.desertor === 'S' || s.activo === 'D');
    else if (sf === 'f3') filtered = filtered.filter(s => s.banda === 'S' || s.banda === '1');
    else if (sf === 'f4') filtered = filtered.filter(s => s.HED === 'S');

    // Sede filter
    if (this.activeFilters.sede) {
      filtered = filtered.filter(s => {
        const sedeName = s.sede || '';
        return sedeName.includes(this.activeFilters.sede);
      });
    }

    // Grado filter
    if (this.activeFilters.grado) {
      filtered = filtered.filter(s => {
        const grado = `${s.nivel}-${s.numero}`;
        return grado === this.activeFilters.grado;
      });
    }

    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const searchable = [
          s.codigo, s.estudiante, s.nombres, s.sede,
          `${s.nivel}-${s.numero}`, s.year
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(term);
      });
    }

    // Sort
    if (this.sortState.column) {
      filtered.sort((a, b) => {
        let aVal = this._getSortValue(a, this.sortState.column);
        let bVal = this._getSortValue(b, this.sortState.column);
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return this.sortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
        return this.sortState.direction === 'asc'
          ? aVal.localeCompare(bVal, 'es')
          : bVal.localeCompare(aVal, 'es');
      });
    }

    this.filteredStudents = filtered;
    // Clamp página al nuevo total
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    if (this.page > totalPages) this.page = totalPages;
    this._renderPage();
  }

  /** Renderiza la porción visible según página + pinta el paginador. */
  _renderPage() {
    const total = this.filteredStudents.length;
    const start = (this.page - 1) * this.pageSize;
    const slice = this.filteredStudents.slice(start, start + this.pageSize);
    this._renderTable(slice, start);
    this._renderPager(total, start, slice.length);
  }

  _renderPager(total, start, shown) {
    const pager = $('controlEstuPager');
    const info = $('pagerInfo');
    const controls = $('pagerControls');
    if (!pager || !controls) return;

    if (total === 0) { pager.classList.add('hidden'); return; }
    pager.classList.remove('hidden');

    const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    if (info) info.textContent = `${start + 1}–${start + shown} de ${total}`;

    const btn = (label, page, opts = {}) => {
      const { disabled = false, active = false, title = '' } = opts;
      if (page === '…') return `<span class="px-2 text-gray-400 text-sm">…</span>`;
      return `<button type="button" data-page="${page}" ${disabled ? 'disabled' : ''} title="${title}"
        class="min-w-8 h-8 px-2 rounded-lg text-sm font-medium transition-all ${
          active ? 'bg-[#543391] text-white shadow-sm'
                 : 'text-gray-600 hover:bg-[#543391]/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'
        }">${label}</button>`;
    };

    // Ventana de páginas: 1 … p-1 p p+1 … N
    const cur = this.page;
    const pages = new Set([1, totalPages, cur, cur - 1, cur + 1]);
    const list = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    let html = btn('<i class="bi bi-chevron-left"></i>', cur - 1, { disabled: cur === 1, title: 'Anterior' });
    let prev = 0;
    for (const p of list) {
      if (p - prev > 1) html += btn('…', '…');
      html += btn(String(p), p, { active: p === cur });
      prev = p;
    }
    html += btn('<i class="bi bi-chevron-right"></i>', cur + 1, { disabled: cur === totalPages, title: 'Siguiente' });
    controls.innerHTML = html;
  }

  _getSortValue(student, column) {
    switch (column) {
      case 'index': return parseInt(student.ind) || 0;
      case 'codigo': return student.codigo || '';
      case 'estudiante': return student.estudiante || '';
      case 'nombres': return student.nombres || '';
      case 'sede': return student.sede || '';
      case 'genero': return student.genero || '';
      case 'edad': return parseInt(student.edad) || 0;
      case 'grado': return `${student.nivel}-${student.numero}`;
      case 'year': return parseInt(student.year) || 0;
      case 'activo': return student.activo || '';
      case 'hed': return student.HED || '';
      default: return '';
    }
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  TABLE RENDERING                                                 */
  /* ──────────────────────────────────────────────────────────────── */

  _renderTable(data, offset = 0) {
    const tbody = $('controlEstuBody');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="15" class="text-center py-12 text-gray-400">
        <i class="bi bi-inbox text-4xl block mb-2"></i>
        No se encontraron estudiantes
      </td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((s, i) => {
      const index = offset + i;
      // JSON-safe data attribute for buttons (escape quotes)
      const dataStr = escapeHtml(JSON.stringify(s));
      const isActive = s.activo === 'S' || s.activo === '1';
      const hasHED = s.HED === 'S';
      const grado = `${s.nivel}-${s.numero}`;
      const genderIcon = s.genero === 'M' ? '👦' : (s.genero === 'F' ? '👧' : '🧑');

      return `
        <tr class="border-b border-gray-100 hover:bg-[#543391]/5 transition-colors" data-index="${index}">
          <td class="text-center px-3 py-3 text-gray-500 text-xs font-medium">${index + 1}</td>
          <td class="text-center px-1 py-3">
            <button class="fluent-btn-edit w-8 h-8 rounded-lg bg-[#543391]/10 hover:bg-[#543391] text-[#543391] hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-md" data-est='${dataStr}' title="Editar estudiante">
              <i class="bi bi-pencil-square text-sm"></i>
            </button>
          </td>
          <td class="text-center px-1 py-3">
            <button class="fluent-btn-history w-8 h-8 rounded-lg bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-md" data-est='${dataStr}' title="Ver historial">
              <i class="bi bi-clock-history text-sm"></i>
            </button>
          </td>
          <td class="text-center px-1 py-3">
            <button class="fluent-btn-change w-8 h-8 rounded-lg bg-amber-600/10 hover:bg-amber-600 text-amber-700 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-md" data-est='${dataStr}' title="Cambiar grupo">
              <i class="bi bi-shuffle text-sm"></i>
            </button>
          </td>
          <td class="text-center px-1 py-3">
            <button class="fluent-btn-printcode w-8 h-8 rounded-lg bg-gray-600/10 hover:bg-gray-600 text-gray-700 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-md" data-codigo="${escapeHtml(s.codigo || '')}" title="Imprimir código QR">
              <i class="bi bi-printer text-sm"></i>
            </button>
          </td>
          <td class="text-center px-3 py-3">
            <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-600">${escapeHtml(s.codigo || '')}</span>
          </td>
          <td class="text-center px-3 py-3 font-medium text-[#543391]">${escapeHtml(s.estudiante || '')}</td>
          <td class="px-3 py-3 text-gray-700">${escapeHtml(s.nombres || '')}</td>
          <td class="px-3 py-3 text-gray-600">${escapeHtml(s.sede || '')}</td>
          <td class="text-center px-3 py-3 text-xl">${genderIcon}</td>
          <td class="text-center px-3 py-3 text-gray-600">${s.edad || '-'}</td>
          <td class="text-center px-3 py-3">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              <i class="bi bi-mortarboard-fill text-xs"></i> ${grado}
            </span>
          </td>
          <td class="text-center px-3 py-3 text-gray-500 text-xs">${s.year || ''}</td>
          <td class="text-center px-3 py-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
            }">
              ${isActive ? '✓ Activo' : '✗ Inactivo'}
            </span>
          </td>
          <td class="text-center px-3 py-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              hasHED ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
            }">
              ${hasHED ? '❤️‍🩹 HED' : '💚 Normal'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  ACTION HANDLERS                                                 */
  /* ──────────────────────────────────────────────────────────────── */

  _onEditStudent(data) {
    if (!data) return;

    // Reset form
    const form = $('frmEstugrupos');
    if (form) form.reset();

    // Set readonly on fields with bg-gray-100 (bg-body-tertiary equivalent)
    form?.querySelectorAll('input[readonly], input.bg-gray-100').forEach(el => {
      el.setAttribute('readonly', 'readonly');
    });

    // Map student data to form fields (prefix 'e' + key)
    Object.keys(data).forEach(key => {
      const field = document.getElementById(`e${key}`);
      if (field) {
        field.value = data[key] ?? '';
      }
    });

    this.editando = true;
    const editandoField = $('eeditando');
    if (editandoField) editandoField.value = 'true';

    // Populate header identity
    const nm = (data.nombres || '').trim();
    const avatar = $('estuAvatarInitial');
    if (avatar) avatar.textContent = (nm.charAt(0) || 'E').toUpperCase();
    const nameEl = $('estuModalName');
    if (nameEl) nameEl.textContent = nm || 'Información del Estudiante';
    const idEl = $('estuModalId');
    if (idEl) idEl.innerHTML = `<i class="bi bi-hash"></i><span>${escapeHtml(String(data.estudiante || data.codigo || '—'))}</span>`;
    const gradoEl = $('estuModalGrado');
    if (gradoEl) gradoEl.innerHTML = `<i class="bi bi-mortarboard-fill"></i><span>${escapeHtml(`${data.nivel ?? ''}-${data.numero ?? ''}`)} · ${escapeHtml(data.sede || '')}</span>`;

    // Activate first tab (rail uses data-active + CSS)
    this._switchTab('datose');
    const content = document.querySelector('#modalEstugrupos .estu-content');
    if (content) content.scrollTop = 0;

    showModal('modalEstugrupos');
  }

  /** Cambia la pestaña activa del formulario de estudiante. */
  _switchTab(tab) {
    document.querySelectorAll('#modalEstugrupos .tab-btn').forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.setAttribute('data-active', isActive ? 'true' : 'false');
      btn.setAttribute('aria-selected', String(isActive));
    });
    document.querySelectorAll('#modalEstugrupos .tab-pane').forEach(p => {
      p.classList.toggle('hidden', p.id !== `tab-${tab}`);
      if (p.id === `tab-${tab}`) p.classList.add('estu-pane-in');
      else p.classList.remove('estu-pane-in');
    });
  }

  /** Aplica los campos editados sobre la fila local (evita recargar todo). */
  _patchLocalStudent(data) {
    const row = this.students.find(s => String(s.ind) === String(data.ind));
    if (!row) return;
    Object.keys(data).forEach(k => {
      if (k !== 'ind' && k in row) row[k] = data[k];
    });
  }

  async _onHistoryStudent(data) {
    if (!data) return;

    const nameEl = $('historialStudentName');
    if (nameEl) nameEl.textContent = `Historial de: ${data.nombres || data.estudiante}`;

    const container = $('histgrupos');
    if (container) {
      container.innerHTML = `<div class="flex justify-center py-12">
        <div class="w-10 h-10 border-4 border-[#107C10] border-t-transparent rounded-full animate-spin"></div>
      </div>`;
    }

    showModal('modalHgrupos');

    try {
      const historial = await estudiantes.getHistory(data.estudiante);

      if (!Array.isArray(historial) || historial.length === 0) {
        if (container) {
          container.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="bi bi-inbox text-4xl block mb-2"></i>No se encontró historial para este estudiante</div>';
        }
        return;
      }

      let html = `<div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead>
            <tr class="bg-gray-100 border-b-2 border-gray-200">
              <th class="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider text-center">N°</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider text-center">Año</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider text-center">Nivel</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider text-center">Número</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Sede</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Institución Externa</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Director</th>
              <th class="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider text-center">Cert.</th>
            </tr>
          </thead>
          <tbody>`;

      historial.forEach((historia, idx) => {
        const { estudiante, director, nivel, numero, sede, year, institucion_externa } = historia;
        const histDataStr = escapeHtml(JSON.stringify(historia));
        html += `
          <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-center text-gray-500">${idx + 1}</td>
            <td class="px-4 py-3 text-center font-medium">${year}</td>
            <td class="px-4 py-3 text-center">${nivel}</td>
            <td class="px-4 py-3 text-center">${numero}</td>
            <td class="px-4 py-3">${sede || ''}</td>
            <td class="px-4 py-3">${institucion_externa || ''}</td>
            <td class="px-4 py-3">${director || ''}</td>
            <td class="px-4 py-3 text-center">
              <button class="px-2 py-1 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors hist-cert-btn" data-hist='${histDataStr}'>
                <i class="bi bi-file-earmark-arrow-down"></i>
              </button>
            </td>
          </tr>`;
      });

      html += '</tbody></table></div>';
      if (container) container.innerHTML = html;

    } catch (error) {
      if (container) {
        container.innerHTML = `<div class="text-center py-12 text-red-500">
          <i class="bi bi-exclamation-triangle text-2xl block mb-2"></i>
          Error al cargar historial: ${escapeHtml(error.message)}
        </div>`;
      }
    }
  }

  async _onChangeGroup(data) {
    if (!data) return;

    const { estudiante, asignacion, nivel, numero, grado, year } = data;

    const labelEl = $('chgest');
    if (labelEl) labelEl.textContent = `Cambiando: ${data.nombres || ''} (${nivel}-${numero})`;

    const select = $('nuevo_grado');
    if (select) {
      select.innerHTML = '<option value="">Cargando...</option>';
      select.disabled = true;
    }

    const confirmBtn = $('btnConfirmChangeGroup');
    if (confirmBtn) confirmBtn.disabled = true;
    const checkbox = $('chkChangeGroupConfirm');
    if (checkbox) checkbox.checked = false;

    showModal('modalCHGgrupos');

    try {
      const targetYear = year || this.currentYear;
      const nivelsel = await estudiantes.getGroupTargets({ asignacion, nivel, numero, year: targetYear });

      if (!Array.isArray(nivelsel) || nivelsel.length === 0) {
        if (select) {
          select.innerHTML = '<option value="">No hay grupos disponibles</option>';
          select.disabled = true;
        }
        return;
      }

      if (select) {
        select.innerHTML = '<option value="">Seleccione un grupo...</option>' + nivelsel.map(n => {
          const optData = JSON.stringify({ ...n, asignacion, estudiante, grado: n.grado || `${n.nivel}-${n.numero}` });
          return `<option value='${escapeHtml(optData)}'>${n.nivel}-${n.numero}</option>`;
        }).join('');
        select.disabled = false;
      }
    } catch (error) {
      if (select) {
        select.innerHTML = '<option value="">Error al cargar grupos</option>';
      }
      alertError('Error', error.message);
    }
  }

  _onPrintCode(codigo) {
    if (!codigo) {
      alertWarning('Código no disponible', 'El estudiante no tiene un código asignado.');
      return;
    }

    const label = $('codigoStudentLabel');
    if (label) label.textContent = `Código: ${codigo}`;

    const iframe = $('ifrmprtcodigo');
    if (iframe) {
      iframe.src = `https://ceslep.github.io/matriculaReport/?codigo=${encodeURIComponent(codigo)}`;
    }

    showModal('modalPrtCodigos');
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  EVENTS                                                         */
  /* ──────────────────────────────────────────────────────────────── */

  /** Abre un dropdown de filtro y cierra los demás. */
  _toggleFilterDropdown(openId) {
    ['filterStatusDropdown', 'filterSedeDropdown', 'filterGradoDropdown'].forEach(id => {
      const dd = $(id);
      if (!dd) return;
      if (id === openId) dd.classList.toggle('hidden');
      else dd.classList.add('hidden');
    });
  }

  _bindEvents() {
    const section = $('seccionControlEstudiantes');
    if (!section) return;

    // ── Year selector "Ir" ──
    delegate(section, 'click', '#btnGoYear', () => {
      const year = $('yearControlEstu')?.value || this.currentYear;
      this.currentYear = parseInt(year);
      this.loadStudents(year);
    });

    // Enter key on year select triggers load
    const yearSelect = $('yearControlEstu');
    if (yearSelect) {
      yearSelect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const year = yearSelect.value;
          this.currentYear = parseInt(year);
          this.loadStudents(year);
        }
      });
    }

    // ── Search with debounce ──
    const searchInput = $('searchControlEstu');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchTerm = searchInput.value.trim();
          if (this.students.length > 0) this._applyFiltersAndRender();
        }, 150);
      });
    }

    // ── Status filter dropdown ──
    delegate(section, 'click', '#btnFilterStatus', () => this._toggleFilterDropdown('filterStatusDropdown'));

    delegate(section, 'click', '#filterStatusDropdown a[data-filter]', (e, target) => {
      const filter = target.dataset.filter;
      const label = $('filterStatusLabel');
      if (filter === 'fb') {
        this.activeFilters.status = null;
        if (label) label.textContent = 'Filtros';
      } else {
        this.activeFilters.status = filter;
        const names = { f0: 'Activos', f1: 'Inactivos', f2: 'Desertores', f3: 'Banda', f4: 'HED' };
        if (label) label.textContent = names[filter] || 'Filtros';
      }
      $('filterStatusDropdown')?.classList.add('hidden');
      if (this.students.length > 0) this._applyFiltersAndRender();
    });

    // ── Sede filter dropdown ──
    delegate(section, 'click', '#btnFilterSede', () => this._toggleFilterDropdown('filterSedeDropdown'));

    delegate(section, 'click', '#filterSedeDropdown a[data-sede]', (e, target) => {
      const sedeId = target.dataset.sede;
      const nsede = target.dataset.nsede || target.textContent.trim();
      const label = $('filterSedeLabel');
      if (sedeId === 'fb') {
        this.activeFilters.sede = null;
        if (label) label.textContent = 'Sede';
      } else {
        this.activeFilters.sede = nsede;
        if (label) label.textContent = nsede;
        this._renderGradoFilters(sedeId, nsede);
      }
      $('filterSedeDropdown')?.classList.add('hidden');
      if (this.students.length > 0) this._applyFiltersAndRender();
    });

    // ── Grado filter dropdown ──
    delegate(section, 'click', '#btnFilterGrado', () => this._toggleFilterDropdown('filterGradoDropdown'));

    delegate(section, 'click', '#filterGradoDropdown a[data-grado]', (e, target) => {
      const grado = target.dataset.grado;
      const label = $('filterGradoLabel');
      if (grado === 'fb') {
        this.activeFilters.grado = null;
        if (label) label.textContent = 'Grados';
      } else {
        this.activeFilters.grado = grado;
        if (label) label.textContent = grado;
      }
      $('filterGradoDropdown')?.classList.add('hidden');
      if (this.students.length > 0) this._applyFiltersAndRender();
    });

    // ── Pagination ──
    delegate(section, 'click', '#pagerControls button[data-page]', (e, target) => {
      const p = parseInt(target.dataset.page);
      if (!p || p === this.page) return;
      this.page = p;
      this._renderPage();
      const wrap = $('tableControlEstuWrapper');
      if (wrap) wrap.scrollTop = 0;
    });

    delegate(section, 'change', '#pagerSize', (e, target) => {
      this.pageSize = parseInt(target.value) || 50;
      this.page = 1;
      this._renderPage();
    });

    // ── Column sorting ──
    delegate(section, 'click', '#tableControlEstu th[data-col]', (e, target) => {
      const col = target.dataset.col;
      if (!col) return;

      if (this.sortState.column === col) {
        this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortState.column = col;
        this.sortState.direction = 'asc';
      }

      document.querySelectorAll('#tableControlEstu th[data-col]').forEach(th => {
        th.classList.remove('text-[#543391]');
        const icon = th.querySelector('.sort-icon-custom');
        if (icon) icon.remove();
      });
      target.classList.add('text-[#543391]');
      const dirIcon = document.createElement('i');
      dirIcon.className = `sort-icon-custom bi bi-caret-${this.sortState.direction === 'asc' ? 'up' : 'down'} ml-1 text-xs`;
      target.appendChild(dirIcon);

      if (this.students.length > 0) this._applyFiltersAndRender();
    });

    // ── Toolbar buttons ──
    delegate(section, 'click', '#btnSearchEstu', () => {
      const si = $('searchControlEstu');
      if (si) si.focus();
    });

    delegate(section, 'click', '#btnCodesEstu', () => {
      alertWarning('Códigos', 'Funcionalidad de códigos en desarrollo.');
    });

    delegate(section, 'click', '#btnPrintCodes', () => {
      // Print all visible codes
      const students = this.filteredStudents.length > 0 ? this.filteredStudents : this.students;
      if (students.length === 0) {
        alertWarning('Sin estudiantes', 'No hay estudiantes cargados para imprimir códigos.');
        return;
      }
      alertInfo('Imprimir códigos', `Hay ${students.length} estudiante(s). Abra cada uno desde el botón de impresión en la tabla.`);
    });

    // ── Edit button ──
    delegate(section, 'click', '.fluent-btn-edit', (e, target) => {
      try {
        const data = JSON.parse(target.dataset.est);
        this._onEditStudent(data);
      } catch { /* ignore */ }
    });

    // ── History button ──
    delegate(section, 'click', '.fluent-btn-history', (e, target) => {
      try {
        const data = JSON.parse(target.dataset.est);
        this._onHistoryStudent(data);
      } catch { /* ignore */ }
    });

    // ── Change group button ──
    delegate(section, 'click', '.fluent-btn-change', (e, target) => {
      try {
        const data = JSON.parse(target.dataset.est);
        this._onChangeGroup(data);
      } catch { /* ignore */ }
    });

    // ── Print code button ──
    delegate(section, 'click', '.fluent-btn-printcode', (e, target) => {
      const codigo = target.dataset.codigo;
      this._onPrintCode(codigo);
    });

    // ── Tab switching in edit modal ──
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('#modalEstugrupos .tab-btn');
      if (!tabBtn || !tabBtn.dataset.tab) return;
      this._switchTab(tabBtn.dataset.tab);
      const content = document.querySelector('#modalEstugrupos .estu-content');
      if (content) content.scrollTop = 0;
    });

    document.addEventListener('keydown', (e) => {
      const tabBtn = e.target.closest('#modalEstugrupos .tab-btn');
      if (!tabBtn || !tabBtn.dataset.tab) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const tabs = Array.from(document.querySelectorAll('#modalEstugrupos .tab-btn'));
      const idx = tabs.indexOf(tabBtn);
      let next;
      if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
      else next = tabs[(idx - 1 + tabs.length) % tabs.length];
      if (next) {
        this._switchTab(next.dataset.tab);
        next.focus();
        const content = document.querySelector('#modalEstugrupos .estu-content');
        if (content) content.scrollTop = 0;
      }
    });

    // ── Change group confirm checkbox ──
    delegate(document, 'change', '#chkChangeGroupConfirm', (e, target) => {
      const btn = $('btnConfirmChangeGroup');
      if (btn) btn.disabled = !target.checked;
    });

    // ── Change group select enables confirm ──
    delegate(document, 'change', '#nuevo_grado', () => {
      const checkbox = $('chkChangeGroupConfirm');
      if (checkbox) checkbox.checked = false;
      const btn = $('btnConfirmChangeGroup');
      if (btn) btn.disabled = true;
    });

    // ── Confirm change group ──
    delegate(document, 'click', '#btnConfirmChangeGroup', async (e, target) => {
      const select = $('nuevo_grado');
      if (!select || !select.value) {
        alertWarning('Seleccione un grupo', 'Debe seleccionar un grupo destino.');
        return;
      }

      const spinner = target.querySelector('.spinner-border');
      if (spinner) spinner.classList.remove('hidden');
      target.disabled = true;

      try {
        // Parse selected option data (incluye asignacion, estudiante, nivel, numero, grado)
        const opt = JSON.parse(select.value);
        const res = await estudiantes.changeGroup({
          estudiante: opt.estudiante,
          asignacion: opt.asignacion,
          nivel: opt.nivel,
          numero: opt.numero,
          grado: opt.grado || `${opt.nivel}-${opt.numero}`,
        });
        if (res && res.error) {
          alertError('Error', res.details || res.error);
          return;
        }
        alertSuccess('Grupo cambiado', `Estudiante movido a ${opt.nivel}-${opt.numero}.`);
        hideModal('modalCHGgrupos');
        // Recarga para reflejar el nuevo grupo y notas migradas
        this.loadStudents(this.currentYear);
      } catch (error) {
        alertError('Error', error.message);
      } finally {
        if (spinner) spinner.classList.add('hidden');
        target.disabled = false;
      }
    });

    // ── Save estudiante ──
    delegate(document, 'click', '#btnSaveEstudiante', async (e, target) => {
      const form = $('frmEstugrupos');
      if (!form) return;

      const data = {};
      form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id) {
          // Remove leading 'e' to get the key
          const key = el.id.startsWith('e') ? el.id.substring(1) : el.id;
          if (key !== 'ind' && key !== 'editando') {
            data[key] = el.value;
          }
        }
      });
      data.ind = $('eind')?.value || '';

      if (!data.ind) {
        alertWarning('Sin registro', 'No se pudo identificar el estudiante a actualizar.');
        return;
      }

      showLoading('Guardando...');
      try {
        const res = await estudiantes.update(data);
        closeLoading();
        if (res && res.exito === false) {
          alertError('Error al guardar', res.mensaje || 'No se pudieron guardar los cambios.');
          return;
        }
        alertSuccess('Estudiante actualizado', 'Los cambios han sido guardados correctamente.');
        hideModal('modalEstugrupos');
        // Refleja los cambios en la fila sin recargar todo
        this._patchLocalStudent(data);
        this._applyFiltersAndRender();
      } catch (error) {
        closeLoading();
        alertError('Error al guardar', error.message);
      }
    });

    // ── History cert button ──
    delegate(document, 'click', '.hist-cert-btn', (e, target) => {
      try {
        const histData = JSON.parse(target.dataset.hist);
        alertInfo('Certificado', `Generar certificado para año ${histData.year}`);
      } catch { /* ignore */ }
    });

    // ── Delegated dismiss for dynamically injected modals ──
    document.addEventListener('click', (e) => {
      const dismissBtn = e.target.closest('[data-modal-dismiss]');
      if (dismissBtn) {
        e.preventDefault();
        hideModal(dismissBtn.dataset.modalDismiss);
      }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      const statusBtn = $('btnFilterStatus');
      const sedeBtn = $('btnFilterSede');
      const gradoBtn = $('btnFilterGrado');
      const statusDD = $('filterStatusDropdown');
      const sedeDD = $('filterSedeDropdown');
      const gradoDD = $('filterGradoDropdown');

      if (statusDD && !statusBtn?.contains(e.target) && !statusDD.contains(e.target)) {
        statusDD.classList.add('hidden');
      }
      if (sedeDD && !sedeBtn?.contains(e.target) && !sedeDD.contains(e.target)) {
        sedeDD.classList.add('hidden');
      }
      if (gradoDD && !gradoBtn?.contains(e.target) && !gradoDD.contains(e.target)) {
        gradoDD.classList.add('hidden');
      }
    });
  }
}

// Instantiate on import
new ControlEstudiantesModule();
