import { endpoint } from '@config/endpoints.js';
import { auth } from '@services/auth.js';
import { $, delegate } from '@utils/dom.js';
import { alertError, alertSuccess, alertWarning } from '@utils/alert.js';
import { preloaded, waitFor } from '@services/preload.js';
import { IconSelect } from '@components/icon-select.js';
import { configService } from '@services/config.js';
import { devService } from '@services/dev.js';
import { refreshNavbar } from '@components/navbar.js';

// Aspectos por defecto para N10 (Autoevaluación) y N11 (Coevaluación).
// Si la fila no trae valor en `aspecto${n}`, se muestra este texto como pre-relleno
// en la vista de tarjetas y en el modal de edición. Al guardar el modal, el valor
// se persiste a todos los estudiantes (igual que con cualquier otro aspecto).
const ASPECTO_DEFAULTS = { 10: 'AutoEvaluación', 11: 'Coevaluación' };

const STYLE = document.createElement('style');
STYLE.textContent = `
/* ============================================================= *
 *  MÓDULO NOTAS — sistema de diseño autocontenido (namespaced)  *
 *  Glassmorphism + micro-interacciones. Marca #543391.          *
 *  Todo scopeado bajo .notas-module para aislamiento total.     *
 * ============================================================= */
/* .hidden debe ganar a los display:flex/fixed scopeados (JS togglea .hidden) */
.notas-module .hidden, .float-save-btn.hidden { display:none !important; }

.notas-module {
  /* Marca + complementarios */
  --nt-brand:#543391; --nt-brand-2:#7c3aed; --nt-brand-glow:#8b5cf6; --nt-brand-soft:#a78bfa;
  --nt-accent:#f59e0b; --nt-accent-2:#d97706;
  --nt-ok:#10b981; --nt-err:#ef4444; --nt-warn:#f59e0b; --nt-info:#0ea5e9;
  /* Superficies vidrio */
  --nt-glass:rgba(255,255,255,.62); --nt-glass-hi:rgba(255,255,255,.80); --nt-glass-lo:rgba(255,255,255,.45);
  --nt-border:rgba(255,255,255,.55); --nt-hairline:rgba(31,17,66,.08);
  --nt-ink:#1a1330; --nt-ink-soft:#5b5470;
  /* Profundidad */
  --nt-blur:20px; --nt-radius:24px; --nt-radius-sm:14px; --nt-radius-xs:10px;
  --nt-shadow:0 8px 32px rgba(31,17,66,.10), inset 0 1px 0 rgba(255,255,255,.6);
  --nt-shadow-md:0 14px 40px -12px rgba(84,51,145,.24), 0 2px 10px rgba(31,17,66,.05), inset 0 1px 0 rgba(255,255,255,.6);
  --nt-shadow-lg:0 28px 70px -18px rgba(84,51,145,.40), inset 0 1px 0 rgba(255,255,255,.7);
  /* Movimiento (transform + opacity only) */
  --nt-fast:150ms cubic-bezier(.4,0,.2,1);
  --nt-normal:250ms cubic-bezier(.4,0,.2,1);
  --nt-slow:350ms cubic-bezier(.4,0,.2,1);
  --nt-spring:.45s cubic-bezier(.34,1.56,.64,1);
  font-family:'Inter',system-ui,sans-serif;
}

/* ---- Keyframes ---- */
@keyframes nt-fadeInUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes nt-scaleIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
@keyframes nt-slideIn  { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:translateX(0)} }
@keyframes nt-fadeIn   { from{opacity:0} to{opacity:1} }
@keyframes nt-barGrow  { from{opacity:0;transform:scaleX(.2);transform-origin:left} to{opacity:1;transform:scaleX(1)} }
@keyframes nt-shimmer  { 0%{background-position:-460px 0} 100%{background-position:460px 0} }
@keyframes nt-pulse    { 0%,100%{box-shadow:var(--nt-fab-shadow),0 0 0 0 rgba(124,58,237,.45)} 50%{box-shadow:var(--nt-fab-shadow),0 0 0 12px rgba(124,58,237,0)} }
@keyframes nt-spin     { to{transform:rotate(360deg)} }
@keyframes nt-checkPop { 0%{transform:scale(0)} 60%{transform:scale(1.25)} 100%{transform:scale(1)} }

/* ---- Cabecera ---- */
.notas-module .nt-heading {
  font-family:'Bricolage Grotesque','Inter',sans-serif;
  font-size:1.6rem; font-weight:800; letter-spacing:-.03em; color:var(--nt-ink);
  display:inline-flex; align-items:center; gap:.7rem; margin-bottom:1.25rem;
  animation:nt-fadeInUp .5s var(--nt-spring) both;
}
.notas-module .nt-heading i {
  font-size:1.5rem;
  background:linear-gradient(135deg,var(--nt-brand),var(--nt-brand-glow));
  -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
  filter:drop-shadow(0 3px 8px rgba(84,51,145,.30));
}

/* ---- Tarjeta glass ---- */
.notas-module .nt-card {
  position:relative; overflow:visible;
  background:var(--nt-glass);
  -webkit-backdrop-filter:blur(var(--nt-blur)) saturate(180%);
  backdrop-filter:blur(var(--nt-blur)) saturate(180%);
  border:1px solid var(--nt-border);
  border-radius:var(--nt-radius);
  box-shadow:var(--nt-shadow-md);
  padding:1.25rem 1.5rem;
  animation:nt-fadeInUp .55s var(--nt-spring) both;
}
.notas-module .nt-card::before {
  content:''; position:absolute; inset:0; pointer-events:none; border-radius:inherit;
  background:linear-gradient(135deg,rgba(124,58,237,.08),transparent 55%);
}
.notas-module .nt-card > * { position:relative; }
.notas-module .nt-card--delay { animation-delay:.08s; }

.notas-module .nt-docente-name {
  font-family:'Bricolage Grotesque','Inter',sans-serif;
  font-size:1.05rem; font-weight:700; color:var(--nt-ink); letter-spacing:-.01em;
}
.notas-module .nt-asig-label {
  text-align:center; font-size:.9rem; font-weight:600; color:var(--nt-ink-soft);
  padding:.4rem .9rem; border-radius:999px; display:inline-block;
  background:rgba(124,58,237,.08); border:1px solid rgba(124,58,237,.14);
}
.notas-module .nt-asig-wrap { text-align:center; margin:.6rem 0; min-height:1px; }

/* ---- Botón seleccionar docente ---- */
.notas-module .nt-btn-primary {
  display:inline-flex; align-items:center; gap:.4rem;
  padding:.55rem 1.1rem; min-height:44px; font-size:.85rem; font-weight:600; color:#fff;
  border:none; border-radius:var(--nt-radius-sm); cursor:pointer;
  background:linear-gradient(135deg,var(--nt-brand),var(--nt-brand-2));
  box-shadow:0 8px 22px -8px rgba(84,51,145,.55), inset 0 1px 0 rgba(255,255,255,.25);
  transition:transform var(--nt-fast), box-shadow var(--nt-fast), filter var(--nt-fast);
}
.notas-module .nt-btn-primary:hover { transform:translateY(-2px); filter:brightness(1.06); box-shadow:0 12px 30px -8px rgba(84,51,145,.6), inset 0 1px 0 rgba(255,255,255,.3); }
.notas-module .nt-btn-primary:active { transform:translateY(0) scale(.97); }
.notas-module .nt-btn-accent { background:linear-gradient(135deg,var(--nt-accent),var(--nt-accent-2)); box-shadow:0 8px 22px -8px rgba(245,158,11,.55), inset 0 1px 0 rgba(255,255,255,.25); }

/* ---- Toast / aviso ---- */
.notas-module .nt-toast {
  display:flex; align-items:center; justify-content:space-between; gap:.75rem;
  padding:.8rem 1rem; margin-bottom:1rem; border-radius:var(--nt-radius-sm);
  font-size:.85rem; font-weight:500; color:var(--nt-accent-2);
  background:linear-gradient(135deg,rgba(245,158,11,.14),rgba(245,158,11,.06));
  border:1px solid rgba(245,158,11,.28);
  -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px);
  box-shadow:0 6px 20px -10px rgba(245,158,11,.4);
  animation:nt-fadeInUp .4s var(--nt-spring) both;
}
.notas-module .nt-toast i.nt-toast-ico { font-size:1.1rem; }
.notas-module .nt-toast-close { color:rgba(217,119,6,.6); background:none; border:none; cursor:pointer; padding:.2rem; min-width:44px; min-height:44px; display:inline-flex; align-items:center; justify-content:center; transition:color var(--nt-fast),transform var(--nt-fast); }
.notas-module .nt-toast-close:hover { color:var(--nt-accent-2); transform:scale(1.15); }

/* ---- Select materia (label) ---- */
.notas-module .nt-field-label {
  display:block; font-size:.7rem; font-weight:700; text-transform:uppercase;
  letter-spacing:.08em; color:var(--nt-brand); margin-bottom:.5rem;
}
.notas-module .nt-menu-empty { font-size:.85rem; color:var(--nt-ink-soft); padding:.5rem 0; }

/* ---- Barra de porcentajes segmentada ---- */
.notas-module .notas-percent-bar {
  display:flex; width:100%; height:34px; border-radius:var(--nt-radius-xs);
  overflow:hidden; font-size:11px; font-weight:700; margin:.9rem 0 .2rem;
  box-shadow:inset 0 1px 3px rgba(31,17,66,.12), 0 2px 8px -3px rgba(31,17,66,.18);
}
.notas-module .notas-percent-bar > div {
  display:flex; align-items:center; justify-content:center; position:relative;
  color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.22); cursor:default;
  animation:nt-barGrow .6s var(--nt-spring) both;
  transition:filter var(--nt-fast);
}
.notas-module .notas-percent-bar > div:nth-child(1){ animation-delay:.05s; background:linear-gradient(135deg,#22c55e,#16a34a); }
.notas-module .notas-percent-bar > div:nth-child(2){ animation-delay:.11s; background:linear-gradient(135deg,#fb923c,#ea580c); }
.notas-module .notas-percent-bar > div:nth-child(3){ animation-delay:.17s; background:linear-gradient(135deg,#60a5fa,#2563eb); }
.notas-module .notas-percent-bar > div:nth-child(4){ animation-delay:.23s; background:linear-gradient(135deg,#f87171,#dc2626); }
.notas-module .notas-percent-bar > div:nth-child(5){ animation-delay:.29s; background:linear-gradient(135deg,#facc15,#d97706); }
.notas-module .notas-percent-bar > div:hover { filter:brightness(1.08); }
.notas-module .notas-percent-bar > div .nt-pct-cat { margin-right:.3rem; }
.notas-module .notas-percent-bar > div .nt-pct-val,
.notas-module .notas-percent-bar > div .nt-pct-cat { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.notas-module .notas-percent-bar > div[data-tip]::after {
  content:attr(data-tip); position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%) translateY(4px);
  background:var(--nt-ink); color:#fff; font-size:11px; font-weight:600; white-space:nowrap;
  padding:.35rem .6rem; border-radius:8px; opacity:0; pointer-events:none;
  box-shadow:0 8px 20px -6px rgba(0,0,0,.4); transition:opacity var(--nt-fast),transform var(--nt-fast); z-index:5;
}
.notas-module .notas-percent-bar > div[data-tip]::before {
  content:''; position:absolute; bottom:calc(100% + 3px); left:50%; transform:translateX(-50%);
  border:5px solid transparent; border-top-color:var(--nt-ink); opacity:0; transition:opacity var(--nt-fast); z-index:5;
}
.notas-module .notas-percent-bar > div[data-tip]:hover::after { opacity:1; transform:translateX(-50%) translateY(0); }
.notas-module .notas-percent-bar > div[data-tip]:hover::before { opacity:1; }

/* ---- Tabla Tabulator (panel glass) ---- */
.notas-module .notas-table-glass {
  background:var(--nt-glass);
  -webkit-backdrop-filter:blur(var(--nt-blur)) saturate(180%);
  backdrop-filter:blur(var(--nt-blur)) saturate(180%);
  border:1px solid var(--nt-border); border-radius:var(--nt-radius);
  box-shadow:var(--nt-shadow-md); padding:.5rem;
  overflow-x:auto; animation:nt-fadeInUp .5s var(--nt-spring) both;
}
.notas-module .tabulator { background:transparent; border:none; font-family:'Inter',sans-serif; border-radius:var(--nt-radius-sm); }
.notas-module .tabulator .tabulator-header {
  background:rgba(84,51,145,.07); border-bottom:1px solid var(--nt-hairline);
  -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px);
}
.notas-module .tabulator .tabulator-header .tabulator-col { background:transparent; border-right:1px solid rgba(31,17,66,.05); }
.notas-module .tabulator .tabulator-header .tabulator-col .tabulator-col-title {
  font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--nt-brand);
}
.notas-module .tabulator .tabulator-row { border-bottom:1px solid rgba(31,17,66,.05); transition:background var(--nt-fast); }
.notas-module .tabulator .tabulator-row:hover { background:rgba(139,92,246,.08); }
.notas-module .tabulator .tabulator-cell { border-right:1px solid rgba(31,17,66,.04); font-size:.85rem; }
/* Celda editable: indicador visual sutil (no pisa colores inline de formatRow) */
.notas-module .tabulator .tabulator-cell.tabulator-editable:not(.tabulator-editing) { cursor:text; box-shadow:inset 0 0 0 1px rgba(84,51,145,.10); }
.notas-module .tabulator .tabulator-cell.tabulator-editable:not(.tabulator-editing):hover { box-shadow:inset 0 0 0 1.5px rgba(124,58,237,.45); }
.notas-module .tabulator .tabulator-cell.tabulator-editing { box-shadow:inset 0 0 0 2px var(--nt-brand-glow); border-radius:6px; }
/* Quitar spinners (up/down) de inputs number usados por el editor de Tabulator */
.notas-module .tabulator input[type="number"]::-webkit-inner-spin-button,
.notas-module .tabulator input[type="number"]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
.notas-module .tabulator input[type="number"] { -moz-appearance:textfield; appearance:textfield; }
.notas-module .tabulator .tabulator-col.tabulator-sortable .tabulator-col-title { padding-right:0; }

/* Scrollbar interno */
.notas-module .notas-table-glass::-webkit-scrollbar,
.notas-module .tabulator-tableholder::-webkit-scrollbar { width:8px; height:8px; }
.notas-module .tabulator-tableholder::-webkit-scrollbar-thumb { background:rgba(84,51,145,.22); border-radius:4px; }
.notas-module .tabulator-tableholder::-webkit-scrollbar-thumb:hover { background:rgba(84,51,145,.4); }

/* ---- Botones flotantes (FAB) ---- */
.notas-module .float-save-btn, .float-save-btn {
  position:fixed; bottom:2rem; right:2rem; width:58px; height:58px;
  border:none; color:#fff; border-radius:18px; z-index:2500; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:transform var(--nt-spring), filter var(--nt-fast);
}
.float-save-btn--primary { --nt-fab-shadow:0 14px 34px -8px rgba(84,51,145,.6), inset 0 1px 0 rgba(255,255,255,.3); background:linear-gradient(135deg,var(--nt-brand,#543391),var(--nt-brand-2,#7c3aed)); box-shadow:var(--nt-fab-shadow); animation:nt-pulse 2.6s ease-in-out infinite; }
.float-save-btn--accent { --nt-fab-shadow:0 14px 34px -8px rgba(245,158,11,.6), inset 0 1px 0 rgba(255,255,255,.3); background:linear-gradient(135deg,#f59e0b,#d97706); box-shadow:var(--nt-fab-shadow); }
.float-save-btn:hover { transform:translateY(-4px) scale(1.06); filter:brightness(1.07); }
.float-save-btn:active { transform:scale(.94); }
.float-save-btn:focus-visible { outline:none; box-shadow:var(--nt-fab-shadow),0 0 0 4px rgba(139,92,246,.4); }

/* ---- Modales glass ---- */
.notas-module .nt-modal-overlay {
  position:fixed; inset:0; z-index:3000; display:flex; align-items:center; justify-content:center;
  background:rgba(26,19,48,.42); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);
  animation:nt-fadeIn .25s ease both; padding:1rem;
}
.notas-module .nt-modal {
  width:100%; max-width:28rem; overflow:visible;
  background:var(--nt-glass-hi);
  -webkit-backdrop-filter:blur(24px) saturate(180%); backdrop-filter:blur(24px) saturate(180%);
  border:1px solid var(--nt-border); border-radius:var(--nt-radius);
  box-shadow:var(--nt-shadow-lg);
  animation:nt-scaleIn .4s var(--nt-spring) both;
}
.notas-module .nt-modal--lg { max-width:34rem; }
.notas-module .nt-modal-head {
  display:flex; align-items:center; justify-content:space-between;
  padding:1.1rem 1.4rem; border-bottom:1px solid var(--nt-hairline);
  background:linear-gradient(135deg,rgba(84,51,145,.12),rgba(124,58,237,.04));
  border-radius:var(--nt-radius) var(--nt-radius) 0 0;
}
.notas-module .nt-modal-title {
  font-family:'Bricolage Grotesque','Inter',sans-serif; font-weight:700; font-size:1.1rem;
  color:var(--nt-ink); display:flex; align-items:center; gap:.55rem;
}
.notas-module .nt-modal-title i { color:var(--nt-brand); }
.notas-module .nt-modal-close {
  width:44px; height:44px; display:flex; align-items:center; justify-content:center;
  border:none; border-radius:var(--nt-radius-xs); background:rgba(31,17,66,.05); color:var(--nt-ink-soft);
  cursor:pointer; transition:background var(--nt-fast),color var(--nt-fast),transform var(--nt-fast);
}
.notas-module .nt-modal-close:hover { background:rgba(239,68,68,.12); color:var(--nt-err); transform:rotate(90deg); }
.notas-module .nt-modal-body { padding:1.4rem; }
.notas-module .nt-modal-foot {
  display:flex; align-items:center; justify-content:flex-end; gap:.6rem;
  padding:1rem 1.4rem; background:rgba(255,255,255,.35); border-top:1px solid var(--nt-hairline);
  border-radius:0 0 var(--nt-radius) var(--nt-radius);
}
.notas-module .nt-btn-ghost {
  padding:.5rem 1rem; font-size:.85rem; font-weight:600; color:var(--nt-ink-soft);
  background:rgba(31,17,66,.05); border:none; border-radius:var(--nt-radius-xs); cursor:pointer;
  transition:background var(--nt-fast),color var(--nt-fast);
}
.notas-module .nt-btn-ghost:hover { background:rgba(31,17,66,.1); color:var(--nt-ink); }

/* ---- Inputs form aspecto ---- */
.notas-module .nt-input-label { display:block; font-size:.8rem; font-weight:600; color:var(--nt-ink-soft); margin-bottom:.35rem; }
.notas-module .nt-field { margin-bottom:1rem; }
.notas-module .custom-select, .notas-module input.custom-select, .notas-module textarea.custom-select {
  width:100%; padding:.6rem .85rem; font-size:.9rem; color:var(--nt-ink);
  background:var(--nt-glass-hi); border:1px solid rgba(31,17,66,.12); border-radius:var(--nt-radius-xs);
  transition:border-color var(--nt-fast), box-shadow var(--nt-fast), background var(--nt-fast);
}
.notas-module .custom-select::placeholder { color:rgba(91,84,112,.55); }
.notas-module .custom-select:hover { border-color:var(--nt-brand-soft); }
.notas-module .custom-select:focus { outline:none; border-color:var(--nt-brand-glow); background:#fff; box-shadow:0 0 0 3px rgba(139,92,246,.18); }
/* Quitar spinners (up/down) de inputs number en cualquier input del módulo */
.notas-module input[type="number"]::-webkit-inner-spin-button,
.notas-module input[type="number"]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
.notas-module input[type="number"] { -moz-appearance:textfield; appearance:textfield; }
/* Campo deshabilitado */
.notas-module .custom-select:disabled,
.notas-module .custom-select[disabled] {
  background:rgba(31,17,66,.04);
  color:rgba(91,84,112,.55);
  cursor:not-allowed;
  opacity:.7;
  font-style:italic;
}

/* ---- Modal de Configuración de Porcentajes ---- */
.notas-module .nt-config-grid {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:.85rem;
  margin-bottom:1rem;
}
.notas-module .nt-config-field { display:flex; flex-direction:column; gap:.35rem; }
.notas-module .nt-config-field .nt-config-cat {
  font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
  color:var(--nt-brand);
}
.notas-module .nt-config-field .nt-config-range {
  font-size:.7rem; color:var(--nt-ink-soft); font-weight:500;
}
.notas-module .nt-config-sum {
  display:flex; align-items:center; justify-content:space-between; gap:.75rem;
  padding:.75rem 1rem; border-radius:var(--nt-radius-xs);
  background:rgba(124,58,237,.06); border:1px solid rgba(124,58,237,.18);
  font-size:.85rem; font-weight:600; color:var(--nt-ink);
  margin-bottom:1rem;
}
.notas-module .nt-config-sum.ok { background:rgba(16,185,129,.10); border-color:rgba(16,185,129,.30); color:#047857; }
.notas-module .nt-config-sum.bad { background:rgba(239,68,68,.10); border-color:rgba(239,68,68,.30); color:#b91c1c; }
.notas-module .nt-config-sum .nt-config-sum-val { font-family:'Bricolage Grotesque','Inter',sans-serif; font-size:1.05rem; font-weight:800; }
.notas-module .nt-config-meta {
  display:flex; flex-wrap:wrap; gap:.5rem 1rem; font-size:.75rem; color:var(--nt-ink-soft);
  margin-bottom:.85rem; padding-bottom:.75rem; border-bottom:1px dashed var(--nt-hairline);
}
.notas-module .nt-config-meta i { color:var(--nt-brand); margin-right:.25rem; }
@media (max-width:540px) { .notas-module .nt-config-grid { grid-template-columns:1fr; } }

/* ---- Spinners / carga ---- */
.notas-module .nt-spinner {
  width:34px; height:34px; border-radius:50%;
  border:3px solid rgba(84,51,145,.15); border-top-color:var(--nt-brand);
  animation:nt-spin .8s linear infinite;
}
.notas-module .nt-loading { display:flex; justify-content:center; padding:2rem 0; }
.notas-module .nt-save-spinner { width:20px; height:20px; border-radius:50%; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; animation:nt-spin .7s linear infinite; }

/* ---- Skeleton ---- */
.notas-module .nt-skeleton {
  border-radius:var(--nt-radius-sm); height:44px; margin:.4rem 0;
  background:linear-gradient(90deg,rgba(84,51,145,.06) 25%,rgba(124,58,237,.14) 50%,rgba(84,51,145,.06) 75%);
  background-size:920px 100%; animation:nt-shimmer 1.4s linear infinite;
}

/* ---- Responsive ---- */
@media (max-width:640px) {
  .notas-module .nt-heading { font-size:1.3rem; }
  .notas-module .nt-modal-overlay { padding:0; }
  .notas-module .nt-modal { max-width:100%; height:100%; border-radius:0; display:flex; flex-direction:column; }
  .notas-module .nt-modal-body { flex:1; overflow-y:auto; }
  /* FABs: tener en cuenta safe-area de iOS (notch/home indicator) */
  .float-save-btn {
    bottom: max(1rem, env(safe-area-inset-bottom, 0px) + 0.5rem);
    width:52px; height:52px;
  }
  .float-save-btn--primary { right: max(1rem, env(safe-area-inset-right, 0px) + 0.5rem); }
  .float-save-btn--accent { right: calc(max(1rem, env(safe-area-inset-right, 0px) + 0.5rem) + 62px); }
  .notas-module .notas-percent-bar { height:40px; font-size:11px; }
  /* Barra: en móvil solo el %, ocultar categoría (tramos 5% no caben el texto) */
  .notas-module .notas-percent-bar > div .nt-pct-cat { display:none; }
  .notas-module .notas-percent-bar > div .nt-pct-val { margin:0; }
  /* Cabecera: botones a ancho completo apilados para no verse apretados al envolver */
  .notas-module #notasCoordiActions,
  .notas-module #notasConfigActions { flex:1 1 100%; }
  .notas-module #notasCoordiActions .nt-btn-primary,
  .notas-module #notasConfigActions .nt-btn-primary { width:100%; justify-content:center; }

  /* ---- Vista tarjetas (móvil) ---- */
  .notas-module .nt-cards, .notas-module .nt-cards * { box-sizing:border-box; }
  .notas-module .nt-cards { display:flex; flex-direction:column; gap:0.75rem; padding-bottom:5rem; width:100%; max-width:100%; overflow-x:hidden; }
  .notas-module .nt-card-grade {
    width:100%; max-width:100%;
    background:rgba(255,255,255,0.92); border:1px solid rgba(84,51,145,0.14);
    border-radius:14px; box-shadow:0 2px 10px rgba(84,51,145,0.08); overflow:hidden;
  }
  .notas-module .nt-card-head {
    display:flex; align-items:center; justify-content:space-between; gap:0.5rem;
    padding:0.6rem 0.75rem; background:linear-gradient(135deg,#543391,#6b46b8); color:#fff;
  }
  .notas-module .nt-card-name { flex:1; min-width:0; font-weight:600; font-size:0.9rem; line-height:1.2; overflow-wrap:anywhere; }
  .notas-module .nt-card-def {
    flex:0 0 auto; min-width:44px; min-height:44px; padding:0 0.6rem; border-radius:22px;
    display:inline-flex; align-items:center; justify-content:center;
    font-weight:700; font-size:0.95rem; font-variant-numeric:tabular-nums; color:#fff;
  }
  .notas-module .nt-def-ok    { background:#16a34a; }
  .notas-module .nt-def-bad   { background:#dc2626; }
  .notas-module .nt-def-empty { background:rgba(255,255,255,0.25); }
  .notas-module .nt-card-body { padding:0.6rem 0.75rem; display:flex; flex-direction:column; gap:0.55rem; }
  .notas-module .nt-card-group {
    border-radius:10px; padding:0.5rem 0.55rem;
    display:flex; flex-direction:column; gap:0.4rem;
  }
  .notas-module .nt-g-saber  { background:#e7ffe7; }
  .notas-module .nt-g-hacer  { background:#ffeee1; }
  .notas-module .nt-g-ser    { background:#f0f5ff; }
  .notas-module .nt-g-autoev { background:#ffd5d6; }
  .notas-module .nt-g-coev   { background:#fffad6; }
  .notas-module .nt-group-label {
    font-size:0.68rem; font-weight:700; letter-spacing:0.03em; color:#543391;
  }
  .notas-module .nt-group-inputs { display:flex; gap:0.4rem; width:100%; }
  .notas-module .nt-grade-cell { display:flex; flex-direction:column; gap:0.2rem; flex:1 1 0; min-width:0; }
  .notas-module .nt-grade-input {
    flex:1 1 0; min-width:0; width:100%; min-height:44px; text-align:center;
    font-size:1rem; font-variant-numeric:tabular-nums;
    border:1px solid rgba(84,51,145,0.25); border-radius:8px; background:#fff; color:#1f2937;
  }
  /* Botón de aspecto (debajo del input): muestra el texto del aspecto, tap → modal */
  .notas-module .nt-grade-aspect {
    font-size:0.62rem; line-height:1.2; padding:0.2rem 0.4rem; min-height:30px;
    background:rgba(84,51,145,0.05); border:1px solid rgba(84,51,145,0.14);
    border-radius:6px; color:var(--nt-ink-soft);
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    cursor:pointer; text-align:left;
    transition:background var(--nt-fast),color var(--nt-fast);
    -webkit-tap-highlight-color:transparent;
  }
  .notas-module .nt-grade-aspect:hover { background:rgba(84,51,145,0.12); color:var(--nt-ink); }
  .notas-module .nt-grade-aspect:active { background:rgba(84,51,145,0.18); }
  .notas-module .nt-grade-aspect.is-empty {
    color:rgba(84,51,145,0.45); font-style:italic;
    background:transparent; border-style:dashed;
  }
  .notas-module .nt-grade-aspect.is-empty:hover { background:rgba(84,51,145,0.06); }
  /* Etiqueta estática para aspectos auto-asignados (N10/N11): no es botón, no editable */
  .notas-module .nt-grade-aspect-static {
    font-size:0.62rem; line-height:1.2; padding:0.2rem 0.4rem; min-height:30px;
    background:transparent; border:1px solid transparent;
    border-radius:6px; color:rgba(84,51,145,0.65); font-style:italic;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    text-align:left; cursor:default; user-select:none;
  }
  /* AUTOEV/COEV: un solo input, flexible pero acotado para que se vea consistente
     con los grupos de 3 inputs (mismo ancho visual aproximado) */
  .notas-module .nt-g-autoev .nt-grade-cell,
  .notas-module .nt-g-coev .nt-grade-cell { flex:1 1 0; max-width:80px; min-width:60px; }
  .notas-module .nt-grade-input:focus { outline:none; border-color:#543391; box-shadow:0 0 0 2px rgba(84,51,145,0.25); }
  .notas-module .nt-grade-input:disabled { background:rgba(0,0,0,0.04); color:#6b7280; }
  .notas-module .nt-input-invalid { border-color:#dc2626 !important; box-shadow:0 0 0 2px rgba(220,38,38,0.25); }
  /* Nota baja (<3.0): texto rojo + bold para destacar visualmente */
  .notas-module .nt-grade-input.is-low { color:#dc2626 !important; font-weight:700; background:#fef2f2; }
  .notas-module .nt-grade-input.is-low:focus { background:#fff; }
}

/* ---- Accesibilidad ---- */
.notas-module :focus-visible { outline:none; box-shadow:0 0 0 3px rgba(139,92,246,.45); border-radius:6px; }
@media (prefers-reduced-motion:reduce) {
  .notas-module *, .float-save-btn { animation:none !important; transition:none !important; }
}
`;
document.head.appendChild(STYLE);

