import { formatPrice, escapeHtml } from "./config.js";
import { normalizeColors, renderColorSwatchesHTML } from "./product-colors.js";

export function formatQuantityLabel(product) {
  const qty = product.packQuantity ?? product.quantity;
  if (qty != null && qty !== "") {
    return `${qty} by ${formatPrice(product.price)}`;
  }
  if (product.quantityLabel) return product.quantityLabel;
  return formatPrice(product.price);
}

/** Pack quantity + price for shop/home product cards */
export function formatCardPriceLine(product) {
  const price = formatPrice(product.price);
  const qty = product.packQuantity ?? product.quantity;
  if (qty != null && qty !== "") {
    return {
      pack: String(qty),
      price,
    };
  }
  return { pack: "", price };
}

export function productPageUrl(productId) {
  return `product.html?id=${encodeURIComponent(productId)}`;
}

export function adminProductViewUrl(productId) {
  return `admin-product-view.html?id=${encodeURIComponent(productId)}`;
}

export function getProductGallery(product) {
  return [...new Set([product?.image, ...(Array.isArray(product?.images) ? product.images : [])].filter(Boolean))];
}

/**
 * @param {object} product
 * @param {{ categoryName?: string, showActions?: boolean }} options
 */
export function renderProductDetailMarkup(product, options = {}) {
  const { categoryName = "", showActions = true } = options;
  const images = getProductGallery(product);
  const mainSrc = images[0] || "images/placeholder-bag.svg";
  const maxQty = Math.max(1, Number(product.stock) || 99);
  const colors = normalizeColors(product.colors);
  const colorsHtml = colors.length
    ? `<div class="product-colors-block">
        <span class="product-colors-label">Colors</span>
        ${renderColorSwatchesHTML(colors, { size: "lg" })}
      </div>`
    : "";

  return `
    <div class="product-view-grid">
      <div class="product-view-gallery glass-card">
        <div class="product-view-main">
          <img src="${escapeHtml(mainSrc)}" alt="${escapeHtml(product.name)}" class="product-view-main-img" id="product-main-img" />
        </div>
        ${
          images.length > 1
            ? `<div class="product-view-thumbs" role="list">
            ${images
              .map(
                (url, i) => `
              <button type="button" class="product-view-thumb${i === 0 ? " active" : ""}" data-img="${escapeHtml(url)}" aria-label="View image ${i + 1}">
                <img src="${escapeHtml(url)}" alt="" loading="lazy" />
              </button>
            `
              )
              .join("")}
          </div>`
            : ""
        }
      </div>
      <div class="product-view-info glass-card">
        ${categoryName ? `<p class="product-view-category">${escapeHtml(categoryName)}</p>` : ""}
        <h1 class="product-view-title">${escapeHtml(product.name)}</h1>
        <p class="product-view-pack">${escapeHtml(formatQuantityLabel(product))}</p>
        <p class="product-view-price gradient-text">${formatPrice(product.price)}</p>
        <p class="product-view-desc">${escapeHtml(product.description || "Premium quality bag from Shopping Bag Erbil.")}</p>
        ${colorsHtml}
        <ul class="product-view-meta">
          <li><span>In stock</span><strong>${product.stock ?? "—"}</strong></li>
          ${product.packQuantity ? `<li><span>Pack quantity</span><strong>${escapeHtml(String(product.packQuantity))}</strong></li>` : ""}
        </ul>
        ${
          showActions
            ? `
        <div class="quantity-selector product-view-qty">
          <button type="button" class="qty-btn" data-qty="minus" aria-label="Decrease quantity">−</button>
          <input type="number" class="qty-input" id="product-qty-input" value="1" min="1" max="${maxQty}" aria-label="Quantity" />
          <button type="button" class="qty-btn" data-qty="plus" aria-label="Increase quantity">+</button>
        </div>
        <div class="product-view-actions">
          <button type="button" class="btn btn-primary btn-3d" id="product-add-cart">Add To Cart</button>
          <a href="shop.html" class="btn btn-outline btn-3d">Back to Shop</a>
        </div>`
            : ""
        }
      </div>
    </div>
  `;
}

export function bindProductGallery(root) {
  if (!root) return;
  const mainImg = root.querySelector(".product-view-main-img, #product-main-img");
  root.querySelectorAll(".product-view-thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (mainImg) mainImg.src = btn.dataset.img;
      root.querySelectorAll(".product-view-thumb").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

export function bindProductQuantity(root) {
  const qtyInput = root?.querySelector("#product-qty-input, .qty-input");
  if (!qtyInput) return null;
  root.querySelector('[data-qty="minus"]')?.addEventListener("click", () => {
    qtyInput.value = String(Math.max(1, Number(qtyInput.value) - 1));
  });
  root.querySelector('[data-qty="plus"]')?.addEventListener("click", () => {
    qtyInput.value = String(Math.min(Number(qtyInput.max), Number(qtyInput.value) + 1));
  });
  return qtyInput;
}
