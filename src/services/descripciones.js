/**
 * Descripciones Service — performance descriptions from legacy
 * getDescripciones.php / setDescripcion.php via the router.
 */
import { api } from './api.js';

class DescripcionesService {
  /**
   * Fetch performance descriptions.
   * @param {string|null} docente — filter to a specific docente identificacion.
   *                                Pass null/empty to fetch all (Maestra only).
   */
  async getAll(docente = null) {
    const params = {};
    if (docente) params.docente = docente;
    const res = await api.get('descriptions', params);
    // Legacy endpoint returns a flat array directly (no {data} wrapper)
    return Array.isArray(res) ? res : (res?.data || []);
  }

  /**
   * Create/update a description record.
   * @param {Object} data — { docente, asignatura, periodo, nivel, numero, desempeno, descripcion }
   */
  async create(data) {
    const res = await api.post('descriptions/save', data);
    return res?.data ?? res;
  }
}

export const descripciones = new DescripcionesService();
