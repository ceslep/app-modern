/**
 * Quick action tiles — 4 shortcut cards with conic-gradient borders
 * that animate on hover (border-rotate effect).
 *
 * Click navigation is delegated from the orchestrator via [data-nav-quick].
 */

import { escapeHtml } from '@utils/dom.js';
import { devTag } from '@utils/devLabel.js';

const ACTIONS = [
  { id: 'informes',      label: 'Consultar Informes',  icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-BjimxRD0gb4rZBjr9jbO9LYXmOZJao.png',     section: 'seccionInformes',      tone: 'from-primary' },
  { id: 'notas',         label: 'Registrar Notas',      icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-V5g1BA4Fg3Mgks7vN6n3eaXb8KBz0g.png',     section: 'seccionNotas',         tone: 'from-emerald' },
  { id: 'consultas',     label: 'Consultas de Grupo',  icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-6TJq3TblGrgJLKvMLFj3N2YcDEXG2A.png',     section: 'seccionInformes',      tone: 'from-violet'  },
  { id: 'inasistencias', label: 'Inasistencias',        icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-keoWINYYBgXx7vwibZe2cbllJ4SaQA.png',     section: 'seccionInasistencias', tone: 'from-amber'   },
  { id: 'convivencia',   label: 'Convivencia',          icon: 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com/image-WaLIdwjgmqnfE0GndCGu1R9ReZOal5.png', section: 'seccionConvivencia',   tone: 'from-red'     },
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
        <img src="${escapeHtml(a.icon)}" alt="" width="28" height="28" style="width:28px;height:28px;object-fit:contain;" class="lead" loading="lazy" aria-hidden="true">
        <span class="lbl">${escapeHtml(a.label)}</span>
      </a>
    `
    )
    .join('');

  devTag(wrap, 'dashboard/sections/quick-actions.js');
  return wrap;
}
