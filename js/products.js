import { formatPrice, escapeHtml } from "./config.js";
import {
  addToCart,
  toggleWishlist,
  isInWishlist,
  showToast,
  openCartDrawer,
} from "./cart.js";

export function renderProductCard(product, options = {}) {
  const { showWishlist = true, showAddToCart = true } = options;
  const wished = isInWishlist(product.id);

  return `
    <article class="product-card card-3d fade-in" data-product-id="${product.id}">
      <div class="product-image-wrap">
        <img src="${product.image || "images/placeholder-bag.svg"}" alt="${escapeHtml(product.name)}" loading="lazy" class="product-image" />
        ${showWishlist ? `<button class="wishlist-btn ${wished ? "active" : ""}" data-wishlist="${product.id}" aria-label="Add to wishlist">
          <svg viewBox="0 0 24 24" fill="${wished ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>` : ""}
        <div class="product-overlay">
          <button class="btn btn-sm btn-outline view-product" data-view="${product.id}">Quick View</button>
        </div>
      </div>
      <div class="product-info">
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <p class="product-price gradient-text">${formatPrice(product.price)}</p>
        ${showAddToCart ? `<button class="btn btn-primary btn-3d btn-sm add-to-cart" data-add="${product.id}">Add To Cart</button>` : ""}
      </div>
    </article>
  `;
}

export function bindProductEvents(products, container) {
  if (!container) return;

  container.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add]");
    if (addBtn) {
      const product = products.find((p) => p.id === addBtn.dataset.add);
      if (product) {
        addToCart(product);
        showToast(`${product.name} added to cart`);
        openCartDrawer();
      }
      return;
    }

    const wishBtn = e.target.closest("[data-wishlist]");
    if (wishBtn) {
      const id = wishBtn.dataset.wishlist;
      const active = toggleWishlist(id);
      wishBtn.classList.toggle("active", active);
      const svg = wishBtn.querySelector("svg");
      if (svg) svg.setAttribute("fill", active ? "currentColor" : "none");
      showToast(active ? "Added to wishlist" : "Removed from wishlist");
      return;
    }

    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn) {
      const product = products.find((p) => p.id === viewBtn.dataset.view);
      if (product) openProductModal(product);
    }
  });
}

export function openProductModal(product) {
  let modal = document.getElementById("product-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "product-modal";
    modal.className = "modal";
    modal.innerHTML = `<div class="modal-overlay"></div><div class="modal-content glass-card"></div>`;
    document.body.appendChild(modal);
  }

  const content = modal.querySelector(".modal-content");
  content.innerHTML = `
    <button class="modal-close" aria-label="Close">&times;</button>
    <div class="modal-grid">
      <div class="modal-image">
        <img src="${product.image || "images/placeholder-bag.svg"}" alt="${escapeHtml(product.name)}" />
      </div>
      <div class="modal-details">
        <h2>${escapeHtml(product.name)}</h2>
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
    openCartDrawer();
  };
}

export function filterProducts(products, { search = "", categoryId = "" } = {}) {
  return products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryId || p.categoryId === categoryId;
    return matchSearch && matchCategory;
  });
}

export { renderCategoryCard } from "./categories.js";
