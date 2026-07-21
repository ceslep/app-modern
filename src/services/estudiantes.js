/**
 * Estudiantes Service — wrapper para estugrupos (control de estudiantes).
 *
 * Centraliza las llamadas al router legacy y normaliza las respuestas
 * (algunos endpoints legacy devuelven arrays crudos, otros {exito,mensaje}).
 */
import { api } from './api.js';

/**
 * Columnas reales de la tabla `estugrupos` que el formulario puede editar.
 * Cualquier campo fuera de esta lista se descarta antes de enviar al backend
 * (evita que `setEstugrupos.php` intente UPDATE sobre columnas inexistentes
 * como `sede`, que proviene de un JOIN).
 */
export const ESTUGRUPOS_COLUMNS = new Set([
  'ind',
  // Identificación / datos personales
  'nombres', 'genero', 'fecnac', 'tipoSangre', 'eps', 'tdei',
  'lugarNacimiento', 'lugarExpedicion', 'fechaExpedicion', 'email_estudiante',
  // Académico / estado
  'activo', 'banda', 'HED', 'desertor', 'institucion_externa', 'estado',
  // Acudiente
  'acudiente', 'idacudiente', 'parentesco', 'telefono_acudiente',
  'email_acudiente', 'direccion', 'telefono1', 'telefono2',
  // Padre / madre
  'padre', 'padreid', 'telefonopadre', 'ocupacionpadre',
  'madre', 'madreid', 'telefonomadre', 'ocupacionmadre',
  // Referencial
  'etnia', 'discapacidad', 'estrato', 'sisben', 'victimaConflicto',
  'lugarDesplazamiento', 'fechaDesplazamiento', 'otraInformacion',
]);

class EstudiantesService {
  /** Lista de estudiantes de un año (tabla estugrupos + sede). */
  async getGroup(year) {
    const res = await api.post('students/group', { year });
    return Array.isArray(res) ? res : (res?.data || []);
  }

  /** Historial de grupos de un estudiante. */
  async getHistory(estudiante) {
    const res = await api.post('students/group-history', { estudiante });
    return Array.isArray(res) ? res : (res?.data || []);
  }

  /** Grupos destino disponibles para cambio de grupo. */
  async getGroupTargets({ asignacion, nivel, numero, year }) {
    const res = await api.post('students/group-targets', { asignacion, nivel, numero, year });
    return Array.isArray(res) ? res : (res?.data || []);
  }

  /**
   * Actualiza los datos de un estudiante.
   * `data` se filtra contra ESTUGRUPOS_COLUMNS antes de enviar.
   */
  async update(data) {
    const payload = {};
    for (const [k, v] of Object.entries(data)) {
      if (ESTUGRUPOS_COLUMNS.has(k)) payload[k] = v;
    }
    if (!payload.ind) throw new Error('Falta el identificador (ind) del estudiante.');
    return api.post('students/update', payload);
  }

  /**
   * Crea un nuevo estudiante.
   * `data` debe incluir al menos: codigo, estudiante, nombres, asignacion, nivel, numero, year.
   */
  async create(data) {
    const payload = {};
    for (const [k, v] of Object.entries(data)) {
      if (ESTUGRUPOS_COLUMNS.has(k) || ['codigo','estudiante','asignacion','nivel','numero','year','anio'].includes(k)) {
        payload[k] = v;
      }
    }
    return api.post('students/create', payload);
  }

  /** Cambia a un estudiante de grupo (cambia_grado.php). */
  async changeGroup({ estudiante, asignacion, nivel, numero, grado, year }) {
    const payload = { estudiante, asignacion, nivel, numero, grado };
    if (year) payload.year = year;
    return api.post('students/change-group', payload);
  }
}

export const estudiantes = new EstudiantesService();
