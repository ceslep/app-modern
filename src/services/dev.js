import { api } from './api.js';

const COOKIE_NAME = 'db_mode_override';

function readCookie(name) {
  const m = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[2]) : null;
}

function writeCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function clearCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export const devService = {
  COOKIE_NAME,

  readOverride() {
    return readCookie(COOKIE_NAME);
  },

  writeOverride(mode) {
    if (mode === 'default' || mode == null) {
      clearCookie(COOKIE_NAME);
    } else {
      writeCookie(COOKIE_NAME, mode, 30);
    }
  },

  async getStatus() {
    const fallback = { debug: false, mode: 'unknown', default_mode: 'unknown', overridden: false };
    try {
      const res = await api.get('dev/status');
      if (!res || typeof res !== 'object') return fallback;
      if (typeof res.data === 'object' && res.data !== null) {
        return { ...fallback, ...res.data };
      }
      return { ...fallback, ...res };
    } catch {
      return fallback;
    }
  },

  async setMode(mode) {
    const res = await api.post('dev/db-mode', { mode });
    if (mode === 'default') {
      clearCookie(COOKIE_NAME);
    } else {
      writeCookie(COOKIE_NAME, mode, 30);
    }
    return res;
  },

  async reset() {
    return devService.setMode('default');
  },
};
