/**
 * Login form state machine.
 *
 * Tracks the visual state of the form (idle / submitting / error / success)
 * and applies/removes CSS classes on the form card accordingly. Components
 * (submit button, fields) read their own state from `data-*` attributes.
 *
 * The form state is purely visual; it does NOT control business logic.
 * Business logic (network calls, validation) lives in the orchestrator.
 */

export const FORM_STATES = Object.freeze({
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  ERROR: 'error',
  SUCCESS: 'success',
});

export class FormStateMachine {
  constructor(cardEl, submitBtn, errorBanner) {
    this.card = cardEl;
    this.submitBtn = submitBtn;
    this.errorBanner = errorBanner;
    this.current = FORM_STATES.IDLE;
  }

  get state() {
    return this.current;
  }

  is(state) {
    return this.current === state;
  }

  setState(state, payload = {}) {
    if (!Object.values(FORM_STATES).includes(state)) return;
    const previous = this.current;
    this.current = state;
    this._applyClasses();
    this._applyButton(state);
    this._applyError(state, payload.message);
    if (state === FORM_STATES.SUCCESS) {
      this._celebrate();
    }
    return previous;
  }

  reset() {
    this.setState(FORM_STATES.IDLE);
    if (this.errorBanner) this.errorBanner.classList.remove('show');
  }

  _applyClasses() {
    if (!this.card) return;
    this.card.classList.remove('state-submitting', 'state-error', 'state-success');
    if (this.current === FORM_STATES.SUBMITTING) this.card.classList.add('state-submitting');
    if (this.current === FORM_STATES.ERROR) this.card.classList.add('state-error');
  }

  _applyButton(state) {
    if (!this.submitBtn) return;
    const content = this.submitBtn.querySelector('.content');
    if (state === FORM_STATES.SUBMITTING) {
      this.submitBtn.disabled = true;
      this.submitBtn.classList.add('state-submitting');
      if (content) content.innerHTML = '<span class="spinner"></span> Ingresando...';
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.classList.remove('state-submitting');
      if (content) content.innerHTML = '<i class="bi bi-box-arrow-in-right" aria-hidden="true"></i> Ingresar';
    }
  }

  _applyError(state, message) {
    if (!this.errorBanner) return;
    if (state === FORM_STATES.ERROR && message) {
      this.errorBanner.innerHTML = `<i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i><span>${message}</span>`;
      this.errorBanner.classList.add('show');
    } else if (state !== FORM_STATES.ERROR) {
      this.errorBanner.classList.remove('show');
    }
  }

  _celebrate() {
    // Confirmación limpia (sin confeti): overlay tenue + check morado/verde.
    const overlay = document.querySelector('.login-module .lg-success-overlay');
    if (overlay) {
      overlay.classList.add('show');
      setTimeout(() => overlay.classList.remove('show'), 1000);
    }
  }
}
