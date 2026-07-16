/**
 * Background — capa mínima para el estético "editorial refined".
 *
 * El diseño ya no usa orbes flotantes ni parallax de ratón (movimiento sobrio).
 * Se conserva la firma de ambas funciones para no tocar el orquestador
 * (index.js). `renderBackground()` devuelve una capa vacía y ligera;
 * `attachParallax()` es un no-op.
 */

export function renderBackground() {
  const layer = document.createElement('div');
  layer.className = 'lg-bg';
  layer.setAttribute('aria-hidden', 'true');
  return layer;
}

/**
 * No-op — el parallax de ratón se eliminó. Se mantiene la firma para que el
 * orquestador pueda seguir llamando/almacenando el "detach" sin cambios.
 */
export function attachParallax() {
  return () => {};
}
