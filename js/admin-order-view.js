import { formatPrice, formatDate, escapeHtml } from "./config.js";
import { showToast } from "./cart.js";
import { getOrderById, updateOrderStatus } from "./firestore.js";
import { initAdminLayout } from "./admin-layout.js";
import { setElementVisible } from "./admin-ui-states.js";
import { ADMIN_MESSAGES } from "./admin-messages.js";

let orderId = null;

function formatAddress(order) {
  const parts = [order.city, order.street].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function renderOrderProducts(products) {
  if (!products?.length) {
    return `<p class="field-hint">No products in this order.</p>`;
  }

  return `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${products
            .map(
              (p) => `
            <tr>
              <td><img src="${escapeHtml(p.image || "images/placeholder-bag.svg")}" alt="" class="table-thumb" /></td>
              <td>${escapeHtml(p.name)}</td>
              <td>${p.quantity ?? 1}</td>
              <td>${formatPrice(p.price)}</td>
              <td>${formatPrice((Number(p.price) || 0) * (Number(p.quantity) || 1))}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function hasOrderLocation(order) {
  const lat = Number(order.mapLat);
  const lng = Number(order.mapLng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function renderOrderLocation(order) {
  if (!hasOrderLocation(order)) return "";

  const lat = Number(order.mapLat);
  const lng = Number(order.mapLng);
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return `
    <div class="admin-order-location glass-card">
      <h4 class="admin-order-products-title">Delivery Location</h4>
      <div id="admin-order-map" class="admin-order-map" aria-label="Delivery location map"></div>
      <p class="admin-order-coords">
        ${lat.toFixed(5)}, ${lng.toFixed(5)}
        · <a href="${mapsUrl}" target="_blank" rel="noopener">Open in Google Maps</a>
      </p>
    </div>
  `;
}

function initOrderLocationMap(order) {
  if (!hasOrderLocation(order) || typeof window.L === "undefined") return;

  const mapEl = document.getElementById("admin-order-map");
  if (!mapEl) return;

  const lat = Number(order.mapLat);
  const lng = Number(order.mapLng);

  const map = window.L.map(mapEl, {
    scrollWheelZoom: false,
    dragging: true,
    zoomControl: true,
  }).setView([lat, lng], 15);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  window.L.marker([lat, lng]).addTo(map);

  requestAnimationFrame(() => {
    map.invalidateSize();
  });
}

function renderAdminOrderView(order) {
  const hasLocation = hasOrderLocation(order);
  return `
    <div class="admin-product-view admin-order-view${hasLocation ? " admin-order-view--has-location" : ""}">
      ${renderOrderLocation(order)}
      <div class="admin-product-view-details admin-order-view-details">
        <h3 class="admin-view-name">${escapeHtml(order.fullName || "Order")}</h3>
        <dl class="admin-view-dl">
          <div><dt>Phone</dt><dd>${escapeHtml(order.phone || "—")}</dd></div>
          <div><dt>Address</dt><dd>${escapeHtml(formatAddress(order))}</dd></div>
          <div><dt>Notes</dt><dd>${escapeHtml(order.notes || "—")}</dd></div>
          <div><dt>Total</dt><dd>${formatPrice(order.total)}</dd></div>
          <div><dt>Status</dt><dd>
            <select class="order-status" id="order-view-status" data-id="${escapeHtml(order.id)}">
              ${["Pending", "Processing", "Delivered"]
                .map(
                  (s) =>
                    `<option value="${s}" ${order.status === s ? "selected" : ""}>${s}</option>`
                )
                .join("")}
            </select>
          </dd></div>
          <div><dt>Date</dt><dd>${formatDate(order.createdAt)}</dd></div>
        </dl>

        <h4 class="admin-order-products-title">Products</h4>
        ${renderOrderProducts(order.products)}

        <div class="admin-view-footer">
          <a href="admin-dashboard.html#orders" class="btn btn-outline">Back to Orders</a>
        </div>
      </div>
    </div>
  `;
}

async function loadOrderView() {
  const root = document.getElementById("admin-order-view-root");
  const loading = document.getElementById("admin-order-view-loading");
  const error = document.getElementById("admin-order-view-error");

  setElementVisible(loading, true);
  setElementVisible(error, false);
  root.querySelector(".admin-order-view")?.remove();

  if (!orderId) {
    setElementVisible(loading, false);
    setElementVisible(error, true);
    if (error?.querySelector("p")) error.querySelector("p").textContent = "Missing order ID.";
    return;
  }

  try {
    const order = await getOrderById(orderId);

    setElementVisible(loading, false);

    if (!order) {
      setElementVisible(error, true);
      if (error?.querySelector("p")) error.querySelector("p").textContent = "Order not found.";
      return;
    }

    const title = document.querySelector(".admin-topbar h2");
    if (title) title.textContent = order.fullName || "View Order";

    root.insertAdjacentHTML("beforeend", renderAdminOrderView(order));
    initOrderLocationMap(order);

    document.getElementById("order-view-status")?.addEventListener("change", async (e) => {
      try {
        await updateOrderStatus(e.target.dataset.id, e.target.value);
        showToast("Order status updated");
      } catch {
        showToast("Failed to update order", "error");
      }
    });
  } catch (err) {
    console.error("[Admin] View order failed:", err);
    setElementVisible(loading, false);
    setElementVisible(error, true);
    if (error?.querySelector("p")) {
      error.querySelector("p").textContent = ADMIN_MESSAGES.ordersError;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminLayout("orders");
  orderId = new URLSearchParams(window.location.search).get("id")?.trim();
  document.getElementById("admin-order-view-retry")?.addEventListener("click", loadOrderView);
  loadOrderView();
});
