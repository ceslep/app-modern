/**
 * Branding panel — lado izquierdo del split-screen (estético editorial).
 * Eyebrow con hairline, escudo, título grande en Bricolage, regla, un solo
 * lema fijo y una nota al pie. Oculto en móvil vía CSS (< 1024px).
 *
 * NOTE: se eliminaron el rotador de lemas y los blobs decorativos (movimiento
 * sobrio). Las estadísticas numéricas se retiraron previamente por ser
 * marcadores de posición engañosos.
 */

const TAGLINE = 'Plataforma de gestión académica para docentes y administrativos de la Institución Educativa de Occidente.';

export function renderBranding() {
  const pane = document.createElement('aside');
  pane.className = 'lg-pane-brand';
  pane.setAttribute('aria-hidden', 'true');

  pane.innerHTML = `
    <div class="lg-brand-inner">
      <div class="lg-brand-eyebrow">Sistema Académico</div>
      <img src="uescudo.png" alt="Escudo I.E. de Occidente" class="lg-brand-escudo" />
      <h1 class="lg-brand-title">I.E. de Occidente</h1>
      <div class="lg-brand-rule"></div>
      <p class="lg-brand-tagline">${TAGLINE}</p>
    </div>
    <div class="lg-brand-foot">
      <i class="bi bi-shield-lock-fill"></i>
      <span>Acceso seguro y cifrado</span>
    </div>
  `;

  return pane;
}
