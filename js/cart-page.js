import {
  initLayout,
  getCart,
  removeFromCart,
  updateQuantity,
  getCartTotal,
  showToast,
} from "./cart.js";
import { initAllAnimations } from "./animations.js";
import { formatPrice, escapeHtml } from "./config.js";

function cartItemId(id) {
  return id == null ? "" : String(id);
}

function renderCartPage() {
  const container = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!container) return;

  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-cart glass-card">
        <p>Your cart is empty</p>
        <a href="shop.html" class="btn btn-primary btn-3d">Continue Shopping</a>
      </div>
    `;
    if (totalEl) totalEl.textContent = formatPrice(0);
    updateCheckoutButton(false);
    return;
  }

  container.innerHTML = cart
    .map((item) => {
      const id = escapeHtml(cartItemId(item.id));
      const image =
        item.image ||
        (Array.isArray(item.images) ? item.images[0] : "") ||
        "images/placeholder-bag.svg";
      return `
      <div class="cart-item glass-card" data-id="${id}">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" loading="lazy" />
        <div class="cart-item-info">
          <h3>${escapeHtml(item.name)}</h3>
          <p class="cart-item-price">${formatPrice(item.price)}</p>
        </div>
        <div class="cart-item-qty">
          <button type="button" class="qty-btn cart-qty-minus" data-id="${id}">−</button>
          <span>${item.quantity}</span>
          <button type="button" class="qty-btn cart-qty-plus" data-id="${id}">+</button>
        </div>
        <p class="cart-item-subtotal">${formatPrice(item.price * item.quantity)}</p>
        <button type="button" class="cart-remove" data-remove="${id}" aria-label="Remove">&times;</button>
      </div>
    `;
    })
    .join("");

  if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
  updateCheckoutButton(true);
}

function updateCheckoutButton(hasItems) {

  const checkoutBtn = document.getElementById("cart-checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.disabled = !hasItems;
    checkoutBtn.setAttribute("aria-disabled", String(!hasItems));
  }
}

function bindCartEvents() {
  const container = document.getElementById("cart-items");
  if (!container || container.dataset.bound) return;
  container.dataset.bound = "true";

  container.addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) {
      removeFromCart(removeBtn.dataset.remove);
      renderCartPage();
      return;
    }

    const minus = e.target.closest(".cart-qty-minus");
    if (minus) {
      const item = getCart().find((i) => cartItemId(i.id) === minus.dataset.id);
      if (item) updateQuantity(item.id, item.quantity - 1);
      renderCartPage();
      return;
    }

    const plus = e.target.closest(".cart-qty-plus");
    if (plus) {
      const item = getCart().find((i) => cartItemId(i.id) === plus.dataset.id);
      if (item) updateQuantity(item.id, item.quantity + 1);
      renderCartPage();
    }
  });
}

function bindCheckoutButton() {
  document.getElementById("cart-checkout-btn")?.addEventListener("click", () => {
    if (!getCart().length) {
      showToast("Your cart is empty", "error");
      return;
    }
    window.location.href = "checkout.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("shop");
  initAllAnimations();
  bindCartEvents();
  bindCheckoutButton();
  renderCartPage();
  window.addEventListener("cart-updated", renderCartPage);
});
