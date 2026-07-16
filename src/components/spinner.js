/**
 * Spinner/loading component
 */

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
  spinner.innerHTML = `
    <div class="inline-block w-8 h-8 border-4 border-[#543391] border-t-transparent rounded-full animate-spin" role="status">
      <span class="sr-only">${message}</span>
    </div>
    <div class="mt-2 text-gray-400 text-xs">${message}</div>
  `;

  container.appendChild(spinner);
  spinners.set(containerId, spinner);
}

/**
 * Hide spinner in a container
 */
export function hideSpinner(containerId) {
  const spinner = spinners.get(containerId);
  if (spinner) {
    spinner.remove();
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

/**
 * Show fullscreen spinner
 */
export function showFullscreenSpinner(message = 'Cargando...') {
  let spinner = document.getElementById('fullscreen-spinner');
  if (spinner) return;

  spinner = document.createElement('div');
  spinner.id = 'fullscreen-spinner';
  spinner.className = 'fullspinner';
  spinner.innerHTML = `
    <div class="text-center">
      <div class="inline-block w-12 h-12 border-4 border-[#543391] border-t-transparent rounded-full animate-spin" role="status" style="width: 3rem; height: 3rem;">
        <span class="sr-only">${message}</span>
      </div>
      <div class="mt-3 text-gray-400">${message}</div>
    </div>
  `;

  document.body.appendChild(spinner);
}

/**
 * Hide fullscreen spinner
 */
export function hideFullscreenSpinner() {
  const spinner = document.getElementById('fullscreen-spinner');
  if (spinner) {
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
