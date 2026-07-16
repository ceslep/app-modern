/**
 * DOM utility functions for safe element manipulation
 */

/**
 * Create a DOM element with attributes and children
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'innerHTML') {
      el.innerHTML = value;
    } else if (key === 'textContent') {
      el.textContent = value;
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    } else if (Array.isArray(child)) {
      child.forEach((c) => {
        if (c instanceof Node) el.appendChild(c);
      });
    }
  }

  return el;
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Remove all children from an element
 */
export function clearElement(el) {
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * Show an element (remove d-none)
 */
export function show(el) {
  if (!el) return;
  el.classList.remove('hidden');
}

/**
 * Hide an element (add hidden)
 */
export function hide(el) {
  if (!el) return;
  el.classList.add('hidden');
}

/**
 * Toggle element visibility
 */
export function toggle(el, visible) {
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

/**
 * Check if element is visible
 */
export function isVisible(el) {
  if (!el) return false;
  return !el.classList.contains('hidden');
}

/**
 * Get element by ID (shorthand)
 */
export function $(id) {
  return document.getElementById(id);
}

/**
 * Query selector (shorthand)
 */
export function $$(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Query all (shorthand)
 */
export function $$$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

/**
 * Wait for DOM to be ready
 */
export function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

/**
 * Debounce function calls
 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function calls
 */
export function throttle(fn, limit = 100) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Set HTML content safely (with escape)
 */
export function setHtml(el, html) {
  if (!el) return;
  el.innerHTML = html;
}

/**
 * Set text content safely
 */
export function setText(el, text) {
  if (!el) return;
  el.textContent = text;
}

/**
 * Add event listener with delegation
 */
export function delegate(parent, eventType, selector, handler) {
  if (!parent) return;
  parent.addEventListener(eventType, (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler(e, target);
    }
  });
}
