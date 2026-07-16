import { devService } from '../services/dev.js';
import { delegate } from '../utils/dom.js';

const STYLE = document.createElement('style');
STYLE.textContent = `
  #dev-db-switcher {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.625rem 0.25rem 0.5rem;
    border-radius: 9999px;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border: 1px solid #f59e0b;
    font-size: 0.75rem;
    font-weight: 600;
    color: #78350f;
    line-height: 1;
    height: 32px;
  }
  #dev-db-switcher .dev-label {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.65rem;
  }
  #dev-db-switcher .dev-track {
    position: relative;
    width: 56px;
    height: 24px;
    border-radius: 9999px;
    background: #fbbf24;
    transition: background 200ms ease;
    cursor: pointer;
    flex-shrink: 0;
  }
  #dev-db-switcher.mode-cloud .dev-track { background: #8b5cf6; }
  #dev-db-switcher .dev-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 9999px;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.25);
    transition: transform 200ms ease;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
  }
  #dev-db-switcher.mode-cloud .dev-thumb { transform: translateX(32px); }
  #dev-db-switcher .dev-modes {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 6px;
    font-size: 0.6rem;
    font-weight: 700;
    color: rgba(255,255,255,0.85);
    pointer-events: none;
    text-transform: uppercase;
  }
  #dev-db-switcher .dev-spinner {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.7);
    border-radius: 9999px;
  }
  #dev-db-switcher.loading { opacity: 0.7; pointer-events: none; }
  #dev-db-switcher .dev-reset {
    background: none;
    border: none;
    color: #92400e;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 0.7rem;
  }
  #dev-db-switcher .dev-reset:hover { background: rgba(0,0,0,0.08); }
`;
document.head.appendChild(STYLE);

let mounted = false;
let currentStatus = null;

function render() {
  if (!currentStatus || !currentStatus.debug) return null;

  const mode = currentStatus.mode;
  const overridden = currentStatus.overridden;
  const isCloud = mode === 'cloud';

  return `
    <div id="dev-db-switcher" class="${isCloud ? 'mode-cloud' : ''} ${overridden ? 'overridden' : ''}"
         title="APP_DEBUG=true — base de datos: ${mode}${overridden ? ' (override)' : ''}">
      <span class="dev-label">
        <i class="bi bi-hdd-network"></i> DB
      </span>
      <div class="dev-track" data-dev-toggle role="switch" aria-checked="${isCloud}" tabindex="0">
        <div class="dev-modes">
          <span>LOC</span>
          <span>CLD</span>
        </div>
        <div class="dev-thumb">
          <i class="bi ${isCloud ? 'bi-cloud-fill' : 'bi-laptop'}"></i>
        </div>
      </div>
      ${overridden ? `<button class="dev-reset" data-dev-reset title="Restablecer al modo por defecto (${currentStatus.default_mode})">
        <i class="bi bi-arrow-counterclockwise"></i>
      </button>` : ''}
    </div>
  `;
}

function mount() {
  if (mounted) return;
  const anchor = document.getElementById('navbar');
  if (!anchor) return;
  const html = render();
  if (!html) return;

  const timerEl = anchor.querySelector('#timer');
  if (timerEl && timerEl.parentElement) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    timerEl.parentElement.insertBefore(wrapper.firstElementChild, timerEl);
  } else {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    anchor.appendChild(wrapper.firstElementChild);
  }
  mounted = true;
}

async function refresh() {
  const status = await devService.getStatus();
  if (!status || !status.debug) {
    currentStatus = status || { debug: false };
    if (mounted) {
      const existing = document.getElementById('dev-db-switcher');
      if (existing) existing.remove();
      mounted = false;
    }
    return;
  }
  currentStatus = status;
  if (mounted) {
    const existing = document.getElementById('dev-db-switcher');
    if (existing) existing.remove();
    mounted = false;
  }
  mount();
}

function setLoading(loading) {
  const el = document.getElementById('dev-db-switcher');
  if (!el) return;
  el.classList.toggle('loading', loading);
  if (loading) {
    const thumb = el.querySelector('.dev-thumb');
    if (thumb && !thumb.querySelector('.dev-spinner')) {
      const sp = document.createElement('div');
      sp.className = 'dev-spinner';
      sp.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
      thumb.appendChild(sp);
    }
  } else {
    el.querySelectorAll('.dev-spinner').forEach(n => n.remove());
  }
}

export async function initDevSwitcher() {
  await refresh();

  delegate(document, 'click', '[data-dev-toggle]', async (e) => {
    e.preventDefault();
    if (!currentStatus) return;
    const target = currentStatus.mode === 'cloud' ? 'local' : 'cloud';
    if (target === currentStatus.default_mode) {
      await devService.reset();
    } else {
      await devService.setMode(target);
    }
    setLoading(true);
    setTimeout(() => window.location.reload(), 250);
  });

  delegate(document, 'keydown', '[data-dev-toggle]', async (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    const el = e.currentTarget;
    el.click();
  });

  delegate(document, 'click', '[data-dev-reset]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await devService.reset();
    setLoading(true);
    setTimeout(() => window.location.reload(), 250);
  });
}

export async function refreshDevSwitcher() {
  await refresh();
}
