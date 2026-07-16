import { api } from './api.js';

class StudentsService {
  /**
   * Get students by filter (assignment, level, number)
   */
  getByFilter(asignacion, nivel, numero) {
    return api.get('students', { asignacion, nivel, numero });
  }

  /**
   * Search students by name or code
   */
  search(query) {
    return api.get('students/search', { q: query });
  }

  /**
   * Get student by ID
   */
  getById(id) {
    return api.get(`students/${id}`);
  }

  /**
   * Create a new student
   */
  create(data) {
    return api.post('students', data);
  }

  /**
   * Update student information
   */
  update(id, data) {
    return api.put(`students/${id}`, data);
  }

  /**
   * Delete a student
   */
  delete(id) {
    return api.delete(`students/${id}`);
  }

  /**
   * Update student group assignment
   */
  updateGroup(id, groupData) {
    return api.put(`students/${id}/group`, groupData);
  }

  /**
   * Get student group history
   */
  getGroupHistory(id) {
    return api.get(`students/${id}/group-history`);
  }

  /**
   * Get all students for a group
   */
  getGroupStudents(asignacion, nivel, numero) {
    return api.get('students/group', { asignacion, nivel, numero });
  }

  /**
   * Get student grades summary
   */
  getGradesSummary(id) {
    return api.get(`students/${id}/grades-summary`);
  }

  /**
   * Get student attendance summary
   */
  getAttendanceSummary(id) {
    return api.get(`students/${id}/attendance-summary`);
  }

  /**
   * Get student convivencia records
   */
  getConvivenciaRecords(id) {
    return api.get(`students/${id}/convivencia`);
  }
}

export const students = new StudentsService();
