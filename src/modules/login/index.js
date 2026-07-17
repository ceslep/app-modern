/**
 * Login module — orchestrator.
 *
 * Public API (kept stable for callers like main.js):
 *   - new LoginModule() / loginModule instance
 *   - loginModule.start()
 *   - loginModule.gate()
 *   - loginModule.reveal()
 *   - loginModule.doLogin()
 *   - loginModule.handleGoogleLogin(credential)
 *
 * The orchestrator now renders the form into a target element
 * (default: #login-content inside the static #login-page shell).
 * Existing business logic (auth, Google Sign-In, period loader,
 * security-code request) is preserved.
 */

import { endpoint } from '@config/endpoints.js';
import { auth } from '@services/auth.js';
import { $, delegate } from '@utils/dom.js';
import { alertError, alertInfo } from '@utils/alert.js';
import { refreshNavbar } from '@components/navbar.js';
import { initSidebar } from '@components/sidebar.js';
import { initDashboard } from '@modules/dashboard.js';
import { clientInfo } from '@utils/clientInfo.js';
import { initIconSelect } from '@components/icon-select.js';

import { injectLoginStyles } from './styles.js';
import { renderBackground, attachParallax } from './sections/background.js';
import { renderBranding } from './sections/branding.js';
import { renderForm } from './sections/form.js';
import { renderTrust } from './sections/footer.js';
import { FormStateMachine, FORM_STATES } from './state.js';
import { RULES, applyRule, validateAll } from './validation.js';

const TARGET_ID = 'login-content';

class LoginModule {
  constructor() {
    this.SolicitaCodigo = false;
    this._googleInitCalled = false;
    this._stateMachine = null;
    this._detachParallax = null;
    this._formFields = null;
    this._init();
  }

  _init() {
    injectLoginStyles();
    this._renderShell();
    this._wireEvents();
  }

  // ---- RENDERING ----

  _renderShell() {
    let target = document.getElementById(TARGET_ID);
    if (!target) {
      const page = document.getElementById('login-page');
      if (!page) return;
      target = document.createElement('div');
      target.id = TARGET_ID;
      target.className = 'contents';
      page.appendChild(target);
    }
    target.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'login-module lg-root';
    root.setAttribute('data-login-root', '');

    // Background (orbs)
    root.appendChild(renderBackground());

    // Brand panel (right, hidden on mobile)
    root.appendChild(renderBranding());

    // Form panel (left)
    const formEl = renderForm();
    root.appendChild(formEl);
    target.appendChild(root);

    // Overlay de éxito (confirmación limpia, sin confeti)
    const overlay = document.createElement('div');
    overlay.className = 'lg-success-overlay';
    overlay.innerHTML = `<div class="lg-success-core"><i class="bi bi-check2"></i></div>`;
    root.appendChild(overlay);

    // Trust indicators
    const trustEl = formEl.querySelector('[data-trust]');
    if (trustEl) trustEl.innerHTML = renderTrust();

    // State machine
    const card = formEl.querySelector('[data-form-card]');
    const submitBtn = formEl.querySelector('#btnDoLogin');
    const errorBanner = formEl.querySelector('[data-form-error]');
    this._stateMachine = new FormStateMachine(card, submitBtn, errorBanner);

    // Cache field refs
    this._formFields = {
      identificacion: formEl.querySelector('#loginIdentificacion'),
      password:       formEl.querySelector('#loginPassword'),
      periodo:        formEl.querySelector('#loginPeriodo'),
      codigo:         formEl.querySelector('#contrasenaseguridad'),
      codigoWrap:     formEl.querySelector('#codigoSeguridadContainer'),
      msgId:          formEl.querySelector('#loginIdentificacion-msg'),
      msgPass:        formEl.querySelector('#loginPassword-msg'),
      msgPeriodo:     formEl.querySelector('#loginPeriodo-msg'),
      msgCodigo:      formEl.querySelector('#contrasenaseguridad-msg'),
      caps:           formEl.querySelector('#loginPassword-caps'),
    };

    // Parallax
    this._detachParallax = attachParallax(root);
  }

