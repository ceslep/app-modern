import { api } from './api.js';

class ConvivenciaService {
  /**
   * Create a convivencia record
   */
  create(data) {
    return api.request('convivencia', { method: 'POST', body: data, modern: true });
  }

  /**
   * Get convivencia records for a student
   */
  getByStudent(studentId) {
    return api.request('convivencia', { method: 'GET', params: { student: studentId }, modern: true });
  }

  getStudentDetail(studentId) {
    return api.request('convivencia/student-detail', { method: 'POST', body: { estudiante: studentId }, modern: true });
  }

  /**
   * Get convivencia records for a group
   */
  getByGroup(asignacion, nivel, numero) {
    return api.request('convivencia/group', { method: 'GET', params: { asignacion, nivel, numero }, modern: true });
  }

  /**
   * Get convivencia statistics
   */
  getStats(year, nivel, numero) {
    return api.request('convivencia/stats', { method: 'GET', params: { year, nivel, numero }, modern: true });
  }

  /**
   * Get convivencia items (types, situations)
   */
  getItems() {
    return api.request('convivencia/items', { method: 'GET', modern: true });
  }

  /**
   * Get consolidation by area
   */
  getConsolidation(params = {}) {
    return api.request('convivencia/consolidation', { method: 'GET', params, modern: true });
  }

  /**
   * Get recent records
   */
  getRecent(studentId, limit = 5) {
    return api.request('convivencia/recent', { method: 'GET', params: { student: studentId, limit }, modern: true });
  }
}

export const convivencia = new ConvivenciaService();
