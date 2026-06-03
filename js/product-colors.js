import { escapeHtml } from "./config.js";

export const MAX_PRODUCT_COLORS = 12;

/** @param {string} value */
export function normalizeHexColor(value) {
  if (!value || typeof value !== "string") return null;
  let hex = value.trim().toLowerCase();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : null;
}

/** @param {unknown} raw */
export function normalizeColors(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const hex = normalizeHexColor(String(item));
    if (hex && !seen.has(hex)) {
      seen.add(hex);
      out.push(hex);
      if (out.length >= MAX_PRODUCT_COLORS) break;
    }
  }
  return out;
}

/**
 * @param {string[]} colors
 * @param {{ size?: 'sm' | 'md' | 'lg', interactive?: boolean }} [options]
 */
export function renderColorSwatchesHTML(colors, options = {}) {
  const list = normalizeColors(colors);
  if (!list.length) return "";

  const size = options.size || "md";
  const interactive = options.interactive ?? false;

  return `<div class="color-swatches color-swatches--${size}${interactive ? " color-swatches--interactive" : ""}" role="list" aria-label="Available colors">
    ${list
      .map(
        (hex) => `
      <span
        class="color-swatch"
        role="listitem"
        style="background-color: ${hex}"
        title="${escapeHtml(hex)}"
        aria-label="Color ${escapeHtml(hex)}"
      ></span>
    `
      )
      .join("")}
  </div>`;
}
