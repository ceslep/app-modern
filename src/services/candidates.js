import { api } from './api.js';

class CandidatesService {
  getAll() {
    return api.get('candidates');
  }

  getById(id) {
    return api.get('candidates', { ind: id });
  }

  checkEnrolled(estudiante, year) {
    return api.post('candidates/check', { estudiante, year });
  }

  enroll(ind) {
    return api.post('candidates/enroll', { ind });
  }

  enrollBulk(indices) {
    return api.post('candidates/enroll-bulk', { indices });
  }

  delete(ind) {
    return api.delete(`candidates/${ind}`);
  }
}

export const candidates = new CandidatesService();
