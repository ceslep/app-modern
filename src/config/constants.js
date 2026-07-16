/**
 * Application constants
 */

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: 'auth/login',
    LOGOUT: 'auth/logout',
    SESSION: 'auth/session',
  },
  STUDENTS: {
    LIST: 'students',
    SEARCH: 'students/search',
    GET: (id) => `students/${id}`,
    CREATE: 'students',
    UPDATE: (id) => `students/${id}`,
    DELETE: (id) => `students/${id}`,
    GROUP: (id) => `students/${id}/group`,
  },
  GRADES: {
    LIST: 'grades',
    GET_BY_STUDENT: 'grades/student',
    CREATE: 'grades',
    DELETE: (id) => `grades/${id}`,
    HISTORY: 'grades/history',
    FINALS: 'grades/finals',
  },
  ATTENDANCE: {
    LIST: 'attendance',
    CREATE: 'attendance',
    DELETE: (id) => `attendance/${id}`,
  },
  CONVIVENCIA: {
    LIST: 'convivencia',
    CREATE: 'convivencia',
    STATS: 'convivencia/stats',
  },
  CERTIFICATES: {
    GENERATE: 'certificates/generate',
    BULK: 'certificates/bulk',
  },
  TEACHERS: {
    LIST: 'teachers',
    GET: (id) => `teachers/${id}`,
  },
  CANDIDATES: {
    LIST: 'candidates',
    ENROLL: (id) => `candidates/${id}/enroll`,
    DELETE: (id) => `candidates/${id}`,
  },
  NOTIFICATIONS: {
    LIST: 'notifications',
    UNREAD: 'notifications/unread',
    MARK_READ: (id) => `notifications/${id}/read`,
  },
  PERIODS: {
    LIST: 'periods',
  },
  YEARS: {
    LIST: 'years',
  },
};

// Grade levels
export const GRADE_LEVELS = [
  { value: '1', label: 'Primero' },
  { value: '2', label: 'Segundo' },
  { value: '3', label: 'Tercero' },
  { value: '4', label: 'Cuarto' },
  { value: '5', label: 'Quinto' },
  { value: '6', label: 'Sexto' },
  { value: '7', label: 'Séptimo' },
  { value: '8', label: 'Octavo' },
  { value: '9', label: 'Noveno' },
  { value: '10', label: 'Décimo' },
  { value: '11', label: 'Undécimo' },
];

// Periods (values match notas.periodo in the DB). Fallback only —
// the live list comes from GET /periods.
export const PERIODS = [
  { value: 'UNO', label: 'UNO' },
  { value: 'DOS', label: 'DOS' },
  { value: 'TRES', label: 'TRES' },
  { value: 'CUATRO', label: 'CUATRO' },
  { value: 'CINCO', label: 'CINCO' },
];

// Convivencia fault types
export const FAULT_TYPES = [
  { value: '1', label: 'Leve' },
  { value: '2', label: 'Grave' },
  { value: '3', label: 'Gravísima' },
];

// Performance scales
export const PERFORMANCE_SCALES = [
  { value: 'SUPERIOR', label: 'SUPERIOR', color: '#198754' },
  { value: 'ALTO', label: 'ALTO', color: '#0dcaf0' },
  { value: 'BASICO', label: 'BÁSICO', color: '#ffc107' },
  { value: 'BAJO', label: 'BAJO', color: '#dc3545' },
];

// Blood types
export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Document types
export const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'RC', label: 'Registro Civil' },
  { value: 'MS', label: 'Menor sin Identificar' },
];

// Gender options
export const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
];

// Disability types (HED)
export const DISABILITY_TYPES = [
  { value: '', label: 'Ninguna' },
  { value: 'FISICA', label: 'Discapacidad Física' },
  { value: 'AUDITIVA', label: 'Discapacidad Auditiva' },
  { value: 'VISUAL', label: 'Discapacidad Visual' },
  { value: 'INTELECTUAL', label: 'Discapacidad Intelectual' },
  { value: 'PSICOSOCIAL', label: 'Discapacidad Psicosocial' },
  { value: 'MULTIPLE', label: 'Discapacidad Múltiple' },
];

// Ethnicity options
export const ETHNICITY_OPTIONS = [
  { value: '', label: 'No Aplica' },
  { value: 'ROM', label: 'Rom (Gitano)' },
  { value: 'RAIZAL', label: 'Raizal' },
  { value: 'GITANO', label: 'Gitano' },
  { value: 'INDIGENA', label: 'Indígena' },
  { value: 'AFROCOLOMBIANO', label: 'Afrocolombiano' },
  { value: 'PALENQUERO', label: 'Palenquero' },
  { value: 'MESTIZO', label: 'Mestizo' },
  { value: 'BLANCO', label: 'Blanco' },
  { value: 'OTRO', label: 'Otro' },
];

// Notification types
export const NOTIFICATION_TYPES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'ACADEMICO', label: 'Académico' },
  { value: 'DISCIPLINARIO', label: 'Disciplinario' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
];

// Time slots (hours for attendance)
export const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const hour = i + 6;
  return {
    value: `${hour}`,
    label: `${hour}:00 - ${hour + 1}:00`,
  };
});

// App info
export const APP_NAME = 'I.E. de Occidente';
export const APP_VERSION = '2.0.0';
export const APP_YEAR = new Date().getFullYear();