  // ---- EVENTS ----

  _wireEvents() {
    const form = $('frmLogin');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this._onSubmit();
      });
    }

    // Solicitar código
    delegate(document, 'click', '#solcod', (e) => {
      e.preventDefault();
      this._solicitarCodigo();
    });

    // Blur de identificación → validar y consultar si requiere código
    delegate(document, 'blur', '#loginIdentificacion', (e) => {
      this._validateField('identificacion', e.target.value);
      this._validarSolicitaCodigo(e.target.value);
    });

    // Blur de password → re-validar si ya hay ID
    delegate(document, 'blur', '#loginPassword', () => {
      this._validateField('password', this._formFields?.password?.value);
      const id = this._formFields?.identificacion?.value;
      if (id) this._validarSolicitaCodigo(id);
    });

    // Real-time: input en identificación / password
    delegate(document, 'input', '#loginIdentificacion', (e) => {
      this._validateField('identificacion', e.target.value, { live: true });
    });
    delegate(document, 'input', '#loginPassword', (e) => {
      this._validateField('password', e.target.value, { live: true });
    });
    delegate(document, 'change', '#loginPeriodo', (e) => {
      this._validateField('periodo', e.target.value, { live: true });
    });
    delegate(document, 'input', '#contrasenaseguridad', (e) => {
      this._validateField('contrasenaseguridad', e.target.value, { live: true });
    });

    // Show/hide password
    delegate(document, 'click', '[data-toggle-pw]', (e, btn) => {
      const pwInput = this._formFields?.password;
      if (!pwInput) return;
      const isHidden = pwInput.type === 'password';
      pwInput.type = isHidden ? 'text' : 'password';
      const icon = btn.querySelector('i');
      if (icon) icon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
      btn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });

    // Caps lock detection
    const pw = this._formFields?.password;
    if (pw) {
      pw.addEventListener('keyup', (e) => this._updateCaps(e));
      pw.addEventListener('keydown', (e) => this._updateCaps(e));
      pw.addEventListener('blur', () => this._hideCaps());
    }

    // Forgot password (placeholder behavior)
    delegate(document, 'click', '[data-forgot]', (e) => {
      e.preventDefault();
      alertInfo(
        '¿Olvidaste tu contraseña?',
        'Comunícate con la administración del colegio para restablecer tu clave.'
      );
    });
  }

  _validateField(name, value, opts = {}) {
    const fields = this._formFields;
    if (!fields) return;
    let inputEl, msgEl, rule;
    if (name === 'identificacion') { inputEl = fields.identificacion; msgEl = fields.msgId; rule = RULES.identificacion(value); }
    else if (name === 'password')     { inputEl = fields.password;       msgEl = fields.msgPass; rule = RULES.password(value); }
    else if (name === 'periodo')      { inputEl = fields.periodo;        msgEl = fields.msgPeriodo; rule = RULES.periodo(value, { optional: true }); }
    else if (name === 'contrasenaseguridad') { inputEl = fields.codigo;  msgEl = fields.msgCodigo; rule = RULES.contrasenaseguridad(value, { required: this.SolicitaCodigo }); }
    if (!inputEl) return;
    // En modo "live" no marcamos error hasta que el usuario salga del campo (excepto si ya tenía error).
    if (opts.live && !inputEl.classList.contains('is-invalid') && !inputEl.value) return;
    applyRule(inputEl, msgEl, rule);
  }

  _updateCaps(e) {
    if (typeof e.getModifierState !== 'function') return;
    const caps = e.getModifierState('CapsLock');
    if (this._formFields?.caps) this._formFields.caps.classList.toggle('show', caps);
  }

  _hideCaps() {
    if (this._formFields?.caps) this._formFields.caps.classList.remove('show');
  }

  async _onSubmit() {
    const fields = this._formFields;
    if (!fields) return;
    const values = {
      identificacion:      fields.identificacion?.value?.trim() || '',
      password:            fields.password?.value || '',
      periodo:             fields.periodo?.value || '',
      contrasenaseguridad: fields.codigo?.value || '',
    };

    const result = validateAll(values, { codigoRequired: this.SolicitaCodigo });
    // Forzar mostrar todos los mensajes
    for (const f of result.fields) {
      this._validateField(f.name, values[f.name === 'contrasenaseguridad' ? 'contrasenaseguridad' : f.name]);
    }
    if (!result.ok) {
      // Shake + scroll al primer error
      this._stateMachine.setState(FORM_STATES.ERROR, { message: 'Revisa los campos marcados' });
      setTimeout(() => this._stateMachine.setState(FORM_STATES.IDLE), 500);
      const firstErr = this._stateMachine.card?.querySelector('.is-invalid');
      if (firstErr) firstErr.focus();
      return;
    }

    await this.doLogin();
  }

  // ---- BUSINESS LOGIC (preserved) ----

  async _cargarPeriodos() {
    const select = $('loginPeriodo');
    if (!select || select.dataset.loaded) return;
    try {
      const response = await fetch(endpoint('/getPeriodos.php'), { credentials: 'include' });
      const data = await response.json();
      select.dataset.loaded = 'true';
      if (Array.isArray(data)) {
        data.forEach((p) => {
          const opt = document.createElement('option');
          opt.value = p.ind;
          opt.textContent = p.nombre;
          if (p.selected === 'selected') opt.selected = true;
          select.appendChild(opt);
        });
      }
      initIconSelect('loginPeriodo', { icon: 'bi-calendar3', placeholder: 'Período' });
    } catch (e) {
      console.warn('Error cargando periodos:', e);
    }
  }

  async _validarSolicitaCodigo(identificacion) {
    if (!identificacion || identificacion.length < 4) return;
    const info = await auth.checkInfoDocente(identificacion);
    this.SolicitaCodigo = info.solicitaCodigo === 'S';
    const container = this._formFields?.codigoWrap;
    if (!container) return;
    const hasPassword = !!this._formFields?.password?.value;
    if (!this.SolicitaCodigo && hasPassword) {
      container.classList.add('hidden');
    } else {
      container.classList.remove('hidden');
    }
  }

  async _solicitarCodigo() {
    const btn = $('solcod');
    if (!btn) return;
    const spinner = btn.querySelector('.spcsco');
    if (spinner) spinner.classList.remove('hidden');
    btn.disabled = true;
    try {
      const idEl = this._formFields?.identificacion;
      if (!idEl || !idEl.value) {
        alertError('Error', 'Primero ingrese su identificación');
        return;
      }
      alertInfo('Código de Seguridad', 'Si necesita un código de seguridad, solicítelo en la administración del colegio.');
    } catch (err) {
      alertError('Error', err.message);
    } finally {
      if (spinner) spinner.classList.add('hidden');
      btn.disabled = false;
    }
  }

  async start() {
    const restored = auth.loadSession();
    if (restored) {
      this.reveal();
      return;
    }
    const ok = await auth.checkSession();
    if (ok) {
      this.reveal();
    } else {
      auth.clearSession();
      this.gate();
    }
  }

  gate() {
    const boot = document.getElementById('boot-loader');
    if (boot) boot.remove();
    const loginPage = document.getElementById('login-page');
    const appLayout = document.getElementById('app-layout');
    if (loginPage) {
      loginPage.style.display = '';
      loginPage.classList.remove('hidden');
    }
    if (appLayout) {
      appLayout.style.display = 'none';
      appLayout.classList.add('hidden');
    }
    this._cargarPeriodos();
    this._initGoogleSignIn();
  }

  reveal() {
    window._sessionExpiredDispatched = false;
    const boot = document.getElementById('boot-loader');
    if (boot) boot.remove();
    const loginPage = document.getElementById('login-page');
    const appLayout = document.getElementById('app-layout');
    if (loginPage) {
      loginPage.style.display = 'none';
      loginPage.classList.add('hidden');
    }
    if (appLayout) {
      appLayout.style.display = '';
      appLayout.classList.remove('hidden');
    }
    if (this._detachParallax) {
      this._detachParallax();
      this._detachParallax = null;
    }
    refreshNavbar();
    initSidebar();
    initDashboard();
    document.dispatchEvent(new CustomEvent('app:authenticated'));
  }

  async doLogin() {
    const fields = this._formFields;
    if (!fields) return;
    const identificacion = fields.identificacion?.value?.trim() || '';
    const password        = fields.password?.value || '';
    const codigoSeguridad = fields.codigo?.value || '';
    const periodo         = fields.periodo?.value || '';

    if (!identificacion || identificacion.length < 4) {
      this._stateMachine.setState(FORM_STATES.ERROR, { message: 'Identificación inválida' });
      setTimeout(() => this._stateMachine.setState(FORM_STATES.IDLE), 500);
      return;
    }
    if (!password || password.length < 4) {
      this._stateMachine.setState(FORM_STATES.ERROR, { message: 'Contraseña inválida' });
      setTimeout(() => this._stateMachine.setState(FORM_STATES.IDLE), 500);
      return;
    }
    if (this.SolicitaCodigo && (!codigoSeguridad || codigoSeguridad.length < 5)) {
      this._stateMachine.setState(FORM_STATES.ERROR, { message: 'Código de seguridad requerido' });
      setTimeout(() => this._stateMachine.setState(FORM_STATES.IDLE), 500);
      return;
    }

    const infocliente = clientInfo();
    this._stateMachine.setState(FORM_STATES.SUBMITTING);

    try {
      const res = await auth.login(identificacion, password, {
        contrasenaseguridad: codigoSeguridad,
        periodonotas: periodo,
        infocliente,
        SolicitaCodigo: this.SolicitaCodigo,
      });

      if (res.success && res.data?.concedido === 'Si') {
        if (fields.password) fields.password.value = '';
        this._stateMachine.setState(FORM_STATES.SUCCESS);
        setTimeout(() => this.reveal(), 800);
      } else {
        this._stateMachine.setState(FORM_STATES.ERROR, {
          message: res.data?.error || res.error || 'Credenciales inválidas',
        });
        setTimeout(() => this._stateMachine.setState(FORM_STATES.IDLE), 800);
      }
    } catch (error) {
      this._stateMachine.setState(FORM_STATES.ERROR, {
        message: error.message || 'No se pudo iniciar sesión',
      });
      setTimeout(() => this._stateMachine.setState(FORM_STATES.IDLE), 800);
    }
  }

  async handleGoogleLogin(response) {
    try {
      const infocliente = clientInfo();
      const res = await auth.googleLogin(response.credential, infocliente);
      if (res.success && res.data?.concedido === 'Si') {
        this._stateMachine.setState(FORM_STATES.SUCCESS);
        setTimeout(() => this.reveal(), 800);
      } else {
        this._stateMachine.setState(FORM_STATES.ERROR, {
          message: res.data?.error || res.error || 'No se pudo iniciar sesión con Google',
        });
        setTimeout(() => this._stateMachine.setState(FORM_STATES.IDLE), 800);
      }
    } catch (error) {
      this._stateMachine.setState(FORM_STATES.ERROR, {
        message: error.message || 'Error al iniciar sesión con Google',
      });
      setTimeout(() => this._stateMachine.setState(FORM_STATES.IDLE), 800);
    }
  }

  _initGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts) {
      if (!this._googleInitCalled) {
        this._googleInitCalled = true;
        setTimeout(() => this._initGoogleSignIn(), 200);
      }
      return;
    }
    const container = document.getElementById('googleBtnContainer');
    if (!container || container.hasAttribute('data-google-initialized')) return;
    container.setAttribute('data-google-initialized', 'true');
    google.accounts.id.initialize({
      client_id: '460775351784-6b3vev8mdsrcv2l67fu1bc1btb60qgq7.apps.googleusercontent.com',
      callback: (response) => this.handleGoogleLogin(response),
    });
    google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 300,
    });
  }
}

export const loginModule = new LoginModule();
export { LoginModule };
