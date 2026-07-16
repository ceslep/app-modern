import { api } from './api.js';

/**
 * Filters service - fetches data for cascading form selects.
 */
class FiltersService {
  /** Campuses (sedes) the current user may access. */
  getSedes() {
    return api.get('sedes');
  }

  /** Distinct nivel/numero groups taught at a sede for a year. */
  getGrupos(sede, year) {
    return api.get('grupos', { sede, year });
  }

  /** Distinct grade levels present in a sede for a year. */
  getNiveles(asignacion, year) {
    return api.get('niveles', { asignacion, year });
  }

  /** Map of nivel => full grade name. */
  getNombresNiveles() {
    return api.get('niveles/nombres');
  }

  /** Subjects for a group (optionally scoped to a docente). */
  getAsignaturas(sede, nivel, numero, year, docente) {
    const params = { sede, nivel, numero, year };
    if (docente) params.docente = docente;
    return api.get('asignaturas', params);
  }

  /** Academic periods (UNO..CINCO). */
  getPeriods() {
    return api.get('periods');
  }

  /** Available school years. */
  getYears() {
    return api.get('years');
  }
}

export const filters = new FiltersService();
