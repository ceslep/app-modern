/**
 * Profile / identity card — avatar with initials, role pill, ID copy-to-clipboard,
 * email and active period rows.
 *
 * Renders a stable DOM that the orchestrator populates with real data.
 * The orchestrator wires up the copy button via delegated listener.
 */

import { escapeHtml } from '@utils/dom.js';
import { devTag } from '@utils/devLabel.js';
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
      <img src="https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-gahIe45OSBuvqPogVpr3KaBJF0zCSL.png" alt="" width="16" height="16" style="width:16px;height:16px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))" loading="lazy" aria-hidden="true"> Perfil del docente
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
          <img src="https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-yFtjfKzQBiN4N3in0hmfzJN0a4u71g.png" alt="" width="16" height="16" style="width:16px;height:16px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))" loading="lazy" aria-hidden="true">
        </button>
      </div>

      <div class="db-id-row" data-copy-row="correo">
        <span class="key">Correo</span>
        <span class="val" data-row-val>${escapeHtml(email)}</span>
        <button type="button" class="copy" data-copy-btn aria-label="Copiar correo">
          <img src="https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-yFtjfKzQBiN4N3in0hmfzJN0a4u71g.png" alt="" width="16" height="16" style="width:16px;height:16px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))" loading="lazy" aria-hidden="true">
        </button>
      </div>

      <div class="db-id-row">
        <span class="key">Período activo</span>
        <span class="val" data-row-val>${escapeHtml(period)}</span>
      </div>
    </div>
  `;

  devTag(card, 'dashboard/sections/profile.js');
  return card;
}

function computeInitials(name) {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
