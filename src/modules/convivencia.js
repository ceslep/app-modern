import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import SignaturePad from 'signature_pad';
import { students } from '@services/students.js';
import { filters } from '@services/filters.js';
import { endpoint } from '@config/endpoints.js';
import { $, delegate, escapeHtml } from '@utils/dom.js';
import { alertSuccess, alertError, alertWarning, alertConfirm, showToast } from '@utils/alert.js';

const SECTION_ID = 'seccionConvivencia';
const CONTAINER_ID = 'observadorContent';

const TIPOS = [
  { id: 'positivo', label: 'Positivo', icon: '🌟', color: 'emerald' },
  { id: 'tipo1', label: 'Tipo I', icon: '📝', color: 'blue' },
  { id: 'tipo2', label: 'Tipo II', icon: '⚠️', color: 'amber' },
  { id: 'tipo3', label: 'Tipo III', icon: '🚨', color: 'rose' },
];

const CATEGORIAS = {
  positivo: [
    { id: 'merito_academico', label: 'Mérito Académico', icon: '🎖️' },
    { id: 'convivencia', label: 'Buena Convivencia', icon: '🌟' },
    { id: 'solidaridad', label: 'Solidaridad', icon: '🤝' },
    { id: 'esfuerzo', label: 'Esfuerzo', icon: '💪' },
    { id: 'logro_deportivo', label: 'Logro Deportivo', icon: '🏆' },
    { id: 'creatividad', label: 'Creatividad', icon: '🎨' },
    { id: 'liderazgo', label: 'Liderazgo', icon: '⭐' },
    { id: 'mejora', label: 'Mejora Significativa', icon: '📈' },
  ],
  tipo1: [
    { id: 'tarea_olvidada', label: 'Tarea/Olvido materiales', icon: '📝' },
    { id: 'uniforme', label: 'Uniforme incompleto', icon: '👕' },
    { id: 'celular', label: 'Uso indebido celular', icon: '📱' },
    { id: 'falta_respeto_leve', label: 'Falta de respeto leve', icon: '💬' },
    { id: 'consumo_alimentos', label: 'Consumo alimentos', icon: '🍬' },
    { id: 'retraso', label: 'Llegada tarde', icon: '⏰' },
    { id: 'interrupcion', label: 'Interrupción clase', icon: '🔊' },
  ],
  tipo2: [
    { id: 'agresion_verbal', label: 'Agresión verbal', icon: '😤' },
    { id: 'ciberacoso', label: 'Ciberacoso', icon: '💻' },
    { id: 'danio_propiedad', label: 'Daño a propiedad', icon: '💔' },
    { id: 'mentira', label: 'Engaño/Mentira', icon: '🎭' },
    { id: 'agresion_fisica_leve', label: 'Agresión física leve', icon: '👊' },
    { id: 'robo', label: 'Hurto menor', icon: '🔒' },
    { id: 'insulto', label: 'Insulto grave', icon: '🗣️' },
  ],
  tipo3: [
    { id: 'armas', label: 'Portación armas', icon: '🔪' },
    { id: 'sustancias', label: 'Sustancias psicoactivas', icon: '💊' },
    { id: 'extorsion', label: 'Extorsión', icon: '💰' },
    { id: 'agresion_fisica', label: 'Agresión física grave', icon: '🚨' },
    { id: 'actividades_ilicitas', label: 'Actividades ilícitas', icon: '⛔' },
    { id: 'acoso_sexual', label: 'Acoso sexual', icon: '🚫' },
    { id: 'vandalismo', label: 'Vandalismo', icon: '🔥' },
  ],
};

const IMPACTO = [
  { id: 'bajo', label: 'Bajo', desc: 'Afectación individual mínima' },
  { id: 'medio', label: 'Medio', desc: 'Afectación al grupo-clase' },
  { id: 'alto', label: 'Alto', desc: 'Afectación a la institución' },
];

const TIPOS_NEE = [
  { id: 'visual', label: 'Visual' },
  { id: 'auditiva', label: 'Auditiva' },
  { id: 'motora', label: 'Motora' },
  { id: 'cognitiva', label: 'Cognitiva' },
  { id: 'emocional', label: 'Emocional' },
  { id: 'autismo', label: 'TEA' },
  { id: 'tdah', label: 'TDAH' },
  { id: 'ninguno', label: 'Ninguno' },
];

const ACCIONES_INMEDIATAS = [
  { id: 'llamada_padre', label: 'Comunicación inmediata al padre/acudiente' },
  { id: 'remision_orientacion', label: 'Remisión a Orientación Escolar' },
  { id: 'cita_coordinacion', label: 'Cita con Coordinación' },
  { id: 'remision_rectoria', label: 'Remisión a Rectoría' },
  { id: 'citacion_padres', label: 'Citación formal a padres' },
  { id: 'primeros_auxilios', label: 'Primeros auxilios / Atención médica' },
  { id: 'protocolo_icbf', label: 'Activación protocolo ICBF' },
  { id: 'comisaria_familia', label: 'Notificación a Comisaría de Familia' },
  { id: 'policia_infancia', label: 'Policía de Infancia y Adolescencia' },
  { id: 'hospital', label: 'Remisión a Hospital / Centro de Salud' },
  { id: 'enfermeria', label: 'Atención de Enfermería Institucional' },
  { id: 'psicologia', label: 'Derivación a Psicología' },
  { id: 'denuncia_penal', label: 'Denuncia ante Fiscalía' },
  { id: 'ninguna', label: 'Ninguna acción inmediata' },
];

const PLANES_SEGUIMIENTO = [
  { id: 'seguimiento_semanal', label: 'Seguimiento semanal', desc: 'Revisión de evolución' },
  { id: 'reunion_padres', label: 'Reunión con padres', desc: 'Concertar cita' },
  { id: 'tutor_asignado', label: 'Tutoría asignada', desc: 'Docente tutor' },
  { id: 'acompañamiento', label: 'Acompañamiento emocional', desc: 'Referencia orientación' },
  { id: 'plan_academico', label: 'Plan de recuperación', desc: 'Académico' },
  { id: 'refuerzo_positivo', label: 'Refuerzo positivo', desc: 'Reconocimiento mejoras' },
  { id: 'derivacion_externa', label: 'Derivación externa', desc: 'Psicólogo/Especialista' },
];

const DERIVACIONES = [
  { id: 'ninguna', label: 'Ninguna - Seguimiento docente' },
  { id: 'orientacion', label: 'Orientación Escolar' },
  { id: 'coordinacion', label: 'Coordinación Académica' },
  { id: 'rectoria', label: 'Rectoría' },
  { id: 'psicologia', label: 'Referencia externa (Psicología)' },
  { id: 'icbf', label: 'ICBF / Bienestar Familiar' },
  { id: 'comite_convivencia', label: 'Comité de Convivencia' },
];

