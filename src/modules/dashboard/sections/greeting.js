/**
 * Hero greeting — full-width section with dynamic time-of-day salutation,
 * long date in es-CO, and a role pill (Maestra / Coordinador / Docente).
 */

import { escapeHtml } from '@utils/dom.js';
import { devTag } from '@utils/devLabel.js';
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
      <span><img src="https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-Qep2rmAXunWu8R2o1FCgLLDrtiD1q2.png" alt="" width="16" height="16" style="width:16px;height:16px;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15));opacity:0.5;vertical-align:middle" loading="lazy"> Panel de control</span>
    </div>
  `;

  devTag(section, 'dashboard/sections/greeting.js');
  return section;
}
