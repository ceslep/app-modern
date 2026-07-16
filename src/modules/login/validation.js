/**
 * Inline validation rules for the login form.
 *
 * Returns { ok, message, level } for each field. The form's sections/form.js
 * subscribes to input events and renders the message + status icon inline.
 */

export const RULES = {
  identificacion: (value) => {
    const v = String(value || '').trim();
    if (!v) return { ok: false, message: 'Ingrese su identificación', level: 'err' };
    if (v.length < 4) return { ok: false, message: 'La identificación es muy corta', level: 'err' };
    if (!/^\d+$/.test(v)) return { ok: false, message: 'Solo dígitos permitidos', level: 'err' };
    return { ok: true, message: 'Identificación válida', level: 'ok' };
  },

  password: (value) => {
    const v = String(value || '');
    if (!v) return { ok: false, message: 'Ingrese su contraseña', level: 'err' };
    if (v.length < 4) return { ok: false, message: 'La contraseña es muy corta', level: 'err' };
    return { ok: true, message: '', level: 'ok' };
  },

  periodo: (value, opts = {}) => {
    if (opts.optional) return { ok: true, message: '', level: 'ok' };
    const v = String(value || '').trim();
    if (!v) return { ok: false, message: 'Seleccione un período', level: 'err' };
    return { ok: true, message: '', level: 'ok' };
  },

  contrasenaseguridad: (value, opts = {}) => {
    if (!opts.required) return { ok: true, message: '', level: 'ok' };
    const v = String(value || '');
    if (!v) return { ok: false, message: 'Ingrese el código de seguridad', level: 'err' };
    if (v.length < 5) return { ok: false, message: 'El código es muy corto', level: 'err' };
    return { ok: true, message: 'Código listo', level: 'ok' };
  },
};

/**
 * Apply a rule result to a DOM field. Updates .is-valid / .is-invalid on
 * the input and writes the message into the field's `.lg-msg` slot.
 */
export function applyRule(inputEl, msgEl, result) {
  if (!inputEl) return;
  inputEl.classList.remove('is-valid', 'is-invalid');
  if (!result) {
    if (msgEl) {
      msgEl.classList.remove('show', 'is-ok', 'is-warn');
      msgEl.textContent = '';
    }
    return;
  }
  if (result.ok) {
    inputEl.classList.add('is-valid');
    if (msgEl) {
      msgEl.classList.add('show', 'is-ok');
      msgEl.classList.remove('is-warn');
      // Éxito no debe interrumpir al lector de pantalla en cada blur.
      msgEl.setAttribute('role', 'status');
      msgEl.textContent = result.message || '';
    }
  } else {
    inputEl.classList.add('is-invalid');
    if (msgEl) {
      msgEl.classList.add('show');
      msgEl.classList.remove('is-ok', 'is-warn');
      msgEl.setAttribute('role', 'alert');
      msgEl.textContent = result.message || '';
    }
  }
}

export function validateAll(values, opts = {}) {
  const fields = [
    { name: 'identificacion',      rule: RULES.identificacion(values.identificacion) },
    { name: 'password',            rule: RULES.password(values.password) },
    { name: 'periodo',             rule: RULES.periodo(values.periodo, { optional: opts.periodoOptional }) },
    { name: 'contrasenaseguridad', rule: RULES.contrasenaseguridad(values.contrasenaseguridad, { required: opts.codigoRequired }) },
  ];
  const errors = fields.filter((f) => !f.rule.ok);
  return { ok: errors.length === 0, errors, fields };
}
