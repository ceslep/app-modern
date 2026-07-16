import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

const COLOMBIA_TZ = 'America/Bogota';

/**
 * Format date string to locale format
 */
export function formatDate(dateStr, format = 'DD/MM/YYYY') {
  if (!dateStr) return '';
  const date = dayjs(dateStr);
  return date.isValid() ? date.format(format) : '';
}

/**
 * Format datetime string
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = dayjs(dateStr);
  return date.isValid() ? date.format('DD/MM/YYYY HH:mm') : '';
}

/**
 * Format time only
 */
export function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = dayjs(dateStr);
  return date.isValid() ? date.format('HH:mm') : '';
}

/**
 * Format number with decimals
 */
export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || num === '') return '';
  return Number(num).toFixed(decimals);
}

/**
 * Format as currency (COP)
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return '';
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Get current date/time in Colombia timezone
 */
export function getColombiaDate() {
  return dayjs().tz(COLOMBIA_TZ);
}

/**
 * Format Colombia date
 */
export function formatColombiaDate(dateStr, format = 'DD/MM/YYYY HH:mm') {
  if (!dateStr) return '';
  return dayjs(dateStr).tz(COLOMBIA_TZ).format(format);
}

/**
 * Get relative time (e.g., "hace 2 horas")
 */
export function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  return dayjs(dateStr).fromNow();
}

/**
 * Check if date is today
 */
export function isToday(dateStr) {
  if (!dateStr) return false;
  return dayjs(dateStr).isSame(dayjs(), 'day');
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate) {
  if (!birthDate) return null;
  return dayjs().diff(dayjs(birthDate), 'year');
}

/**
 * Get grade CSS class (pass/fail)
 */
export function getGradeClass(grade, passingGrade = 3.0) {
  const num = Number(grade);
  if (isNaN(num)) return '';
  return num >= passingGrade ? 'grade-pass' : 'grade-fail';
}

/**
 * Check if grade is passing
 */
export function isPassingGrade(grade, passingGrade = 3.0) {
  const num = Number(grade);
  if (isNaN(num)) return false;
  return num >= passingGrade;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str, maxLength = 50) {
  if (!str || str.length <= maxLength) return str || '';
  return str.substring(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format full name
 */
export function formatFullName(names, lastNames) {
  return `${names || ''} ${lastNames || ''}`.trim();
}
