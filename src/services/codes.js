import { api } from './api.js';

class CodesService {
  getAll() {
    return api.get('codes');
  }

  getNextCode() {
    return api.get('codes/next');
  }

  assign(estudiante, codigo) {
    return api.post('codes/assign', { estudiante, codigo });
  }

  remove(estudiante) {
    return api.delete(`codes/${encodeURIComponent(estudiante)}`);
  }
}

export const codes = new CodesService();
