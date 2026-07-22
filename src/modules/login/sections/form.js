/**
 * Login form — fields, floating labels, show/hide password, caps lock warning,
 * inline validation messages, remember-me, forgot link, Google Sign-In slot.
 *
 * Renders a stable DOM; the orchestrator wires events and the state machine.
 * Estético "editorial refined": tarjeta plana, título de bienvenida, y una
 * cabecera de marca compacta que solo se ve en móvil (< 1024px).
 */

export function renderForm() {
  const pane = document.createElement('div');
  pane.className = 'lg-pane-form';
  pane.innerHTML = `
    <div class="lg-card" data-form-card>
      <!-- Cabecera de marca (solo móvil) · decorativa: la marca la anuncia el panel/heading -->
      <header class="lg-head" aria-hidden="true">
        <img src="escudohd.png" alt="" class="logo" style="width:80px;height:auto;" />
        <h1>I.E. de Occidente</h1>
        <p>Sistema Académico</p>
      </header>

      <!-- Título editorial · h1 real de la página de login -->
      <div class="lg-intro">
        <h1>Bienvenido</h1>
        <p>Inicia sesión para acceder a la plataforma.</p>
      </div>

      <form id="frmLogin" novalidate autocomplete="on">
        <!-- Identificación -->
        <div class="lg-field" data-field="identificacion">
          <input
            type="text"
            id="loginIdentificacion"
            name="identificacion"
            class="lg-input"
            autocomplete="username"
            required
            autofocus
            inputmode="numeric"
            placeholder=" "
            aria-describedby="loginIdentificacion-msg"
          />
          <i class="bi bi-person-vcard lg-field-icon" aria-hidden="true"></i>
          <span class="lg-label">Identificación</span>
          <i class="bi bi-check-circle-fill lg-field-status" aria-hidden="true"></i>
          <span class="lg-msg" id="loginIdentificacion-msg" role="alert"></span>
        </div>

        <!-- Contraseña -->
        <div class="lg-field" data-field="password">
          <input
            type="password"
            id="loginPassword"
            name="password"
            class="lg-input"
            autocomplete="current-password"
            required
            placeholder=" "
            aria-describedby="loginPassword-msg loginPassword-caps"
          />
          <i class="bi bi-key lg-field-icon" aria-hidden="true"></i>
          <span class="lg-label">Contraseña</span>
          <button type="button" class="lg-toggle-pw" data-toggle-pw aria-label="Mostrar contraseña">
            <i class="bi bi-eye" aria-hidden="true"></i>
          </button>
          <span class="lg-msg" id="loginPassword-msg" role="alert"></span>
        </div>
        <div class="lg-caps" id="loginPassword-caps" role="status">
          <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
          <span>Bloq Mayús está activo</span>
        </div>

        <!-- Período -->
        <div class="lg-field" data-field="periodo">
          <select
            id="loginPeriodo"
            name="periodo"
            class="lg-input"
            required
            placeholder=" "
            aria-describedby="loginPeriodo-msg"
          >
            <option value="" disabled selected></option>
          </select>
          <i class="bi bi-calendar3 lg-field-icon" aria-hidden="true"></i>
          <span class="lg-label">Período</span>
          <i class="bi bi-chevron-down lg-chevron" aria-hidden="true"></i>
          <span class="lg-msg" id="loginPeriodo-msg" role="alert"></span>
        </div>

        <!-- Código de seguridad (condicional) -->
        <div class="lg-code hidden" id="codigoSeguridadContainer" data-field="codigo">
          <div class="lg-field" style="margin-bottom:0.5rem">
            <input
              type="text"
              id="contrasenaseguridad"
              name="contrasenaseguridad"
              class="lg-input"
              inputmode="numeric"
              placeholder=" "
              aria-describedby="contrasenaseguridad-msg"
            />
            <i class="bi bi-shield-lock lg-field-icon" aria-hidden="true"></i>
            <span class="lg-label">Código de seguridad</span>
            <span class="lg-msg" id="contrasenaseguridad-msg" role="alert"></span>
          </div>
          <button type="button" id="solcod" class="lg-forgot" style="width:100%;text-align:center;padding:0.5rem 0;border-radius:0.375rem;background:rgba(245,158,11,0.09);border:1px solid rgba(245,158,11,0.22)">
            <i class="bi bi-cpu" style="margin-right:0.3rem" aria-hidden="true"></i> Solicitar código
            <span class="spinner-border spinner-border-sm spcsco hidden" style="margin-left:0.4rem;width:0.85rem;height:0.85rem;border-width:0.15em"></span>
          </button>
        </div>

        <!-- Recordarme + olvidé contraseña -->
        <div class="lg-meta">
          <label class="lg-remember">
            <input type="checkbox" id="loginRemember" />
            <span class="box"></span>
            <span>Recordar dispositivo</span>
          </label>
          <button type="button" class="lg-forgot" data-forgot>¿Olvidaste tu contraseña?</button>
        </div>

        <!-- Error banner (server / general) -->
        <div class="lg-form-error" data-form-error role="alert" aria-live="assertive"></div>

        <!-- Submit -->
        <button type="submit" id="btnDoLogin" class="lg-submit">
          <span class="content">
            <i class="bi bi-box-arrow-in-right" aria-hidden="true"></i> Ingresar
          </span>
        </button>
      </form>

      <div class="lg-divider"><span>o</span></div>

      <div class="lg-google">
        <div id="googleBtnContainer"></div>
      </div>

      <div class="lg-trust" data-trust></div>
    </div>
  `;

  return pane;
}
