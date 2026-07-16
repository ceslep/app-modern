let USE_LEGACY_ENDPOINTS = true;

const PREFIXES = {
  legacy: '/app/app-modern/server/legacy',
  original: '/app',
};

export function endpoint(path) {
  const prefix = USE_LEGACY_ENDPOINTS ? PREFIXES.legacy : PREFIXES.original;
  return `${prefix}${path}`;
}

export function isLegacy() { return USE_LEGACY_ENDPOINTS; }
export function toggleLegacy(v) { USE_LEGACY_ENDPOINTS = v; }
