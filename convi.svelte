<script lang="ts">
  import { jsPDF } from "jspdf";
  import "jspdf-autotable";
  import { onMount } from "svelte";
  import { theme } from "../lib/themeStore";
  import { get } from 'svelte/store';
  import { ChevronLeft, FileText, Sun, Moon, CloudMoon } from '@lucide/svelte';
  import ModuleHeader from './ModuleHeader.svelte';

  let { onBack }: { onBack: () => void } = $props();

  // --- TIPOS E INTERFACES ---
  interface Estudiante {
    nombre: string;
    grado: string;
    codigo: string;
  }

  interface ObservadorRecord {
    fecha: string;
    estudiante: Estudiante;
    tipo: string;
    categoria: string;
    impacto: string;
    esNEE: boolean;
    tipoNEE: string;
    descripcion: string;
    accionesInmediatas: string[];
    planSeguimiento: string;
    derivacion: string;
    compromisos: string;
    contactoEntidades: string;
    firmaDocente: string | null;
    firmaEstudiante: string | null;
    firmaAcudiente: string | null;
  }

  // --- CONSTANTES NORMATIVAS ---
  const TIPOS = [
    { id: "positivo", label: "Positivo", color: "emerald", icon: "🌟" },
    { id: "tipo1", label: "Tipo I", color: "blue", icon: "📝" },
    { id: "tipo2", label: "Tipo II", color: "amber", icon: "⚠️" },
    { id: "tipo3", label: "Tipo III", color: "rose", icon: "🚨" },
  ];

  const CATEGORIAS: Record<string, { id: string; label: string; icon: string }[]> = {
    positivo: [
      { id: "merito_academico", label: "Mérito Académico", icon: "🎖️" },
      { id: "convivencia", label: "Buena Convivencia", icon: "🌟" },
      { id: "solidaridad", label: "Solidaridad", icon: "🤝" },
      { id: "esfuerzo", label: "Esfuerzo", icon: "💪" },
      { id: "logro_deportivo", label: "Logro Deportivo", icon: "🏆" },
      { id: "creatividad", label: "Creatividad", icon: "🎨" },
      { id: "liderazgo", label: "Liderazgo", icon: "⭐" },
      { id: "mejora", label: "Mejora Significativa", icon: "📈" },
    ],
    tipo1: [
      { id: "tarea_olvidada", label: "Tarea/Olvido materiales", icon: "📝" },
      { id: "uniforme", label: "Uniforme incompleto", icon: "👕" },
      { id: "celular", label: "Uso indebido celular", icon: "📱" },
      { id: "falta_respeto_leve", label: "Falta de respeto leve", icon: "💬" },
      { id: "consumo_alimentos", label: "Consumo alimentos", icon: "🍬" },
      { id: "retraso", label: "Llegada tarde", icon: "⏰" },
      { id: "interrupcion", label: "Interrupción clase", icon: "🔊" },
    ],
    tipo2: [
      { id: "agresion_verbal", label: "Agresión verbal", icon: "😤" },
      { id: "ciberacoso", label: "Ciberacoso", icon: "💻" },
      { id: "danio_propiedad", label: "Daño a propiedad", icon: "💔" },
      { id: "mentira", label: "Engaño/Mentira", icon: "🎭" },
      { id: "agresion_fisica_leve", label: "Agresión física leve", icon: "👊" },
      { id: "robo", label: "Hurto menor", icon: "🔒" },
      { id: "insulto", label: "Insulto grave", icon: "🗣️" },
    ],
    tipo3: [
      { id: "armas", label: "Portación armas", icon: "🔪" },
      { id: "sustancias", label: "Sustancias psicoactivas", icon: "💊" },
      { id: "extorsion", label: "Extorsión", icon: "💰" },
      { id: "agresion_fisica", label: "Agresión física grave", icon: "🚨" },
      { id: "actividades_ilicitas", label: "Actividades ilícitas", icon: "⛔" },
      { id: "acoso_sexual", label: "Acoso sexual", icon: "🚫" },
      { id: "vandalismo", label: "Vandalismo", icon: "🔥" },
    ],
  };

  const IMPACTO = [
    { id: "bajo", label: "Bajo", desc: "Afectación individual mínima" },
    { id: "medio", label: "Medio", desc: "Afectación al grupo-clase" },
    { id: "alto", label: "Alto", desc: "Afectación a la institución" },
  ];

  const TIPOS_NEE = [
    { id: "visual", label: "Visual" },
    { id: "auditiva", label: "Auditiva" },
    { id: "motora", label: "Motora" },
    { id: "cognitiva", label: "Cognitiva" },
    { id: "emocional", label: "Emocional" },
    { id: "autismo", label: "TEA" },
    { id: "tdah", label: "TDAH" },
    { id: "ninguno", label: "Ninguno" },
  ];

  const ACCIONES_INMEDIATAS = [
    { id: "llamada_padre", label: "Comunicación inmediata al padre/acudiente", category: "interno" },
    { id: "remision_orientacion", label: "Remisión a Orientación Escolar", category: "interno" },
    { id: "cita_coordinacion", label: "Cita con Coordinación", category: "interno" },
    { id: "remision_rectoria", label: "Remisión a Rectoría", category: "interno" },
    { id: "citacion_padres", label: "Citación formal a padres", category: "interno" },
    { id: "primeros_auxilios", label: "Primeros auxilios / Atención médica", category: "salud" },
    { id: "protocolo_icbf", label: "Activación protocolo ICBF", category: "externo" },
    { id: "comisaria_familia", label: "Notificación a Comisaría de Familia", category: "externo" },
    { id: "policia_infancia", label: "Policía de Infancia y Adolescencia", category: "externo" },
    { id: "hospital", label: "Remisión a Hospital / Centro de Salud", category: "salud" },
    { id: "enfermeria", label: "Atención de Enfermería Institucional", category: "salud" },
    { id: "psicologia", label: "Derivación a Psicología", category: "salud" },
    { id: "denuncia_penal", label: "Denuncia ante Fiscalía", category: "externo" },
    { id: "ninguna", label: "Ninguna acción inmediata", category: "ninguno" },
  ];

  const PLANES_SEGUIMIENTO = [
    { id: "seguimiento_semanal", label: "Seguimiento semanal", desc: "Revisión de evolución" },
    { id: "reunion_padres", label: "Reunión con padres", desc: "Concertar cita" },
    { id: "tutor_asignado", label: "Tutoría asignada", desc: "Docente tutor" },
    { id: "acompañamiento", label: "Acompañamiento emocional", desc: "Referencia orientación" },
    { id: "plan_academico", label: "Plan de recuperación", desc: "Académico" },
    { id: "refuerzo_positivo", label: "Refuerzo positivo", desc: "Reconocimiento mejoras" },
    { id: "derivacion_externa", label: "Derivación externa", desc: "Psicólogo/Especialista" },
  ];

  const DERIVACIONES = [
    { id: "ninguna", label: "Ninguna - Seguimiento docente" },
    { id: "orientacion", label: "Orientación Escolar" },
    { id: "coordinacion", label: "Coordinación Académica" },
    { id: "rectoria", label: "Rectoría" },
    { id: "psicologia", label: "Referencia externa (Psicología)" },
    { id: "icbf", label: "ICBF / Bienestar Familiar" },
    { id: "comite_convivencia", label: "Comité de Convivencia" },
  ];

  const TEXTOS_ASISTENTE: Record<string, string> = {
    // OBSERVACIÓN
    observacion: "Al momento de la observación, se evidenció que ",
    en_clase: "Durante el desarrollo de la clase de ",
    reporte_terceros: "Según reporte realizado por parte de ",
    inicio_jornada: "Al iniciar la jornada académica se observó que ",
    durante_recargo: "Durante el tiempo de recreo/descanso se evidenció que ",
    salida_aula: "Al momento de salir del aula, se detectó que ",
    
    // CONVERSACIÓN
    dialogo: "Se mantuvo diálogo con el estudiante quien expresó que ",
    version_estudiante: "El estudiante manifiesta que ",
    version_testigos: "Según versión de los compañeros presentes en el lugar, ",
    negacion: "Al dialogar con el estudiante, este manifestó no estar de acuerdo con ",
    aceptacion: "El estudiante reconoció que ",
    
    // NOTIFICACIONES
    llamada_padre: "Se contactó telefónicamente al padre/acudiente para informar sobre ",
    citacion_escrita: "Por medio de la presente se cita al padre/acudiente para ",
    comunicacion_escrita: "Se hace conocimiento del padre/acudiente mediante comunicación escrita sobre ",
    aviso_urgente: "Se comunica de manera URGENTE sobre la situación presentada que requiere atención inmediata.",
    notificacion_coordinacion: "Se notifica a Coordinación Académica sobre ",
    notificacion_orientacion: "Se remite a Orientación Escolar para ",
    
    // COMPROMISOS
    compromiso_escrito: "El estudiante se compromete formalmente a: ",
    plan_mejora: "Se establece plan de mejora consistente en: ",
    seguimiento_semanal: "Se realizará seguimiento semanal durante las próximas semanas para evaluar ",
    meta_especifica: "Como meta para la próxima semana el estudiante se propone: ",
    compromiso_padres: "Se compromete conjuntamente con el padre/acudiente a ",
    compromiso_especifico: "El estudiante adquiere el siguiente compromiso: ",
    
    // REFLEXIÓN
    valoracion_actos: "Se invita al estudiante a reflexionar sobre la valoración de sus actos y el impacto en ",
    contexto_familiar: "Se conversa sobre el impacto de sus acciones en el contexto familiar y escolar.",
    sana_convivencia: "Se analiza el impacto de sus acciones en la sana convivencia del grupo.",
    rendimiento_academico: "Se habla sobre la relación entre su comportamiento y el rendimiento académico.",
    derechos_otros: "Se reflexiona sobre el respeto a los derechos de los demás y el interés superior del niño (Ley 1098/2006).",
    empatia: "Se trabaja en el desarrollo de habilidades socioemocionales y empatía hacia ",
    
    // ACCIONES
    protocolo_activado: "Se activa protocolo de convivencia según Manual de Convivencia institucional.",
    remision_orientacion: "Se remite caso a Orientación Escolar para ",
    emergencia: "Dado el nivel de gravedad de la situación, se comunica de manera inmediata a ",
    primeros_auxilios: "Se brindaron primeros auxilios psicológicos y se contactó al padre para ",
    mediacion: "Se propone proceso de mediación entre las partes involucradas.",
    medida_preventiva: "Como medida preventiva se establece ",
    reflejo_escrito: "Se solicita reflexión escrita sobre ",
    
    // SITUACIONES ESPECIALES - TIPO II/III
    ciberacoso: "Se evidencia posible situación de cyberacoso/acoso virtual en redes sociales. Se procederá según protocolo de la Ley 1620/2013.",
    agresion_fisica: "Se presenta altercado que involucra agresión física entre estudiantes. Se activan medidas de protección inmediatas.",
    sustancias: "Se encontró u observó posible tenencia o consumo de sustancias psicoactivas dentro de la institución. Se notifica a rectoría.",
    armas: "Se evidenció posible objeto peligroso o arma en poder del estudiante. Se comunica a autoridades competentes.",
    dano_propiedad: "Se evidencia daño intencional a propiedad de la institución o de la comunidad educativa.",
    extorsion: "Se presenta situación de extorsión o agresión entre compañeros que requiere investigación.",
    robo: "Se detecta hurto de pertenencias de ",
    insultos_graves: "Se profieren insultos y expresiones vejatorias hacia ",
    amenaza: "Se reciben amenazas ",
    
    // SITUACIONES ESPECIALES - NEE/VULNERABLES
    situacion_familiar: "El estudiante reporta situación familiar o comunitaria que afecta su bienestar. Se deriva a Orientación.",
    estado_emocional: "Se evidencia estado emocional alterado o afectación anímica que requiere acompañamiento.",
    nee_atencion: "Estudiante con Necesidades Educativas Especiales (NEE). Se coordina con área de apoyo para ",
    vulneracion_derechos: "Posible vulneración de derechos del estudiante. Se activa ruta de atención según Ley 1098/2006.",
    icbf_derivacion: "Situación que requiere notificación al ICBF. Se activa protocolo de protección.",
    
    // NOTIFICACIONES A AUTORIDADES - TIPO III
    comisaria_familia: "Se notifica formalmente a Comisaría de Familia de Guática según Ley 1098/2006 (Código de Infancia y Adolescencia) para activación de ruta de protección. Fecha de notificación: ___/___/_______. Contacto: _________________",
    policia_infancia: "Se comunica a Policía de Infancia y Adolescencia según protocolos de la Ley 1620/2013 y Código de Infancia. Caso remitido el día ___/___/_______. Contacto: _________________",
    hospital: "Se remite al estudiante al Hospital Local / Centro de Salud de Guática para valoración y atención médica correspondiente. Fecha de remisión: ___/___/_______. Responsable del traslado: _________________",
    enfermeria: "Se deriva a enfermería institucional para evaluación de primeros auxilios y seguimiento de estado de salud. Hora de atención: ___:___",
    psicologia: "Se deriva a psicología institucional/externa para acompañamiento emocional y evaluación correspondiente. Fecha de cita: ___/___/_______. Contacto: _________________",
    denuncia_penal: "Se radica denuncia formal ante Fiscalía / URI / Unidad de Infancia para investigación de hechos que pueden constituir delito. Radicado No.: _________________",
    
    // RECONOCIMIENTOS POSITIVOS
    reconocimiento: "Se reconoce el esfuerzo y dedicación del estudiante en ",
    logro_academico: "El estudiante ha demostrado excelencia académica en ",
    logro_convivencia: "Se destaca el comportamiento ejemplar en ",
    solidaridad: "Se destaca el comportamiento SOLIDARIO del estudiante hacia sus compañeros.",
    mejora_significativa: "Se evidencia mejora significativa en ",
    liderazgo_positivo: "El estudiante demuestra liderazgo positivo y propicia ",
    creatividad: "Se destaca la creatividad e iniciativa del estudiante en ",
    esfuerzo_perseverancia: "Se reconoce el esfuerzo y perseverancia del estudiante para ",
    
    // FUNDAMENTOS LEGALES
    fundamentolegal_t1: "Situación Tipo I - Según Manual de Convivencia y Ley 1620/2013: Situación leve que se resuelve en el aula con seguimiento del docente titular.",
    fundamentolegal_t2: "Situación Tipo II - Según Ley 1620/2013 y Código de Infancia (Ley 1098/2006): Situación tipo II que requiere mediación pedagógica y remisión obligatoria a Orientación Escolar.",
    fundamentolegal_t3: "Situación Tipo III - Según Ley 1620/2013: Situación que implica riesgo o emergencia. Se requiere comunicación inmediata al padre, notificación a Rectoría y posible activación de ruta con ICBF.",
    fundamentolegal_positivo: "Reconocimiento positivo - Según Ley 115/1994 Art. 87 y Decreto 1290/2009: La evaluación cualitativa del comportamiento valora los aspectos positivos del desarrollo integral del estudiante.",
  };

  // Grupos de botones para el UI
  const GRUPOS_ASISTENTE = [
    { id: "observacion", label: "👁️ Observación", keys: ["observacion", "en_clase", "reporte_terceros", "inicio_jornada", "durante_recargo", "salida_aula"] },
    { id: "conversacion", label: "💬 Conversación", keys: ["dialogo", "version_estudiante", "version_testigos", "negacion", "aceptacion"] },
    { id: "notificacion", label: "📞 Notificación", keys: ["llamada_padre", "citacion_escrita", "comunicacion_escrita", "aviso_urgente", "notificacion_coordinacion", "notificacion_orientacion"] },
    { id: "compromiso", label: "✅ Compromiso", keys: ["compromiso_escrito", "plan_mejora", "seguimiento_semanal", "meta_especifica", "compromiso_padres", "compromiso_especifico"] },
    { id: "reflexion", label: "🤔 Reflexión", keys: ["valoracion_actos", "contexto_familiar", "sana_convivencia", "rendimiento_academico", "derechos_otros", "empatia"] },
    { id: "accion", label: "⚡ Acción", keys: ["protocolo_activado", "remision_orientacion", "emergencia", "primeros_auxilios", "mediacion", "medida_preventiva", "reflejo_escrito"] },
    { id: "situaciones", label: "🚨 Situaciones", keys: ["ciberacoso", "agresion_fisica", "sustancias", "armas", "dano_propiedad", "extorsion", "robo", "insultos_graves", "amenaza"] },
    { id: "vulnerable", label: "🛡️ NEE/Vulnerable", keys: ["situacion_familiar", "estado_emocional", "nee_atencion", "vulneracion_derechos", "icbf_derivacion"] },
    { id: "autoridades", label: "🏛️ Autoridades", keys: ["comisaria_familia", "policia_infancia", "hospital", "enfermeria", "psicologia", "denuncia_penal"] },
    { id: "positivo", label: "🌟 Positivo", keys: ["reconocimiento", "logro_academico", "logro_convivencia", "solidaridad", "mejora_significativa", "liderazgo_positivo", "creatividad", "esfuerzo_perseverancia"] },
    { id: "legal", label: "⚖️ Legal", keys: ["fundamentolegal_t1", "fundamentolegal_t2", "fundamentolegal_t3", "fundamentolegal_positivo"] },
  ];

  // --- FUNDAMENTO LEGAL ---
  const FUNDAMENTO_LEGAL = [
    {
      id: "ley115",
      titulo: "Ley 115/1994 - Ley General de Educación",
      contenido: "Art. 87: La evaluación del comportamiento se hará con fines de diagnóstico, para prevenir y superar las dificultades en el aprendizaje y en las relaciones interpersonales.",
    },
    {
      id: "decreto1290",
      titulo: "Decreto 1290/2009 - Evaluación",
      contenido: "Art. 10: La evaluación del comportamiento varía según el grado de desarrollo del estudiante, con énfasis formativo.",
    },
    {
      id: "ley1098",
      titulo: "Ley 1098/2006 - Código Infancia y Adolescencia",
      contenido: "Art. 22: Derecho a la educación. Art. 31: Participación. Art. 39: Protección integral. Interés superior del niño primará en toda medida.",
    },
    {
      id: "ley1620",
      titulo: "Ley 1620/2013 - Convivencia Escolar",
      contenido: "Art. 2: Sistema Nacional de Convivencia Escolar. Art. 20: Rutas de atención: Tipo I (aula), Tipo II (mediación), Tipo III (comité, rectoría, ICBF).",
    },
    {
      id: "manual",
      titulo: "Manual de Convivencia I.E. Instituto Guática",
      contenido: "El observador del estudiante es un documento interno con carácter confidencial. Registro de situaciones positivas y negativas.",
    },
  ];

  // --- ESTADO REACTIVO ---
  let record = $state<ObservadorRecord>({
    fecha: new Date().toISOString().split("T")[0],
    estudiante: { nombre: "", grado: "", codigo: "" },
    tipo: "positivo",
    categoria: "convivencia",
    impacto: "bajo",
    esNEE: false,
    tipoNEE: "ninguno",
    descripcion: "",
    accionesInmediatas: [],
    planSeguimiento: "",
    derivacion: "ninguna",
    compromisos: "",
    contactoEntidades: "",
    firmaDocente: null,
    firmaEstudiante: null,
    firmaAcudiente: null,
  });

  let showPreview = $state(false);
  let pdfUrl = $state<string | null>(null);
  let showHistory = $state(false);
  let showLegalInfo = $state(false);
  let firmaModal = $state({ open: false, tipo: "" as "" | "docente" | "estudiante" | "acudiente" });
  let activeTab = $state<string | null>(null);
  let activeLegalSection = $state<string | null>(null);

  // --- HISTORIAL ---
  interface HistorialEntry {
    fecha: string;
    nombreEstudiante: string;
    tipo: string;
    categoria: string;
    descripcion: string;
  }

  let historial: HistorialEntry[] = $state([]);

  // --- COMPUTED: PROGRESO ---
  let progreso = $derived(() => {
    let completados = 0;
    const total = 7;
    if (record.estudiante.nombre) completados++;
    if (record.estudiante.grado) completados++;
    if (record.categoria) completados++;
    if (record.descripcion.length > 10) completados++;
    if (record.derivacion !== "ninguna") completados++;
    if (record.accionesInmediatas.length > 0) completados++;
    if (record.firmaDocente) completados++;
    return Math.round((completados / total) * 100);
  });

  // --- PERSISTENCIA ---
  onMount(() => {
    const saved = localStorage.getItem("observador_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(record, parsed);
      } catch (e) {
        console.error("Error parsing saved draft", e);
      }
    }

    const historySaved = localStorage.getItem("observador_historial");
    if (historySaved) {
      try {
        historial = JSON.parse(historySaved);
      } catch (e) {
        historial = [];
      }
    }
  });

  $effect(() => {
    localStorage.setItem("observador_draft", JSON.stringify(record));
  });

  // Initialize signature canvas when modal opens
  $effect(() => {
    if (firmaModal.open && firmaCanvas) {
      setTimeout(() => {
        const ctx = firmaCanvas.getContext("2d");
        if (ctx) {
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#1e293b"; // Always dark for visibility on light canvas
          
          let drawing = false;
          
          const getPos = (e: MouseEvent | TouchEvent) => {
            const rect = firmaCanvas.getBoundingClientRect();
            const scaleX = firmaCanvas.width / rect.width;
            const scaleY = firmaCanvas.height / rect.height;
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
            return {
              x: (clientX - rect.left) * scaleX,
              y: (clientY - rect.top) * scaleY,
            };
          };

          const start = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            drawing = true;
            ctx.beginPath();
            const p = getPos(e);
            ctx.moveTo(p.x, p.y);
          };
          
          const move = (e: MouseEvent | TouchEvent) => {
            if (!drawing) return;
            e.preventDefault();
            const p = getPos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          };
          
          const stop = () => {
            drawing = false;
          };

          firmaCanvas.onmousedown = start;
          firmaCanvas.onmousemove = move;
          firmaCanvas.onmouseup = stop;
          firmaCanvas.onmouseleave = stop;
          firmaCanvas.ontouchstart = start;
          firmaCanvas.ontouchmove = move;
          firmaCanvas.ontouchend = stop;
        }
      }, 100);
    }
  });

  // --- FIRMA MODAL ---
  let firmaCanvas: HTMLCanvasElement = $state(null!);
  
  const guardarFirma = () => {
    if (firmaCanvas && firmaModal.tipo) {
      const dataUrl = firmaCanvas.toDataURL("image/png");
      if (firmaModal.tipo === "docente") record.firmaDocente = dataUrl;
      else if (firmaModal.tipo === "estudiante") record.firmaEstudiante = dataUrl;
      else if (firmaModal.tipo === "acudiente") record.firmaAcudiente = dataUrl;
    }
    firmaModal.open = false;
  };
  
  const limpiarFirma = () => {
    if (firmaCanvas) {
      const ctx = firmaCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, firmaCanvas.width, firmaCanvas.height);
    }
  };

  const toggleTheme = () => {
    const currentTheme = get(theme);
    let newTheme: "light" | "dim" | "dark" = "light";
    
    if (currentTheme === "light") newTheme = "dim";
    else if (currentTheme === "dim") newTheme = "dark";
    else newTheme = "light";
    
    theme.set(newTheme);
  };

  const insertText = (key: string) => {
    const texto = TEXTOS_ASISTENTE[key];
    if (texto) {
      record.descripcion += (record.descripcion ? "\n" : "") + texto;
    }
  };

  const toggleAccion = (id: string) => {
    if (record.accionesInmediatas.includes(id)) {
      record.accionesInmediatas = record.accionesInmediatas.filter((a: string) => a !== id);
    } else {
      record.accionesInmediatas = [...record.accionesInmediatas, id];
    }
  };

  const selectPlan = (id: string) => {
    const plan = PLANES_SEGUIMIENTO.find(p => p.id === id);
    if (plan) {
      record.planSeguimiento += (record.planSeguimiento ? "\n- " : "- ") + plan.desc;
    }
  };

  const clearAll = () => {
    if (confirm("¿Limpiar todo el formulario?")) {
      localStorage.removeItem("observador_draft");
      location.reload();
    }
  };

  const guardarEnHistorial = () => {
    const entry: HistorialEntry = {
      fecha: record.fecha,
      nombreEstudiante: record.estudiante.nombre,
      tipo: record.tipo,
      categoria: record.categoria,
      descripcion: record.descripcion.substring(0, 100) + "...",
    };
    historial = [entry, ...historial].slice(0, 50);
    localStorage.setItem("observador_historial", JSON.stringify(historial));
  };

  // --- PDF GENERATION ---
  const generatePDF = async () => {
    if (!record.estudiante.nombre || !record.descripcion) {
      alert("Por favor complete los campos obligatorios");
      return;
    }

    guardarEnHistorial();

    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 41, 59).rect(0, 0, w, 35, "F");
    doc.setTextColor(255, 255, 255)
      .setFontSize(16)
      .setFont("helvetica", "bold")
      .text("I.E. INSTITUTO GUÁTICA", 15, 15);
    doc.setFontSize(9).text("OBSERVADOR DEL ESTUDIANTE - CONVIVENCIA ESCOLAR", 15, 25);
    doc.setFontSize(8).text("Según Ley 1620/2013 - Ley de Convivencia Escolar", 15, 31);

    // Datos básicos
    doc.setTextColor(30, 30, 30).setFontSize(11).setFont("helvetica", "bold");
    doc.text("DATOS DEL ESTUDIANTE", 15, 45);
    
    doc.setFontSize(10).setFont("helvetica", "normal");
    const tipoLabel = TIPOS.find(t => t.id === record.tipo)?.label || record.tipo;
    doc.text(`Nombre: ${record.estudiante.nombre}`, 15, 53);
    doc.text(`Grado: ${record.estudiante.grado}`, 100, 53);
    doc.text(`Código: ${record.estudiante.codigo || "N/A"}`, 15, 60);
    doc.text(`Fecha: ${record.fecha}`, 100, 60);
    doc.text(`Tipo: ${tipoLabel}`, 15, 67);
    doc.text(`Impacto: ${IMPACTO.find(i => i.id === record.impacto)?.label || record.impacto}`, 100, 67);

    if (record.esNEE && record.tipoNEE !== "ninguno") {
      doc.setTextColor(100, 100, 100).setFontSize(9);
      doc.text(`NEE: ${TIPOS_NEE.find(n => n.id === record.tipoNEE)?.label}`, 15, 74);
    }

    // Categoría
    const cats = CATEGORIAS[record.tipo] || [];
    const catLabel = cats.find(c => c.id === record.categoria)?.label || record.categoria;
    doc.setTextColor(30, 30, 30).setFontSize(11).setFont("helvetica", "bold");
    doc.text("CATEGORÍA", 15, 85);
    doc.setFontSize(10).setFont("helvetica", "normal");
    doc.text(catLabel, 15, 92);

    // Descripción
    doc.setFontSize(11).setFont("helvetica", "bold").text("DESCRIPCIÓN DE LOS HECHOS", 15, 103);
    doc.setFontSize(9).setFont("helvetica", "normal");
    const splitDesc = doc.splitTextToSize(record.descripcion, 180);
    doc.text(splitDesc, 15, 110);

    let currentY = 110 + (splitDesc.length * 4) + 10;

    // Fundamento legal según tipo
    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.text("MARCO NORMATIVO APLICABLE", 15, currentY);
    currentY += 7;
    
    doc.setFontSize(8).setFont("helvetica", "normal");
    if (record.tipo === "positivo") {
      doc.text("Reconocimiento positivo según Manual de Convivencia - Evaluación cualitativa del comportamiento (Ley 115/1994)", 15, currentY);
    } else if (record.tipo === "tipo1") {
      doc.text("Situación Tipo I - Resolución en el aula con seguimiento del docente (Ley 1620/2013, Art. 20)", 15, currentY);
    } else if (record.tipo === "tipo2") {
      doc.text("Situación Tipo II - Requiere mediación y remisión a Orientación Escolar (Ley 1620/2013)", 15, currentY);
    } else {
      doc.text("Situación Tipo III - Remisión inmediata a Rectoría, Comité de Convivencia y posible notificación a ICBF (Ley 1620/2013)", 15, currentY);
    }
    currentY += 10;

    // Acciones inmediatas
    if (record.accionesInmediatas.length > 0) {
      doc.setFontSize(10).setFont("helvetica", "bold");
      doc.text("ACCIONES INMEDIATAS TOMADAS", 15, currentY);
      currentY += 7;
      doc.setFontSize(9).setFont("helvetica", "normal");
      record.accionesInmediatas.forEach((accion: string) => {
        const accLabel = ACCIONES_INMEDIATAS.find(a => a.id === accion)?.label || accion;
        doc.text(`• ${accLabel}`, 15, currentY);
        currentY += 5;
      });
      currentY += 5;
    }

    // Derivación
    if (record.derivacion !== "ninguna") {
      doc.setFontSize(10).setFont("helvetica", "bold");
      doc.text("DERIVACIÓN", 15, currentY);
      currentY += 7;
      doc.setFontSize(9).setFont("helvetica", "normal");
      const derivLabel = DERIVACIONES.find(d => d.id === record.derivacion)?.label || record.derivacion;
      doc.text(derivLabel, 15, currentY);
      currentY += 10;
    }

    // Notificaciones a Autoridades Externas (Tipo III)
    const entidadesExternas = ["comisaria_familia", "policia_infancia", "hospital", "psicologia", "denuncia_penal", "protocolo_icbf"];
    const entidadesNotificadas = record.accionesInmediatas.filter(a => entidadesExternas.includes(a));
    
    if (entidadesNotificadas.length > 0) {
      doc.setFillColor(220, 53, 69).rect(15, currentY - 4, w - 30, 8, "F");
      doc.setTextColor(255, 255, 255).setFontSize(9).setFont("helvetica", "bold");
      doc.text("NOTIFICACIONES A AUTORIDADES EXTERNAS", 18, currentY + 1);
      currentY += 12;
      
      doc.setTextColor(30, 30, 30).setFontSize(9).setFont("helvetica", "normal");
      entidadesNotificadas.forEach((ent) => {
        const entLabel = ACCIONES_INMEDIATAS.find(a => a.id === ent)?.label || ent;
        doc.text(`• ${entLabel}`, 15, currentY);
        currentY += 5;
      });
      
      // Información de contacto
      if (record.contactoEntidades) {
        currentY += 3;
        doc.setFontSize(8).setFont("helvetica", "bold");
        doc.text("DATOS DE CONTACTO:", 15, currentY);
        currentY += 5;
        doc.setFontSize(8).setFont("helvetica", "normal");
        const splitContact = doc.splitTextToSize(record.contactoEntidades, 175);
        doc.text(splitContact, 15, currentY);
        currentY += (splitContact.length * 4);
      }
      currentY += 5;
    }

    // Plan de seguimiento
    if (record.planSeguimiento) {
      doc.setFontSize(10).setFont("helvetica", "bold");
      doc.text("PLAN DE SEGUIMIENTO", 15, currentY);
      currentY += 7;
      doc.setFontSize(9).setFont("helvetica", "normal");
      const splitPlan = doc.splitTextToSize(record.planSeguimiento, 180);
      doc.text(splitPlan, 15, currentY);
      currentY += (splitPlan.length * 4) + 10;
    }

    // Compromisos
    if (record.compromisos) {
      doc.setFontSize(10).setFont("helvetica", "bold");
      doc.text("COMPROMISOS DEL ESTUDIANTE", 15, currentY);
      currentY += 7;
      doc.setFontSize(9).setFont("helvetica", "normal");
      const splitComp = doc.splitTextToSize(record.compromisos, 180);
      doc.text(splitComp, 15, currentY);
    }

    // Firmas
    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.text("FIRMAS", 15, 270);
    
    if (record.firmaDocente) {
      doc.setFontSize(8).setFont("helvetica", "normal").text("Docente", 25, 280);
      doc.addImage(record.firmaDocente, "PNG", 20, 275, 40, 15);
      doc.line(20, 292, 60, 292);
    }
    
    if (record.firmaEstudiante) {
      doc.setFontSize(8).setFont("helvetica", "normal").text("Estudiante", 80, 280);
      doc.addImage(record.firmaEstudiante, "PNG", 75, 275, 40, 15);
      doc.line(75, 292, 115, 292);
    }
    
    if (record.firmaAcudiente) {
      doc.setFontSize(8).setFont("helvetica", "normal").text("Padre/Acudiente", 135, 280);
      doc.addImage(record.firmaAcudiente, "PNG", 130, 275, 40, 15);
      doc.line(130, 292, 170, 292);
    }

    // Footer normativo
    doc.setFillColor(240, 240, 240).rect(0, 295, w, 15, "F");
    doc.setFontSize(6).setTextColor(100, 100, 100);
    doc.text("Documento generado digitalmente - Observador Escuela I.E. Instituto Guática", 15, 300);
    doc.text("Conforme a Ley 1098/2006 (Código Infancia) y Ley 1620/2013 (Convivencia Escolar)", 15, 304);

    pdfUrl = doc.output("bloburl") as unknown as string;
    showPreview = true;
  };
