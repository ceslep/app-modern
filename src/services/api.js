import { isLegacy } from '@config/endpoints.js';

/**
 * Resolve the API base URL at runtime so the app works identically in:
 *  - Vite dev server (:3000, proxied)  -> /app-modern/api.php/v1
 *  - Apache subfolder /app/app-modern/ -> /app/app-modern/api.php/v1
 *  - production (any mount point)
 */
function resolveApiBase() {
  const path = window.location.pathname;
  const marker = '/app-modern/';
  const i = path.indexOf(marker);
  if (i >= 0) {
    return path.slice(0, i) + '/app-modern/api.php/v1';
  }
  return '/app-modern/api.php/v1';
}

function resolveRouterBase() {
  const path = window.location.pathname;
  const marker = '/app-modern/';
  const i = path.indexOf(marker);
  if (i >= 0) {
    return path.slice(0, i) + '/app-modern/server/router.php';
  }
  return '/app-modern/server/router.php';
}

const API_BASE = resolveApiBase();
const ROUTER_BASE = resolveRouterBase();

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
    this.routerBase = ROUTER_BASE;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  setAuthToken(token) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  async request(endpoint, options = {}) {
    let url;
    if (options.modern || !isLegacy()) {
      url = `${this.baseUrl}/${endpoint}`;
      if (options.params) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(options.params)) {
          if (v !== undefined && v !== null) qs.set(k, v);
        }
        const qsStr = qs.toString();
        if (qsStr) url += `?${qsStr}`;
      }
    } else {
      const params = new URLSearchParams();
      params.set('__api', endpoint);
      if (options.params) {
        for (const [k, v] of Object.entries(options.params)) {
          if (v !== undefined && v !== null) params.set(k, v);
        }
      }
      url = `${this.routerBase}?${params.toString()}`;
    }

    const config = {
      credentials: 'include',
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    delete config.params;
    delete config.modern;

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(async () => {
        const text = await response.text().catch(() => '');
        return { __nonJsonBody: text.slice(0, 300) };
      });

      if (data && typeof data === 'object' && '__nonJsonBody' in data) {
        const preview = data.__nonJsonBody || '(vacío)';
        throw new ApiError(
          `Respuesta no-JSON del servidor (HTTP ${response.status}): ${preview}`,
          response.status,
          null
        );
      }

      if (!response.ok) {
        if (response.status === 401 && !endpoint.startsWith('auth/session') && !window._sessionExpiredDispatched) {
          window._sessionExpiredDispatched = true;
          window.dispatchEvent(new CustomEvent('auth:session-expired', {
            detail: { message: data?.error || 'Sesión expirada. Inicie sesión nuevamente.' }
          }));
        }
        throw new ApiError(
          data?.error || `Error del servidor (${response.status})`,
          response.status,
          data
        );
      }

      if (data === null || typeof data !== 'object') {
        throw new ApiError('Respuesta vacía o inválida del servidor', 500, null);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new ApiError('Error de conexión. Verifique su red.', 0);
      }

      throw new ApiError(error.message || 'Error desconocido', 0);
    }
  }

  get(endpoint, params = {}, opts = {}) {
    return this.request(endpoint, { method: 'GET', params, ...opts });
  }

  post(endpoint, body = {}, opts = {}) {
    return this.request(endpoint, { method: 'POST', body, ...opts });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async upload(endpoint, formData) {
    let url;
    if (isLegacy()) {
      url = `${this.routerBase}?__api=${endpoint}`;
    } else {
      url = `${this.baseUrl}/${endpoint}`;
    }

    const headers = {};
    delete headers['Content-Type'];

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 && !endpoint.startsWith('auth/session') && !window._sessionExpiredDispatched) {
        window._sessionExpiredDispatched = true;
        window.dispatchEvent(new CustomEvent('auth:session-expired', {
          detail: { message: data?.error || 'Sesión expirada. Inicie sesión nuevamente.' }
        }));
      }
      throw new ApiError(data?.error || 'Error al subir archivo', response.status, data);
    }

    if (data === null || typeof data !== 'object') {
      throw new ApiError('Respuesta vacía o inválida del servidor', 500, null);
    }

    return data;
  }
}

export const api = new ApiService();
export { ApiError };