import { api } from './api.js';

class ReportsService {
  /**
   * Generate student report card (informe)
   */
  generateReportCard(studentId, periodo) {
    // El PHP legacy (@server/legacy/generaReporte.php) lee $datos->estudiante.
    // Si mandamos "student" el backend responde "Falta el ID del estudiante".
    return api.post('reports/report-card', { estudiante: studentId, periodo });
  }

  /**
   * Generate group report
   */
  generateGroupReport(asignacion, nivel, numero, periodo) {
    return api.post('reports/group', { asignacion, nivel, numero, periodo });
  }

  /**
   * Get valoraciones (evaluations)
   */
  getValoraciones(asignacion, nivel, numero, periodo) {
    return api.get('reports/valoraciones', { asignacion, nivel, numero, periodo });
  }

  /**
   * Get descriptions for achievements
   */
  getDescriptions(Asignatura, nivel, periodo) {
    return api.get('reports/descriptions', { Asignatura, nivel, periodo });
  }

  /**
   * Save description for an achievement
   */
  saveDescription(data) {
    return api.post('reports/descriptions', data);
  }

  /**
   * Get NAP (No Alcanzó el Periodo) data
   */
  getNAP(studentId, periodo) {
    return api.get('reports/nap', { student: studentId, periodo });
  }

  /**
   * Save NAP data
   */
  saveNAP(data) {
    return api.post('reports/nap', data);
  }

  /**
   * Get concentration data
   */
  getConcentration(asignacion, nivel, numero, periodo) {
    return api.get('reports/concentration', { asignacion, nivel, numero, periodo });
  }

  /**
   * Export group data to Excel
   */
  exportToExcel(asignacion, nivel, numero, periodo) {
    return api.get('reports/export/excel', { asignacion, nivel, numero, periodo });
  }

  /**
   * Generate PDF report
   */
  generatePdf(studentId, template) {
    return api.post('reports/pdf', { student: studentId, template });
  }

  /**
   * Get student positions (ranking)
   */
  getPositions(asignacion, nivel, numero, periodo) {
    return api.get('reports/positions', { asignacion, nivel, numero, periodo });
  }

  /**
   * Get areas performance
   */
  getAreasPerformance(asignacion, nivel, numero, periodo) {
    return api.get('reports/areas-performance', { asignacion, nivel, numero, periodo });
  }
}

export const reports = new ReportsService();
