import { api } from './api.js';

class ConvivenciaService {
  /**
   * Create a convivencia record
   */
  create(data) {
    return api.post('convivencia', data);
  }

  /**
   * Get convivencia records for a student
   */
  getByStudent(studentId) {
    return api.get('convivencia', { student: studentId });
  }

  getStudentDetail(studentId) {
    return api.post('convivencia/student-detail', { estudiante: studentId });
  }

  /**
   * Get convivencia records for a group
   */
  getByGroup(asignacion, nivel, numero) {
    return api.get('convivencia/group', { asignacion, nivel, numero });
  }

  /**
   * Get convivencia statistics
   */
  getStats(year, nivel, numero) {
    return api.get('convivencia/stats', { year, nivel, numero });
  }

  /**
   * Get convivencia items (types, situations)
   */
  getItems() {
    return api.get('convivencia/items');
  }

  /**
   * Get consolidation by area
   */
  getConsolidation(params = {}) {
    return api.get('convivencia/consolidation', params);
  }

  /**
   * Get recent records
   */
  getRecent(studentId, limit = 5) {
    return api.get('convivencia/recent', { student: studentId, limit });
  }
}

export const convivencia = new ConvivenciaService();