</script>

<div>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0f172a] p-4 md:p-6 transition-colors duration-500 font-sans">
    <ModuleHeader title="Observador Escolar" subtitle="Convivencia y Seguimiento" {onBack}>
      {#snippet actions()}
        <button onclick={() => showHistory = !showHistory} class="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-primary))] text-[rgb(var(--text-primary))] hover:border-[rgb(var(--accent-primary))] transition-colors">
          Historial
        </button>
        <button onclick={() => showLegalInfo = !showLegalInfo} class="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-primary))] text-[rgb(var(--text-primary))] hover:border-[rgb(var(--accent-primary))] transition-colors">
          Marco Legal
        </button>
        <button onclick={clearAll} class="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          Limpiar
        </button>
      {/snippet}
    </ModuleHeader>

    <header class="max-w-7xl mx-auto mb-6">

      <!-- Progress Bar -->
      <div class="mt-4 bg-white/50 dark:bg-white/5 rounded-2xl p-4 border border-slate-200 dark:border-white/10">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Progreso del Reporte</span>
          <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">{progreso()}%</span>
        </div>
        <div class="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style="width: {progreso()}%"></div>
        </div>
      </div>
    </header>

    <!-- Legal Info Panel -->
    {#if showLegalInfo}
      <div class="max-w-7xl mx-auto mb-6 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
        <h3 class="text-sm font-black text-slate-600 dark:text-white uppercase mb-4">📚 Marco Normativo Aplicable</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {#each FUNDAMENTO_LEGAL as item}
            <button onclick={() => activeLegalSection = activeLegalSection === item.id ? null : item.id} 
              class="text-left p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-indigo-500 transition-colors {activeLegalSection === item.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-slate-50 dark:bg-white/5'}">
              <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.titulo}</span>
              {#if activeLegalSection === item.id}
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-2">{item.contenido}</p>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- History Panel -->
    {#if showHistory}
      <div class="max-w-7xl mx-auto mb-6 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
        <h3 class="text-sm font-black text-slate-600 dark:text-white uppercase mb-4">📜 Historial de Reportes</h3>
        {#if historial.length === 0}
          <p class="text-sm text-slate-400">No hay registros anteriores</p>
        {:else}
          <div class="space-y-2 max-h-60 overflow-y-auto">
            {#each historial as entry}
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div class="flex justify-between items-start">
                  <span class="text-xs font-bold text-slate-700 dark:text-white">{entry.nombreEstudiante}</span>
                  <span class="text-[10px] text-slate-400">{entry.fecha}</span>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full {entry.tipo === 'positivo' ? 'bg-emerald-100 text-emerald-700' : entry.tipo === 'tipo3' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">{entry.categoria}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- LEFT COLUMN: Datos y Tipo -->
      <div class="lg:col-span-3 space-y-4">
        <!-- Datos Estudiante -->
        <div class="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4">👤 Datos del Estudiante</h3>
          <div class="space-y-3">
            <input bind:value={record.estudiante.nombre} placeholder="Nombre completo" 
              class="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-sm font-medium dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500" />
            <input bind:value={record.estudiante.grado} placeholder="Grado/Grupo" 
              class="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-sm font-medium dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500" />
            <input bind:value={record.estudiante.codigo} placeholder="Código estudiantil" 
              class="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-sm font-medium dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500" />
            <input type="date" bind:value={record.fecha} 
              class="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-sm font-medium dark:text-white focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <!-- Tipo de Situación -->
        <div class="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4">🎯 Tipo de Situación</h3>
          <div class="space-y-2">
            {#each TIPOS as tipo}
              <button onclick={() => { record.tipo = tipo.id; record.categoria = CATEGORIAS[tipo.id][0]?.id || ""; }}
                class="w-full p-3 rounded-xl text-left text-sm font-medium transition-all border {record.tipo === tipo.id 
                  ? `bg-${tipo.color}-600 border-${tipo.color}-600 text-white` 
                  : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-300 dark:text-slate-300'}">
                <span class="mr-2">{tipo.icon}</span> {tipo.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Warning para Tipo III -->
        {#if record.tipo === 'tipo3'}
          <div class="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-[2rem] p-4">
            <div class="flex items-start gap-3">
              <span class="text-2xl">⚠️</span>
              <div>
                <h4 class="text-sm font-black text-red-700 dark:text-red-400 uppercase">Situación Tipo III - Acciones Obligatorias</h4>
                <p class="text-xs text-red-600 dark:text-red-300 mt-1">
                  Según Ley 1620/2013 y Ley 1098/2006, esta situación requiere notificación inmediata a autoridades competentes. 
                  Seleccione las entidades a continuaciån.
                </p>
                <div class="flex flex-wrap gap-2 mt-3">
                  <button onclick={() => toggleAccion('comisaria_familia')} class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-red-800 text-red-700 dark:text-red-200 border border-red-300 hover:bg-red-100 {record.accionesInmediatas.includes('comisaria_familia') ? 'bg-red-600 text-white' : ''}">
                    🏛️ Comisaría
                  </button>
                  <button onclick={() => toggleAccion('policia_infancia')} class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-red-800 text-red-700 dark:text-red-200 border border-red-300 hover:bg-red-100 {record.accionesInmediatas.includes('policia_infancia') ? 'bg-red-600 text-white' : ''}">
                    👮 Policía
                  </button>
                  <button onclick={() => toggleAccion('hospital')} class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-red-800 text-red-700 dark:text-red-200 border border-red-300 hover:bg-red-100 {record.accionesInmediatas.includes('hospital') ? 'bg-red-600 text-white' : ''}">
                    🏥 Hospital
                  </button>
                  <button onclick={() => toggleAccion('psicologia')} class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-red-800 text-red-700 dark:text-red-200 border border-red-300 hover:bg-red-100 {record.accionesInmediatas.includes('psicologia') ? 'bg-red-600 text-white' : ''}">
                    🧠 Psicología
                  </button>
                  <button onclick={() => toggleAccion('denuncia_penal')} class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-red-800 text-red-700 dark:text-red-200 border border-red-300 hover:bg-red-100 {record.accionesInmediatas.includes('denuncia_penal') ? 'bg-red-600 text-white' : ''}">
                    ⚖️ Fiscalía
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Impacto -->
        <div class="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4">📊 Nivel de Impacto</h3>
          <div class="space-y-2">
            {#each IMPACTO as imp}
              <button onclick={() => record.impacto = imp.id}
                class="w-full p-2 rounded-xl text-left text-xs font-medium transition-all border {record.impacto === imp.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                  : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-indigo-300 dark:text-slate-300'}">
                {imp.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- NEE -->
        <div class="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <label class="flex items-center gap-3 mb-4 cursor-pointer">
            <input type="checkbox" bind:checked={record.esNEE} class="w-5 h-5 rounded text-indigo-600" />
            <span class="text-xs font-bold text-slate-600 dark:text-slate-300">¿Estudiante NEE?</span>
          </label>
          {#if record.esNEE}
            <select bind:value={record.tipoNEE} class="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-sm dark:text-white focus:ring-2 focus:ring-indigo-500">
              {#each TIPOS_NEE as nee}
                <option value={nee.id}>{nee.label}</option>
              {/each}
            </select>
          {/if}
        </div>
      </div>

      <!-- CENTER COLUMN: Descripción y Acciones -->
      <div class="lg:col-span-6 space-y-4">
        <!-- Categoría -->
        <div class="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4">🏷️ Categoría Específica</h3>
          <div class="flex flex-wrap gap-2">
            {#each CATEGORIAS[record.tipo] || [] as cat}
              <button onclick={() => record.categoria = cat.id}
                class="px-3 py-2 rounded-xl text-xs font-medium transition-all border {record.categoria === cat.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-indigo-400'}">
                <span class="mr-1">{cat.icon}</span> {cat.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Asistente de Redacción -->
        <div class="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4">✏️ Asistente de Redacción Inteligente</h3>
          
          <!-- Tabs de grupos -->
          <div class="flex flex-wrap gap-1 mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
            {#each GRUPOS_ASISTENTE as grupo, i}
              <button onclick={() => activeTab = activeTab === grupo.id ? null : grupo.id}
                class="px-2 py-1.5 rounded-t-lg text-[10px] font-bold transition-all {activeTab === grupo.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200'}">
                {grupo.label}
              </button>
            {/each}
          </div>
          
          <!-- Botones del grupo activo -->
          {#if activeTab}
            {@const grupoActual = GRUPOS_ASISTENTE.find(g => g.id === activeTab)}
            {#if grupoActual}
              <div class="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                {#each grupoActual.keys as key}
                  {@const texto = TEXTOS_ASISTENTE[key]}
                  <button onclick={() => insertText(key)} title={texto?.substring(0, 60) + '...'}
                    class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:border-indigo-400 border border-transparent transition-all">
                    {key.replace(/_/g, ' ').substring(0, 20)}
                  </button>
                {/each}
              </div>
            {/if}
          {:else}
            <div class="flex flex-wrap gap-2 mb-4">
              <button onclick={() => insertText('observacion')} class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                👁️ Observación
              </button>
              <button onclick={() => insertText('dialogo')} class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                💬 Conversación
              </button>
              <button onclick={() => insertText('compromiso_escrito')} class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                ✅ Compromiso
              </button>
              <button onclick={() => insertText('valoracion_actos')} class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                🤔 Reflexión
              </button>
              <button onclick={() => insertText('protocolo_activado')} class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                ⚡ Acción
              </button>
              <button onclick={() => insertText('reconocimiento')} class="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-colors">
                🌟 Positivo
              </button>
              <button onclick={() => insertText('ciberacoso')} class="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 transition-colors">
                🚨 Especial
              </button>
            </div>
          {/if}
          
          <textarea bind:value={record.descripcion} rows="8" placeholder="Describa los hechos de manera clara y objetiva o use los botones de arriba para insertar texto..."
            class="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-none text-sm dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"></textarea>
        </div>

        <!-- Acciones Inmediatas -->
        <div class="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4">⚡ Acciones Inmediatas</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            {#each ACCIONES_INMEDIATAS as accion}
              <label class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <input type="checkbox" checked={record.accionesInmediatas.includes(accion.id)} 
                  onchange={() => toggleAccion(accion.id)} class="w-4 h-4 rounded text-indigo-600" />
                <span class="text-xs text-slate-600 dark:text-slate-300">{accion.label}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Plan de Seguimiento -->
        <div class="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4">📅 Plan de Seguimiento</h3>
          <div class="flex flex-wrap gap-2 mb-4">
            {#each PLANES_SEGUIMIENTO as plan}
              <button onclick={() => selectPlan(plan.id)} class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                + {plan.label}
              </button>
            {/each}
          </div>
          <textarea bind:value={record.planSeguimiento} rows="3" placeholder="Describa el plan de seguimiento..."
            class="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-none text-sm dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 resize-none"></textarea>
        </div>

        <!-- Derivación -->
        <div class="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4">🏢 Derivación</h3>
          <select bind:value={record.derivacion} class="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-sm dark:text-white focus:ring-2 focus:ring-indigo-500">
            {#each DERIVACIONES as deriv}
              <option value={deriv.id}>{deriv.label}</option>
            {/each}
          </select>
        </div>

        <!-- Notas Adicionales / Contactos de Entidades -->
        <div class="bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4">📝 Notas Adicionales / Contactos</h3>
          <textarea bind:value={record.contactoEntidades} rows="3" 
            placeholder="Ingrese notas, contactos de entidades externas, o información adicional relevante..."
            class="w-full p-4 rounded-2xl bg-white dark:bg-white/5 border-none text-sm dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
        </div>

        <!-- Compromisos -->
        <div class="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6">
          <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-4">🤝 Compromisos del Estudiante</h3>
          <textarea bind:value={record.compromisos} rows="3" placeholder="Compromisos adquiridos por el estudiante..."
            class="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-none text-sm dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
        </div>
      </div>

      <!-- RIGHT COLUMN: Firmas y Generar -->
      <div class="lg:col-span-3 space-y-4">
        <!-- Firmas -->
        <div class="bg-indigo-950 dark:bg-indigo-900/30 rounded-[2rem] p-6 shadow-2xl">
          <h3 class="text-white text-sm font-black uppercase mb-6">✍️ Firmas</h3>
          
          <!-- Firma Docente -->
          <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
              <span class="text-[10px] font-bold text-indigo-300 uppercase">Firma Docente</span>
              {#if record.firmaDocente}
                <button onclick={() => record.firmaDocente = null} class="text-[9px] text-white/40 hover:text-white">Borrar</button>
              {/if}
            </div>
            {#if record.firmaDocente}
              <img src={record.firmaDocente} alt="Firma docente" class="w-full h-[100px] object-contain bg-white rounded-2xl" />
            {:else}
              <button onclick={() => firmaModal = { open: true, tipo: "docente" }}
                class="w-full h-[100px] bg-white/10 hover:bg-white/20 rounded-2xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center transition-all">
                <span class="text-3xl">✍️</span>
                <span class="text-xs text-white/60 mt-1">Click para firmar</span>
              </button>
            {/if}
          </div>

          <!-- Firma Estudiante -->
          <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
              <span class="text-[10px] font-bold text-indigo-300 uppercase">Firma Estudiante</span>
              {#if record.firmaEstudiante}
                <button onclick={() => record.firmaEstudiante = null} class="text-[9px] text-white/40 hover:text-white">Borrar</button>
              {/if}
            </div>
            {#if record.firmaEstudiante}
              <img src={record.firmaEstudiante} alt="Firma estudiante" class="w-full h-[100px] object-contain bg-white rounded-2xl" />
            {:else}
              <button onclick={() => firmaModal = { open: true, tipo: "estudiante" }}
                class="w-full h-[100px] bg-white/10 hover:bg-white/20 rounded-2xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center transition-all">
                <span class="text-3xl">✍️</span>
                <span class="text-xs text-white/60 mt-1">Click para firmar</span>
              </button>
            {/if}
          </div>

          <!-- Firma Acudiente -->
          <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
              <span class="text-[10px] font-bold text-indigo-300 uppercase">Firma Padre/Acudiente</span>
              {#if record.firmaAcudiente}
                <button onclick={() => record.firmaAcudiente = null} class="text-[9px] text-white/40 hover:text-white">Borrar</button>
              {/if}
            </div>
            {#if record.firmaAcudiente}
              <img src={record.firmaAcudiente} alt="Firma acudiente" class="w-full h-[100px] object-contain bg-white rounded-2xl" />
            {:else}
              <button onclick={() => firmaModal = { open: true, tipo: "acudiente" }}
                class="w-full h-[100px] bg-white/10 hover:bg-white/20 rounded-2xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center transition-all">
                <span class="text-3xl">✍️</span>
                <span class="text-xs text-white/60 mt-1">Click para firmar</span>
              </button>
            {/if}
          </div>
        </div>

        <!-- Botón Generar -->
        <button onclick={generatePDF}
          class="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all">
          📄 GENERAR REPORTE PDF
        </button>

        <!-- Info Legal Flotante -->
        <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
          <div class="flex items-start gap-2">
            <span class="text-lg">💡</span>
            <div>
              <p class="text-xs font-bold text-emerald-700 dark:text-emerald-400">Nota Legal</p>
              <p class="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1">
                {#if record.tipo === 'positivo'}
                  Reconocimiento positivo - Evaluación cualitativa según Ley 115/1994
                {:else if record.tipo === 'tipo1'}
                  Situación Tipo I - Seguimiento en aula (Ley 1620/2013)
                {:else if record.tipo === 'tipo2'}
                  Situación Tipo II - Mediación y Orientación Escolar
                {:else}
                  Situación Tipo III - Remisión inmediata a Rectoría
                {/if}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PDF Preview Modal -->
    {#if showPreview && pdfUrl}
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[2rem] flex flex-col shadow-2xl">
          <div class="p-4 flex justify-between items-center border-b border-slate-100 dark:border-white/10">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Vista Previa del Reporte</span>
            <button onclick={() => showPreview = false} class="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors font-bold">
              ✕
            </button>
          </div>
          <iframe src={pdfUrl} title="Vista PDF" class="flex-1 w-full border-none rounded-b-[2rem]"></iframe>
          <div class="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex justify-center gap-4">
            <a href={pdfUrl} download="Observador_{record.estudiante.nombre || 'estudiante'}.pdf"
              class="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg hover:bg-indigo-500 transition-colors">
              ⬇️ Descargar PDF
            </a>
          </div>
        </div>
      </div>
    {/if}

    <!-- Signature Modal -->
    {#if firmaModal.open}
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] flex flex-col shadow-2xl">
          <div class="p-4 flex justify-between items-center border-b border-slate-100 dark:border-white/10">
            <span class="text-sm font-black text-slate-600 dark:text-white uppercase tracking-widest">
              ✍️ Firma {firmaModal.tipo === "docente" ? "Docente" : firmaModal.tipo === "estudiante" ? "Estudiante" : "Padre/Acudiente"}
            </span>
            <button onclick={() => firmaModal.open = false} class="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors font-bold">
              ✕
            </button>
          </div>
          
          <div class="p-6">
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Dibuje su firma en el espacio de abajo:</p>
            <canvas 
              bind:this={firmaCanvas}
              width="600"
              height="200"
              class="w-full h-[200px] bg-white rounded-xl border-2 border-slate-300 dark:border-slate-600 cursor-crosshair touch-none shadow-inner"
            ></canvas>
          </div>
          
          <div class="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex justify-center gap-4">
            <button onclick={limpiarFirma}
              class="px-6 py-3 rounded-2xl bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-300 transition-colors">
              🗑️ Limpiar
            </button>
            <button onclick={() => firmaModal.open = false}
              class="px-6 py-3 rounded-2xl bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-300 transition-colors">
              ❌ Cancelar
            </button>
            <button onclick={guardarFirma}
              class="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg hover:bg-indigo-500 transition-colors">
              ✅ Guardar Firma
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(html) { scroll-behavior: smooth; }
  canvas { image-rendering: -webkit-optimize-contrast; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #6366f133; border-radius: 10px; }
</style>