class NotasModule {
  constructor() {
    this.table = null;
    this.currentDocente = '';
    this.currentNivel = '';
    this.currentNumero = '';
    this.currentAsignatura = '';
    this.currentPeriodo = '';
    this.DatosDocente = [];
    this.datosTabla = [];
    this.datosTablai = [];
    this._porcentajes = null;
    this._porcentajesYear = null;
    this._porcentajesMeta = { actualizado_por: null, actualizado_en: null };

    this.headerMenu = [
      {
        label: 'Aspectos',
        action: (e, column) => this.openAspectosModal(column),
      },
    ];

    document.addEventListener('app:authenticated', () => this.onAuth());
    document.addEventListener('click', (e) => this.handleClick(e));
  }

  async getCurrentPeriodo() {
    try {
      const resp = await fetch(endpoint('/getPeriodosNotas.php'));
      const periodos = await resp.json();
      const p = periodos.find((p) => p.selected === 'selected');
      return p ? p.nombre : '1';
    } catch {
      return '1';
    }
  }

  onAuth() {
    const user = auth.getUser();
    if (!user) return;
    if (this._rendered) return;
    this._rendered = true;
    this.renderUI();
  }

  renderUI() {
    const section = $('seccionNotas');
    if (!section) return;
    section.classList.add('notas-module');
    const user = auth.getUser();
    const isMaestra = auth.isMaestra() || auth.isCoordinador();
    const isAccesoTotal = auth.isAccesoTotal();
    this._selectedDocenteAsignacion = user?.asignacion || '';
    this._checkDevMode();
    const p = this._porcentajes || { porcentaje_saber: 35, porcentaje_hacer: 35, porcentaje_ser: 20, porcentaje_autoev: 5, porcentaje_coev: 5 };

    section.innerHTML = `
      <h2 class="nt-heading">
        <i class="bi bi-journal-text"></i> Registrar Notas
      </h2>
      <div class="nt-toast hidden" role="alert" id="notasAlert">
        <span class="flex items-center gap-2"><i class="bi bi-info-circle nt-toast-ico"></i><span id="notasAviso"></span></span>
        <button type="button" class="nt-toast-close" onclick="this.closest('#notasAlert').classList.add('hidden')" aria-label="Cerrar aviso">
          <i class="bi bi-x-lg text-xs"></i>
        </button>
      </div>
      <div id="notasMenuContainer" class="mb-4"></div>
      <div class="nt-card nt-card--delay mb-4" style="z-index:1">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
          <span id="notasDocenteNombre" class="nt-docente-name">${user.nombres || ''}</span>
          <div class="flex items-center flex-wrap gap-2" style="position:relative;z-index:2">
            <div id="notasCoordiActions" class="${isMaestra ? '' : 'hidden'}">
              <button type="button" id="btnSelDocente" class="nt-btn-primary nt-btn-accent">
                <i class="bi bi-person-plus"></i>Seleccionar Docente
              </button>
            </div>
            <div id="notasConfigActions">
              <button type="button" id="btnConfigPorcentajes" class="nt-btn-primary" title="${isAccesoTotal ? 'Configurar porcentajes de notas' : 'Requiere acceso_total=S en tu usuario'}" style="background:linear-gradient(135deg,#0ea5e9,#0369a1);box-shadow:0 8px 22px -8px rgba(14,165,233,.55), inset 0 1px 0 rgba(255,255,255,.25);${!isAccesoTotal ? 'opacity:0.55;' : ''}">
                <i class="bi ${isAccesoTotal ? 'bi-sliders2-vertical' : 'bi-shield-lock'}"></i>Configurar %
              </button>
            </div>
          </div>
        </div>
        <div class="nt-asig-wrap"><span id="notasAsignaturaLabel" class="nt-asig-label" style="display:none"></span></div>
        <div class="notas-percent-bar hidden" id="notasPercentBar">
          <div style="flex:0 0 ${p.porcentaje_saber}%" data-tip="SABER — ${p.porcentaje_saber}% (3 notas)"><span class="nt-pct-cat">SABER</span><span class="nt-pct-val">${p.porcentaje_saber}%</span></div>
          <div style="flex:0 0 ${p.porcentaje_hacer}%" data-tip="HACER — ${p.porcentaje_hacer}% (3 notas)"><span class="nt-pct-cat">HACER</span><span class="nt-pct-val">${p.porcentaje_hacer}%</span></div>
          <div style="flex:0 0 ${p.porcentaje_ser}%" data-tip="SER — ${p.porcentaje_ser}% (3 notas)"><span class="nt-pct-cat">SER</span><span class="nt-pct-val">${p.porcentaje_ser}%</span></div>
          <div style="flex:0 0 ${p.porcentaje_autoev}%" data-tip="AUTOEVALUACIÓN — ${p.porcentaje_autoev}%"><span class="nt-pct-cat">AUTOEV</span><span class="nt-pct-val">${p.porcentaje_autoev}%</span></div>
          <div style="flex:0 0 ${p.porcentaje_coev}%" data-tip="COEVALUACIÓN — ${p.porcentaje_coev}%"><span class="nt-pct-cat">COEV</span><span class="nt-pct-val">${p.porcentaje_coev}%</span></div>
        </div>
      </div>
      <div id="notasTableContainer" class="w-full"></div>
      <button class="float-save-btn float-save-btn--primary hidden" id="notasSaveBtn" aria-label="Guardar notas">
        <i class="bi bi-floppy" style="font-size:1.4rem"></i>
        <div class="nt-save-spinner" id="notasSaveSpinner" style="display:none"></div>
      </button>
      <button class="float-save-btn float-save-btn--accent hidden" id="notasCalcBtn" style="right:102px" aria-label="Recalcular totales">
        <i class="bi bi-calculator" style="font-size:1.4rem"></i>
      </button>
      <div id="notasLoading" class="hidden nt-loading">
        <div class="nt-spinner"></div>
      </div>
      <div id="notasModalContainer" class="hidden nt-modal-overlay">
        <div class="nt-modal">
          <div class="nt-modal-head">
            <h5 class="nt-modal-title">
              <i class="bi bi-person-badge"></i> Seleccionar Docente
            </h5>
            <button type="button" class="nt-modal-close" id="notasModalClose" aria-label="Cerrar">
              <i class="bi bi-x-lg text-sm"></i>
            </button>
          </div>
          <div class="nt-modal-body">
            <div class="nt-loading" id="notasModalLoading">
              <div class="nt-spinner"></div>
            </div>
            <select id="notasModalSelect" class="hidden" style="display:none"></select>
            <div id="notasModalSelectWrap"></div>
          </div>
          <div class="nt-modal-foot">
            <button type="button" class="nt-btn-ghost" id="notasModalCancel">Cancelar</button>
            <button type="button" class="nt-btn-primary hidden" id="notasModalAccept">
              <i class="bi bi-check-lg"></i>Seleccionar
            </button>
          </div>
        </div>
      </div>
      <div id="notasModalAspecto" class="hidden nt-modal-overlay">
        <div class="nt-modal nt-modal--lg">
          <div class="nt-modal-head">
            <h5 class="nt-modal-title" id="notasModalAspectoTitle"><i class="bi bi-list-check"></i>Aspecto</h5>
            <button type="button" class="nt-modal-close" id="notasModalAspectoClose" aria-label="Cerrar">
              <i class="bi bi-x-lg text-sm"></i>
            </button>
          </div>
          <div class="nt-modal-body">
            <form id="frmAspecto">
              <div class="nt-field">
                <label class="nt-input-label">Porcentaje</label>
                <input type="number" name="porcentaje" class="custom-select" min="1" max="100" inputmode="numeric" placeholder="No disponible por ahora" disabled title="Configuración de porcentajes disponible en futuras versiones">
              </div>
              <div class="nt-field">
                <label class="nt-input-label">Aspecto</label>
                <textarea name="aspecto" rows="3" class="custom-select" style="resize:vertical" placeholder="Descripción del aspecto evaluado"></textarea>
              </div>
              <div class="nt-field">
                <label class="nt-input-label">Fecha</label>
                <input type="date" name="fecha" class="custom-select">
              </div>
            </form>
          </div>
          <div class="nt-modal-foot">
            <button type="button" class="nt-btn-ghost" id="notasModalAspectoCancel">Cerrar</button>
            <button type="button" class="nt-btn-primary" id="notasModalAspectoAccept">
              <i class="bi bi-check-lg"></i>Guardar Aspecto
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Configuración de Porcentajes (solo acceso_total='S') -->
      <div id="notasModalConfig" class="hidden nt-modal-overlay">
        <div class="nt-modal nt-modal--lg">
          <div class="nt-modal-head">
            <h5 class="nt-modal-title">
              <i class="bi bi-sliders2-vertical"></i> Configurar Porcentajes
            </h5>
            <button type="button" class="nt-modal-close" id="notasModalConfigClose" aria-label="Cerrar">
              <i class="bi bi-x-lg text-sm"></i>
            </button>
          </div>
          <div class="nt-modal-body">
            <div class="nt-config-meta">
              <span><i class="bi bi-calendar3"></i>Año: <strong id="ntConfigYear"></strong></span>
              <span id="ntConfigMetaPor" class="hidden"><i class="bi bi-person-check"></i>Modificado por: <strong id="ntConfigMetaPorVal"></strong></span>
              <span id="ntConfigMetaEn" class="hidden"><i class="bi bi-clock-history"></i>Fecha: <strong id="ntConfigMetaEnVal"></strong></span>
            </div>
            <form id="frmConfigPorcentajes" autocomplete="off">
              <div class="nt-config-grid">
                <div class="nt-config-field">
                  <span class="nt-config-cat">SABER (N1–N3)</span>
                  <input type="number" name="porcentaje_saber" class="custom-select" min="0" max="100" step="0.5" inputmode="decimal">
                  <span class="nt-config-range">Aplica a N1, N2, N3</span>
                </div>
                <div class="nt-config-field">
                  <span class="nt-config-cat">HACER (N4–N6)</span>
                  <input type="number" name="porcentaje_hacer" class="custom-select" min="0" max="100" step="0.5" inputmode="decimal">
                  <span class="nt-config-range">Aplica a N4, N5, N6</span>
                </div>
                <div class="nt-config-field">
                  <span class="nt-config-cat">SER (N7–N9)</span>
                  <input type="number" name="porcentaje_ser" class="custom-select" min="0" max="100" step="0.5" inputmode="decimal">
                  <span class="nt-config-range">Aplica a N7, N8, N9</span>
                </div>
                <div class="nt-config-field">
                  <span class="nt-config-cat">AUTOEVALUACIÓN (N10)</span>
                  <input type="number" name="porcentaje_autoev" class="custom-select" min="0" max="100" step="0.5" inputmode="decimal">
                  <span class="nt-config-range">Aplica a N10</span>
                </div>
                <div class="nt-config-field" style="grid-column:1 / -1">
                  <span class="nt-config-cat">COEVALUACIÓN (N11)</span>
                  <input type="number" name="porcentaje_coev" class="custom-select" min="0" max="100" step="0.5" inputmode="decimal">
                  <span class="nt-config-range">Aplica a N11</span>
                </div>
              </div>
              <div class="nt-config-sum" id="ntConfigSum">
                <span>Suma de porcentajes</span>
                <span class="nt-config-sum-val" id="ntConfigSumVal">100%</span>
              </div>
            </form>
          </div>
          <div class="nt-modal-foot">
            <button type="button" class="nt-btn-ghost" id="notasModalConfigCancel">Cancelar</button>
            <button type="button" class="nt-btn-primary" id="notasModalConfigSave" disabled>
              <i class="bi bi-check-lg"></i>Guardar configuración
            </button>
          </div>
        </div>
      </div>
    `;

    const btn = $('btnSelDocente');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openSelectDocenteModal();
      });
    }

    const btnCfg = $('btnConfigPorcentajes');
    if (btnCfg) {
      btnCfg.addEventListener('click', (e) => {
        e.preventDefault();
        this.openConfigModal();
      });
    }

    if (isMaestra) {
      this.showCoordiView();
    } else {
      this.loadTeacherMenu(user.identificacion || user.id);
    }

    if (isAccesoTotal) {
      this._loadConfigPorcentajes(new Date().getFullYear());
      delegate(document, 'input', '#frmConfigPorcentajes input', () => this._updateConfigSum());
    }
  }

  showCoordiView() {
    $('notasMenuContainer').innerHTML = '<p class="nt-menu-empty">Seleccione un docente para ver sus notas</p>';
  }

  async loadTeacherMenu(docente) {
    if (!docente) return;
    this.currentDocente = docente;
    this._clearGradeTable();
    const container = $('notasMenuContainer');
    const loading = $('notasLoading');
    if (loading) loading.classList.remove('hidden');

    try {
      const response = await fetch(endpoint('/generarMenu.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docente }),
      });
      this.DatosDocente = await response.json();

      if (!this.DatosDocente || this.DatosDocente.length === 0) {
        container.innerHTML = '<p class="nt-menu-empty">No tiene asignaciones disponibles</p>';
        return;
      }

      if (this._subjectIconSelect && typeof this._subjectIconSelect.destroy === 'function') {
        this._subjectIconSelect.destroy();
        this._subjectIconSelect = null;
      }

      let html = '<div class="nt-card" style="padding:1rem 1.25rem;position:relative;z-index:30"><label class="nt-field-label">Seleccionar materia</label>';
      html += '<select id="notasSubjectSelect" style="display:none"></select></div>';
      container.innerHTML = html;

      const items = [];
      for (const dato of this.DatosDocente) {
        const asignaturas = dato.asignaturas || [];
        for (const asig of asignaturas) {
          items.push({
            value: `${docente}|${dato.nivel}|${dato.numero}|${asig.asignatura}`,
            label: asig.asignatura,
            icon: 'bi-book',
            group: `Grado ${dato.grado}`,
          });
        }
      }

      const target = container.querySelector('#notasSubjectSelect');
      if (target) {
        this._subjectIconSelect = new IconSelect(target, {
          placeholder: '-- Seleccione --',
          onChange: (val) => {
            if (!val) return;
            const [d, niv, num, asi] = val.split('|');
            this.loadGradeTable(d, niv, num, asi, this._selectedDocenteAsignacion);
          },
        });
        this._subjectIconSelect.setItems(items);
      }

    this._loadMensaje();
    } catch (e) {
      container.innerHTML = '<p class="nt-menu-empty" style="color:var(--nt-err)">Error al cargar asignaciones</p>';
    } finally {
      if (loading) loading.classList.add('hidden');
    }
  }

  async _loadMensaje() {
    try {
      const msgResp = await fetch(endpoint('/getMensaje.php'));
      const msg = await msgResp.json();
      if (msg.mensaje) {
        const alert = $('notasAlert');
        if (alert) {
          alert.classList.remove('hidden');
          const span = $('notasAviso');
          if (span) span.textContent = msg.mensaje;
        }
      }
    } catch (_) {}
  }

  handleClick(e) {
    const target = e.target;

    if (target.closest('#btnSelDocente')) {
      e.preventDefault();
      this.openSelectDocenteModal();
      return;
    }

    if (target.closest('#notasModalClose') || target.closest('#notasModalCancel')) {
      e.preventDefault();
      this._hideModal();
      return;
    }

    if (target.closest('#notasModalAccept')) {
      e.preventDefault();
      this._acceptDocenteSelection();
      return;
    }

    if (target.closest('#notasModalAspectoClose') || target.closest('#notasModalAspectoCancel')) {
      e.preventDefault();
      this._hideAspectoModal();
      return;
    }

    if (target.closest('#notasModalAspectoAccept')) {
      e.preventDefault();
      this._saveAspecto();
      return;
    }

    if (target.closest('#notasModalConfigClose') || target.closest('#notasModalConfigCancel')) {
      e.preventDefault();
      this._hideConfigModal();
      return;
    }

    if (target.closest('#notasModalConfigSave')) {
      e.preventDefault();
      this._saveConfigPorcentajes();
      return;
    }

    const saveBtn = target.closest('#notasSaveBtn');
    if (saveBtn && !saveBtn.classList.contains('hidden')) {
      e.preventDefault();
      this.saveAllGrades();
    }

    const calcBtn = target.closest('#notasCalcBtn');
    if (calcBtn && !calcBtn.classList.contains('hidden')) {
      e.preventDefault();
      this.recalcTotal();
    }
  }

  async openSelectDocenteModal() {
    const modal = $('notasModalContainer');
    const select = $('notasModalSelect');
    const loading = $('notasModalLoading');
    const accept = $('notasModalAccept');

    if (!modal || !select) return;
    if (!modal.classList.contains('hidden')) return;

    modal.classList.remove('hidden');
    if (loading) loading.classList.remove('hidden');
    if (accept) accept.classList.add('hidden');

    try {
      let docentes = await Promise.race([
        waitFor('docentes'),
        new Promise((_, r) => setTimeout(r, 5000, null)),
      ]);
      if (!docentes) {
        try {
          const res = await fetch(endpoint('/getInfoDocentes.php'));
          docentes = await res.json();
          preloaded.docentes = docentes;
        } catch { docentes = []; }
      }
      if (loading) loading.classList.add('hidden');

      if (!docentes || docentes.length === 0) {
        alertError('Sin datos', 'No se encontraron docentes');
        this._hideModal();
        return;
      }

      accept.classList.remove('hidden');
      this._buildDocenteIconSelect(docentes);
    } catch (e) {
      if (loading) loading.classList.add('hidden');
      alertError('Error', 'No se pudieron cargar los docentes');
      this._hideModal();
    }
  }

  _buildDocenteIconSelect(docentes) {
    const select = $('notasModalSelect');
    if (!select) return;

    const sedes = (preloaded.sedes || []).reduce((map, s) => {
      map[String(s.ind)] = s.nombre || s.sede || s.asignacion || `Sede ${s.ind}`;
      return map;
    }, {});

    this._docentesData = {};
    const items = docentes.map((d) => {
      const id = d.docente || d.identificacion;
      this._docentesData[id] = d;
      const sedeId = String(d.asignacion || d.sede || '');
      const sedeName = sedes[sedeId] || `Sede ${sedeId}`;
      return {
        value: id,
        label: d.nombres || '',
        icon: 'bi-person-badge',
        group: sedeName,
      };
    });

    if (this._docenteIconSelect && typeof this._docenteIconSelect.destroy === 'function') {
      this._docenteIconSelect.destroy();
      this._docenteIconSelect = null;
    }

    select.style.display = '';
    select.classList.remove('hidden');
    this._docenteIconSelect = new IconSelect(select, {
      placeholder: 'Seleccione un docente...',
      dropUp: true,
      onChange: (val) => {
        select.value = val;
        this._acceptDocenteSelection();
      },
    });
    this._docenteIconSelect.setItems(items);
  }

  _hideModal() {
    const modal = $('notasModalContainer');
    if (modal) modal.classList.add('hidden');
  }

  _acceptDocenteSelection() {
    const val = this._docenteIconSelect ? this._docenteIconSelect.getValue() : $('notasModalSelect')?.value;
    if (!val) return;

    const docenteData = this._docentesData?.[val];
    this._selectedDocenteAsignacion = docenteData?.asignacion || '';

    const nameEl = $('notasDocenteNombre');
    if (this._docenteIconSelect) {
      const item = this._docenteIconSelect.items.find((i) => String(i.value) === String(val));
      if (nameEl && item) nameEl.textContent = item.label.split(' - Sede ')[0] || 'Cargando...';
    } else {
      const selectedOpt = $('notasModalSelect')?.options[$('notasModalSelect').selectedIndex];
      if (nameEl && selectedOpt) nameEl.textContent = selectedOpt.textContent.split(' - Sede ')[0] || 'Cargando...';
    }

    this.loadTeacherMenu(val);
    this._hideModal();
  }

  openAspectosModal(column) {
    const colIdx = column.getField().slice(1);
    const title = column.getDefinition().title;
    const titleEl = $('notasModalAspectoTitle');
    if (titleEl) titleEl.textContent = `Aspecto - ${title}`;

    const modal = $('notasModalAspecto');
    if (!modal) return;

    const frm = $('frmAspecto');
    if (!frm) return;

    this._currentAspectoColumn = colIdx;

    let asp = '';
    let porc = '';
    let fecha = new Date().toISOString().slice(0, 10);

    for (const row of this.datosTabla) {
      if (row[`aspecto${colIdx}`]) { asp = row[`aspecto${colIdx}`]; break; }
    }
    if (!asp && ASPECTO_DEFAULTS[colIdx]) asp = ASPECTO_DEFAULTS[colIdx];
    for (const row of this.datosTabla) {
      if (row[`porcentaje${colIdx}`]) { porc = row[`porcentaje${colIdx}`]; break; }
    }
    for (const row of this.datosTabla) {
      if (row[`fechaa${colIdx}`]) { fecha = row[`fechaa${colIdx}`]; break; }
    }

    frm.querySelector('[name="aspecto"]').value = asp;
    frm.querySelector('[name="porcentaje"]').value = porc;
    frm.querySelector('[name="fecha"]').value = fecha && fecha !== '0000-00-00' ? fecha : new Date().toISOString().slice(0, 10);

    // Para N10/N11 el aspecto es auto-asignado: deshabilitar el campo para que el
    // usuario no lo cambie accidentalmente. (El default se persiste igual al guardar.)
    const aspectoInput = frm.querySelector('[name="aspecto"]');
    if (ASPECTO_DEFAULTS[colIdx]) {
      aspectoInput.disabled = true;
      aspectoInput.title = 'Auto-asignado por el sistema';
    } else {
      aspectoInput.disabled = false;
      aspectoInput.title = '';
    }

    modal.classList.remove('hidden');
  }

  _hideAspectoModal() {
    const modal = $('notasModalAspecto');
    if (modal) modal.classList.add('hidden');
  }

  _saveAspecto() {
    const colIdx = this._currentAspectoColumn;
    if (!colIdx) return;

    const frm = $('frmAspecto');
    if (!frm) return;

    const aspecto = frm.querySelector('[name="aspecto"]').value;
    const porcentaje = frm.querySelector('[name="porcentaje"]').value;
    const fecha = frm.querySelector('[name="fecha"]').value;

    this.datosTabla = this.datosTabla.map((row) => {
      const r = { ...row };
      r[`aspecto${colIdx}`] = aspecto;
      r[`porcentaje${colIdx}`] = porcentaje;
      r[`fechaa${colIdx}`] = fecha;
      return r;
    });

    if (this.table) {
      this.table.setData(this.datosTabla);
    }
    if (this._viewMode === 'cards') {
      this._refreshCardAspects();
    }

    this._hideAspectoModal();
  }

  async _loadConfigPorcentajes(year) {
    try {
      const res = await configService.getPorcentajes(year);
      if (res && (res.success === true || res.data)) {
        const data = res.data || res;
        this._porcentajes = {
          porcentaje_saber:  Number(data.porcentaje_saber  ?? 35),
          porcentaje_hacer:  Number(data.porcentaje_hacer  ?? 35),
          porcentaje_ser:    Number(data.porcentaje_ser    ?? 20),
          porcentaje_autoev: Number(data.porcentaje_autoev ?? 5),
          porcentaje_coev:   Number(data.porcentaje_coev   ?? 5),
        };
        this._porcentajesYear = year;
        this._porcentajesMeta = {
          actualizado_por: data.actualizado_por || null,
          actualizado_en: data.actualizado_en || null,
        };
      }
    } catch (e) {
      console.warn('No se pudo cargar config porcentajes, usando defaults', e);
      this._porcentajes = { porcentaje_saber: 35, porcentaje_hacer: 35, porcentaje_ser: 20, porcentaje_autoev: 5, porcentaje_coev: 5 };
      this._porcentajesYear = year;
      this._porcentajesMeta = { actualizado_por: null, actualizado_en: null };
    }
  }

  async openConfigModal() {
    const modal = $('notasModalConfig');
    if (!modal) return;

    if (!auth.isAccesoTotal()) {
      const user = auth.getUser();
      const id = user?.identificacion || user?.id || 'tu usuario';
      const isDev = this._isDevMode();
      const Swal = (await import('sweetalert2')).default;
      const { isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: 'Sin acceso total',
        html: `Tu usuario <strong>${id}</strong> no tiene <code>acceso_total='S'</code> en la base de datos.<br><br>
          <small>Opciones:</small><br>
          <code style="display:inline-block;margin-top:0.5rem;padding:0.3rem 0.5rem;background:rgba(0,0,0,0.05);border-radius:4px">php dev/set_acceso_total.php ${id} S</code>
          ${isDev ? '<br><br><small>O, si estás en modo dev, puedes otorgártelo ahora con un click.</small>' : ''}`,
        showCancelButton: true,
        showConfirmButton: isDev,
        confirmButtonText: isDev ? 'Otorgarme acceso (dev)' : 'Entendido',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#0ea5e9',
      });
      if (isConfirmed && isDev) {
        try {
          const res = await configService.grantAccess();
          if (res && res.success) {
            await auth.checkSession(true);
            refreshNavbar();
            await Swal.fire({ icon: 'success', title: 'Acceso otorgado', text: 'Recargando...', timer: 1500, showConfirmButton: false });
            window.location.reload();
          }
        } catch (e) {
          alertError('Error', e?.data?.error || e?.message || 'No se pudo otorgar acceso');
        }
      }
      return;
    }

    modal.classList.remove('hidden');

    const year = new Date().getFullYear();
    await this._loadConfigPorcentajes(year);
    this._renderConfigModal();
  }

  _isDevMode() {
    return this._devStatus && this._devStatus.debug === true;
  }

  async _checkDevMode() {
    try {
      this._devStatus = await devService.getStatus();
    } catch {
      this._devStatus = { debug: false };
    }
  }

  _hideConfigModal() {
    const modal = $('notasModalConfig');
    if (modal) modal.classList.add('hidden');
  }

  _renderConfigModal() {
    const p = this._porcentajes || { porcentaje_saber: 35, porcentaje_hacer: 35, porcentaje_ser: 20, porcentaje_autoev: 5, porcentaje_coev: 5 };
    const frm = $('frmConfigPorcentajes');
    if (!frm) return;
    frm.querySelector('[name="porcentaje_saber"]').value  = p.porcentaje_saber;
    frm.querySelector('[name="porcentaje_hacer"]').value  = p.porcentaje_hacer;
    frm.querySelector('[name="porcentaje_ser"]').value    = p.porcentaje_ser;
    frm.querySelector('[name="porcentaje_autoev"]').value = p.porcentaje_autoev;
    frm.querySelector('[name="porcentaje_coev"]').value   = p.porcentaje_coev;

    const yEl = $('ntConfigYear');
    if (yEl) yEl.textContent = this._porcentajesYear || new Date().getFullYear();

    const meta = this._porcentajesMeta || {};
    const porEl = $('ntConfigMetaPor');
    const porVal = $('ntConfigMetaPorVal');
    const enEl = $('ntConfigMetaEn');
    const enVal = $('ntConfigMetaEnVal');
    if (meta.actualizado_por) {
      porEl.classList.remove('hidden');
      porVal.textContent = meta.actualizado_por;
      enEl.classList.remove('hidden');
      enVal.textContent = meta.actualizado_en || '—';
    } else {
      porEl.classList.add('hidden');
      enEl.classList.add('hidden');
    }

    this._updateConfigSum();
  }

  _updateConfigSum() {
    const frm = $('frmConfigPorcentajes');
    if (!frm) return;
    const fields = ['porcentaje_saber', 'porcentaje_hacer', 'porcentaje_ser', 'porcentaje_autoev', 'porcentaje_coev'];
    let sum = 0;
    fields.forEach((name) => {
      const v = parseFloat(frm.querySelector(`[name="${name}"]`).value);
      if (!isNaN(v)) sum += v;
    });
    const sumEl = $('ntConfigSum');
    const sumVal = $('ntConfigSumVal');
    const saveBtn = $('notasModalConfigSave');
    const ok = Math.abs(sum - 100) < 0.01;
    if (sumEl) {
      sumEl.classList.remove('ok', 'bad');
      sumEl.classList.add(ok ? 'ok' : 'bad');
    }
    if (sumVal) sumVal.textContent = `${sum.toFixed(1)}%`;
    if (saveBtn) saveBtn.disabled = !ok;
  }

  async _saveConfigPorcentajes() {
    if (!auth.isAccesoTotal()) return;
    const frm = $('frmConfigPorcentajes');
    if (!frm) return;
    const fields = ['porcentaje_saber', 'porcentaje_hacer', 'porcentaje_ser', 'porcentaje_autoev', 'porcentaje_coev'];
    const data = { year: this._porcentajesYear || new Date().getFullYear() };
    for (const name of fields) {
      data[name] = parseFloat(frm.querySelector(`[name="${name}"]`).value) || 0;
    }
    const sum = data.porcentaje_saber + data.porcentaje_hacer + data.porcentaje_ser + data.porcentaje_autoev + data.porcentaje_coev;
    if (Math.abs(sum - 100) > 0.01) {
      alertError('Suma incorrecta', `La suma debe ser 100%. Actual: ${sum.toFixed(1)}%`);
      return;
    }
    const saveBtn = $('notasModalConfigSave');
    if (saveBtn) saveBtn.disabled = true;
    try {
      const res = await configService.updatePorcentajes(data);
      const payload = res && res.data ? res.data : res;
      this._porcentajes = {
        porcentaje_saber:  Number(payload.porcentaje_saber  ?? data.porcentaje_saber),
        porcentaje_hacer:  Number(payload.porcentaje_hacer  ?? data.porcentaje_hacer),
        porcentaje_ser:    Number(payload.porcentaje_ser    ?? data.porcentaje_ser),
        porcentaje_autoev: Number(payload.porcentaje_autoev ?? data.porcentaje_autoev),
        porcentaje_coev:   Number(payload.porcentaje_coev   ?? data.porcentaje_coev),
      };
      this._porcentajesMeta = {
        actualizado_por: payload.actualizado_por || null,
        actualizado_en: payload.actualizado_en || null,
      };
      alertSuccess('Configuración guardada', 'Los porcentajes se aplicarán al recargar la tabla');
      this._renderConfigModal();
      this._renderPercentBar();
      if (this.table) this.recalcTotal();
    } catch (e) {
      const msg = e?.data?.error || e?.message || 'Error al guardar';
      alertError('Error', msg);
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  _renderPercentBar() {
    const bar = $('notasPercentBar');
    if (!bar) return;
    const p = this._porcentajes || { porcentaje_saber: 35, porcentaje_hacer: 35, porcentaje_ser: 20, porcentaje_autoev: 5, porcentaje_coev: 5 };
    const items = bar.querySelectorAll(':scope > div');
    const cfg = [
      { label: 'SABER',  val: p.porcentaje_saber,  tip: `SABER — ${p.porcentaje_saber}% (3 notas)` },
      { label: 'HACER',  val: p.porcentaje_hacer,  tip: `HACER — ${p.porcentaje_hacer}% (3 notas)` },
      { label: 'SER',    val: p.porcentaje_ser,    tip: `SER — ${p.porcentaje_ser}% (3 notas)` },
      { label: 'AUTOEV', val: p.porcentaje_autoev, tip: `AUTOEVALUACIÓN — ${p.porcentaje_autoev}%` },
      { label: 'COEV',   val: p.porcentaje_coev,   tip: `COEVALUACIÓN — ${p.porcentaje_coev}%` },
    ];
    cfg.forEach((c, i) => {
      const el = items[i];
      if (!el) return;
      el.style.flex = `0 0 ${c.val}%`;
      el.setAttribute('data-tip', c.tip);
      const catEl = el.querySelector('.nt-pct-cat');
      const valEl = el.querySelector('.nt-pct-val');
      if (catEl && valEl) {
        catEl.textContent = c.label;
        valEl.textContent = `${c.val}%`;
      } else {
        el.textContent = `${c.label} ${c.val}%`;
      }
    });
  }

  async loadGradeTable(docente, nivel, numero, asignatura, teacherAsignacion) {
    this.currentDocente = docente;
    this.currentNivel = nivel;
    this.currentNumero = numero;
    this.currentAsignatura = asignatura;
    this.currentPeriodo = await this.getCurrentPeriodo();

    const periodo = this.currentPeriodo;
    const label = $('notasAsignaturaLabel');
    if (label) { label.textContent = `${asignatura} ${nivel}-${numero} · P${periodo}`; label.style.display = ''; }

    const bar = $('notasPercentBar');
    if (bar) bar.classList.remove('hidden');

    const container = $('notasTableContainer');
    const loading = $('notasLoading');
    if (loading) loading.classList.remove('hidden');

    if (this.table && typeof this.table.destroy === 'function') {
      this.table.destroy();
    }
    container.innerHTML = '';

    try {
      const response = await fetch(endpoint('/getNotas.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          docente,
          nivel,
          numero,
          asignatura,
          periodo,
          asignacion: teacherAsignacion || this._selectedDocenteAsignacion || auth.getUser()?.asignacion || '',
          year: new Date().getFullYear(),
        }),
      });
      let data = await response.json();
      data = (data || []).sort((a, b) => (a.Nombres || '').localeCompare(b.Nombres || ''));

      this.datosTabla = data;
      this.datosTablai = JSON.parse(JSON.stringify(data));

      const canEdit = !auth.isMaestra() && !auth.isCoordinador();
      this._canEdit = canEdit;

      // Detección de modo (≤640px cualquier orientación → tarjetas; si no → tabla Tabulator).
      if (!this._mobileMQ) this._mobileMQ = window.matchMedia('(max-width:640px)');
      if (!this._mqBound) {
        this._mqBound = true;
        this._mobileMQ.addEventListener('change', () => this._onViewportChange());
      }

      if (this._mobileMQ.matches) {
        if (loading) loading.classList.add('hidden');
        this._renderCardsView();
      } else {
        this._renderTableView(data, canEdit, loading);
      }
    } catch (e) {
      if (loading) loading.classList.add('hidden');
      container.innerHTML = '<p class="nt-menu-empty" style="color:var(--nt-err)">Error al cargar notas</p>';
    }
  }

  // Re-renderiza en el modo que corresponda al viewport actual, reusando this.datosTabla (sin re-fetch).
  _onViewportChange() {
    if (!this.datosTabla || !this.datosTabla.length) return;
    const container = $('notasTableContainer');
    if (!container) return;

    // Guardar foco + posición del cursor para restaurarlo después del re-render.
    const focusInfo = this._captureFocus(container);

    if (this._mobileMQ && this._mobileMQ.matches) {
      if (this._viewMode !== 'cards') {
        if (this.table && typeof this.table.destroy === 'function') { this.table.destroy(); this.table = null; }
        container.innerHTML = '';
        this._renderCardsView();
      }
    } else {
      if (!(this._viewMode === 'table' && this.table)) {
        this._renderTableView(this.datosTabla, this._canEdit, null);
      }
    }

    this._restoreFocus(focusInfo);
  }

  // Captura info del elemento enfocado dentro de un container (para re-renders).
  _captureFocus(container) {
    const active = document.activeElement;
    if (!active || active === document.body || !container.contains(active)) return null;
    return {
      tag: active.tagName,
      className: active.className,
      id: active.id,
      selectionStart: typeof active.selectionStart === 'number' ? active.selectionStart : null,
      selectionEnd: typeof active.selectionEnd === 'number' ? active.selectionEnd : null,
      est: active.getAttribute?.('data-est'),
      n: active.getAttribute?.('data-n'),
    };
  }

  // Restaura el foco (y posición del cursor) en un input equivalente tras re-render.
  _restoreFocus(focusInfo) {
    if (!focusInfo) return;
    let target = null;
    if (focusInfo.est && focusInfo.n) {
      target = document.querySelector(
        `.nt-grade-input[data-est="${CSS.escape(focusInfo.est)}"][data-n="${CSS.escape(focusInfo.n)}"]`
      );
    } else if (focusInfo.id) {
      target = document.getElementById(focusInfo.id);
    } else if (focusInfo.className) {
      const first = focusInfo.className.split(/\s+/).filter(Boolean)[0];
      if (first) target = document.querySelector(`.${CSS.escape(first)}`);
    }
    if (!target) return;
    target.focus();
    if (focusInfo.selectionStart != null && typeof target.setSelectionRange === 'function') {
      try {
        target.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
      } catch (_) { /* number inputs pueden no soportar */ }
    }
  }

  _renderTableView(data, canEdit, loading) {
    this._viewMode = 'table';
    const container = $('notasTableContainer');

    if (typeof Tabulator === 'undefined') {
      container.innerHTML = '<p class="nt-menu-empty" style="color:var(--nt-err)">Error: Tabulator no está disponible</p>';
      return;
    }

      const columns = [
        { title: 'estudiante', field: 'estudiante', visible: false, resizable: false },
        {
          title: 'Estudiante', field: 'Nombres', width: 250,
          headerFilter: 'input', headerFilterPlaceholder: 'Buscar...', resizable: false,
        },
        {
          title: 'Def.', field: 'Val', hozAlign: 'center', width: 60, minWidth: 60,
          formatter: (cell) => {
            const v = cell.getValue();
            if (v === null || v === undefined || v === '') {
              return '<span class="opacity-50">…</span>';
            }
            const num = parseFloat(v);
            if (isNaN(num)) return '<span class="opacity-50">…</span>';
            return `<span class="font-bold">${num.toFixed(1)}</span>`;
          },
          resizable: false,
        },
      ];

      for (let i = 1; i <= 11; i++) {
        columns.push({
          title: `N${i}`, field: `N${i}`, hozAlign: 'center', width: 55,
          editor: canEdit ? 'number' : false,
          editorParams: { verticalNavigation: 'table' },
          validator: canEdit ? [{ type: (cell, value) => {
            if (value === '' || value === null || value === undefined) return true;
            return /^[1-5](\.[0-9])?$/.test(String(value));
          }, parameters: { min: 1, max: 5 } }] : undefined,
          cellEdited: canEdit ? () => this.onCellEdited() : undefined,
          headerMenu: this.headerMenu,
          resizable: false,
        });
      }

      for (let i = 1; i <= 11; i++) {
        columns.push(
          { title: `aspecto${i}`, field: `aspecto${i}`, visible: false, resizable: false },
          { title: `porcentaje${i}`, field: `porcentaje${i}`, visible: false, resizable: false },
          { title: `fechaa${i}`, field: `fechaa${i}`, visible: false, resizable: false },
          { title: `fecha${i}`, field: `fecha${i}`, visible: false, resizable: false },
        );
      }

      container.innerHTML = '<div class="notas-table-glass"><div id="tabulatorNotasTable"></div></div>';

      this.table = new Tabulator('#tabulatorNotasTable', {
        height: 'min(500px, 65vh)',
        layout: 'fitDataFill',
        placeholder: 'No hay datos',
        index: 'estudiante',
        data,
        columns,
        headerSort: false,
        responsiveLayout: 'collapse',
        responsiveLayoutCollapseStart: 768,
        responsiveLayoutCollapseUseFormatters: true,
        rowFormatter: (row) => this.formatRow(row),
        renderComplete: () => {
          if (loading) loading.classList.add('hidden');
          const saveBtn = $('notasSaveBtn');
          const calcBtn = $('notasCalcBtn');
          if (saveBtn) {
            if (canEdit) saveBtn.classList.remove('hidden');
            else saveBtn.classList.add('hidden');
          }
          if (calcBtn) {
            if (canEdit) calcBtn.classList.remove('hidden');
            else calcBtn.classList.add('hidden');
          }
        },
        validationFailed: (cell, value) => {
          alertError('Valor erróneo', `"${value}" no permitido. Use un número entre 1.0 y 5.0 con un decimal (ej. 3.5).`);
        },
      });
  }

  // Vista tarjetas (solo ≤640px). Una tarjeta por estudiante: nombre + Def + 11 notas agrupadas.
  _renderCardsView() {
    this._viewMode = 'cards';
    const container = $('notasTableContainer');
    if (!container) return;
    const canEdit = this._canEdit;

    // Botones guardar/calcular (mismos globales que la tabla).
    const saveBtn = $('notasSaveBtn');
    const calcBtn = $('notasCalcBtn');
    if (saveBtn) saveBtn.classList.toggle('hidden', !canEdit);
    if (calcBtn) calcBtn.classList.toggle('hidden', !canEdit);

    const GROUPS = [
      { label: 'SABER',  cls: 'nt-g-saber',  ns: [1, 2, 3] },
      { label: 'HACER',  cls: 'nt-g-hacer',  ns: [4, 5, 6] },
      { label: 'SER',    cls: 'nt-g-ser',    ns: [7, 8, 9] },
      { label: 'AUTOEV', cls: 'nt-g-autoev', ns: [10] },
      { label: 'COEV',   cls: 'nt-g-coev',   ns: [11] },
    ];

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const disabled = canEdit ? '' : 'disabled';

    let html = '<div class="nt-cards">';
    if (!this.datosTabla || !this.datosTabla.length) {
      html += '<p class="nt-menu-empty">No hay datos</p>';
    }
    for (const row of (this.datosTabla || [])) {
      const val = row.Val;
      const num = parseFloat(val);
      const hasVal = !(val === null || val === undefined || val === '' || isNaN(num));
      const defCls = hasVal ? (num >= 3 ? 'nt-def-ok' : 'nt-def-bad') : 'nt-def-empty';
      const defTxt = hasVal ? num.toFixed(1) : '…';

      html += `<div class="nt-card-grade" data-est="${esc(row.estudiante)}">`;
      html += `<div class="nt-card-head"><span class="nt-card-name">${esc(row.Nombres)}</span>`;
      html += `<span class="nt-card-def ${defCls}">${defTxt}</span></div>`;
      html += '<div class="nt-card-body">';
      for (const g of GROUPS) {
        html += `<div class="nt-card-group ${g.cls}"><span class="nt-group-label">${g.label}</span><div class="nt-group-inputs">`;
        for (const n of g.ns) {
          const v = row[`N${n}`];
          const iv = (v === null || v === undefined) ? '' : esc(v);
          const isAuto = !!ASPECTO_DEFAULTS[n];   // N10/N11 no se preguntan al usuario
          if (isAuto) {
            // Etiqueta estática (no botón): muestra el default sin opción de editar
            const aspTxt = ASPECTO_DEFAULTS[n];
            const lowCls = this._isLowGrade(iv) ? ' is-low' : '';
            html += `<div class="nt-grade-cell">`;
            html += `<input type="text" inputmode="decimal" class="nt-grade-input${lowCls}" value="${iv}" data-est="${esc(row.estudiante)}" data-n="${n}" aria-label="${g.label} N${n}" ${disabled} />`;
            html += `<span class="nt-grade-aspect-static" title="Aspecto auto-asignado (no editable)">${esc(aspTxt)}</span>`;
            html += `</div>`;
          } else {
            const asp = this._getAspectoValueForRow(row, n);
            const aspTrim = asp ? (asp.length > 30 ? esc(asp.slice(0, 29)) + '…' : esc(asp)) : 'Definir aspecto';
            const aspEmpty = asp ? '' : 'is-empty';
            const lowCls = this._isLowGrade(iv) ? ' is-low' : '';
            html += `<div class="nt-grade-cell">`;
            html += `<input type="text" inputmode="decimal" class="nt-grade-input${lowCls}" value="${iv}" data-est="${esc(row.estudiante)}" data-n="${n}" aria-label="${g.label} N${n}" ${disabled} />`;
            html += `<button type="button" class="nt-grade-aspect ${aspEmpty}" data-est="${esc(row.estudiante)}" data-n="${n}" aria-label="Configurar aspecto N${n}" title="${esc(asp) || 'Sin aspecto — toca para definir'}">${aspTrim}</button>`;
            html += `</div>`;
          }
        }
        html += '</div></div>';
      }
      html += '</div></div>';
    }
    html += '</div>';
    container.innerHTML = html;

    if (canEdit) this._wireCardInputs(container);
  }

  _wireCardInputs(container) {
    const inputs = container.querySelectorAll('.nt-grade-input');
    inputs.forEach((inp) => {
      inp.addEventListener('change', (e) => this._onCardInput(e.target));
    });
    const aspects = container.querySelectorAll('.nt-grade-aspect');
    aspects.forEach((btn) => {
      btn.addEventListener('click', (e) => this._onCardAspectClick(e.currentTarget));
    });
  }

  // Abre el modal de aspectos desde un botón de la vista de tarjetas.
  // Reutiliza openAspectosModal pasándole un objeto "columna" compatible.
  _onCardAspectClick(btn) {
    const n = btn.getAttribute('data-n');
    this.openAspectosModal({
      getField: () => `N${n}`,
      getDefinition: () => ({ title: `N${n}` }),
    });
  }

  // Aspecto vigente para un N (de cualquier estudiante, el primero no vacío).
  // Si ninguno tiene valor y existe un default (N10/N11), lo devuelve.
  _getAspectoValue(n) {
    for (const row of (this.datosTabla || [])) {
      const v = row[`aspecto${n}`];
      if (v) return v;
    }
    return ASPECTO_DEFAULTS[n] || '';
  }

  // Aspecto efectivo para una fila+N (valor de la fila o default).
  _getAspectoValueForRow(row, n) {
    return row[`aspecto${n}`] || ASPECTO_DEFAULTS[n] || '';
  }

  // Trunca texto largo para mostrar en el botón de aspecto.
  _truncateAsp(str, len = 30) {
    if (!str) return '';
    return String(str).length > len ? String(str).slice(0, len - 1) + '…' : String(str);
  }

  // Refresca el texto de los botones de aspecto tras guardar.
  // Llamado desde _saveAspecto cuando estamos en vista de tarjetas.
  _refreshCardAspects() {
    const container = $('notasTableContainer');
    if (!container) return;
    const buttons = container.querySelectorAll('.nt-grade-aspect');
    buttons.forEach((btn) => {
      const n = btn.getAttribute('data-n');
      const asp = this._getAspectoValue(n);
      btn.textContent = asp ? this._truncateAsp(asp) : 'Definir aspecto';
      btn.title = asp || 'Sin aspecto — toca para definir';
      btn.classList.toggle('is-empty', !asp);
    });
  }

  _onCardInput(input) {
    const est = input.getAttribute('data-est');
    const n = input.getAttribute('data-n');
    let value = input.value.trim();
    if (value !== '' && !/^[1-5](\.[0-9])?$/.test(value)) {
      input.classList.add('nt-input-invalid');
      alertError('Valor erróneo', `"${value}" no permitido. Use un número entre 1.0 y 5.0 con un decimal (ej. 3.5).`);
      return;
    }
    input.classList.remove('nt-input-invalid');
    const row = (this.datosTabla || []).find((r) => String(r.estudiante) === String(est));
    if (!row) return;
    row[`N${n}`] = value === '' ? '' : value;
    this._recalcRow(row);
    this._updateCardDef(row);
    this._updateInputLowClass(input, value);
  }

  // True si la nota (string numérico) es < 3.0 → se marca en rojo en la UI.
  _isLowGrade(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num < 3;
  }

  // Aplica la clase is-low al input según el valor actual.
  _updateInputLowClass(input, value) {
    if (!input) return;
    if (this._isLowGrade(value)) input.classList.add('is-low');
    else input.classList.remove('is-low');
  }
  _recalcRow(row) {
    let Saber35 = 0, Hacer35 = 0, Ser20 = 0, Autoe5 = 0, Coev5 = 0;
    const arraycounts = [];
    for (let i = 1; i <= 11; i++) {
      const val = row[`N${i}`];
      if (val != null && val !== '' && val !== ' ') {
        if (row[`fecha${i}`] == null) row[`fecha${i}`] = new Date().toISOString().slice(0, 10);
        const v = parseFloat(val);
        if (i >= 1 && i <= 3) Saber35 += v;
        else if (i >= 4 && i <= 6) Hacer35 += v;
        else if (i >= 7 && i <= 9) Ser20 += v;
        else if (i === 10) Autoe5 += v;
        else if (i === 11) Coev5 += v;
      }
      arraycounts.push(val);
    }
    const contadores = this.countNonEmptyGroups(arraycounts);
    const p = this._porcentajes || { porcentaje_saber: 35, porcentaje_hacer: 35, porcentaje_ser: 20, porcentaje_autoev: 5, porcentaje_coev: 5 };
    const total =
      (Saber35 / (contadores[0] || 1)) * (p.porcentaje_saber  / 100) +
      (Hacer35 / (contadores[1] || 1)) * (p.porcentaje_hacer  / 100) +
      (Ser20   / (contadores[2] || 1)) * (p.porcentaje_ser    / 100) +
      Autoe5 * (p.porcentaje_autoev / 100) +
      Coev5  * (p.porcentaje_coev   / 100);
    row.Val = total.toFixed(1);
    row.valoracion = total >= 3 ? 'A' : 'R';
  }

  // Refleja Val/valoracion recalculados en la burbuja Def de la tarjeta (modo cards).
  _updateCardDef(row) {
    const container = $('notasTableContainer');
    if (!container) return;
    const card = container.querySelector(`.nt-card-grade[data-est="${CSS.escape(String(row.estudiante))}"]`);
    if (!card) return;
    const def = card.querySelector('.nt-card-def');
    if (!def) return;
    const num = parseFloat(row.Val);
    const hasVal = !(row.Val === null || row.Val === undefined || row.Val === '' || isNaN(num));
    def.classList.remove('nt-def-ok', 'nt-def-bad', 'nt-def-empty');
    if (hasVal) {
      def.classList.add(num >= 3 ? 'nt-def-ok' : 'nt-def-bad');
      def.textContent = num.toFixed(1);
    } else {
      def.classList.add('nt-def-empty');
      def.textContent = '…';
    }
  }

  _clearGradeTable() {
    if (this.table && typeof this.table.destroy === 'function') {
      this.table.destroy();
    }
    this.table = null;
    this._viewMode = null;
    this.datosTabla = [];
    this.datosTablai = [];
    const container = $('notasTableContainer');
    if (container) container.innerHTML = '';
    const label = $('notasAsignaturaLabel');
    if (label) { label.textContent = ''; label.style.display = 'none'; }
    const bar = $('notasPercentBar');
    if (bar) bar.classList.add('hidden');
    const saveBtn = $('notasSaveBtn');
    if (saveBtn) saveBtn.classList.add('hidden');
    const calcBtn = $('notasCalcBtn');
    if (calcBtn) calcBtn.classList.add('hidden');
  }

  formatRow(row) {
    const data = row.getData();
    const cells = row.getCells();
    if (cells.length < 3) return;

    cells[2]?.getElement().style.setProperty('background', parseFloat(data?.Val) >= 3 ? 'green' : 'red');
    cells[2]?.getElement().style.setProperty('color', 'white');
    cells[2]?.getElement().style.setProperty('text-align', 'center');
    cells[2]?.getElement().style.setProperty('font-weight', 'bold');

    const ranges = [
      { start: 3, end: 5, bg: '#e7ffe7' },
      { start: 6, end: 8, bg: '#ffeee1' },
      { start: 9, end: 11, bg: '#f0f5ff' },
      { start: 12, end: 12, bg: '#ffd5d6' },
      { start: 13, end: 13, bg: '#fffad6' },
    ];

    for (const r of ranges) {
      for (let i = r.start; i <= r.end && i < cells.length; i++) {
        const cell = cells[i];
        if (!cell) continue;
        cell.getElement().style.setProperty('background', r.bg);
        const val = cell.getValue();
        if (val && parseFloat(val) < 3) {
          cell.getElement().style.setProperty('color', 'red');
        }
      }
    }
  }

  countNonEmptyGroups(array) {
    const groups = [
      array.slice(0, 3),
      array.slice(3, 6),
      array.slice(6, 9),
      array.slice(9, 10),
      array.slice(10, 11),
    ];
    const isEmpty = (val) => !val || String(val).trim() === '';
    return groups.map((g) => g.filter((val) => !isEmpty(val)).length);
  }

  // Fórmula de recálculo (idéntica al original), agnóstica a la vista.
  // Muta las fechas vacías y devuelve { Val, valoracion }.
  _computeRow(row) {
    let Saber35 = 0;
    let Hacer35 = 0;
    let Ser20 = 0;
    let Autoe5 = 0;
    let Coev5 = 0;
    const arraycounts = [];

    for (let i = 1; i <= 11; i++) {
      const val = row[`N${i}`];
      if (val != null && val !== '' && val !== ' ') {
        if (row[`fecha${i}`] == null) {
          row[`fecha${i}`] = new Date().toISOString().slice(0, 10);
        }
        const v = parseFloat(val);
        if (i >= 1 && i <= 3) Saber35 += v;
        else if (i >= 4 && i <= 6) Hacer35 += v;
        else if (i >= 7 && i <= 9) Ser20 += v;
        else if (i === 10) Autoe5 += v;
        else if (i === 11) Coev5 += v;
      }
      arraycounts.push(val);
    }

    const contadores = this.countNonEmptyGroups(arraycounts);
    const p = this._porcentajes || { porcentaje_saber: 35, porcentaje_hacer: 35, porcentaje_ser: 20, porcentaje_autoev: 5, porcentaje_coev: 5 };
    const total =
      (Saber35 / (contadores[0] || 1)) * (p.porcentaje_saber  / 100) +
      (Hacer35 / (contadores[1] || 1)) * (p.porcentaje_hacer  / 100) +
      (Ser20   / (contadores[2] || 1)) * (p.porcentaje_ser    / 100) +
      Autoe5 * (p.porcentaje_autoev / 100) +
      Coev5  * (p.porcentaje_coev   / 100);

    row.Val = total.toFixed(1);
    row.valoracion = total >= 3 ? 'A' : 'R';
    return { Val: row.Val, valoracion: row.valoracion, total };
  }

  async recalcTotal() {
    if (!this._porcentajes) await this._loadConfigPorcentajes(new Date().getFullYear());
    // Fuente de verdad: this.datosTabla (tabla y tarjetas son vistas sobre él).
    const data = this.table ? this.table.getData() : this.datosTabla;
    if (!data) return;
    for (const row of data) {
      this._computeRow(row);
      if (this.table) {
        const r = this.table.getRow(row.estudiante);
        if (r) r.update(row);
      } else {
        this._updateCardDef(row);
      }
    }
  }

  onCellEdited() {
    this.recalcTotal();
  }

  async saveAllGrades() {
    const saveBtn = $('notasSaveBtn');
    const spinner = $('notasSaveSpinner');

    const cleanup = () => {
      if (saveBtn) saveBtn.style.pointerEvents = '';
      if (spinner) spinner.style.display = 'none';
    };

    if (saveBtn) saveBtn.style.pointerEvents = 'none';
    if (spinner) spinner.style.display = '';

    try {
      const data = this.table ? this.table.getData() : (this.datosTabla || []);
      const allRows = [];

      for (const row of data) {
        if (!row.estudiante) continue;

        const datajs = {
          estudiante: row.estudiante,
          valoracion: row.Val,
          periodo: this.currentPeriodo || '1',
          asignatura: this.currentAsignatura,
          grado: `${this.currentNivel}-${this.currentNumero}`,
          docente: this.currentDocente,
          year: new Date().getFullYear(),
        };

        for (let i = 1; i <= 11; i++) {
          const notaV = parseFloat(row[`N${i}`]);
          datajs[`nota${i}`] = !isNaN(notaV) ? notaV : '';
          // Aspecto: usar el valor de la fila, o el default auto-asignado (N10/N11)
          datajs[`aspecto${i}`] = row[`aspecto${i}`] || ASPECTO_DEFAULTS[i] || '';
          datajs[`porcentaje${i}`] = row[`porcentaje${i}`] || '';
          datajs[`fechaa${i}`] = row[`fechaa${i}`] || '';
          datajs[`fecha${i}`] = row[`fecha${i}`] || '';
        }

        if (datajs.valoracion && datajs.valoracion !== '0.00') {
          allRows.push(datajs);
        }
      }

      if (allRows.length === 0) {
        alertWarning('Sin datos', 'No hay estudiantes con notas para guardar');
        cleanup();
        return;
      }

      try {
        await fetch(endpoint('/guardar_notas2.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allRows),
        });
      } catch (_) {}

      const response = await fetch(endpoint('/guardar_notas.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allRows),
      });

      const result = await response.json();
      if (result.msg === 'error_de_aspecto') {
        alertError('Error de aspecto', result.info_aspecto || 'Revise los aspectos');
        cleanup();
        return;
      }
      if (result.msg === 'Prohibido') {
        alertError('Plataforma Cerrada', 'La edición de notas está cerrada');
        cleanup();
        return;
      }

      alertSuccess('Guardado', `${allRows.length} estudiante(s) guardado(s)`);
      this.datosTablai = JSON.parse(JSON.stringify(this.table ? this.table.getData() : (this.datosTabla || [])));
    } catch (e) {
      alertError('Error', e.message || 'Error al guardar');
    } finally {
      cleanup();
    }
  }
}

export const notasModule = new NotasModule();
