/**
 * Greeting helper — produces a time-of-day aware salutation
 * and a long Spanish (es-CO) date string.
 */

const SALUDOS = [
  { from: 5,  to: 12, label: 'Buenos días' },
  { from: 12, to: 19, label: 'Buenas tardes' },
  { from: 19, to: 24, label: 'Buenas noches' },
  { from: 0,  to: 5,  label: 'Buenas noches' },
];

export function getGreetingForHour(hour) {
  const h = Number.isFinite(hour) ? hour : new Date().getHours();
  return SALUDOS.find((s) => h >= s.from && h < s.to)?.label || 'Bienvenido';
}

export function getLongDateEs(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString('es-CO');
  }
}

export function getRoleDescriptor(user) {
  if (!user) return { label: 'Docente', variant: 'primary' };
  if (user.maestra === 'Si' || user.role === 'maestra') {
    return { label: 'Maestra', variant: 'accent' };
  }
  const nombres = (user.nombres || '').toUpperCase();
  if (nombres.includes('COORDI')) {
    return { label: 'Coordinador', variant: 'info' };
  }
  return { label: 'Docente', variant: 'primary' };
}
