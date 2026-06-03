import { initLayout, getCart, getCartTotal, clearCart, showToast } from "./cart.js";
import { initAllAnimations } from "./animations.js";
import { addOrder } from "./firestore.js";
import { formatPrice, WHATSAPP_ORDER_NUMBER } from "./config.js";

const ERBIL_CENTER = [36.1911, 44.0092];
const DEFAULT_ZOOM = 13;

let mapInstance = null;
let mapMarker = null;
let pendingMapLat = null;
let pendingMapLng = null;

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

function updateMapPickedLabel(lat, lng) {
  const label = document.getElementById("map-picked-label");
  if (!label) return;
  if (lat != null && lng != null) {
    label.textContent = `Pin set: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
    label.classList.add("has-pin");
  } else {
    label.textContent = "No pin selected yet";
    label.classList.remove("has-pin");
  }
}

function initMapPicker() {
  const modal = document.getElementById("map-picker-modal");
  const openBtn = document.getElementById("open-map-picker");
  const closeBtn = modal?.querySelector(".map-picker-close");
  const overlay = modal?.querySelector(".map-picker-overlay");
  const confirmBtn = document.getElementById("confirm-map-location");
  const latInput = document.getElementById("mapLat");
  const lngInput = document.getElementById("mapLng");

  if (!modal || !openBtn || typeof window.L === "undefined") return;

  const closeModal = () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  };

  const openModal = () => {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");

    if (!mapInstance) {
      mapInstance = window.L.map("checkout-map", { scrollWheelZoom: true }).setView(
        ERBIL_CENTER,
        DEFAULT_ZOOM
      );
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(mapInstance);

      mapInstance.on("click", (e) => {
        const { lat, lng } = e.latlng;
        pendingMapLat = lat;
        pendingMapLng = lng;
        if (mapMarker) {
          mapMarker.setLatLng(e.latlng);
        } else {
          mapMarker = window.L.marker(e.latlng).addTo(mapInstance);
        }
        if (confirmBtn) confirmBtn.disabled = false;
      });
    }

    const savedLat = latInput?.value;
    const savedLng = lngInput?.value;
    if (savedLat && savedLng) {
      const lat = Number(savedLat);
      const lng = Number(savedLng);
      pendingMapLat = lat;
      pendingMapLng = lng;
      if (mapMarker) mapMarker.setLatLng([lat, lng]);
      else mapMarker = window.L.marker([lat, lng]).addTo(mapInstance);
      mapInstance.setView([lat, lng], 15);
      if (confirmBtn) confirmBtn.disabled = false;
    } else {
      pendingMapLat = null;
      pendingMapLng = null;
      if (confirmBtn) confirmBtn.disabled = true;
    }

    requestAnimationFrame(() => {
      mapInstance.invalidateSize();
    });
  };

  openBtn.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  overlay?.addEventListener("click", closeModal);

  confirmBtn?.addEventListener("click", () => {
    if (pendingMapLat == null || pendingMapLng == null) return;
    if (latInput) latInput.value = String(pendingMapLat);
    if (lngInput) lngInput.value = String(pendingMapLng);
    updateMapPickedLabel(pendingMapLat, pendingMapLng);
    closeModal();
    showToast("Delivery pin saved");
  });
}

function buildWhatsAppUrl(orderData, cart) {
  const lines = [
    "*New order — Shopping Bag*",
    "",
    `Name: ${orderData.fullName}`,
    `Phone: ${orderData.phone}`,
  ];

  if (orderData.street) lines.push(`Address: ${orderData.street}`);
  if (orderData.mapLat != null && orderData.mapLng != null) {
    lines.push(
      `Map: https://www.google.com/maps?q=${orderData.mapLat},${orderData.mapLng}`
    );
  }
  if (orderData.notes) lines.push(`Notes: ${orderData.notes}`);

  lines.push("", "*Items:*");
  cart.forEach((item) => {
    lines.push(
      `• ${item.name} × ${item.quantity} — ${formatPrice(item.price * item.quantity)}`
    );
  });
  lines.push("", `*Total: ${formatPrice(orderData.total)}*`);

  return `https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
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

  const mapLat = form.mapLat?.value?.trim();
  const mapLng = form.mapLng?.value?.trim();

  const data = {
    fullName: form.fullName.value.trim(),
    phone: form.phone.value.trim(),
    street: form.street.value.trim(),
    notes: form.notes.value.trim(),
    mapLat: mapLat ? Number(mapLat) : null,
    mapLng: mapLng ? Number(mapLng) : null,
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

  const whatsappUrl = buildWhatsAppUrl(data, cart);

  try {
    await addOrder(data);
  } catch (err) {
    console.error("[Checkout] Firestore save failed:", err);
  }

  clearCart();
  window.location.href = whatsappUrl;
}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("shop");
  initAllAnimations();
  renderOrderSummary();
  initMapPicker();

  document.getElementById("checkout-form")?.addEventListener("submit", handleSubmit);
});
