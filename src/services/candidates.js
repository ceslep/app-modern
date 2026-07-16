import { api } from './api.js';

class CandidatesService {
  /**
   * Get all pending candidates
   */
  getAll() {
    return api.get('candidates');
  }

  /**
   * Get candidate by ID
   */
  getById(id) {
    return api.get(`candidates/${id}`);
  }

  /**
   * Create a new candidate (pre-enrollment)
   */
  create(data) {
    return api.post('candidates', data);
  }

  /**
   * Enroll a single candidate
   */
  enroll(id) {
    return api.post(`candidates/${id}/enroll`);
  }

  /**
   * Enroll multiple candidates
   */
  enrollBulk(ids) {
    return api.post('candidates/enroll-bulk', { ids });
  }

  /**
   * Delete a candidate
   */
  delete(id) {
    return api.delete(`candidates/${id}`);
  }

  /**
   * Check if student is already enrolled for a year
   */
  checkEnrolled(studentId, year) {
    return api.get('candidates/check', { student: studentId, year });
  }

  /**
   * Assign enrollment code
   */
  assignCode(studentId, code) {
    return api.post('candidates/assign-code', { student: studentId, code });
  }

  /**
   * Get available codes
   */
  getCodes() {
    return api.get('candidates/codes');
  }

  /**
   * Get next available code
   */
  getNextCode() {
    return api.get('candidates/next-code');
  }
}

export const candidates = new CandidatesService();