const TEXTOS_ASISTENTE = {
  observacion: 'Al momento de la observación, se evidenció que ',
  en_clase: 'Durante el desarrollo de la clase de ',
  reporte_terceros: 'Según reporte realizado por parte de ',
  inicio_jornada: 'Al iniciar la jornada académica se observó que ',
  durante_recargo: 'Durante el tiempo de recreo/descanso se evidenció que ',
  salida_aula: 'Al momento de salir del aula, se detectó que ',
  dialogo: 'Se mantuvo diálogo con el estudiante quien expresó que ',
  version_estudiante: 'El estudiante manifiesta que ',
  version_testigos: 'Según versión de los compañeros presentes en el lugar, ',
  negacion: 'Al dialogar con el estudiante, este manifestó no estar de acuerdo con ',
  aceptacion: 'El estudiante reconoció que ',
  llamada_padre: 'Se contactó telefónicamente al padre/acudiente para informar sobre ',
  citacion_escrita: 'Por medio de la presente se cita al padre/acudiente para ',
  comunicacion_escrita: 'Se hace conocimiento del padre/acudiente mediante comunicación escrita sobre ',
  aviso_urgente: 'Se comunica de manera URGENTE sobre la situación presentada que requiere atención inmediata.',
  notificacion_coordinacion: 'Se notifica a Coordinación Académica sobre ',
  notificacion_orientacion: 'Se remite a Orientación Escolar para ',
  compromiso_escrito: 'El estudiante se compromete formalmente a: ',
  plan_mejora: 'Se establece plan de mejora consistente en: ',
  seguimiento_semanal: 'Se realizará seguimiento semanal durante las próximas semanas para evaluar ',
  meta_especifica: 'Como meta para la próxima semana el estudiante se propone: ',
  compromiso_padres: 'Se compromete conjuntamente con el padre/acudiente a ',
  compromiso_especifico: 'El estudiante adquiere el siguiente compromiso: ',
  valoracion_actos: 'Se invita al estudiante a reflexionar sobre la valoración de sus actos y el impacto en ',
  contexto_familiar: 'Se conversa sobre el impacto de sus acciones en el contexto familiar y escolar.',
  sana_convivencia: 'Se analiza el impacto de sus acciones en la sana convivencia del grupo.',
  rendimiento_academico: 'Se habla sobre la relación entre su comportamiento y el rendimiento académico.',
  derechos_otros: 'Se reflexiona sobre el respeto a los derechos de los demás.',
  empatia: 'Se trabaja en el desarrollo de habilidades socioemocionales y empatía hacia ',
  protocolo_activado: 'Se activa protocolo de convivencia según Manual de Convivencia institucional.',
  remision_orientacion: 'Se remite caso a Orientación Escolar para ',
  emergencia: 'Dado el nivel de gravedad de la situación, se comunica de manera inmediata a ',
  primeros_auxilios: 'Se brindaron primeros auxilios psicológicos y se contactó al padre para ',
  mediacion: 'Se propone proceso de mediación entre las partes involucradas.',
  medida_preventiva: 'Como medida preventiva se establece ',
  reflejo_escrito: 'Se solicita reflexión escrita sobre ',
  ciberacoso: 'Se evidencia posible situación de ciberacoso en redes sociales. Se procederá según protocolo Ley 1620/2013.',
  agresion_fisica: 'Se presenta altercado que involucra agresión física. Se activan medidas de protección inmediatas.',
  sustancias: 'Se encontró posible tenencia o consumo de sustancias psicoactivas. Se notifica a rectoría.',
  armas: 'Se evidenció posible objeto peligroso o arma. Se comunica a autoridades competentes.',
  dano_propiedad: 'Se evidencia daño intencional a propiedad institucional.',
  extorsion: 'Se presenta situación de extorsión que requiere investigación.',
  robo: 'Se detecta hurto de pertenencias de ',
  insultos_graves: 'Se profieren insultos y expresiones vejatorias hacia ',
  amenaza: 'Se reciben amenazas ',
  situacion_familiar: 'El estudiante reporta situación familiar que afecta su bienestar. Se deriva a Orientación.',
  estado_emocional: 'Se evidencia estado emocional alterado que requiere acompañamiento.',
  nee_atencion: 'Estudiante con NEE. Se coordina con área de apoyo para ',
  vulneracion_derechos: 'Posible vulneración de derechos. Se activa ruta de atención Ley 1098/2006.',
  icbf_derivacion: 'Situación que requiere notificación al ICBF.',
  reconocimiento: 'Se reconoce el esfuerzo y dedicación del estudiante en ',
  logro_academico: 'El estudiante ha demostrado excelencia académica en ',
  logro_convivencia: 'Se destaca el comportamiento ejemplar en ',
  solidaridad: 'Se destaca el comportamiento SOLIDARIO del estudiante.',
  mejora_significativa: 'Se evidencia mejora significativa en ',
  liderazgo_positivo: 'El estudiante demuestra liderazgo positivo y propicia ',
  creatividad: 'Se destaca la creatividad e iniciativa del estudiante en ',
  esfuerzo_perseverancia: 'Se reconoce el esfuerzo y perseverancia del estudiante para ',
};

const GRUPOS_ASISTENTE = [
  { id: 'observacion', label: '👁️ Observación', keys: ['observacion', 'en_clase', 'reporte_terceros', 'inicio_jornada', 'durante_recargo', 'salida_aula'] },
  { id: 'conversacion', label: '💬 Conversación', keys: ['dialogo', 'version_estudiante', 'version_testigos', 'negacion', 'aceptacion'] },
  { id: 'notificacion', label: '📞 Notificación', keys: ['llamada_padre', 'citacion_escrita', 'comunicacion_escrita', 'aviso_urgente', 'notificacion_coordinacion', 'notificacion_orientacion'] },
  { id: 'compromiso', label: '✅ Compromiso', keys: ['compromiso_escrito', 'plan_mejora', 'seguimiento_semanal', 'meta_especifica', 'compromiso_padres', 'compromiso_especifico'] },
  { id: 'reflexion', label: '🤔 Reflexión', keys: ['valoracion_actos', 'contexto_familiar', 'sana_convivencia', 'rendimiento_academico', 'derechos_otros', 'empatia'] },
  { id: 'accion', label: '⚡ Acción', keys: ['protocolo_activado', 'remision_orientacion', 'emergencia', 'primeros_auxilios', 'mediacion', 'medida_preventiva', 'reflejo_escrito'] },
  { id: 'situaciones', label: '🚨 Situaciones', keys: ['ciberacoso', 'agresion_fisica', 'sustancias', 'armas', 'dano_propiedad', 'extorsion', 'robo', 'insultos_graves', 'amenaza'] },
  { id: 'vulnerable', label: '🛡️ NEE/Vulnerable', keys: ['situacion_familiar', 'estado_emocional', 'nee_atencion', 'vulneracion_derechos', 'icbf_derivacion'] },
  { id: 'autoridades', label: '🏛️ Autoridades', keys: ['comisaria_familia', 'policia_infancia', 'hospital', 'enfermeria', 'psicologia', 'denuncia_penal'] },
  { id: 'positivo', label: '🌟 Positivo', keys: ['reconocimiento', 'logro_academico', 'logro_convivencia', 'solidaridad', 'mejora_significativa', 'liderazgo_positivo', 'creatividad', 'esfuerzo_perseverancia'] },
  { id: 'legal', label: '⚖️ Legal', keys: ['fundamentolegal_t1', 'fundamentolegal_t2', 'fundamentolegal_t3', 'fundamentolegal_positivo'] },
];

const FUNDAMENTO_LEGAL = [
  { id: 'ley115', titulo: 'Ley 115/1994 - Ley General de Educación', contenido: 'Art. 87: Evaluación del comportamiento con fines de diagnóstico y superación de dificultades.' },
  { id: 'decreto1290', titulo: 'Decreto 1290/2009 - Evaluación', contenido: 'Art. 10: Evaluación formativa del comportamiento según grado de desarrollo.' },
  { id: 'ley1098', titulo: 'Ley 1098/2006 - Código Infancia', contenido: 'Art. 22: Derecho a la educación. Art. 39: Protección integral. Interés superior del niño.' },
  { id: 'ley1620', titulo: 'Ley 1620/2013 - Convivencia Escolar', contenido: 'Art. 2: Sistema Nacional de Convivencia. Art. 20: Rutas de atención.' },
  { id: 'manual', titulo: 'Manual de Convivencia', contenido: 'Observador del estudiante: documento interno con carácter confidencial.' },
];

class ConvivenciaModule {
  constructor() {
    this.record = this.getDefaultRecord();
    this.showPreview = false;
    this.pdfUrl = null;
    this.showHistory = false;
    this.showLegalInfo = false;
    this.firmaModal = { open: false, tipo: '' };
    this.activeTab = null;
    this.activeLegalSection = null;
    this.historial = [];
    this.firmaCanvas = null;
    this.signaturePad = null;
    this.showItemsModal = false;
    this.itemsList = [];
    this.itemsLoading = false;

    this._filterStudents = [];
    this._filterYear = '';
    this._filterSede = '';
    this._filterNivel = '';
    this._filterNumero = '';

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

  load() {
    const section = $(SECTION_ID);
    if (!section) return;
    const existing = $(CONTAINER_ID);
    if (existing) return;

    const heading = section.querySelector('.section-heading');
    section.innerHTML = `<div id="${CONTAINER_ID}"></div>`;
    if (heading) section.prepend(heading);

    this.loadSavedState();
    this.render();
    this.setupEvents();
    this._loaded = true;
  }

  getDefaultRecord() {
    return {
      fecha: new Date().toISOString().split('T')[0],
      estudiante: { codigo: '', nombres: '', grado: '', nivel: '', numero: '', sede: '' },
      estudiantes: [],
      tipo: 'positivo',
      categoria: 'convivencia',
      impacto: 'bajo',
      esNEE: false,
      tipoNEE: 'ninguno',
      descripcion: '',
      accionesInmediatas: [],
      planSeguimiento: '',
      derivacion: 'ninguna',
      compromisos: '',
      contactoEntidades: '',
      firmaDocente: null,
      firmaEstudiante: null,
      firmaAcudiente: null,
    };
  }

  loadSavedState() {
    const saved = localStorage.getItem('observador_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.record = { ...this.getDefaultRecord(), ...parsed };
      } catch (e) {
        console.error('Error parsing saved draft', e);
      }
    }
    const historySaved = localStorage.getItem('observador_historial');
    if (historySaved) {
      try {
        this.historial = JSON.parse(historySaved);
      } catch (e) {
        this.historial = [];
      }
    }
  }

