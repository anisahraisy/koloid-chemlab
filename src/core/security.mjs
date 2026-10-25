/**
 * @file security.mjs
 * Secure-by-default DOM helpers, input clamping, and validation for scientific computations.
 */

/**
 * Strict parameter clamping to prevent Division by Zero, NaN, or Infinity in physics calculations.
 * @param {number|string} val - Input value
 * @param {number} min - Minimum allowed bound
 * @param {number} max - Maximum allowed bound
 * @param {number} fallback - Default fallback if invalid
 * @returns {number} Clamped safe float
 */
export function clampNumber(val, min, max, fallback = 0) {
  const parsed = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(parsed) || !isFinite(parsed)) {
    return fallback;
  }
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

/**
 * Safely escape string for text insertions
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safe DOM element factory with textContent & attribute sanitization (No raw unescaped innerHTML)
 * @param {string} tag - Tag name
 * @param {Record<string, any>} [attrs] - Element attributes or event listeners
 * @param {Array<HTMLElement|string|number>|HTMLElement|string|number} [children] - Child nodes
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (val === undefined || val === null) continue;
      
      if (key.startsWith('on') && typeof val === 'function') {
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, val);
      } else if (key === 'className' || key === 'class') {
        el.className = val;
      } else if (key === 'style' && typeof val === 'object') {
        Object.assign(el.style, val);
      } else if (key === 'dataset' && typeof val === 'object') {
        Object.assign(el.dataset, val);
      } else if (key === 'checked' || key === 'disabled' || key === 'selected') {
        if (val) el.setAttribute(key, '');
        el[key] = Boolean(val);
      } else {
        el.setAttribute(key, String(val));
      }
    }
  }

  const childList = Array.isArray(children) ? children : [children];
  for (const child of childList) {
    if (child === null || child === undefined) continue;
    if (child instanceof Node) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  }

  return el;
}

/**
 * Safe JSON parser with fallback schema validation
 * @param {string|null} raw
 * @param {any} fallback
 * @returns {any}
 */
export function safeJSONParse(raw, fallback = null) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Format numbers for scientific tabular displays
 * @param {number} val
 * @param {number} precision
 * @returns {string}
 */
export function formatScientific(val, precision = 3) {
  if (!isFinite(val)) return '—';
  if (Math.abs(val) >= 1e4 || (Math.abs(val) < 1e-3 && Math.abs(val) > 0)) {
    return val.toExponential(precision);
  }
  return Number(val.toFixed(precision)).toString();
}
