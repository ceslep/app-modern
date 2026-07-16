import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

/**
 * Show success alert
 */
export function alertSuccess(title, text = '') {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonColor: '#543391',
    confirmButtonText: 'Aceptar',
  });
}

/**
 * Show error alert
 */
export function alertError(title, text = '') {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#543391',
    confirmButtonText: 'Aceptar',
  });
}

/**
 * Show warning alert
 */
export function alertWarning(title, text = '') {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonColor: '#543391',
    confirmButtonText: 'Aceptar',
  });
}

/**
 * Show info alert
 */
export function alertInfo(title, text = '') {
  return Swal.fire({
    icon: 'info',
    title,
    text,
    confirmButtonColor: '#543391',
    confirmButtonText: 'Aceptar',
  });
}

/**
 * Show confirmation dialog
 */
export function alertConfirm(title, text = '') {
  return Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#543391',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, continuar',
    cancelButtonText: 'Cancelar',
  });
}

/**
 * Show confirmation dialog returning boolean
 */
export async function confirmAction(title, text = '') {
  const result = await alertConfirm(title, text);
  return result.isConfirmed;
}

/**
 * Show prompt dialog
 */
export function alertPrompt(title, inputType = 'text', inputValue = '') {
  return Swal.fire({
    title,
    input: inputType,
    inputValue,
    showCancelButton: true,
    confirmButtonColor: '#543391',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Aceptar',
    cancelButtonText: 'Cancelar',
    inputValidator: (value) => {
      if (!value) return 'Debe ingresar un valor';
      return null;
    },
  });
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'success') {
  return Toast.fire({
    icon: type,
    title: message,
  });
}

/**
 * Show loading dialog
 */
export function showLoading(title = 'Procesando...') {
  return Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
  });
}

/**
 * Close loading dialog
 */
export function closeLoading() {
  Swal.close();
}

/**
 * Update current loading dialog
 */
export function updateLoading(options) {
  Swal.update(options);
}

/**
 * Show HTML content in alert
 */
export function alertHtml(title, html) {
  return Swal.fire({
    title,
    html,
    confirmButtonColor: '#543391',
    confirmButtonText: 'Aceptar',
  });
}

/**
 * Show timer-based alert (auto close)
 */
export function alertTimer(title, timer = 2000) {
  return Swal.fire({
    title,
    timer,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  });
}
