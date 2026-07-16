/**
 * Profile / identity card — avatar with initials, role pill, ID copy-to-clipboard,
 * email and active period rows.
 *
 * Renders a stable DOM that the orchestrator populates with real data.
 * The orchestrator wires up the copy button via delegated listener.
 */

import { escapeHtml } from '@utils/dom.js';
import { getRoleDescriptor } from '../greeting.js';

export function renderProfile(user) {
  const initials = computeInitials(user?.nombres);
  const role = getRoleDescriptor(user);
  const ident = user?.identificacion || '—';
  const email = user?.correo || '—';
  const period = user?.periodo || '—';

  const card = document.createElement('div');
  card.className = 'db-card';
  card.style.animationDelay = '0.55s';

  card.innerHTML = `
    <h2 class="db-section-title" style="margin-bottom:0.85rem">
      <i class="bi bi-person-badge" aria-hidden="true"></i> Perfil del docente
    </h2>
    <div class="db-profile">
      <div class="db-profile-head">
        <div class="db-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
        <div class="db-profile-id">
          <h4>${escapeHtml(user?.nombres || 'Docente')}</h4>
          <p>
            <span class="db-role-pill db-role-${role.variant}" style="font-size:0.65rem;padding:0.15rem 0.55rem">
              <span class="pulse"></span>${escapeHtml(role.label)}
            </span>
          </p>
        </div>
      </div>

      <div class="db-id-row" data-copy-row="identificacion">
        <span class="key">Identificación</span>
        <span class="val" data-row-val>${escapeHtml(ident)}</span>
        <button type="button" class="copy" data-copy-btn aria-label="Copiar identificación">
          <i class="bi bi-clipboard" aria-hidden="true"></i>
        </button>
      </div>

      <div class="db-id-row" data-copy-row="correo">
        <span class="key">Correo</span>
        <span class="val" data-row-val>${escapeHtml(email)}</span>
        <button type="button" class="copy" data-copy-btn aria-label="Copiar correo">
          <i class="bi bi-clipboard" aria-hidden="true"></i>
        </button>
      </div>

      <div class="db-id-row">
        <span class="key">Período activo</span>
        <span class="val" data-row-val>${escapeHtml(period)}</span>
      </div>
    </div>
  `;

  return card;
}

function computeInitials(name) {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
