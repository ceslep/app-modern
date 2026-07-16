import { api } from './api.js';

class PuestosService {
  /**
   * Get institution-wide ranking.
   * @param {Object} params - { asignacion, year, periodo }
   * @returns {Promise<Array<{estudiante, nombres, promedio, grupo, asignacion, puesto}>>}
   */
  getInstitutionRanking(params) {
    return api.post('puestos/institution', params);
  }

  /**
   * Get group-specific ranking.
   * @param {Object} params - { asignacion, nivel, numero, periodo, year }
   * @returns {Promise<Array<{estudiante, nombres, promedio, grupo, puesto}>>}
   */
  getGroupRanking(params) {
    return api.post('puestos/group', params);
  }
}

export const puestos = new PuestosService();
