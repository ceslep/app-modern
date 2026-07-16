import { api } from './api.js';

class GradesService {
  /**
   * Get grades for a specific student and period
   */
  getByStudent(studentId, periodo) {
    return api.get('grades/student', { student: studentId, periodo });
  }

  /**
   * Get all grades for a group/subject/period
   */
  getByGroup(asignacion, nivel, numero, asignatura, periodo) {
    return api.get('grades', { asignacion, nivel, numero, asignatura, periodo });
  }

  /**
   * Save a grade (create or update)
   */
  save(data) {
    return api.post('grades', data);
  }

  /**
   * Save multiple grades at once
   */
  saveBatch(grades) {
    return api.post('grades/batch', { grades });
  }

  /**
   * Delete a grade
   */
  delete(id) {
    return api.delete(`grades/${id}`);
  }

  /**
   * Get grade history for a student
   */
  getHistory(studentId) {
    return api.get('grades/history', { student: studentId });
  }

  /**
   * Get final (definitive) grades
   */
  getFinals(asignacion, nivel, numero) {
    return api.get('grades/finals', { asignacion, nivel, numero });
  }

  /**
   * Get lost/pending final grades
   */
  getLostFinals() {
    return api.get('grades/lost-finals');
  }

  /**
   * Get grade quantities/counts
   */
  getQuantities(asignacion, nivel, numero) {
    return api.get('grades/quantities', { asignacion, nivel, numero });
  }

  /**
   * Get student-specific quantities
   */
  getStudentQuantities(studentId) {
    return api.get('grades/student-quantities', { student: studentId });
  }

  /**
   * Open grades editing for a teacher
   */
  openEditing(teacherId) {
    return api.post('grades/open-editing', { teacher: teacherId });
  }

  /**
   * Close grades editing for all teachers
   */
  closeEditing() {
    return api.post('grades/close-editing');
  }

  /**
   * Get concentration by subject
   */
  getConcentration(asignacion, nivel, numero, periodo) {
    return api.get('grades/concentration', { asignacion, nivel, numero, periodo });
  }

  /**
   * Get individual grades for a student
   */
  getIndividual(studentId, periodo) {
    return api.get('grades/individual', { student: studentId, periodo });
  }
}

export const grades = new GradesService();