  saveDraft() {
    try {
      localStorage.setItem('observador_draft', JSON.stringify(this.record));
    } catch (e) {
      /* quota exceeded, ignore */
    }
  }

  getProgreso() {
    let completados = 0;
    const total = 7;
    if (this.record.estudiante.nombres) completados++;
    if (this.record.estudiante.grado) completados++;
    if (this.record.categoria) completados++;
    if (this.record.descripcion.length > 10) completados++;
    if (this.record.derivacion !== 'ninguna') completados++;
    if (this.record.accionesInmediatas.length > 0) completados++;
    if (this.record.firmaDocente) completados++;
    return Math.round((completados / total) * 100);
  }

  render() {
    const container = $(CONTAINER_ID);
    if (!container) return;
    container.innerHTML = this.renderHTML();
  }

  renderHTML() {
    return `
      <div class="min-h-screen p-4 md:p-6 transition-colors duration-500 font-sans">

        <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-gray-800">Observador Escolar</h2>
            <p class="text-xs text-gray-400 mt-0.5">Convivencia y Seguimiento - Ley 1620/2013</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" id="obsToggleHistory"
              class="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:border-[#543391] transition-colors shadow-sm">
              <i class="bi bi-clock-history mr-1"></i> Historial
            </button>
            <button type="button" id="obsToggleLegal"
              class="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:border-[#543391] transition-colors shadow-sm">
              <i class="bi bi-book mr-1"></i> Marco Legal
            </button>
            <button type="button" id="obsClearAll"
              class="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">
              <i class="bi bi-trash3 mr-1"></i> Limpiar
            </button>
          </div>
        </div>

        <div class="max-w-7xl mx-auto mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div class="flex justify-between items-center mb-2">
            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Progreso del Reporte</span>
            <span class="text-xs font-black text-[#543391]" id="obsProgressPct">${this.getProgreso()}%</span>
            </div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-[#543391] to-purple-500 transition-all duration-500 rounded-full" id="obsProgressBar" style="width: ${this.getProgreso()}%"></div>
            </div>
          </div>
        </div>

        ${this.renderLegalInfo()}
        ${this.renderHistory()}

        <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

          <div class="lg:col-span-4 xl:col-span-3 space-y-4">
            ${this.renderDatosEstudiante()}
            ${this.renderTipoSituacion()}
            ${this.renderWarningTipo3()}
            ${this.renderImpacto()}
            ${this.renderNEE()}
          </div>

          <div class="lg:col-span-8 xl:col-span-6 space-y-4">
            ${this.renderCategoria()}
            ${this.renderAsistenteRedaccion()}
            ${this.renderAccionesInmediatas()}
            ${this.renderPlanSeguimiento()}
            ${this.renderDerivacion()}
            ${this.renderContactos()}
            ${this.renderCompromisos()}
          </div>

          <div class="lg:col-span-8 xl:col-span-3 space-y-4">
            ${this.renderFirmas()}
            ${this.renderBotones()}
            ${this.renderNotaLegal()}
          </div>
        </div>

        ${this.renderPDFPreview()}
        ${this.renderFirmaModal()}
      </div>
    `;
  }

  renderLegalInfo() {
    if (!this.showLegalInfo) return '';
    const items = FUNDAMENTO_LEGAL.map((item) => `
      <button type="button" data-legal-section="${item.id}"
        class="text-left p-3 rounded-xl border transition-all
          ${this.activeLegalSection === item.id ? 'bg-purple-50 border-[#543391]' : 'bg-gray-50 border-gray-100 hover:border-purple-300'}">
        <span class="text-xs font-bold text-[#543391]">${item.titulo}</span>
        ${this.activeLegalSection === item.id ? `<p class="text-xs text-gray-500 mt-2">${item.contenido}</p>` : ''}
      </button>
    `).join('');
    return `
      <div class="max-w-7xl mx-auto mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-sm font-black text-gray-500 uppercase mb-4">📚 Marco Normativo Aplicable</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">${items}</div>
      </div>
    `;
  }

