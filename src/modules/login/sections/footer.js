/**
 * Trust indicators — small badges rendered under the form
 * (SSL, cifrado, etc.). Reusable across desktop/mobile.
 */

import { escapeHtml } from '@utils/dom.js';

const ITEMS = [
  { icon: 'bi-shield-lock-fill', label: 'Acceso cifrado SSL' },
  { icon: 'bi-incognito',         label: 'Sesión privada' },
  { icon: 'bi-patch-check-fill',  label: 'Plataforma verificada' },
];

export function renderTrust() {
  return ITEMS.map(
    (it) => `<span class="item"><i class="bi ${escapeHtml(it.icon)}" aria-hidden="true"></i>${escapeHtml(it.label)}</span>`
  ).join('');
}
