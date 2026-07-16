/**
 * Quick action tiles — 4 shortcut cards with conic-gradient borders
 * that animate on hover (border-rotate effect).
 *
 * Click navigation is delegated from the orchestrator via [data-nav-quick].
 */

import { escapeHtml } from '@utils/dom.js';

const ACTIONS = [
  { id: 'informes',      label: 'Consultar Informes',  icon: 'bi-file-earmark-text',     section: 'seccionInformes',      tone: 'from-primary' },
  { id: 'notas',         label: 'Registrar Notas',      icon: 'bi-journal-text',          section: 'seccionNotas',         tone: 'from-emerald' },
  { id: 'consultas',     label: 'Consultas de Grupo',  icon: 'bi-folder-plus',           section: 'seccionInformes',      tone: 'from-violet'  },
  { id: 'inasistencias', label: 'Inasistencias',        icon: 'bi-person-x-fill',         section: 'seccionInasistencias', tone: 'from-amber'   },
  { id: 'convivencia',   label: 'Convivencia',          icon: 'bi-people-fill',           section: 'seccionConvivencia',   tone: 'from-red'     },
];

export function renderQuickActions() {
  const wrap = document.createElement('div');
  wrap.className = 'db-actions';

  wrap.innerHTML = ACTIONS
    .map(
      (a, i) => `
      <a href="#"
         class="db-action ${escapeHtml(a.tone)}"
         data-nav-quick="${escapeHtml(a.section)}"
         aria-label="${escapeHtml(a.label)}"
         style="animation-delay:${0.35 + i * 0.05}s">
        <i class="bi ${escapeHtml(a.icon)} lead" aria-hidden="true"></i>
        <span class="lbl">${escapeHtml(a.label)}</span>
      </a>
    `
    )
    .join('');

  return wrap;
}
