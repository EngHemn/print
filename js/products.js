import { formatPrice, escapeHtml } from "./config.js";
import { productPageUrl, formatQuantityLabel, formatCardPriceLine } from "./product-detail.js";

export { formatQuantityLabel } from "./product-detail.js";

import { addToCart, showToast } from "./cart.js";

export function renderProductCard(product) {
  const viewUrl = productPageUrl(product.id);
  const { pack, price } = formatCardPriceLine(product);
  const priceHtml = pack
    ? `<span class="product-pack-qty">${escapeHtml(pack)}</span><span class="product-price-value gradient-text">${price}</span>`
    : `<span class="product-price-value gradient-text">${price}</span>`;

  return `
    <a href="${viewUrl}" class="product-card card-3d fade-in" data-product-id="${product.id}">
      <div class="product-image-wrap">
        <img src="${product.image || "images/placeholder-bag.svg"}" alt="${escapeHtml(product.name)}" loading="lazy" class="product-image" />
      </div>
      <div class="product-info">
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <p class="product-price">${priceHtml}</p>
      </div>
    </a>
  `;
}

export function bindProductEvents() {}

export function openProductModal(product) {
  let modal = document.getElementById("product-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "product-modal";
    modal.className = "modal";
    modal.innerHTML = `<div class="modal-overlay"></div><div class="modal-content glass-card"></div>`;
    document.body.appendChild(modal);
  }

  const gallery = [
    product.image,
    ...(Array.isArray(product.images) ? product.images : []),
  ].filter(Boolean);
  const uniqueImages = [...new Set(gallery)];

  const content = modal.querySelector(".modal-content");
  content.innerHTML = `
    <button class="modal-close" aria-label="Close">&times;</button>
    <div class="modal-grid">
      <div class="modal-image">
        <img src="${uniqueImages[0] || "images/placeholder-bag.svg"}" alt="${escapeHtml(product.name)}" class="modal-main-img" />
        ${uniqueImages.length > 1 ? `
          <div class="modal-gallery-thumbs">
            ${uniqueImages.map((url, i) => `
              <button type="button" class="modal-thumb ${i === 0 ? "active" : ""}" data-img="${escapeHtml(url)}">
                <img src="${url}" alt="" />
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <div class="modal-details">
        <h2>${escapeHtml(product.name)}</h2>
        <p class="modal-quantity">${escapeHtml(formatQuantityLabel(product))}</p>
        <p class="modal-price gradient-text">${formatPrice(product.price)}</p>
        <p class="modal-desc">${escapeHtml(product.description || "Premium quality bag from Shopping Bag Erbil.")}</p>
        <p class="modal-stock">In stock: ${product.stock ?? "—"}</p>
        <div class="quantity-selector">
          <button class="qty-btn" data-qty="minus">−</button>
          <input type="number" class="qty-input" value="1" min="1" max="${product.stock || 99}" />
          <button class="qty-btn" data-qty="plus">+</button>
        </div>
        <button class="btn btn-primary btn-3d modal-add-cart">Add To Cart</button>
      </div>
    </div>
  `;

  content.querySelectorAll(".modal-thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mainImg = content.querySelector(".modal-main-img");
      if (mainImg) mainImg.src = btn.dataset.img;
      content.querySelectorAll(".modal-thumb").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  modal.classList.add("open");
  document.body.classList.add("no-scroll");

  const close = () => {
    modal.classList.remove("open");
    document.body.classList.remove("no-scroll");
  };

  modal.querySelector(".modal-overlay").onclick = close;
  modal.querySelector(".modal-close").onclick = close;

  const qtyInput = content.querySelector(".qty-input");
  content.querySelector('[data-qty="minus"]').onclick = () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
  };
  content.querySelector('[data-qty="plus"]').onclick = () => {
    qtyInput.value = Math.min(Number(qtyInput.max), Number(qtyInput.value) + 1);
  };

  content.querySelector(".modal-add-cart").onclick = () => {
    addToCart(product, Number(qtyInput.value));
    showToast(`${product.name} added to cart`);
    close();
  };
}

export function getProductCategoryId(product) {
  const id = product?.categoryId ?? product?.category ?? "";
  return id == null ? "" : String(id).trim();
}

export function filterProducts(products, { search = "", categoryId = "" } = {}) {
  const cat = categoryId == null || categoryId === "" ? "" : String(categoryId).trim();

  return products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = !cat || getProductCategoryId(p) === cat;
    return matchSearch && matchCategory;
  });
}

export { renderCategoryCard } from "./categories.js";
