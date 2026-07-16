/**
 * Asignaciones Service — API wrapper for `asignacion_asignaturas` CRUD
 */
import { api } from './api.js';

class AsignacionesService {
  /**
   * List asignaciones with optional filters
   */
  list(filters = {}) {
    return api.request('asignaciones', {
      method: 'GET',
      params: filters,
    });
  }

  /**
   * Create a new asignacion
   */
  create(data) {
    return api.request('asignaciones', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Update an existing asignacion
   */
  update(data) {
    return api.request('asignaciones', {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Delete an asignacion
   */
  delete(ind) {
    return api.request('asignaciones', {
      method: 'DELETE',
      body: { ind },
    });
  }

  /**
   * Get teacher list for dropdowns.
   * Legacy endpoint returns a raw array — normalize to { success, data }.
   */
  async getTeachers() {
    const res = await api.get('teachers/all');
    return { success: true, data: Array.isArray(res) ? res : (res?.data || []) };
  }

  /**
   * Get sedes list (same source as concentrador: getasignacion.php).
   * Legacy endpoint returns a raw array — normalize to { success, data }.
   */
  async getSedes() {
    const res = await api.get('sedes');
    return { success: true, data: Array.isArray(res) ? res : (res?.data || []) };
  }
}

export const asignaciones = new AsignacionesService();
