/**
 * Hero greeting — full-width section with dynamic time-of-day salutation,
 * long date in es-CO, and a role pill (Maestra / Coordinador / Docente).
 */

import { escapeHtml } from '@utils/dom.js';
import { getGreetingForHour, getLongDateEs, getRoleDescriptor } from '../greeting.js';

export function renderGreeting(user) {
  const salutation = getGreetingForHour();
  const dateStr = getLongDateEs();
  const name = user?.nombres || 'Docente';
  const firstName = name.split(' ')[0];
  const role = getRoleDescriptor(user);

  const section = document.createElement('section');
  section.className = 'db-hero db-card';
  section.style.animationDelay = '0.05s';

  section.innerHTML = `
    <h1 class="db-hero-title">
      ${escapeHtml(salutation)}, <span class="db-name">${escapeHtml(firstName)}</span>
    </h1>
    <div class="db-hero-meta">
      <span class="db-role-pill db-role-${role.variant}">
        <span class="pulse"></span>${escapeHtml(role.label)}
      </span>
      <span class="dot"></span>
      <span>${escapeHtml(dateStr)}</span>
      <span class="dot"></span>
      <span><i class="bi bi-grid-1x2-fill" style="opacity:0.5" aria-hidden="true"></i> Panel de control</span>
    </div>
  `;

  return section;
}
