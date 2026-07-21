/**
 * Dashboard module · self-contained stylesheet (namespaced under .dashboard-module)
 * Injected once on first import. Reuses the global Aurora tokens from main.css
 * but owns all layout, animation and micro-interaction details.
 */

const CSS = `
/* ============================================================= *
 *  DASHBOARD · Bento Aurora                                       *
 *  Scoped under .dashboard-module                                 *
 * ============================================================= */
.dashboard-module {
  --db-brand:        #543391;
  --db-brand-light:  #6f4ab3;
  --db-brand-glow:   #8b5cf6;
  --db-brand-soft:   #a78bfa;
  --db-accent:       #f59e0b;
  --db-ok:           #10b981;
  --db-info:         #0ea5e9;
  --db-red:          #ef4444;
  --db-ink:          #1a1330;
  --db-ink-soft:     #5b5470;
  --db-glass:        rgba(255, 255, 255, 0.62);
  --db-glass-hi:     rgba(255, 255, 255, 0.78);
  --db-glass-lo:     rgba(255, 255, 255, 0.42);
  --db-border:       rgba(255, 255, 255, 0.55);
  --db-hairline:     rgba(31, 17, 66, 0.08);
  --db-shadow:       0 8px 28px -10px rgba(31, 17, 66, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  --db-shadow-md:    0 14px 40px -14px rgba(84, 51, 145, 0.24), 0 2px 10px rgba(31, 17, 66, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.65);
  --db-shadow-lg:    0 28px 70px -20px rgba(84, 51, 145, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  --db-radius:       1.25rem;
  --db-radius-sm:    0.875rem;
  --db-fast:         180ms cubic-bezier(0.4, 0, 0.2, 1);
  --db-normal:       280ms cubic-bezier(0.4, 0, 0.2, 1);
  --db-spring:       480ms cubic-bezier(0.34, 1.56, 0.64, 1);
  font-family: 'Inter', system-ui, sans-serif;
}

/* ---- Keyframes (own scope) ---- */
@keyframes db-fade-up    { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes db-fade-in    { from { opacity: 0; } to { opacity: 1; } }
@keyframes db-scale-in   { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
@keyframes db-gradient-pan {
  0%   { background-position:   0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position:   0% 50%; }
}
@keyframes db-conic-spin  { to { transform: rotate(360deg); } }
@keyframes db-aurora-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.0), var(--db-shadow-md); }
  50%      { box-shadow: 0 0 24px 2px rgba(139, 92, 246, 0.20), var(--db-shadow-md); }
}
@keyframes db-pulse-dot   { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
@keyframes db-shimmer     { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes db-celebrate   { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }

@media (prefers-reduced-motion: reduce) {
  .dashboard-module, .dashboard-module * {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

/* ---- Layout grid ---- */
.dashboard-module.db-root {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
.dashboard-module.db-root > * {
  margin: 0;
}
.dashboard-module .db-section {
  display: block;
  margin: 0;
}
.dashboard-module.db-root > *:not(:first-child) {
  margin-top: 0;
}
.dashboard-module .db-bento {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}
@media (min-width: 768px) {
  .dashboard-module .db-bento-stats    { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .dashboard-module .db-bento-profile  { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dashboard-module .db-actions        { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
}
@media (max-width: 767px) {
  .dashboard-module .db-bento-stats   { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dashboard-module .db-bento-profile { grid-template-columns: 1fr; }
  .dashboard-module .db-actions        { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* ---- Glass card primitive (overrides .glass-card paddings for our context) ---- */
.dashboard-module .db-card {
  position: relative;
  background: var(--db-glass);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter: blur(22px) saturate(180%);
  border: 1px solid var(--db-border);
  border-radius: var(--db-radius);
  box-shadow: var(--db-shadow-md);
  padding: 1.5rem;
  transition: transform var(--db-normal), box-shadow var(--db-normal), background var(--db-normal);
  animation: db-fade-up 0.55s var(--db-spring) both;
}
.dashboard-module .db-card::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.06), transparent 55%);
  pointer-events: none;
}
.dashboard-module .db-card:hover {
  background: var(--db-glass-hi);
  box-shadow: var(--db-shadow-lg);
  transform: translateY(-2px);
}

/* ---- HERO greeting ---- */
.dashboard-module .db-hero {
  position: relative;
  overflow: hidden;
  padding: 1.75rem 1.75rem 1.5rem;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.14), rgba(255, 255, 255, 0.55) 60%, rgba(14, 165, 233, 0.10));
  animation: db-fade-up 0.5s var(--db-spring) both;
}
.dashboard-module .db-hero::after {
  content: '';
  position: absolute;
  top: -40%; right: -10%;
  width: 22rem; height: 22rem;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.30) 0%, transparent 70%);
  filter: blur(20px);
  pointer-events: none;
}
.dashboard-module .db-hero-title {
  font-family: 'Bricolage Grotesque', 'Inter', sans-serif;
  font-size: clamp(1.6rem, 2.6vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.1;
  color: var(--db-ink);
  margin: 0 0 0.4rem 0;
}
.dashboard-module .db-hero-title .db-name {
  background: linear-gradient(120deg, var(--db-brand) 0%, var(--db-brand-glow) 50%, var(--db-brand-light) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: db-gradient-pan 6s ease-in-out infinite;
}
.dashboard-module .db-hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: var(--db-ink-soft);
  font-weight: 500;
}
.dashboard-module .db-hero-meta .dot {
  width: 4px; height: 4px; border-radius: 999px; background: var(--db-hairline);
  display: inline-block;
}
.dashboard-module .db-role-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1px solid;
  backdrop-filter: blur(6px);
}
.dashboard-module .db-role-pill .pulse {
  width: 6px; height: 6px; border-radius: 999px; display: inline-block;
  animation: db-pulse-dot 2s ease-in-out infinite;
}
.dashboard-module .db-role-primary  { background: rgba(84, 51, 145, 0.12);  color: var(--db-brand);  border-color: rgba(84, 51, 145, 0.22); }
.dashboard-module .db-role-primary  .pulse { background: var(--db-brand); }
.dashboard-module .db-role-accent   { background: rgba(245, 158, 11, 0.12); color: #d97706;            border-color: rgba(245, 158, 11, 0.22); }
.dashboard-module .db-role-accent   .pulse { background: #f59e0b; }
.dashboard-module .db-role-info     { background: rgba(14, 165, 233, 0.12); color: #0891b2;            border-color: rgba(14, 165, 233, 0.22); }
.dashboard-module .db-role-info     .pulse { background: #0ea5e9; }

/* ---- STAT cards (KPIs) ---- */
.dashboard-module .db-stat {
  position: relative;
  background: var(--db-glass);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter: blur(22px) saturate(180%);
  border: 1px solid var(--db-border);
  border-radius: var(--db-radius);
  padding: 1.25rem 1.4rem;
  box-shadow: var(--db-shadow-md);
  overflow: hidden;
  transition: transform var(--db-normal), box-shadow var(--db-normal), background var(--db-normal);
  animation: db-fade-up 0.55s var(--db-spring) both;
}
.dashboard-module .db-stat::before {
  content: '';
  position: absolute; inset: 0 0 auto 0;
  height: 55%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.45), transparent);
  pointer-events: none;
}
.dashboard-module .db-stat:hover {
  background: var(--db-glass-hi);
  box-shadow: var(--db-shadow-lg);
  transform: translateY(-3px);
}
.dashboard-module .db-stat-head {
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.85rem;
}
.dashboard-module .db-stat-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.6rem; height: 2.6rem; border-radius: 0.9rem;
  font-size: 1.15rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}
.dashboard-module .db-stat-icon.icon-primary { background: linear-gradient(135deg, rgba(84, 51, 145, 0.16), rgba(139, 92, 246, 0.08)); color: #543391; }
.dashboard-module .db-stat-icon.icon-emerald { background: linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(16, 185, 129, 0.06)); color: #059669; }
.dashboard-module .db-stat-icon.icon-amber   { background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(245, 158, 11, 0.06)); color: #d97706; }
.dashboard-module .db-stat-icon.icon-red     { background: linear-gradient(135deg, rgba(239, 68, 68, 0.16),  rgba(239, 68, 68, 0.06));  color: #dc2626; }
.dashboard-module .db-stat-icon.icon-violet  { background: linear-gradient(135deg, rgba(124, 58, 237, 0.16), rgba(124, 58, 237, 0.06)); color: #7c3aed; }
.dashboard-module .db-stat-icon.icon-sky     { background: linear-gradient(135deg, rgba(14, 165, 233, 0.16), rgba(14, 165, 233, 0.06)); color: #0891b2; }

.dashboard-module .db-stat-badge {
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  padding: 0.18rem 0.55rem; border-radius: 999px;
  background: rgba(16, 185, 129, 0.10);
  color: #047857;
  border: 1px solid rgba(16, 185, 129, 0.18);
}
.dashboard-module .db-stat-badge.soon {
  background: rgba(107, 114, 128, 0.08);
  color: #6b7280;
  border-color: rgba(107, 114, 128, 0.15);
}
.dashboard-module .db-stat-value {
  font-family: 'Bricolage Grotesque', 'Inter', sans-serif;
  font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; color: var(--db-ink);
  line-height: 1; display: flex; align-items: baseline; gap: 0.3rem;
  font-variant-numeric: tabular-nums;
}
.dashboard-module .db-stat-value .unit { font-size: 0.85rem; color: var(--db-ink-soft); font-weight: 600; }
.dashboard-module .db-stat-label {
  margin-top: 0.4rem;
  font-size: 0.78rem;
  color: var(--db-ink-soft);
  font-weight: 500;
}
.dashboard-module .db-stat-trend {
  display: inline-flex; align-items: center; gap: 0.25rem;
  font-size: 0.72rem; font-weight: 600;
  margin-top: 0.55rem;
}
.dashboard-module .db-stat-trend.up   { color: #047857; }
.dashboard-module .db-stat-trend.down { color: #b91c1c; }
.dashboard-module .db-stat-trend.flat { color: #6b7280; }

/* Skeleton (overrides main skeleton for our font-size) */
.dashboard-module .db-skel {
  display: inline-block;
  height: 1.6rem; width: 4rem; border-radius: 0.4rem;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.30) 25%, rgba(255, 255, 255, 0.70) 50%, rgba(255, 255, 255, 0.30) 75%);
  background-size: 200% 100%;
  animation: db-shimmer 1.5s infinite;
}

/* ---- QUICK ACTIONS ---- */
.dashboard-module .db-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}
@media (min-width: 768px) {
  .dashboard-module .db-actions { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
}
.dashboard-module .db-action {
  --c-from: #543391;
  --c-to:   #8b5cf6;
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.65rem;
  padding: 1.4rem 1rem 1.2rem;
  text-align: center;
  background: var(--db-glass);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter: blur(22px) saturate(180%);
  border: 1px solid var(--db-border);
  border-radius: var(--db-radius);
  text-decoration: none;
  color: var(--db-ink);
  box-shadow: var(--db-shadow-md);
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--db-spring), box-shadow var(--db-normal), background var(--db-normal);
  animation: db-fade-up 0.55s var(--db-spring) both;
  isolation: isolate;
}
.dashboard-module .db-action::before {
  content: '';
  position: absolute; inset: -2px;
  border-radius: inherit;
  background: conic-gradient(from var(--db-angle, 0deg), var(--c-from), var(--c-to), var(--c-from));
  opacity: 0;
  transition: opacity var(--db-normal);
  z-index: -2;
  animation: db-conic-spin 4s linear infinite paused;
}
.dashboard-module .db-action::after {
  content: '';
  position: absolute; inset: 1.5px;
  border-radius: inherit;
  background: var(--db-glass);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter: blur(22px) saturate(180%);
  z-index: -1;
  transition: background var(--db-normal);
}
.dashboard-module .db-action:hover {
  transform: translateY(-4px) scale(1.015);
  box-shadow: var(--db-shadow-lg);
}
.dashboard-module .db-action:hover::before { opacity: 1; animation-play-state: running; }
.dashboard-module .db-action:hover::after  { background: var(--db-glass-hi); }
.dashboard-module .db-action:active { transform: translateY(-1px) scale(0.99); }
.dashboard-module .db-action:focus-visible {
  outline: 3px solid var(--db-brand-glow);
  outline-offset: 3px;
}
.dashboard-module .db-action .lead {
  transition: transform var(--db-spring);
}
.dashboard-module .db-action:hover .lead { transform: scale(1.12) rotate(-4deg); }
.dashboard-module .db-action span.lbl {
  font-size: 0.78rem; font-weight: 600; color: var(--db-ink); letter-spacing: 0.005em;
}
.dashboard-module .db-action.from-primary  { --c-from: #543391; --c-to: #8b5cf6; }
.dashboard-module .db-action.from-emerald  { --c-from: #10b981; --c-to: #34d399; }
.dashboard-module .db-action.from-violet   { --c-from: #7c3aed; --c-to: #a78bfa; }
.dashboard-module .db-action.from-amber    { --c-from: #f59e0b; --c-to: #fbbf24; }
.dashboard-module .db-action.from-red      { --c-from: #ef4444; --c-to: #f87171; }

/* ---- PROFILE card ---- */
.dashboard-module .db-profile {
  display: flex; flex-direction: column; gap: 1.1rem;
}
.dashboard-module .db-profile-head {
  display: flex; align-items: center; gap: 1rem;
}
.dashboard-module .db-avatar {
  width: 3.6rem; height: 3.6rem; border-radius: 1rem;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bricolage Grotesque', 'Inter', sans-serif;
  font-size: 1.4rem; font-weight: 800; color: white;
  background: linear-gradient(135deg, #543391 0%, #8b5cf6 100%);
  box-shadow: 0 8px 24px -8px rgba(84, 51, 145, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  letter-spacing: -0.02em;
  animation: db-aurora-glow 4s ease-in-out infinite;
}
.dashboard-module .db-profile-id h4 {
  margin: 0; font-family: 'Bricolage Grotesque', 'Inter', sans-serif;
  font-size: 1.05rem; font-weight: 700; color: var(--db-ink); letter-spacing: -0.015em;
}
.dashboard-module .db-profile-id p {
  margin: 0.15rem 0 0 0; font-size: 0.78rem; color: var(--db-ink-soft); font-weight: 500;
}
.dashboard-module .db-id-row {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid var(--db-hairline);
  border-radius: var(--db-radius-sm);
  font-size: 0.82rem;
}
.dashboard-module .db-id-row .key { color: var(--db-ink-soft); font-weight: 500; min-width: 6.5rem; }
.dashboard-module .db-id-row .val { color: var(--db-ink); font-weight: 600; flex: 1; word-break: break-all; }
.dashboard-module .db-id-row button.copy {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.75rem; height: 2.75rem; border-radius: 0.5rem;
  background: rgba(84, 51, 145, 0.10);
  border: 1px solid rgba(84, 51, 145, 0.18);
  color: var(--db-brand);
  cursor: pointer; padding: 0; flex-shrink: 0;
  transition: all var(--db-fast);
}
.dashboard-module .db-id-row button.copy:hover { background: rgba(84, 51, 145, 0.20); transform: scale(1.06); }
.dashboard-module .db-id-row button.copy:focus-visible {
  outline: 3px solid var(--db-brand-glow);
  outline-offset: 2px;
}
.dashboard-module .db-id-row button.copy.copied { background: rgba(16, 185, 129, 0.20); border-color: rgba(16, 185, 129, 0.30); color: #047857; }
.dashboard-module .db-id-row button.copy i { font-size: 0.85rem; }

/* ---- ACTIVITY timeline ---- */
.dashboard-module .db-activity {
  display: flex; flex-direction: column; gap: 0;
}
.dashboard-module .db-activity-item {
  position: relative;
  display: flex; align-items: flex-start; gap: 0.85rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--db-hairline);
}
.dashboard-module .db-activity-item:last-child { border-bottom: none; }
.dashboard-module .db-activity-item .dot {
  width: 0.55rem; height: 0.55rem; border-radius: 999px; margin-top: 0.45rem; flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.5);
}
.dashboard-module .db-activity-item .dot.t-GENERAL      { background: #543391; }
.dashboard-module .db-activity-item .dot.t-ACADEMICO    { background: #0ea5e9; }
.dashboard-module .db-activity-item .dot.t-DISCIPLINARIO{ background: #ef4444; }
.dashboard-module .db-activity-item .dot.t-ADMINISTRATIVO { background: #f59e0b; }
.dashboard-module .db-activity-item .body { flex: 1; min-width: 0; }
.dashboard-module .db-activity-item .body .t {
  font-size: 0.82rem; color: var(--db-ink); font-weight: 500; line-height: 1.4;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.dashboard-module .db-activity-item .body .meta {
  font-size: 0.7rem; color: var(--db-ink-soft); font-weight: 500; margin-top: 0.2rem;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.dashboard-module .db-empty {
  text-align: center; padding: 1.5rem 0; color: var(--db-ink-soft);
  font-size: 0.85rem; font-weight: 500;
}
.dashboard-module .db-empty i { font-size: 1.5rem; display: block; margin-bottom: 0.4rem; opacity: 0.4; }
.dashboard-module .db-empty img { display: block; margin-bottom: 0.4rem; }

/* ---- Section heading ---- */
.dashboard-module .db-section-title {
  font-size: 0.7rem; font-weight: 700; color: var(--db-ink-soft);
  text-transform: uppercase; letter-spacing: 0.12em;
  margin: 0 0 0.5rem 0.25rem;
  display: flex; align-items: center; gap: 0.5rem;
}
.dashboard-module .db-section-title::before {
  content: ''; width: 0.4rem; height: 0.4rem; border-radius: 999px;
  background: linear-gradient(135deg, var(--db-brand), var(--db-brand-glow));
  display: inline-block;
}

/* Toast for copy */
.dashboard-module .db-toast {
  position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%) translateY(20px);
  background: var(--db-ink); color: white;
  padding: 0.6rem 1rem; border-radius: 999px;
  font-size: 0.8rem; font-weight: 600;
  box-shadow: 0 10px 30px -8px rgba(0, 0, 0, 0.3);
  opacity: 0; pointer-events: none;
  transition: all var(--db-normal);
  z-index: 2000;
  display: inline-flex; align-items: center; gap: 0.4rem;
}
.dashboard-module .db-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;

let styleInjected = false;
let styleEl = null;

export function injectDashboardStyles() {
  if (styleInjected) return;
  styleEl = document.createElement('style');
  styleEl.setAttribute('data-dashboard-styles', '');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);
  styleInjected = true;
}
