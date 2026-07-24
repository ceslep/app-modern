import { api } from './api.js';

class AttendanceService {
  /**
   * Get absences for a student
   */
  getByStudent(studentId, periodo) {
    return api.get('attendance', { student: studentId, periodo });
  }

  /**
   * Get absences for a group
   */
  getByGroup(asignacion, nivel, numero, periodo) {
    return api.get('attendance/group', { asignacion, nivel, numero, periodo });
  }

  /**
   * Create an absence record
   */
  create(data) {
    return api.post('attendance', data);
  }

  /**
   * Delete an absence record
   */
  delete(id) {
    return api.delete(`attendance/${id}`);
  }

  /**
   * Get absence concentration for a group
   */
  getConcentration(asignacion, nivel, numero, periodo) {
    return api.get('attendance/concentration', { asignacion, nivel, numero, periodo });
  }

  /**
   * Get full absence data (for control)
   */
  getFullData(asignacion, nivel, numero, periodo, options = {}) {
    return api.get('attendance/full', {
      asignacion,
      nivel,
      numero,
      periodo,
      retardos: options.retardos ? 1 : 0,
      excusas: options.excusas ? 1 : 0,
    });
  }

  /**
   * Get excuses for a student
   */
  getExcuses(studentId) {
    return api.get('attendance/excuses', { student: studentId }, { modern: true });
  }

  /**
   * Create an excuse
   */
  createExcuse(data) {
    return api.post('attendance/excuses', data, { modern: true });
  }

  /**
   * Get attendance consolidation (grouped by student)
   */
  getConsolidation(params = {}) {
    return api.get('attendance/consolidation', params);
  }

  /**
   * Get attendance statistics
   */
  getStats(asignacion, nivel, numero) {
    return api.get('attendance/stats', { asignacion, nivel, numero });
  }
}

export const attendance = new AttendanceService();
