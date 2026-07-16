/**
 * Dashboard module — entry point.
 *
 * The implementation now lives in ./dashboard/ and is broken down into
 * self-contained sections (greeting, stats, quick actions, profile,
 * activity). This file is kept as a thin re-export so existing callers
 * (e.g. login.js) keep working unchanged.
 */

export { initDashboard } from './dashboard/index.js';
