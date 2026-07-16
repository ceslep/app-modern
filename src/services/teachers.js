import { api } from './api.js';

class TeachersService {
  /**
   * Get all teachers
   */
  getAll() {
    return api.get('teachers');
  }

  /**
   * Get teacher by ID
   */
  getById(id) {
    return api.get(`teachers/${id}`);
  }

  /**
   * Get teacher schedule
   */
  getSchedule(teacherId) {
    return api.get(`teachers/${teacherId}/schedule`);
  }

  /**
   * Get teacher's assigned subjects
   */
  getSubjects(teacherId) {
    return api.get(`teachers/${teacherId}/subjects`);
  }

  /**
   * Get teacher time records
   */
  getTimes(teacherId) {
    return api.get(`teachers/${teacherId}/times`);
  }

  /**
   * Authenticate teacher
   */
  authenticate(identificacion, password) {
    return api.post('teachers/authenticate', { identificacion, password });
  }

  /**
   * Get teacher historical grades (for archived teachers)
   */
  getHistoricalGrades(teacherId) {
    return api.get(`teachers/${teacherId}/historical-grades`);
  }
}

export const teachers = new TeachersService();
