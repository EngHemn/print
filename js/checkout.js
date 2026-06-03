import { initLayout, getCart, getCartTotal, clearCart, showToast } from "./cart.js";
import { initAllAnimations } from "./animations.js";
import { addOrder } from "./firestore.js";
import { formatPrice } from "./config.js";

function renderOrderSummary() {
  const summary = document.getElementById("order-summary");
  const totalEl = document.getElementById("checkout-total");
  const cart = getCart();

  if (!cart.length) {
    window.location.href = "cart.html";
    return;
  }

  summary.innerHTML = cart
    .map(
      (item) => `
      <div class="summary-item">
        <span>${item.name} × ${item.quantity}</span>
        <span>${formatPrice(item.price * item.quantity)}</span>
      </div>
    `
    )
    .join("");

  if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
}

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type="submit"]');
  const cart = getCart();

  if (!cart.length) {
    showToast("Your cart is empty", "error");
    return;
  }

  const data = {
    fullName: form.fullName.value.trim(),
    phone: form.phone.value.trim(),
    city: form.city.value.trim(),
    street: form.street.value.trim(),
    notes: form.notes.value.trim(),
    products: cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
    })),
    total: getCartTotal(),
  };

  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    await addOrder(data);
    clearCart();
    showToast("Order placed successfully!");
    form.reset();
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch {
    showToast("Failed to submit order. Please try again.", "error");
    btn.disabled = false;
    btn.textContent = "Submit Order";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("shop");
  initAllAnimations();
  renderOrderSummary();

  document.getElementById("checkout-form")?.addEventListener("submit", handleSubmit);
});
