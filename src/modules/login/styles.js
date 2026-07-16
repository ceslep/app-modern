/**
 * Login module · self-contained stylesheet (namespaced under .login-module)
 * Injected once on first render.
 *
 * Aesthetic: "editorial refined" — split-screen serio y premium. Panel de marca
 * morado sólido con tipografía protagonista (Bricolage Grotesque); panel de
 * formulario en papel casi blanco con tarjeta plana y hairlines nítidas. Sin
 * glassmorphism, sin orbes, sin confeti. Movimiento sobrio: solo entrada
 * escalonada al cargar + micro-interacciones en focus/hover.
 */

const CSS = `
/* ============================================================= *
 *  LOGIN · Editorial Refined (split-screen)                      *
 *  Scoped under .login-module                                    *
 * ============================================================= */
.login-module {
  /* Brand */
  --lg-brand:        #543391;
  --lg-brand-deep:   #3d2670;
  --lg-brand-light:  #6f4ab3;
  --lg-brand-ink:    #2c1c52;
  /* Status */
  --lg-ok:           #0f9d6b;
  --lg-err:          #dc2626;
  --lg-warn:         #b45309;
  /* Paper (form side) */
  --lg-paper:        #fafafb;
  --lg-surface:      #ffffff;
  --lg-ink:          #1c1830;
  --lg-ink-soft:     #6b6580;
  --lg-ink-faint:    #9a94ab;
  --lg-line:         #e6e3ee;
  --lg-line-strong:  #d3cee0;
  /* Radii — nítidos, editoriales */
  --lg-radius:       0.75rem;
  --lg-radius-sm:    0.5rem;
  --lg-radius-xs:    0.375rem;
  /* Shadows — suaves */
  --lg-shadow:       0 1px 2px rgba(28, 24, 48, 0.04);
  --lg-shadow-md:    0 8px 24px -14px rgba(44, 28, 82, 0.22);
  /* Timing */
  --lg-fast:         160ms cubic-bezier(0.4, 0, 0.2, 1);
  --lg-normal:       260ms cubic-bezier(0.4, 0, 0.2, 1);
  --lg-ease-out:     420ms cubic-bezier(0.16, 1, 0.3, 1);
  font-family: 'Inter', system-ui, sans-serif;
}

/* ---- Keyframes (sobrio) ---- */
@keyframes lg-fade-up      { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes lg-fade-in      { from { opacity: 0; } to { opacity: 1; } }
@keyframes lg-shake        { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
@keyframes lg-success-core { 0% { opacity: 0; transform: scale(0.6); } 55% { opacity: 1; transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
@keyframes lg-spin         { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .login-module, .login-module * {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

/* ---- Layout root ---- */
.login-module.lg-root {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background: var(--lg-paper);
  isolation: isolate;
}
.login-module .lg-pane-form {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  position: relative;
  z-index: 2;
  overflow-y: auto;
  background: var(--lg-paper);
}
/* En pantallas cortas el card puede ser más alto que el viewport: márgenes
   automáticos centran cuando cabe y permiten scroll sin recortar el borde
   superior (evita la trampa flex + overflow-y). */
.login-module .lg-pane-form > .lg-card {
  margin-block: auto;
}

/* ---- Brand pane (left) ---- */
.login-module .lg-pane-brand {
  display: none;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, var(--lg-brand-deep) 0%, var(--lg-brand) 100%);
  isolation: isolate;
}
/* Textura editorial: retícula de hairlines muy tenues */
.login-module .lg-pane-brand::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 4.5rem 4.5rem;
  mask-image: radial-gradient(120% 90% at 30% 20%, #000 30%, transparent 90%);
  -webkit-mask-image: radial-gradient(120% 90% at 30% 20%, #000 30%, transparent 90%);
  pointer-events: none;
}

@media (min-width: 1024px) {
  .login-module .lg-pane-form { flex: 0 0 50%; padding: 3.5rem; }
  .login-module .lg-pane-brand { display: flex; flex: 0 0 50%; align-items: center; }
}

/* Portrait / pantallas cortas: compactar para que todo quepa sin apretujar */
@media (max-width: 1023px) {
  .login-module .lg-pane-form { padding: 1.5rem 1.25rem; }
}
@media (max-width: 400px), (max-height: 720px) {
  .login-module .lg-head { margin-bottom: 1.25rem; }
  .login-module .lg-head .logo { width: 2.75rem; height: 2.75rem; margin-bottom: 0.6rem; }
  .login-module .lg-intro { margin-bottom: 1.15rem; }
  .login-module .lg-intro h1 { font-size: 1.45rem; }
  .login-module .lg-field { margin-bottom: 0.8rem; }
  .login-module .lg-divider { margin: 0.9rem 0 0.8rem; }
  .login-module .lg-trust { margin-top: 1rem; padding-top: 0.85rem; }
}

/* ---- Brand content ---- */
.login-module .lg-brand-inner {
  position: relative; z-index: 2;
  padding: 4rem 3.5rem;
  color: white;
  max-width: 34rem;
  width: 100%;
  animation: lg-fade-up var(--lg-ease-out) both;
}
.login-module .lg-brand-eyebrow {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 2.5rem;
}
.login-module .lg-brand-eyebrow::after {
  content: '';
  flex: 1; height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.30), transparent);
}
.login-module .lg-brand-escudo {
  width: 5rem; height: 5rem;
  margin-bottom: 2rem;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.28));
}
.login-module .lg-brand-title {
  font-family: 'Bricolage Grotesque', 'Inter', sans-serif;
  font-size: clamp(2rem, 3vw, 2.8rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin: 0 0 1.25rem 0;
}
.login-module .lg-brand-rule {
  width: 3rem; height: 3px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 2px;
  margin-bottom: 1.25rem;
}
.login-module .lg-brand-tagline {
  font-size: 1.02rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.6;
  margin: 0;
  max-width: 24rem;
}
.login-module .lg-brand-foot {
  position: absolute;
  left: 3.5rem; right: 3.5rem; bottom: 2.25rem;
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.45);
  z-index: 2;
}
.login-module .lg-brand-foot i { font-size: 0.85rem; }

/* ---- Mobile brand header (shown < 1024px) ---- */
.login-module .lg-head {
  text-align: center;
  margin-bottom: 2rem;
  animation: lg-fade-up 0.5s var(--lg-ease-out) both;
}
.login-module .lg-head .logo {
  width: 3.5rem; height: 3.5rem;
  margin: 0 auto 0.85rem;
  display: block;
}
.login-module .lg-head h1 {
  font-family: 'Bricolage Grotesque', 'Inter', sans-serif;
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--lg-ink);
  margin: 0;
}
.login-module .lg-head p {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--lg-ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin: 0.3rem 0 0;
}
@media (min-width: 1024px) {
  .login-module .lg-head { display: none; }
}

/* ---- Form card (plana) ---- */
.login-module .lg-card {
  position: relative;
  width: 100%;
  max-width: 25rem;
  background: transparent;
  padding: 0;
  isolation: isolate;
}
@media (max-width: 1023px) {
  .login-module .lg-card {
    background: var(--lg-surface);
    border: 1px solid var(--lg-line);
    border-radius: var(--lg-radius);
    box-shadow: var(--lg-shadow-md);
    padding: 1.75rem 1.5rem;
  }
}
.login-module .lg-card.state-error { animation: lg-shake 0.4s ease-in-out; }

/* ---- Form intro (título editorial) ---- */
.login-module .lg-intro {
  margin-bottom: 1.75rem;
  animation: lg-fade-up 0.5s var(--lg-ease-out) both;
  animation-delay: 0.05s;
}
.login-module .lg-intro h1 {
  font-family: 'Bricolage Grotesque', 'Inter', sans-serif;
  font-size: 1.7rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--lg-ink);
  margin: 0 0 0.35rem;
}
.login-module .lg-intro p {
  font-size: 0.9rem;
  color: var(--lg-ink-soft);
  margin: 0;
}

/* ---- Floating-label input (aplanado) ---- */
.login-module .lg-field { position: relative; margin-bottom: 1rem; animation: lg-fade-up 0.5s var(--lg-ease-out) both; }
.login-module .lg-field:nth-of-type(1) { animation-delay: 0.10s; }
.login-module .lg-field:nth-of-type(2) { animation-delay: 0.15s; }
.login-module .lg-field:nth-of-type(3) { animation-delay: 0.20s; }
.login-module .lg-field:nth-of-type(4) { animation-delay: 0.25s; }

.login-module .lg-input {
  width: 100%;
  padding: 1.15rem 2.5rem 0.5rem 2.5rem;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--lg-ink);
  background: var(--lg-surface);
  border: 1px solid var(--lg-line-strong);
  border-radius: var(--lg-radius-sm);
  outline: none;
  transition: border-color var(--lg-fast), box-shadow var(--lg-fast);
  font-family: inherit;
  line-height: 1.5;
}
.login-module select.lg-input { appearance: none; cursor: pointer; }
.login-module .lg-input::placeholder { color: transparent; }
.login-module .lg-input:focus {
  border-color: var(--lg-brand);
  box-shadow: 0 0 0 3px rgba(84, 51, 145, 0.13);
}
.login-module .lg-input.is-valid { border-color: rgba(15, 157, 107, 0.55); }
.login-module .lg-input.is-valid:focus { box-shadow: 0 0 0 3px rgba(15, 157, 107, 0.14); }
.login-module .lg-input.is-invalid { border-color: rgba(220, 38, 38, 0.55); }
.login-module .lg-input.is-invalid:focus { box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.13); }

.login-module .lg-label {
  position: absolute;
  left: 2.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--lg-ink-faint);
  pointer-events: none;
  transition: all var(--lg-fast);
}
.login-module .lg-input:focus ~ .lg-label,
.login-module .lg-input:not(:placeholder-shown) ~ .lg-label {
  top: 0.42rem;
  transform: translateY(0);
  left: 0.9rem;
  font-size: 0.64rem;
  font-weight: 700;
  color: var(--lg-brand);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.login-module .lg-input.is-valid ~ .lg-label { color: var(--lg-ok); }
.login-module .lg-input.is-invalid ~ .lg-label { color: var(--lg-err); }

.login-module .lg-field-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  color: var(--lg-ink-faint);
  pointer-events: none;
  transition: color var(--lg-fast);
}
.login-module .lg-input:focus ~ .lg-field-icon { color: var(--lg-brand); }

/* Chevron for selects */
.login-module .lg-field select.lg-input ~ .lg-chevron {
  position: absolute;
  right: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--lg-ink-faint);
  pointer-events: none;
  font-size: 0.9rem;
}

.login-module .lg-field-status {
  position: absolute;
  right: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  opacity: 0;
  transition: opacity var(--lg-fast);
  pointer-events: none;
}
.login-module .lg-input.is-valid ~ .lg-field-status { opacity: 1; color: var(--lg-ok); }
.login-module .lg-input.is-invalid ~ .lg-field-status { opacity: 1; color: var(--lg-err); }

.login-module .lg-toggle-pw {
  position: absolute;
  right: 0.35rem;
  top: 50%;
  transform: translateY(-50%);
  width: 2.75rem; height: 2.75rem;
  display: flex; align-items: center; justify-content: center;
  background: transparent;
  border: none;
  color: var(--lg-ink-faint);
  cursor: pointer;
  border-radius: var(--lg-radius-xs);
  transition: all var(--lg-fast);
  font-size: 0.95rem;
}
.login-module .lg-toggle-pw:hover { color: var(--lg-brand); background: rgba(84, 51, 145, 0.08); }
.login-module .lg-toggle-pw:focus-visible,
.login-module .lg-forgot:focus-visible {
  outline: 2px solid var(--lg-brand);
  outline-offset: 2px;
}
.login-module .lg-submit:focus-visible {
  outline: 3px solid var(--lg-brand-light);
  outline-offset: 3px;
}

.login-module .lg-msg {
  display: block;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--lg-err);
  margin-top: 0.32rem;
  padding-left: 0.25rem;
  animation: lg-fade-up 0.2s ease-out both;
}
.login-module .lg-msg::before {
  content: '\\F33A';
  font-family: 'bootstrap-icons';
  margin-right: 0.25rem;
  font-size: 0.78rem;
}
.login-module .lg-msg.is-ok { color: var(--lg-ok); }
.login-module .lg-msg.is-ok::before { content: '\\F26B'; }
.login-module .lg-msg.is-warn { color: var(--lg-warn); }
.login-module .lg-msg.is-warn::before { content: '\\F33A'; }
/* Sin mensaje → sin icono (evita triángulos rojos sueltos) */
.login-module .lg-msg:empty { display: none; }

/* ---- Caps lock warning ---- */
.login-module .lg-caps {
  display: none;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--lg-warn);
  background: rgba(245, 158, 11, 0.09);
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: var(--lg-radius-xs);
  padding: 0.35rem 0.6rem;
  margin: -0.5rem 0 0.75rem 0;
  animation: lg-fade-up 0.2s ease-out both;
}
.login-module .lg-caps.show { display: inline-flex; }
.login-module .lg-caps i { font-size: 0.9rem; }

/* ---- Submit button (plano) ---- */
.login-module .lg-submit {
  position: relative;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.85rem 1.25rem;
  margin-top: 0.4rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: white;
  background: var(--lg-brand);
  border: none;
  border-radius: var(--lg-radius-sm);
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(44, 28, 82, 0.20);
  transition: transform var(--lg-fast), box-shadow var(--lg-fast), background var(--lg-fast);
  animation: lg-fade-up 0.5s var(--lg-ease-out) both;
  animation-delay: 0.30s;
  font-family: inherit;
}
.login-module .lg-submit:hover:not(:disabled) {
  background: var(--lg-brand-light);
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -8px rgba(84, 51, 145, 0.45);
}
.login-module .lg-submit:active:not(:disabled) { transform: translateY(0); }
.login-module .lg-submit:disabled { cursor: not-allowed; opacity: 0.7; }
.login-module .lg-submit .content { position: relative; z-index: 2; display: inline-flex; align-items: center; gap: 0.55rem; }
.login-module .lg-submit .spinner {
  width: 1rem; height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: white;
  border-radius: 50%;
  animation: lg-spin 0.8s linear infinite;
}

/* ---- Divider ---- */
.login-module .lg-divider {
  display: flex; align-items: center; gap: 0.85rem;
  margin: 1.25rem 0 1rem 0;
  color: var(--lg-ink-faint);
  font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em;
  animation: lg-fade-up 0.5s var(--lg-ease-out) both;
  animation-delay: 0.35s;
}
.login-module .lg-divider::before, .login-module .lg-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--lg-line);
}

/* ---- Google button wrapper ---- */
.login-module .lg-google {
  display: flex; justify-content: center;
  animation: lg-fade-up 0.5s var(--lg-ease-out) both;
  animation-delay: 0.40s;
}
.login-module .lg-google > div { border-radius: var(--lg-radius-sm) !important; overflow: hidden; }

/* ---- Remember me + forgot ---- */
.login-module .lg-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  margin-top: 0.5rem;
  animation: lg-fade-up 0.5s var(--lg-ease-out) both;
  animation-delay: 0.28s;
}
.login-module .lg-remember {
  display: inline-flex; align-items: center; gap: 0.45rem;
  color: var(--lg-ink-soft);
  cursor: pointer;
  user-select: none;
  font-weight: 500;
}
.login-module .lg-remember input {
  position: absolute;
  width: 1px; height: 1px;
  opacity: 0;
  margin: 0;
  pointer-events: none;
}
.login-module .lg-remember .box {
  width: 1.05rem; height: 1.05rem;
  border-radius: var(--lg-radius-xs);
  background: var(--lg-surface);
  border: 1.5px solid var(--lg-line-strong);
  display: flex; align-items: center; justify-content: center;
  transition: all var(--lg-fast);
  flex-shrink: 0;
}
.login-module .lg-remember input:focus-visible + .box {
  border-color: var(--lg-brand);
  box-shadow: 0 0 0 3px rgba(84, 51, 145, 0.25);
}
.login-module .lg-remember input:checked + .box {
  background: var(--lg-brand);
  border-color: var(--lg-brand);
}
.login-module .lg-remember input:checked + .box::after {
  content: '\\F26B';
  font-family: 'bootstrap-icons';
  color: white;
  font-size: 0.68rem;
  font-weight: bold;
}
.login-module .lg-forgot {
  color: var(--lg-brand);
  font-weight: 600;
  text-decoration: none;
  transition: color var(--lg-fast);
  background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; font-size: inherit;
}
.login-module .lg-forgot:hover { color: var(--lg-brand-light); text-decoration: underline; }

/* ---- Security code section ---- */
.login-module .lg-code {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.9rem;
  background: rgba(245, 158, 11, 0.055);
  border: 1px solid rgba(245, 158, 11, 0.20);
  border-radius: var(--lg-radius-sm);
  animation: lg-fade-up 0.3s var(--lg-ease-out) both;
}
.login-module .lg-code .label-row {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.78rem; font-weight: 600; color: var(--lg-warn); margin-bottom: 0.5rem;
}
.login-module .lg-code .label-row i { margin-right: 0.35rem; }

/* ---- Trust indicators (footer) ---- */
.login-module .lg-trust {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem 1.1rem;
  margin-top: 1.5rem;
  padding-top: 1.15rem;
  border-top: 1px solid var(--lg-line);
  font-size: 0.7rem;
  color: var(--lg-ink-faint);
  font-weight: 500;
  animation: lg-fade-up 0.5s var(--lg-ease-out) both;
  animation-delay: 0.50s;
}
.login-module .lg-trust .item { display: inline-flex; align-items: center; gap: 0.3rem; }
.login-module .lg-trust i { color: var(--lg-ok); font-size: 0.85rem; }

/* ---- Success confirmation (reemplaza confeti) ---- */
.login-module .lg-success-overlay {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(250, 250, 251, 0.55);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  pointer-events: none;
  z-index: 9999;
  opacity: 0;
  transition: opacity var(--lg-normal);
}
.login-module .lg-success-overlay.show { opacity: 1; }
.login-module .lg-success-core {
  position: relative;
  width: 4rem; height: 4rem;
  background: var(--lg-ok);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white;
  font-size: 1.75rem;
  box-shadow: 0 12px 32px -8px rgba(15, 157, 107, 0.5);
  animation: lg-success-core 0.45s var(--lg-ease-out) both;
}

/* ---- Período: IconSelect editorial ---- */
/* El IconSelect ya aporta su propio icono, etiqueta y chevron.
   Ocultamos las decoraciones del .lg-field para no duplicar/solapar. */
.login-module .lg-field[data-field="periodo"] > .lg-field-icon,
.login-module .lg-field[data-field="periodo"] > .lg-label,
.login-module .lg-field[data-field="periodo"] > .lg-chevron { display: none; }

.login-module .icon-select-wrap { position: relative; width: 100%; }
.login-module .icon-select-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.85rem 0.9rem;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--lg-ink);
  background: var(--lg-surface);
  border: 1px solid var(--lg-line-strong);
  border-radius: var(--lg-radius-sm);
  text-align: left;
  cursor: pointer;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color var(--lg-fast), box-shadow var(--lg-fast);
}
.login-module .icon-select-btn:hover { border-color: var(--lg-brand); }
.login-module .icon-select-btn:focus,
.login-module .icon-select-btn.open {
  border-color: var(--lg-brand);
  box-shadow: 0 0 0 3px rgba(84, 51, 145, 0.13);
}
.login-module .icon-select-btn-icon,
.login-module .icon-select-option-icon {
  font-size: 1rem;
  color: var(--lg-brand);
  flex-shrink: 0;
  width: 1.15rem;
  text-align: center;
}
.login-module .icon-select-arrow {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--lg-ink-faint);
  transition: transform var(--lg-fast);
  flex-shrink: 0;
}
.login-module .icon-select-btn.open .icon-select-arrow { transform: rotate(180deg); }
.login-module .icon-select-placeholder { color: var(--lg-ink-faint); flex: 1; }
.login-module .icon-select-selected { flex: 1; color: var(--lg-ink); font-weight: 500; }

.login-module .icon-select-dropdown {
  position: absolute;
  top: 100%; left: 0; right: 0;
  z-index: 1051;
  background: var(--lg-surface);
  border: 1px solid var(--lg-line);
  border-radius: var(--lg-radius-sm);
  box-shadow: var(--lg-shadow-md);
  margin-top: 0.35rem;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height var(--lg-normal), opacity var(--lg-fast);
}
.login-module .icon-select-dropdown.open { opacity: 1; overflow-y: auto; }
.login-module .icon-select-dropdown.drop-up { top: auto; bottom: 100%; margin-top: 0; margin-bottom: 0.35rem; }
.login-module .icon-select-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.9rem;
  font-size: 0.88rem;
  color: var(--lg-ink);
  cursor: pointer;
  transition: background var(--lg-fast);
}
.login-module .icon-select-option:hover { background: rgba(84, 51, 145, 0.06); }
.login-module .icon-select-option.selected { background: rgba(84, 51, 145, 0.09); font-weight: 600; }
.login-module .icon-select-check { margin-left: auto; color: var(--lg-brand); font-size: 0.9rem; }
.login-module .icon-select-empty { padding: 0.6rem 0.9rem; font-size: 0.85rem; color: var(--lg-ink-faint); }

/* ---- Form error (inline, general/server) ---- */
.login-module .lg-form-error {
  display: none;
  align-items: center; gap: 0.5rem;
  padding: 0.7rem 0.85rem;
  background: rgba(220, 38, 38, 0.07);
  border: 1px solid rgba(220, 38, 38, 0.22);
  border-radius: var(--lg-radius-sm);
  font-size: 0.82rem;
  color: #b91c1c;
  font-weight: 600;
  margin-top: 0.6rem;
  animation: lg-fade-up 0.25s ease-out both;
}
.login-module .lg-form-error.show { display: flex; }
.login-module .lg-form-error i { font-size: 1rem; flex-shrink: 0; }
`;

let styleInjected = false;
let styleEl = null;

export function injectLoginStyles() {
  if (styleInjected) return;
  styleEl = document.createElement('style');
  styleEl.setAttribute('data-login-styles', '');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);
  styleInjected = true;
}