  renderHistory() {
    if (!this.showHistory) return '';
    const entries = this.historial.length === 0
      ? '<p class="text-sm text-gray-400">No hay registros anteriores</p>'
      : `<div class="space-y-2 max-h-60 overflow-y-auto">
          ${this.historial.map((entry) => {
            const isPositivo = entry.tipo === 'positivo';
            const isTipo3 = entry.tipo === 'tipo3';
            return `
              <div class="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div class="flex justify-between items-start">
                  <span class="text-xs font-bold text-gray-700">${escapeHtml(entry.nombreEstudiante)}</span>
                  <span class="text-[10px] text-gray-400">${entry.fecha}</span>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full
                  ${isPositivo ? 'bg-emerald-100 text-emerald-700' : isTipo3 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">
                  ${entry.categoria}
                </span>
              </div>
            `;
          }).join('')}
        </div>`;
    return `
      <div class="max-w-7xl mx-auto mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-sm font-black text-gray-500 uppercase mb-4">📜 Historial de Reportes</h3>
        ${entries}
      </div>
    `;
  }

  renderDatosEstudiante() {
    const est = this.record.estudiante;
    const estudiantes = this.record.estudiantes || [];

    const selected = estudiantes.length > 0 ? `
      <div class="flex flex-wrap gap-2 mb-3">
        ${estudiantes.map((e) => `
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200">
            <span class="text-sm font-bold text-gray-800">${escapeHtml(e.nombres)}</span>
            <button type="button" data-remove-student="${escapeHtml(e.codigo)}" class="text-gray-400 hover:text-red-500 transition-colors">
              <i class="bi bi-x"></i>
            </button>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="text-center py-4 text-gray-400">
        <i class="bi bi-person-circle text-3xl block mb-1"></i>
        <p class="text-xs">Use los filtros y seleccione uno o varios estudiantes</p>
      </div>`;

    const selectOptions = this._filterStudents.length > 0 ? `
      <div class="border-t border-gray-100 pt-3 mt-1">
        <p class="text-xs font-semibold text-gray-500 mb-2">${this._filterStudents.length} estudiante(s):</p>
        <div class="max-h-48 overflow-y-auto space-y-1">
          ${this._filterStudents.map((s) => {
            const name = s.nombres || s.nombre || '';
            const code = s.estudiante || s.codigo || '';
            const nivel = s.nivel || '';
            const numero = s.numero || '';
            const val = escapeHtml(JSON.stringify({ codigo: code, nombres: name, grado: nivel + '-' + numero, nivel, numero }));
            const checked = estudiantes.some((e) => e.codigo === code);
            return `
              <label class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer hover:bg-purple-50 ${checked ? 'bg-purple-50 border border-purple-200' : 'border border-transparent'}">
                <input type="checkbox" data-student-checkbox value="${val}" ${checked ? 'checked' : ''}
                  class="w-4 h-4 rounded border-gray-300 text-[#543391] focus:ring-[#543391]">
                <span class="font-semibold text-gray-700 flex-1">${escapeHtml(name)}</span>
                <span class="text-gray-400">${escapeHtml(String(nivel))}-${escapeHtml(String(numero))}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">👤 Seleccionar Estudiante</h3>

        <div class="grid grid-cols-2 gap-2 mb-3">
          <select id="obsFilterSede" class="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
            <option value="">Sede</option>
          </select>
          <select id="obsFilterNivel" class="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
            <option value="">Nivel</option>
          </select>
          <select id="obsFilterNumero" class="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
            <option value="">Grupo</option>
          </select>
          <button type="button" id="obsLoadStudents"
            class="w-full p-2.5 rounded-xl bg-[#543391] hover:bg-[#6f4ab3] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            <i class="bi bi-search"></i> Cargar
          </button>
        </div>

        ${selectOptions}
        ${selected}

        <hr class="my-3 border-gray-100">

        <div class="grid grid-cols-2 gap-2">
          <div class="col-span-2">
            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Fecha</label>
            <input type="date" id="obsFecha" value="${this.record.fecha}"
              class="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none">
          </div>
        </div>
      </div>
    `;
  }

  renderTipoSituacion() {
    const buttons = TIPOS.map((t) => {
      const active = this.record.tipo === t.id;
      const activeBg = t.color === 'emerald' ? 'bg-emerald-600' : t.color === 'blue' ? 'bg-blue-600' : t.color === 'amber' ? 'bg-amber-600' : 'bg-rose-600';
      const activeBorder = t.color === 'emerald' ? 'border-emerald-600' : t.color === 'blue' ? 'border-blue-600' : t.color === 'amber' ? 'border-amber-600' : 'border-rose-600';
      return `
        <button type="button" data-tipo="${t.id}"
          class="w-full p-3 rounded-xl text-left text-sm font-medium transition-all border
            ${active ? `${activeBg} ${activeBorder} text-white` : 'bg-gray-50 border-transparent text-gray-600 hover:border-gray-300'}">
          <span class="mr-2">${t.icon}</span> ${t.label}
        </button>
      `;
    }).join('');
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">🎯 Tipo de Situación</h3>
        <div class="space-y-2">${buttons}</div>
      </div>
    `;
  }

  renderWarningTipo3() {
    if (this.record.tipo !== 'tipo3') return '';
    const actions = ['comisaria_familia', 'policia_infancia', 'hospital', 'psicologia', 'denuncia_penal'];
    const chips = actions.map((a) => {
      const labels = { comisaria_familia: '🏛️ Comisaría', policia_infancia: '👮 Policía', hospital: '🏥 Hospital', psicologia: '🧠 Psicología', denuncia_penal: '⚖️ Fiscalía' };
      const active = this.record.accionesInmediatas.includes(a);
      return `
        <button type="button" data-accion="${a}"
          class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
            ${active ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300 hover:bg-red-100'}">
          ${labels[a]}
        </button>
      `;
    }).join('');
    return `
      <div class="bg-red-50 border-2 border-red-500 rounded-2xl p-4">
        <div class="flex items-start gap-3">
          <span class="text-2xl">⚠️</span>
          <div>
            <h4 class="text-sm font-black text-red-700 uppercase">Situación Tipo III - Acciones Obligatorias</h4>
            <p class="text-xs text-red-600 mt-1">Según Ley 1620/2013 y Ley 1098/2006, requiere notificación inmediata a autoridades.</p>
            <div class="flex flex-wrap gap-2 mt-3">${chips}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderImpacto() {
    const buttons = IMPACTO.map((imp) => {
      const active = this.record.impacto === imp.id;
      return `
        <button type="button" data-impacto="${imp.id}"
          class="w-full p-2 rounded-xl text-left text-xs font-medium transition-all border
            ${active ? 'bg-[#543391] border-[#543391] text-white' : 'bg-gray-50 border-transparent text-gray-600 hover:border-purple-300'}">
          ${imp.label}
        </button>
      `;
    }).join('');
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">📊 Nivel de Impacto</h3>
        <div class="space-y-2">${buttons}</div>
      </div>
    `;
  }

  renderNEE() {
    const options = TIPOS_NEE.map((nee) =>
      `<option value="${nee.id}" ${this.record.tipoNEE === nee.id ? 'selected' : ''}>${nee.label}</option>`
    ).join('');
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <label class="flex items-center gap-3 mb-4 cursor-pointer">
          <input type="checkbox" id="obsNEE" ${this.record.esNEE ? 'checked' : ''} class="w-5 h-5 rounded text-[#543391]">
          <span class="text-xs font-bold text-gray-600">¿Estudiante NEE?</span>
        </label>
        <div id="obsNEESelect" class="${this.record.esNEE ? '' : 'hidden'}">
          <select id="obsTipoNEE" class="w-full p-2.5 rounded-xl bg-gray-50 border-none text-sm text-gray-700 focus:ring-2 focus:ring-[#543391]">
            ${options}
          </select>
        </div>
      </div>
    `;
  }

  renderCategoria() {
    const cats = CATEGORIAS[this.record.tipo] || [];
    const buttons = cats.map((cat) => {
      const active = this.record.categoria === cat.id;
      return `
        <button type="button" data-categoria="${cat.id}"
          class="px-3 py-2 rounded-xl text-xs font-medium transition-all border
            ${active ? 'bg-[#543391] border-[#543391] text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-purple-400'}">
          <span class="mr-1">${cat.icon}</span> ${cat.label}
        </button>
      `;
    }).join('');
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">🏷️ Categoría Específica</h3>
        <div class="flex flex-wrap gap-2">${buttons}</div>
        <div class="mt-3 pt-3 border-t border-gray-100">
          <button type="button" id="obsOpenItemsModal"
            class="w-full p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[#543391] text-xs font-bold hover:bg-purple-100 transition-all flex items-center justify-center gap-1.5">
            <i class="bi bi-list-check"></i> Seleccionar situaciones predefinidas
          </button>
        </div>
      </div>
      ${this.renderItemsModal()}
    `;
  }

  renderItemsModal() {
    if (!this.showItemsModal) return '';
    const loading = this.itemsLoading ? `
      <div class="flex items-center justify-center py-12">
        <div class="w-8 h-8 border-4 border-[#543391] border-t-transparent rounded-full animate-spin"></div>
        <span class="ml-3 text-sm text-gray-500">Cargando situaciones...</span>
      </div>
    ` : '';
    const items = !this.itemsLoading && this.itemsList.length > 0 ? `
      <div class="max-h-64 overflow-y-auto space-y-1.5">
        ${this.itemsList.map((item) => {
          const text = item.itemConvivencia || item.nombre || '';
          return `
            <button type="button" data-items-select="${escapeHtml(text)}"
              class="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium bg-gray-50 text-gray-700 hover:bg-purple-50 hover:border-purple-200 border border-transparent hover:border transition-all">
              <span>${escapeHtml(text)}</span>
            </button>
          `;
        }).join('')}
      </div>
    ` : '';
    const empty = !this.itemsLoading && this.itemsList.length === 0 ? `
      <div class="text-center py-8 text-gray-400">
        <i class="bi bi-inbox text-3xl block mb-2"></i>
        <p class="text-xs">No hay situaciones predefinidas para esta categoría</p>
      </div>
    ` : '';
    const tipoLabel = TIPOS.find((t) => t.id === this.record.tipo)?.label || this.record.tipo;
    return `
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <div class="bg-white w-full max-w-lg rounded-2xl flex flex-col shadow-2xl">
          <div class="p-4 flex justify-between items-center border-b border-gray-100">
            <div>
              <span class="text-sm font-black text-gray-600 uppercase tracking-widest">📋 Situaciones - ${tipoLabel}</span>
              <p class="text-[10px] text-gray-400 mt-0.5">Seleccione una situación para agregarla a la descripción</p>
            </div>
            <button type="button" id="obsCloseItemsModal" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors font-bold text-gray-500">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="p-4">
            ${loading}
            ${items}
            ${empty}
          </div>
        </div>
      </div>
    `;
  }

  renderAsistenteRedaccion() {
    const tabs = GRUPOS_ASISTENTE.map((g) => `
      <button type="button" data-asistente-tab="${g.id}"
        class="px-2 py-1.5 rounded-t-lg text-[10px] font-bold transition-all
          ${this.activeTab === g.id ? 'bg-[#543391] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}">
        ${g.label}
      </button>
    `).join('');

    let buttonsHTML = '';
    if (this.activeTab) {
      const grupo = GRUPOS_ASISTENTE.find((g) => g.id === this.activeTab);
      if (grupo) {
        buttonsHTML = `<div class="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
          ${grupo.keys.map((key) => {
            const texto = TEXTOS_ASISTENTE[key] || '';
            return `
              <button type="button" data-insert-text="${key}" title="${escapeHtml(texto.substring(0, 60))}"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 hover:bg-purple-100 hover:border-purple-400 border border-transparent transition-all">
                ${key.replace(/_/g, ' ').substring(0, 20)}
              </button>
            `;
          }).join('')}
        </div>`;
      }
    } else {
      buttonsHTML = `<div class="flex flex-wrap gap-2 mb-4">
        <button type="button" data-insert-text="observacion" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-purple-100 transition-colors">👁️ Observación</button>
        <button type="button" data-insert-text="dialogo" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-purple-100 transition-colors">💬 Conversación</button>
        <button type="button" data-insert-text="compromiso_escrito" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-purple-100 transition-colors">✅ Compromiso</button>
        <button type="button" data-insert-text="valoracion_actos" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-purple-100 transition-colors">🤔 Reflexión</button>
        <button type="button" data-insert-text="protocolo_activado" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-purple-100 transition-colors">⚡ Acción</button>
        <button type="button" data-insert-text="reconocimiento" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">🌟 Positivo</button>
        <button type="button" data-insert-text="ciberacoso" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors">🚨 Especial</button>
      </div>`;
    }

    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">✏️ Asistente de Redacción</h3>
        <div class="flex flex-wrap gap-1 mb-4 border-b border-gray-100 pb-2">${tabs}</div>
        ${buttonsHTML}
        <textarea id="obsDescripcion" rows="8" placeholder="Describa los hechos de manera clara y objetiva..."
          class="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-[#543391] resize-none leading-relaxed">${escapeHtml(this.record.descripcion)}</textarea>
      </div>
    `;
  }

  renderAccionesInmediatas() {
    const items = ACCIONES_INMEDIATAS.map((a) => {
      const checked = this.record.accionesInmediatas.includes(a.id);
      return `
        <label class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer hover:bg-purple-50 transition-colors">
          <input type="checkbox" data-accion-check="${a.id}" ${checked ? 'checked' : ''} class="w-4 h-4 rounded text-[#543391]">
          <span class="text-xs text-gray-600">${a.label}</span>
        </label>
      `;
    }).join('');
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">⚡ Acciones Inmediatas</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${items}</div>
      </div>
    `;
  }

  renderPlanSeguimiento() {
    const buttons = PLANES_SEGUIMIENTO.map((p) =>
      `<button type="button" data-plan="${p.id}" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-emerald-100 transition-colors">+ ${p.label}</button>`
    ).join('');
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">📅 Plan de Seguimiento</h3>
        <div class="flex flex-wrap gap-2 mb-4">${buttons}</div>
        <textarea id="obsPlanSeguimiento" rows="3" placeholder="Describa el plan de seguimiento..."
          class="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 resize-none">${escapeHtml(this.record.planSeguimiento)}</textarea>
      </div>
    `;
  }

  renderDerivacion() {
    const options = DERIVACIONES.map((d) =>
      `<option value="${d.id}" ${this.record.derivacion === d.id ? 'selected' : ''}>${d.label}</option>`
    ).join('');
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">🏢 Derivación</h3>
        <select id="obsDerivacion" class="w-full p-2.5 rounded-xl bg-gray-50 border-none text-sm text-gray-700 focus:ring-2 focus:ring-[#543391]">${options}</select>
      </div>
    `;
  }

  renderContactos() {
    return `
      <div class="bg-gray-50 rounded-2xl border border-gray-200 p-5">
        <h3 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">📝 Notas / Contactos Entidades</h3>
        <textarea id="obsContactos" rows="3" placeholder="Contactos de entidades externas o información adicional..."
          class="w-full p-4 rounded-2xl bg-white border-none text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-[#543391] resize-none">${escapeHtml(this.record.contactoEntidades)}</textarea>
      </div>
    `;
  }

  renderCompromisos() {
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">🤝 Compromisos del Estudiante</h3>
        <textarea id="obsCompromisos" rows="3" placeholder="Compromisos adquiridos por el estudiante..."
          class="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-[#543391] resize-none">${escapeHtml(this.record.compromisos)}</textarea>
      </div>
    `;
  }

  renderFirmas() {
    const firmaDocente = this.record.firmaDocente
      ? `<img src="${this.record.firmaDocente}" alt="Firma docente" class="w-full h-[90px] object-contain bg-white rounded-2xl border">`
      : `<button type="button" data-firma-tipo="docente" class="w-full h-[90px] bg-gray-100 hover:bg-gray-200 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center transition-all">
          <span class="text-2xl">✍️</span>
          <span class="text-[10px] text-gray-400 mt-0.5">Click para firmar</span>
        </button>`;
    const firmaEstudiante = this.record.firmaEstudiante
      ? `<img src="${this.record.firmaEstudiante}" alt="Firma estudiante" class="w-full h-[90px] object-contain bg-white rounded-2xl border">`
      : `<button type="button" data-firma-tipo="estudiante" class="w-full h-[90px] bg-gray-100 hover:bg-gray-200 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center transition-all">
          <span class="text-2xl">✍️</span>
          <span class="text-[10px] text-gray-400 mt-0.5">Click para firmar</span>
        </button>`;
    const firmaAcudiente = this.record.firmaAcudiente
      ? `<img src="${this.record.firmaAcudiente}" alt="Firma acudiente" class="w-full h-[90px] object-contain bg-white rounded-2xl border">`
      : `<button type="button" data-firma-tipo="acudiente" class="w-full h-[90px] bg-gray-100 hover:bg-gray-200 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center transition-all">
          <span class="text-2xl">✍️</span>
          <span class="text-[10px] text-gray-400 mt-0.5">Click para firmar</span>
        </button>`;

    return `
      <div class="bg-[#2d1b69] rounded-2xl p-5 shadow-lg">
        <h3 class="text-white text-sm font-black uppercase mb-5 tracking-wider">✍️ Firmas</h3>
        <div class="mb-5">
          <div class="flex justify-between items-center mb-2">
            <span class="text-[10px] font-bold text-purple-300 uppercase">Firma Docente</span>
            ${this.record.firmaDocente ? `<button type="button" data-borrar-firma="docente" class="text-[9px] text-white/40 hover:text-white">Borrar</button>` : ''}
          </div>
          ${firmaDocente}
        </div>
        <div class="mb-5">
          <div class="flex justify-between items-center mb-2">
            <span class="text-[10px] font-bold text-purple-300 uppercase">Firma Estudiante</span>
            ${this.record.firmaEstudiante ? `<button type="button" data-borrar-firma="estudiante" class="text-[9px] text-white/40 hover:text-white">Borrar</button>` : ''}
          </div>
          ${firmaEstudiante}
        </div>
        <div>
          <div class="flex justify-between items-center mb-2">
            <span class="text-[10px] font-bold text-purple-300 uppercase">Firma Padre/Acudiente</span>
            ${this.record.firmaAcudiente ? `<button type="button" data-borrar-firma="acudiente" class="text-[9px] text-white/40 hover:text-white">Borrar</button>` : ''}
          </div>
          ${firmaAcudiente}
        </div>
      </div>
    `;
  }

  renderBotones() {
    return `
      <button type="button" id="obsGeneratePDF"
        class="w-full py-4 rounded-2xl bg-gradient-to-r from-[#543391] to-purple-600 text-white font-black text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
        📄 GENERAR REPORTE PDF
      </button>
    `;
  }

  renderNotaLegal() {
    const tipo = this.record.tipo;
    let nota = '';
    if (tipo === 'positivo') nota = 'Reconocimiento positivo - Evaluación cualitativa según Ley 115/1994';
    else if (tipo === 'tipo1') nota = 'Situación Tipo I - Seguimiento en aula (Ley 1620/2013)';
    else if (tipo === 'tipo2') nota = 'Situación Tipo II - Mediación y Orientación Escolar';
    else nota = 'Situación Tipo III - Remisión inmediata a Rectoría';
    return `
      <div class="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
        <div class="flex items-start gap-2">
          <span class="text-lg">💡</span>
          <div>
            <p class="text-xs font-bold text-emerald-700">Nota Legal</p>
            <p class="text-[10px] text-emerald-600 mt-1">${nota}</p>
          </div>
        </div>
      </div>
    `;
  }

  renderPDFPreview() {
    if (!this.showPreview || !this.pdfUrl) return '';
    return `
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <div class="bg-white w-full max-w-5xl h-[90vh] rounded-2xl flex flex-col shadow-2xl">
          <div class="p-4 flex justify-between items-center border-b border-gray-100">
            <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Vista Previa del Reporte</span>
            <button type="button" id="obsClosePreview" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors font-bold text-gray-500">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <iframe src="${this.pdfUrl}" title="Vista PDF" class="flex-1 w-full border-none rounded-b-2xl"></iframe>
          <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-center gap-4">
            <a href="${this.pdfUrl}" download="Observador_${this.record.estudiante.nombres || 'estudiante'}.pdf"
              class="px-8 py-3 rounded-2xl bg-[#543391] text-white font-bold text-sm shadow-lg hover:bg-[#6f4ab3] transition-colors">
              <i class="bi bi-download mr-2"></i> Descargar PDF
            </a>
          </div>
        </div>
      </div>
    `;
  }

  renderFirmaModal() {
    if (!this.firmaModal.open) return '';
    const label = this.firmaModal.tipo === 'docente' ? 'Docente' : this.firmaModal.tipo === 'estudiante' ? 'Estudiante' : 'Padre/Acudiente';
    return `
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <div class="bg-white w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl">
          <div class="p-4 flex justify-between items-center border-b border-gray-100">
            <span class="text-sm font-black text-gray-600 uppercase tracking-widest">✍️ Firma ${label}</span>
            <button type="button" id="obsCloseFirma" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors font-bold text-gray-500">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="p-6">
            <p class="text-xs text-gray-400 mb-4">Dibuje su firma en el espacio de abajo:</p>
            <canvas id="obsFirmaCanvas" width="600" height="200"
              class="w-full h-[200px] bg-white rounded-xl border-2 border-gray-300 cursor-crosshair touch-none shadow-inner"></canvas>
          </div>
          <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-center gap-4">
            <button type="button" id="obsClearFirma" class="px-6 py-3 rounded-2xl bg-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-300 transition-colors">
              <i class="bi bi-eraser mr-1"></i> Limpiar
            </button>
            <button type="button" id="obsCancelFirma" class="px-6 py-3 rounded-2xl bg-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-300 transition-colors">
              <i class="bi bi-x-circle mr-1"></i> Cancelar
            </button>
            <button type="button" id="obsSaveFirma" class="px-8 py-3 rounded-2xl bg-[#543391] text-white font-bold text-sm shadow-lg hover:bg-[#6f4ab3] transition-colors">
              <i class="bi bi-check-lg mr-1"></i> Guardar Firma
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setupEvents() {
    const container = $(CONTAINER_ID);
    if (!container) return;

    delegate(container, 'click', '#obsToggleHistory', () => {
      this.showHistory = !this.showHistory;
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '#obsToggleLegal', () => {
      this.showLegalInfo = !this.showLegalInfo;
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '#obsClearAll', () => {
      if (confirm('¿Limpiar todo el formulario?')) {
        localStorage.removeItem('observador_draft');
        this.record = this.getDefaultRecord();
        this.showHistory = false;
        this.showLegalInfo = false;
        this.render();
        this.setupEvents();
      }
    });

    delegate(container, 'click', '#obsClosePreview', () => {
      this.showPreview = false;
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '#obsCloseFirma', () => {
      this.firmaModal.open = false;
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '#obsCancelFirma', () => {
      this.firmaModal.open = false;
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '#obsClearFirma', () => {
      if (this.signaturePad) this.signaturePad.clear();
    });

    delegate(container, 'click', '#obsSaveFirma', () => {
      if (this.signaturePad && !this.signaturePad.isEmpty()) {
        const dataUrl = this.signaturePad.toDataURL('image/png');
        if (this.firmaModal.tipo === 'docente') this.record.firmaDocente = dataUrl;
        else if (this.firmaModal.tipo === 'estudiante') this.record.firmaEstudiante = dataUrl;
        else if (this.firmaModal.tipo === 'acudiente') this.record.firmaAcudiente = dataUrl;
        this.saveDraft();
      }
      this.firmaModal.open = false;
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '#obsLoadStudents', () => {
      this.loadStudentList();
    });

    delegate(container, 'click', '#obsClearStudent', () => {
      this.record.estudiante = { codigo: '', nombres: '', grado: '', nivel: '', numero: '', sede: '' };
      this.record.estudiantes = [];
      this._filterStudents = [];
      this.saveDraft();
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'change', '[data-student-checkbox]', (e, target) => {
      const est = (() => { try { return JSON.parse(target.value); } catch { return null; } })();
      if (!est) return;
      if (target.checked) {
        this.record.estudiantes = [...this.record.estudiantes, est];
      } else {
        this.record.estudiantes = this.record.estudiantes.filter((e) => e.codigo !== est.codigo);
      }
      this.record.estudiante = this.record.estudiantes.length > 0 ? { ...this.record.estudiantes[0] } : { codigo: '', nombres: '', grado: '', nivel: '', numero: '', sede: '' };
      this.saveDraft();
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '[data-remove-student]', (e, target) => {
      const codigo = target.dataset.removeStudent;
      this.record.estudiantes = this.record.estudiantes.filter((e) => e.codigo !== codigo);
      if (this.record.estudiantes.length > 0) {
        this.record.estudiante = { ...this.record.estudiantes[0] };
      } else {
        this.record.estudiante = { codigo: '', nombres: '', grado: '', nivel: '', numero: '', sede: '' };
      }
      this.saveDraft();
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '#obsGeneratePDF', () => {
      this.generatePDF();
    });

    delegate(container, 'click', '[data-tipo]', (e, target) => {
      const tipo = target.dataset.tipo;
      this.record.tipo = tipo;
      const cats = CATEGORIAS[tipo];
      this.record.categoria = cats && cats.length > 0 ? cats[0].id : '';
      this.saveDraft();
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '[data-categoria]', (e, target) => {
      this.record.categoria = target.dataset.categoria;
      this.saveDraft();
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '[data-impacto]', (e, target) => {
      this.record.impacto = target.dataset.impacto;
      this.saveDraft();
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '[data-accion]', (e, target) => {
      const id = target.dataset.accion;
      this.toggleAccion(id);
      this.saveDraft();
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'change', '[data-accion-check]', (e, target) => {
      const id = target.dataset.accionCheck;
      this.toggleAccion(id);
      this.saveDraft();
    });

    delegate(container, 'click', '[data-plan]', (e, target) => {
      const plan = PLANES_SEGUIMIENTO.find((p) => p.id === target.dataset.plan);
      if (plan) {
        this.record.planSeguimiento += (this.record.planSeguimiento ? '\n- ' : '- ') + plan.desc;
        this.saveDraft();
        const ta = document.getElementById('obsPlanSeguimiento');
        if (ta) ta.value = this.record.planSeguimiento;
      }
    });

    delegate(container, 'click', '[data-insert-text]', (e, target) => {
      const key = target.dataset.insertText;
      const texto = TEXTOS_ASISTENTE[key];
      if (texto) {
        this.record.descripcion += (this.record.descripcion ? '\n' : '') + texto;
        this.saveDraft();
        const ta = document.getElementById('obsDescripcion');
        if (ta) ta.value = this.record.descripcion;
      }
    });

    delegate(container, 'click', '[data-asistente-tab]', (e, target) => {
      const id = target.dataset.asistenteTab;
      this.activeTab = this.activeTab === id ? null : id;
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '[data-legal-section]', (e, target) => {
      const id = target.dataset.legalSection;
      this.activeLegalSection = this.activeLegalSection === id ? null : id;
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '#obsOpenItemsModal', () => {
      this.showItemsModal = true;
      this.itemsList = [];
      this.loadItemsFromBackend();
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '#obsCloseItemsModal', () => {
      this.showItemsModal = false;
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '[data-items-select]', (e, target) => {
      const text = target.dataset.itemsSelect;
      if (text) {
        this.record.descripcion += (this.record.descripcion ? '\n' : '') + '• ' + text;
        this.saveDraft();
      }
      this.showItemsModal = false;
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    delegate(container, 'click', '[data-firma-tipo]', (e, target) => {
      this.firmaModal = { open: true, tipo: target.dataset.firmaTipo };
      this.render();
      this.syncFormFromState();
      this.setupEvents();
      this.initSignaturePad();
    });

    delegate(container, 'click', '[data-borrar-firma]', (e, target) => {
      const tipo = target.dataset.borrarFirma;
      if (tipo === 'docente') this.record.firmaDocente = null;
      else if (tipo === 'estudiante') this.record.firmaEstudiante = null;
      else if (tipo === 'acudiente') this.record.firmaAcudiente = null;
      this.saveDraft();
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    });

    this.bindLiveInputs();
    this.bindFilterEvents();
  }

  bindLiveInputs() {
    const desc = document.getElementById('obsDescripcion');
    if (desc) {
      desc.addEventListener('input', () => {
        this.record.descripcion = desc.value;
    this.saveDraft();
    this.updateProgressBar();
      });
    }

    const plan = document.getElementById('obsPlanSeguimiento');
    if (plan) {
      plan.addEventListener('input', () => {
        this.record.planSeguimiento = plan.value;
        this.saveDraft();
      });
    }

    const contactos = document.getElementById('obsContactos');
    if (contactos) {
      contactos.addEventListener('input', () => {
        this.record.contactoEntidades = contactos.value;
        this.saveDraft();
      });
    }

    const compromisos = document.getElementById('obsCompromisos');
    if (compromisos) {
      compromisos.addEventListener('input', () => {
        this.record.compromisos = compromisos.value;
        this.saveDraft();
      });
    }

    const fecha = document.getElementById('obsFecha');
    if (fecha) {
      fecha.addEventListener('change', () => {
        this.record.fecha = fecha.value;
        this.saveDraft();
      });
    }

    const nee = document.getElementById('obsNEE');
    if (nee) {
      nee.addEventListener('change', () => {
        this.record.esNEE = nee.checked;
        const neeSelect = document.getElementById('obsNEESelect');
        if (neeSelect) neeSelect.classList.toggle('hidden', !nee.checked);
        this.saveDraft();
      });
    }

    const tipoNEE = document.getElementById('obsTipoNEE');
    if (tipoNEE) {
      tipoNEE.addEventListener('change', () => {
        this.record.tipoNEE = tipoNEE.value;
        this.saveDraft();
      });
    }

    const derivacion = document.getElementById('obsDerivacion');
    if (derivacion) {
      derivacion.addEventListener('change', () => {
        this.record.derivacion = derivacion.value;
        this.saveDraft();
      });
    }
  }

  async bindFilterEvents() {
    const sedeSel = document.getElementById('obsFilterSede');
    const nivelSel = document.getElementById('obsFilterNivel');
    const numeroSel = document.getElementById('obsFilterNumero');
    if (!sedeSel) return;

    try {
      const res = await filters.getSedes();
      const sedes = Array.isArray(res) ? res : (res?.data || []);
      sedeSel.innerHTML = '<option value="">Todas las sedes</option>'
        + sedes.map((s) => `<option value="${escapeHtml(String(s.ind ?? s.value ?? ''))}">${escapeHtml(s.nombre || s.sede || s.label || '')}</option>`).join('');
    } catch {
      sedeSel.innerHTML = '<option value="">Error al cargar</option>';
    }

    sedeSel.addEventListener('change', async () => {
      if (!sedeSel.value) { nivelSel.innerHTML = '<option value="">Nivel</option>'; numeroSel.innerHTML = '<option value="">Grupo</option>'; return; }
      nivelSel.innerHTML = '<option value="">Cargando...</option>';
      try {
        const res = await filters.getNiveles(sedeSel.value, String(new Date().getFullYear()));
        const grupos = Array.isArray(res) ? res : (res?.data || []);
        const niveles = [...new Set(grupos.map((g) => g.nivel ?? g.value).filter((v) => v != null))].sort((a, b) => Number(a) - Number(b));
        nivelSel.innerHTML = '<option value="">Todos los niveles</option>'
          + niveles.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
      } catch { nivelSel.innerHTML = '<option value="">Error</option>'; }
      numeroSel.innerHTML = '<option value="">Seleccione nivel primero</option>';
    });

    nivelSel.addEventListener('change', async () => {
      if (!sedeSel.value || !nivelSel.value) { numeroSel.innerHTML = '<option value="">Grupo</option>'; return; }
      numeroSel.innerHTML = '<option value="">Cargando...</option>';
      try {
        const year = String(new Date().getFullYear());
        const res = await fetch(endpoint('/getNumeros.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asignacion: sedeSel.value, nivel: nivelSel.value, year }),
        });
        const numeros = await res.json();
        const lista = Array.isArray(numeros) ? numeros : (numeros?.data || []);
        const unicos = [...new Set(lista.map((g) => g.numero ?? g.value).filter((v) => v != null))].sort((a, b) => Number(a) - Number(b));
        numeroSel.innerHTML = '<option value="">Todos los grupos</option>'
          + unicos.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
      } catch { numeroSel.innerHTML = '<option value="">Error</option>'; }
    });
  }

  _mapTipo(tipo) {
    const map = { positivo: 'POSITIVO', tipo1: 'TIPO I', tipo2: 'TIPO II', tipo3: 'TIPO III' };
    return map[tipo] || tipo;
  }

  async loadItemsFromBackend() {
    this.itemsLoading = true;
    try {
      const tipoParam = encodeURIComponent(this._mapTipo(this.record.tipo));
      const res = await fetch(endpoint(`/getItemsConvivencia.php?tipo=${tipoParam}`));
      const data = await res.json();
      this.itemsList = Array.isArray(data) ? data : [];
    } catch {
      this.itemsList = [];
    }
    this.itemsLoading = false;
    this.render();
    this.syncFormFromState();
    this.setupEvents();
  }

  async loadStudentList() {
    const sedeSel = document.getElementById('obsFilterSede');
    const nivelSel = document.getElementById('obsFilterNivel');
    const numeroSel = document.getElementById('obsFilterNumero');
    if (!sedeSel && !nivelSel && !numeroSel) return;

    const btn = document.getElementById('obsLoadStudents');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat animate-spin"></i> Cargando...'; }

    try {
      const res = await students.getByFilter(sedeSel?.value || undefined, nivelSel?.value || undefined, numeroSel?.value || undefined);
      this._filterStudents = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    } catch {
      this._filterStudents = [];
      this.render();
      this.syncFormFromState();
      this.setupEvents();
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-search"></i> Cargar'; }
    }
  }

  bindStudentSearch() {
    // search replaced by <select multiple> — kept for compat
  }

  syncFormFromState() {
    const desc = document.getElementById('obsDescripcion');
    if (desc) desc.value = this.record.descripcion;
    const plan = document.getElementById('obsPlanSeguimiento');
    if (plan) plan.value = this.record.planSeguimiento;
    const contactos = document.getElementById('obsContactos');
    if (contactos) contactos.value = this.record.contactoEntidades;
    const compromisos = document.getElementById('obsCompromisos');
    if (compromisos) compromisos.value = this.record.compromisos;
    const fecha = document.getElementById('obsFecha');
    if (fecha) fecha.value = this.record.fecha;
    const nee = document.getElementById('obsNEE');
    if (nee) nee.checked = this.record.esNEE;
    const neeSelect = document.getElementById('obsNEESelect');
    if (neeSelect) neeSelect.classList.toggle('hidden', !this.record.esNEE);
    const tipoNEE = document.getElementById('obsTipoNEE');
    if (tipoNEE) tipoNEE.value = this.record.tipoNEE;
    const derivacion = document.getElementById('obsDerivacion');
    if (derivacion) derivacion.value = this.record.derivacion;
  }

  updateProgressBar() {
    const pct = this.getProgreso();
    const span = document.getElementById('obsProgressPct');
    if (span) span.textContent = pct + '%';
    const bar = document.getElementById('obsProgressBar');
    if (bar) bar.style.width = pct + '%';
  }

  initSignaturePad() {
    setTimeout(() => {
      const canvas = document.getElementById('obsFirmaCanvas');
      if (!canvas) return;
      this.firmaCanvas = canvas;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;

      if (this.signaturePad) {
        this.signaturePad.clear();
      } else {
        this.signaturePad = new SignaturePad(canvas, {
          penColor: '#1e293b',
          backgroundColor: 'rgb(255,255,255)',
          minWidth: 1,
          maxWidth: 3,
          throttle: 0,
        });
      }
    }, 100);
  }

  toggleAccion(id) {
    if (this.record.accionesInmediatas.includes(id)) {
      this.record.accionesInmediatas = this.record.accionesInmediatas.filter((a) => a !== id);
    } else {
      this.record.accionesInmediatas = [...this.record.accionesInmediatas, id];
    }
  }

  guardarEnHistorial() {
    const entry = {
      fecha: this.record.fecha,
      nombreEstudiante: this.record.estudiante.nombres,
      tipo: this.record.tipo,
      categoria: this.record.categoria,
      descripcion: this.record.descripcion.substring(0, 100) + '...',
    };
    this.historial = [entry, ...this.historial].slice(0, 50);
    try {
      localStorage.setItem('observador_historial', JSON.stringify(this.historial));
    } catch (e) { /* ignore */ }
  }

  async generatePDF() {
    if (!this.record.estudiante.nombres || !this.record.descripcion) {
      alertWarning('Complete los campos obligatorios', 'Nombre del estudiante y descripción son requeridos');
      return;
    }

    this.guardarEnHistorial();

    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(45, 27, 105).rect(0, 0, w, 35, 'F');
    doc.setTextColor(255, 255, 255)
      .setFontSize(16)
      .setFont('helvetica', 'bold')
      .text('I.E. DE OCCIDENTE', 15, 15);
    doc.setFontSize(9).text('OBSERVADOR DEL ESTUDIANTE - CONVIVENCIA ESCOLAR', 15, 25);
    doc.setFontSize(8).text('Según Ley 1620/2013 - Ley de Convivencia Escolar', 15, 31);

    doc.setTextColor(30, 30, 30).setFontSize(11).setFont('helvetica', 'bold');
    doc.text('DATOS DEL ESTUDIANTE', 15, 45);

    doc.setFontSize(10).setFont('helvetica', 'normal');
    const tipoLabel = TIPOS.find((t) => t.id === this.record.tipo)?.label || this.record.tipo;
    doc.text(`Nombre: ${this.record.estudiante.nombres}`, 15, 53);
    doc.text(`Grado: ${this.record.estudiante.grado}`, 100, 53);
    doc.text(`Código: ${this.record.estudiante.codigo || 'N/A'}`, 15, 60);
    doc.text(`Fecha: ${this.record.fecha}`, 100, 60);
    doc.text(`Tipo: ${tipoLabel}`, 15, 67);
    doc.text(`Impacto: ${IMPACTO.find((i) => i.id === this.record.impacto)?.label || this.record.impacto}`, 100, 67);

    if (this.record.esNEE && this.record.tipoNEE !== 'ninguno') {
      doc.setTextColor(100, 100, 100).setFontSize(9);
      doc.text(`NEE: ${TIPOS_NEE.find((n) => n.id === this.record.tipoNEE)?.label}`, 15, 74);
    }

    const cats = CATEGORIAS[this.record.tipo] || [];
    const catLabel = cats.find((c) => c.id === this.record.categoria)?.label || this.record.categoria;
    doc.setTextColor(30, 30, 30).setFontSize(11).setFont('helvetica', 'bold');
    doc.text('CATEGORÍA', 15, 85);
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(catLabel, 15, 92);

    doc.setFontSize(11).setFont('helvetica', 'bold').text('DESCRIPCIÓN DE LOS HECHOS', 15, 103);
    doc.setFontSize(9).setFont('helvetica', 'normal');
    const splitDesc = doc.splitTextToSize(this.record.descripcion, 180);
    doc.text(splitDesc, 15, 110);

    let currentY = 110 + splitDesc.length * 4 + 10;

    doc.setFontSize(10).setFont('helvetica', 'bold');
    doc.text('MARCO NORMATIVO APLICABLE', 15, currentY);
    currentY += 7;
    doc.setFontSize(8).setFont('helvetica', 'normal');
    if (this.record.tipo === 'positivo') {
      doc.text('Reconocimiento positivo según Manual de Convivencia - Evaluación cualitativa (Ley 115/1994)', 15, currentY);
    } else if (this.record.tipo === 'tipo1') {
      doc.text('Situación Tipo I - Resolución en el aula con seguimiento del docente (Ley 1620/2013)', 15, currentY);
    } else if (this.record.tipo === 'tipo2') {
      doc.text('Situación Tipo II - Requiere mediación y remisión a Orientación Escolar (Ley 1620/2013)', 15, currentY);
    } else {
      doc.text('Situación Tipo III - Remisión inmediata a Rectoría y posible notificación a ICBF (Ley 1620/2013)', 15, currentY);
    }
    currentY += 10;

    if (this.record.accionesInmediatas.length > 0) {
      doc.setFontSize(10).setFont('helvetica', 'bold');
      doc.text('ACCIONES INMEDIATAS TOMADAS', 15, currentY);
      currentY += 7;
      doc.setFontSize(9).setFont('helvetica', 'normal');
      this.record.accionesInmediatas.forEach((accion) => {
        const accLabel = ACCIONES_INMEDIATAS.find((a) => a.id === accion)?.label || accion;
        doc.text(`• ${accLabel}`, 15, currentY);
        currentY += 5;
      });
      currentY += 5;
    }

    if (this.record.derivacion !== 'ninguna') {
      doc.setFontSize(10).setFont('helvetica', 'bold');
      doc.text('DERIVACIÓN', 15, currentY);
      currentY += 7;
      doc.setFontSize(9).setFont('helvetica', 'normal');
      const derivLabel = DERIVACIONES.find((d) => d.id === this.record.derivacion)?.label || this.record.derivacion;
      doc.text(derivLabel, 15, currentY);
      currentY += 10;
    }

    const entidadesExternas = ['comisaria_familia', 'policia_infancia', 'hospital', 'psicologia', 'denuncia_penal', 'protocolo_icbf'];
    const entidadesNotificadas = this.record.accionesInmediatas.filter((a) => entidadesExternas.includes(a));

    if (entidadesNotificadas.length > 0) {
      doc.setFillColor(220, 53, 69).rect(15, currentY - 4, w - 30, 8, 'F');
      doc.setTextColor(255, 255, 255).setFontSize(9).setFont('helvetica', 'bold');
      doc.text('NOTIFICACIONES A AUTORIDADES EXTERNAS', 18, currentY + 1);
      currentY += 12;

      doc.setTextColor(30, 30, 30).setFontSize(9).setFont('helvetica', 'normal');
      entidadesNotificadas.forEach((ent) => {
        const entLabel = ACCIONES_INMEDIATAS.find((a) => a.id === ent)?.label || ent;
        doc.text(`• ${entLabel}`, 15, currentY);
        currentY += 5;
      });

      if (this.record.contactoEntidades) {
        currentY += 3;
        doc.setFontSize(8).setFont('helvetica', 'bold');
        doc.text('DATOS DE CONTACTO:', 15, currentY);
        currentY += 5;
        doc.setFontSize(8).setFont('helvetica', 'normal');
        const splitContact = doc.splitTextToSize(this.record.contactoEntidades, 175);
        doc.text(splitContact, 15, currentY);
        currentY += splitContact.length * 4;
      }
      currentY += 5;
    }

    if (this.record.planSeguimiento) {
      doc.setFontSize(10).setFont('helvetica', 'bold');
      doc.text('PLAN DE SEGUIMIENTO', 15, currentY);
      currentY += 7;
      doc.setFontSize(9).setFont('helvetica', 'normal');
      const splitPlan = doc.splitTextToSize(this.record.planSeguimiento, 180);
      doc.text(splitPlan, 15, currentY);
      currentY += splitPlan.length * 4 + 10;
    }

    if (this.record.compromisos) {
      doc.setFontSize(10).setFont('helvetica', 'bold');
      doc.text('COMPROMISOS DEL ESTUDIANTE', 15, currentY);
      currentY += 7;
      doc.setFontSize(9).setFont('helvetica', 'normal');
      const splitComp = doc.splitTextToSize(this.record.compromisos, 180);
      doc.text(splitComp, 15, currentY);
    }

    doc.setFontSize(10).setFont('helvetica', 'bold');
    doc.text('FIRMAS', 15, 270);

    if (this.record.firmaDocente) {
      doc.setFontSize(8).setFont('helvetica', 'normal').text('Docente', 25, 280);
      doc.addImage(this.record.firmaDocente, 'PNG', 20, 275, 40, 15);
      doc.line(20, 292, 60, 292);
    }
    if (this.record.firmaEstudiante) {
      doc.setFontSize(8).setFont('helvetica', 'normal').text('Estudiante', 80, 280);
      doc.addImage(this.record.firmaEstudiante, 'PNG', 75, 275, 40, 15);
      doc.line(75, 292, 115, 292);
    }
    if (this.record.firmaAcudiente) {
      doc.setFontSize(8).setFont('helvetica', 'normal').text('Padre/Acudiente', 135, 280);
      doc.addImage(this.record.firmaAcudiente, 'PNG', 130, 275, 40, 15);
      doc.line(130, 292, 170, 292);
    }

    doc.setFillColor(240, 240, 240).rect(0, 295, w, 15, 'F');
    doc.setFontSize(6).setTextColor(100, 100, 100);
    doc.text('Documento generado digitalmente - Observador Escolar I.E. de Occidente', 15, 300);
    doc.text('Conforme a Ley 1098/2006 (Código Infancia) y Ley 1620/2013 (Convivencia Escolar)', 15, 304);

    this.pdfUrl = doc.output('bloburl');
    this.showPreview = true;
    this.render();
    this.syncFormFromState();
    this.setupEvents();
  }
}

const convivenciaModule = new ConvivenciaModule();
export default convivenciaModule;
