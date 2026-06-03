import { initLayout, getCart, removeFromCart, updateQuantity, getCartTotal } from "./cart.js";
import { initAllAnimations } from "./animations.js";
import { formatPrice } from "./config.js";

function renderCartPage() {
  const container = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-cart glass-card fade-in">
        <p>Your cart is empty</p>
        <a href="shop.html" class="btn btn-primary btn-3d">Continue Shopping</a>
      </div>
    `;
    if (totalEl) totalEl.textContent = formatPrice(0);
    return;
  }

  container.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item glass-card slide-up" data-id="${item.id}">
        <img src="${item.image}" alt="${item.name}" loading="lazy" />
        <div class="cart-item-info">
          <h3>${item.name}</h3>
          <p class="cart-item-price">${formatPrice(item.price)}</p>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn cart-qty-minus" data-id="${item.id}">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn cart-qty-plus" data-id="${item.id}">+</button>
        </div>
        <p class="cart-item-subtotal">${formatPrice(item.price * item.quantity)}</p>
        <button class="cart-remove" data-remove="${item.id}" aria-label="Remove">&times;</button>
      </div>
    `
    )
    .join("");

  if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
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
      const item = getCart().find((i) => i.id === minus.dataset.id);
      if (item) updateQuantity(item.id, item.quantity - 1);
      renderCartPage();
      return;
    }

    const plus = e.target.closest(".cart-qty-plus");
    if (plus) {
      const item = getCart().find((i) => i.id === plus.dataset.id);
      if (item) updateQuantity(item.id, item.quantity + 1);
      renderCartPage();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("shop");
  initAllAnimations();
  bindCartEvents();
  renderCartPage();
});
