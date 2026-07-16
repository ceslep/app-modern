import { api } from './api.js';

class CertificatesService {
  /**
   * Generate a single certificate
   */
  generate(studentId, template, options = {}) {
    return api.post('certificates/generate', {
      student: studentId,
      template,
      ...options,
    });
  }

  /**
   * Generate certificates in bulk
   */
  generateBulk(studentIds, template, options = {}) {
    return api.post('certificates/bulk', {
      students: studentIds,
      template,
      ...options,
    });
  }

  /**
   * Get available certificate templates
   */
  getTemplates() {
    return api.get('certificates/templates');
  }

  /**
   * Get generated certificates for a student
   */
  getByStudent(studentId) {
    return api.get(`certificates/student/${studentId}`);
  }

  /**
   * Download a generated certificate
   */
  download(certificateId) {
    return api.get(`certificates/download/${certificateId}`);
  }

  /**
   * Generate constancia (letter)
   */
  generateConstancia(studentId, data) {
    return api.post('certificates/constancia', {
      student: studentId,
      ...data,
    });
  }
}

export const certificates = new CertificatesService();
