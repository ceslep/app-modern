import { api } from './api.js';
import { endpoint, isLegacy } from '@config/endpoints.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.sessionChecked = false;
  }

  async login(identificacion, password, extraFields = {}) {
    const body = {
      docente: identificacion,
      contrasena: password,
      ...extraFields,
    };

    if (isLegacy()) {
      const res = await fetch(endpoint('/login.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const response = { success: true, data };
      if (response.success && response.data?.concedido === 'Si') {
        this.currentUser = this._mapUser(response.data);
        this.saveSession(this.currentUser);
        this.sessionChecked = true;
      }
      return response;
    }

    const response = await api.post('auth/login', body);
    if (response.success && response.data?.concedido === 'Si') {
      this.currentUser = this._mapUser(response.data);
      this.saveSession(this.currentUser);
      this.sessionChecked = true;
    }
    return response;
  }

  async googleLogin(googleToken, infocliente) {
    if (isLegacy()) {
      const res = await fetch(endpoint('/login.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ googleToken, infocliente }),
      });
      const data = await res.json();
      const response = { success: true, data };
      if (response.success && response.data?.concedido === 'Si') {
        this.currentUser = this._mapUser(response.data);
        this.saveSession(this.currentUser);
        this.sessionChecked = true;
      }
      return response;
    }
    const response = await api.post('auth/google-login', { googleToken, infocliente });
    if (response.success && response.data?.concedido === 'Si') {
      this.currentUser = this._mapUser(response.data);
      this.saveSession(this.currentUser);
      this.sessionChecked = true;
    }
    return response;
  }

  async checkInfoDocente(identificacion) {
    if (isLegacy()) {
      try {
        const res = await fetch(endpoint('/getInfoDocentes.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ identificacion }),
        });
        const data = await res.json();
        if (data) return data;
      } catch {}
      return { permitido: false, solicitaCodigo: 'N' };
    }
    try {
      const response = await api.post('auth/info-docente', { identificacion });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {}
    return { permitido: false, solicitaCodigo: 'N' };
  }

  async logout() {
    if (isLegacy()) {
      try {
        await fetch(endpoint('/cerrar_sesion.php'), {
          method: 'POST',
          credentials: 'include',
        });
      } catch {}
      this.currentUser = null;
      this.clearSession();
      this.sessionChecked = false;
      return;
    }
    try {
      await api.post('auth/logout');
    } finally {
      this.currentUser = null;
      this.clearSession();
      this.sessionChecked = false;
    }
  }

  async checkSession(force = false) {
    if (this.sessionChecked && !force) return this.currentUser !== null;

    if (isLegacy()) {
      const stored = this.loadSession();
      if (stored) {
        if (force) {
          // Force refresh desde el servidor para obtener campos nuevos
          // (acceso_total, etc.). Intenta modern endpoint primero;
          // si falla, deja el cached session tal cual.
          try {
            const response = await api.request('auth/session', {
              method: 'GET',
              modern: true,
            });
            if (response && response.success && response.data) {
              this.currentUser = { ...this.currentUser, ...response.data };
              this.saveSession(this.currentUser);
            }
          } catch {}
        }
        this.sessionChecked = true;
        return true;
      }
      this.sessionChecked = true;
      return false;
    }

    try {
      const response = await api.get('auth/session');
      if (response.success && response.data) {
        this.currentUser = response.data;
        this.sessionChecked = true;
        return true;
      }
      this.currentUser = null;
      this.sessionChecked = true;
      return false;
    } catch {
      this.currentUser = null;
      this.sessionChecked = true;
      return false;
    }
  }

  getUser() {
    return this.currentUser;
  }

  hasRole(role) {
    return this.currentUser?.role === role;
  }

  isAdmin() {
    return this.hasRole('maestra') || this.hasRole('admin') || this.hasRole('administrador');
  }

  isTeacher() {
    return this.hasRole('docente') || this.hasRole('teacher');
  }

  isMaestra() {
    return this.currentUser?.maestra === 'Si';
  }

  isCoordinador() {
    const nombres = this.currentUser?.nombres || '';
    return nombres.includes('COORDI');
  }

  isAccesoTotal() {
    return this.currentUser?.acceso_total === 'S';
  }

  hasInformes() {
    return this.currentUser?.informes === 'S';
  }

  isSoloExcusas() {
    return this.currentUser?.soloexcusas === 'S';
  }

  getPeriodo() {
    return this.currentUser?.periodo || '';
  }

  saveSession(data) {
    try {
      localStorage.setItem('user', JSON.stringify(data));
    } catch {}
  }

  loadSession() {
    try {
      const data = localStorage.getItem('user');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.identificacion) {
          this.currentUser = parsed;
          return true;
        }
        localStorage.removeItem('user');
      }
    } catch {}
    return false;
  }

  clearSession() {
    try {
      localStorage.removeItem('user');
    } catch {}
    this.currentUser = null;
    this.sessionChecked = false;
  }

  async changePassword(currentPassword, newPassword) {
    if (isLegacy()) {
      const body = { docente: this.currentUser?.identificacion, contrasena: newPassword };
      const res = await fetch(endpoint('/cambiapass.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      return res.json();
    }
    return api.post('auth/change-password', { currentPassword, newPassword });
  }

  _mapUser(acceso) {
    const accesoTotal = acceso.acceso_total || acceso.datos?.acceso_total || 'N';
    const esMaestra = acceso.Maestra === 'Si' || accesoTotal === 'S';
    return {
      id: acceso.datos?.idn || '',
      identificacion: acceso.datos?.identificacion || '',
      nombres: acceso.datos?.nombres || '',
      correo: acceso.datos?.correo || acceso.correo || '',
      periodo: acceso.periodo || acceso.datos?.periodo || '',
      role: esMaestra ? 'maestra' : 'docente',
      maestra: esMaestra ? 'Si' : 'No',
      asignacion: acceso.asignacion || acceso.datos?.asignacion || '',
      informes: acceso.informes || 'N',
      nivel: acceso.nivel || '',
      numero: acceso.numero || '',
      verEstudiantes: acceso.datos?.verEstudiantes || 'N',
      soloexcusas: acceso.datos?.soloexcusas || 'N',
      acceso_total: accesoTotal,
    };
  }
}

export const auth = new AuthService();
