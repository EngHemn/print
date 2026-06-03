import { escapeHtml, formatPrice } from "./config.js";

export const MAX_GALLERY_IMAGES = 15;

export { formatQuantityLabel } from "./product-detail.js";

export function parseGalleryUrls(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function renderImagePreview(container, url, { removable = false, onRemove } = {}) {
  if (!container || !url) return;
  const wrap = document.createElement("div");
  wrap.className = "preview-thumb-wrap";
  wrap.innerHTML = `
    <img src="${escapeHtml(url)}" alt="" class="preview-thumb" />
    ${removable ? `<button type="button" class="preview-remove" aria-label="Remove image">&times;</button>` : ""}
  `;
  if (removable && onRemove) {
    wrap.querySelector(".preview-remove")?.addEventListener("click", onRemove);
  }
  container.appendChild(wrap);
}

export function updateQuantityPreview() {
  const preview = document.getElementById("quantity-preview");
  const form = document.getElementById("product-form");
  if (!preview || !form) return;
  const qty = form.packQuantity?.value || "—";
  const price = form.price?.value;
  preview.textContent =
    price !== "" && price != null
      ? `Preview: ${qty} by ${formatPrice(Number(price))}`
      : `Preview: ${qty}`;
}

export function syncGalleryHint(count) {
  const hint = document.getElementById("gallery-hint");
  if (hint) hint.textContent = `${count} / ${MAX_GALLERY_IMAGES} gallery images`;
}
