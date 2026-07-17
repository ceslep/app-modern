import { escapeHtml } from '../utils/dom.js';

const STYLE = document.createElement('style');
STYLE.textContent = `
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 1.5rem;
    text-align: center;
  }
  .empty-state-icon {
    width: 3.5rem;
    height: 3.5rem;
    margin-bottom: 1rem;
    opacity: 0.5;
    color: #9ca3af;
  }
  .empty-state-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .empty-state-icon i {
    font-size: 3rem;
    line-height: 1;
  }
  .empty-state-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }
  .empty-state-desc {
    font-size: 0.82rem;
    color: #9ca3af;
    max-width: 20rem;
    line-height: 1.4;
    margin-bottom: 1rem;
  }
  .empty-state-action {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    border-radius: 9999px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #543391;
    background: rgba(84, 51, 145, 0.1);
    border: 1px solid rgba(84, 51, 145, 0.18);
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
  }
  .empty-state-action:hover {
    background: rgba(84, 51, 145, 0.18);
    transform: translateY(-1px);
  }
`;
document.head.appendChild(STYLE);

const ICONS = {
  inbox: 'bi-inbox',
  search: 'bi-search',
  bell: 'bi-bell-slash',
  hourglass: 'bi-hourglass-split',
  people: 'bi-people',
  file: 'bi-file-earmark-text',
  bookmark: 'bi-bookmark',
  star: 'bi-star',
  chart: 'bi-bar-chart',
  exclamation: 'bi-exclamation-circle',
  check: 'bi-check-circle',
};

/**
 * Create an empty-state element.
 *
 * @param {object} opts
 * @param {string} opts.icon     - Bootstrap icon name (without 'bi-' prefix) or 'none'
 * @param {string} opts.icon3d   - Path to a Thiings 3D PNG (replaces bootstrap icon)
 * @param {string} opts.title    - Short bold message
 * @param {string} opts.desc     - Explanation text
 * @param {{ label: string, onClick: Function }|null} opts.action - Optional action button
 * @param {string}  [opts.className] - Extra class to append
 * @returns {HTMLElement}
 */
export function createEmptyState(opts = {}) {
  const el = document.createElement('div');
  el.className = `empty-state ${opts.className || ''}`;
  el.setAttribute('role', 'status');

  let iconHtml;
  if (opts.icon3d) {
    iconHtml = `<img src="${escapeHtml(opts.icon3d)}" alt="" class="empty-state-icon" loading="lazy">`;
  } else if (opts.icon && opts.icon !== 'none') {
    const cls = ICONS[opts.icon] || `bi-${opts.icon}`;
    iconHtml = `<i class="${cls} empty-state-icon"></i>`;
  } else {
    iconHtml = '';
  }

  const titleHtml = opts.title ? `<p class="empty-state-title">${escapeHtml(opts.title)}</p>` : '';
  const descHtml = opts.desc ? `<p class="empty-state-desc">${escapeHtml(opts.desc)}</p>` : '';
  let actionHtml = '';
  if (opts.action) {
    actionHtml = `<button type="button" class="empty-state-action">${escapeHtml(opts.action.label)}</button>`;
  }

  el.innerHTML = iconHtml + titleHtml + descHtml + actionHtml;

  if (opts.action) {
    const actBtn = el.querySelector('.empty-state-action');
    if (actBtn) actBtn.addEventListener('click', opts.action.onClick);
  }

  return el;
}

/**
 * Set or clear an empty state in a container element.
 * @param {HTMLElement|string} container - Element or its id
 * @param {object|null} opts - same as createEmptyState, or null to remove
 */
export function showEmptyState(container, opts = null) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  const existing = el.querySelector('.empty-state');
  if (existing) existing.remove();
  if (opts) el.appendChild(createEmptyState(opts));
}
