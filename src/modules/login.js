/**
 * Login module — entry point.
 *
 * The implementation now lives in ./login/ and is broken down into
 * self-contained sections (background, branding, form, footer), a
 * state machine, and validation rules. This file is kept as a thin
 * re-export so existing callers (e.g. main.js) keep working unchanged.
 */

export { loginModule, LoginModule } from './login/index.js';
