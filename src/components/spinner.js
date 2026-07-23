/**
 * Spinner/loading component — backed by thinking-orbs.
 * See src/components/thinkingOrb.js for the orb engine.
 */

import { createOrb } from '@components/thinkingOrb.js';

const spinners = new Map();

/**
 * Show a spinner in a container
 */
export function showSpinner(containerId, message = 'Cargando...') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const existing = container.querySelector('.loading-spinner');
  if (existing) return;

  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner text-center p-4';

  const orbHost = document.createElement('div');
  orbHost.className = 'inline-block';
  spinner.appendChild(orbHost);

  const caption = document.createElement('div');
  caption.className = 'mt-2 text-gray-400 text-xs';
  caption.textContent = message;
  spinner.appendChild(caption);

  const orb = createOrb(orbHost, { state: 'working', size: 40 });

  container.appendChild(spinner);
  spinners.set(containerId, { el: spinner, orb });
}

/**
 * Hide spinner in a container
 */
export function hideSpinner(containerId) {
  const entry = spinners.get(containerId);
  if (entry) {
    entry.orb?.destroy();
    entry.el.remove();
    spinners.delete(containerId);
  }
}

/**
 * Toggle spinner visibility
 */
export function toggleSpinner(containerId, message = 'Cargando...') {
  if (spinners.has(containerId)) {
    hideSpinner(containerId);
  } else {
    showSpinner(containerId, message);
  }
}

let fullscreenOrb = null;

/**
 * Show fullscreen spinner
 */
export function showFullscreenSpinner(message = 'Cargando...') {
  let spinner = document.getElementById('fullscreen-spinner');
  if (spinner) return;

  spinner = document.createElement('div');
  spinner.id = 'fullscreen-spinner';
  spinner.className = 'fullspinner';

  const box = document.createElement('div');
  box.className = 'text-center';

  const orbHost = document.createElement('div');
  orbHost.className = 'inline-block';
  box.appendChild(orbHost);

  const caption = document.createElement('div');
  caption.className = 'mt-3 text-gray-400';
  caption.textContent = message;
  box.appendChild(caption);

  spinner.appendChild(box);
  fullscreenOrb = createOrb(orbHost, { state: 'working', size: 64 });

  document.body.appendChild(spinner);
}

/**
 * Hide fullscreen spinner
 */
export function hideFullscreenSpinner() {
  const spinner = document.getElementById('fullscreen-spinner');
  if (spinner) {
    fullscreenOrb?.destroy();
    fullscreenOrb = null;
    spinner.remove();
  }
}

/**
 * Wrap an async function with spinner
 */
export function withSpinner(containerId, asyncFn, message = 'Cargando...') {
  return async (...args) => {
    showSpinner(containerId, message);
    try {
      return await asyncFn(...args);
    } finally {
      hideSpinner(containerId);
    }
  };
}

/**
 * Wrap an async function with fullscreen spinner
 */
export function withFullscreenSpinner(asyncFn, message = 'Procesando...') {
  return async (...args) => {
    showFullscreenSpinner(message);
    try {
      return await asyncFn(...args);
    } finally {
      hideFullscreenSpinner();
    }
  };
}
