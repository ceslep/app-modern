/**
 * Animated number counter for KPIs.
 * Uses requestAnimationFrame with an easeOutCubic curve, ~800ms.
 * Respects prefers-reduced-motion by snapping to final value.
 */

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function animateCount(el, target, { duration = 800, decimals = 0 } = {}) {
  if (!el) return;
  const end = Number.isFinite(target) ? target : 0;

  if (REDUCED_MOTION) {
    el.textContent = formatNumber(end, decimals);
    return;
  }

  const start = performance.now();
  const startVal = 0;
  const diff = end - startVal;

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = startVal + diff * eased;
    el.textContent = formatNumber(current, decimals);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = formatNumber(end, decimals);
  }

  requestAnimationFrame(step);
}

export function formatNumber(n, decimals = 0) {
  const value = Number(n) || 0;
  if (decimals > 0) return value.toFixed(decimals);
  return Math.round(value).toLocaleString('es-CO');
}
