import { COMPANY } from "./config.js";

const CART_KEY = "shopping_bag_cart";

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
  window.dispatchEvent(new CustomEvent("cart-updated", { detail: cart }));
}

export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function updateCartCount() {
  const count = getCartCount();
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count;
    el.classList.toggle("visible", count > 0);
  });
}

export function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image,
      quantity,
    });
  }

  saveCart(cart);
  return cart;
}

export function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
  return cart;
}

export function updateQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    saveCart(cart);
  }
  return cart;
}

export function clearCart() {
  saveCart([]);
}

export function getCartTotal() {
  return getCart().reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
}

export function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem("shopping_bag_wishlist")) || [];
  } catch {
    return [];
  }
}

export function saveWishlist(list) {
  localStorage.setItem("shopping_bag_wishlist", JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: list }));
}

export function toggleWishlist(productId) {
  const list = getWishlist();
  const index = list.indexOf(productId);
  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(productId);
  }
  saveWishlist(list);
  return list.includes(productId);
}

export function isInWishlist(productId) {
  return getWishlist().includes(productId);
}

export function showToast(message, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function renderHeader(activePage = "") {
  const pages = [
    { href: "index.html", label: "Home", id: "home" },
    { href: "shop.html", label: "Shop", id: "shop" },
    { href: "services.html", label: "Services", id: "services" },
    { href: "contact.html", label: "Contact", id: "contact" },
  ];

  return `
    <header class="site-header">
      <div class="container header-inner">
        <a href="index.html" class="logo-link">
          <img src="images/logo.png" alt="${COMPANY.name}" class="logo" loading="lazy" />
          <span class="logo-text gradient-text">${COMPANY.name}</span>
        </a>
        <nav class="main-nav" aria-label="Main navigation">
          <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
          <ul class="nav-list">
            ${pages
              .map(
                (p) =>
                  `<li><a href="${p.href}" class="nav-link ${activePage === p.id ? "active" : ""}">${p.label}</a></li>`
              )
              .join("")}
          </ul>
        </nav>
        <div class="header-actions">
          <a href="shop.html" class="icon-btn" aria-label="Search shop">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </a>
          <button class="icon-btn cart-trigger" aria-label="Open cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span class="cart-badge" data-cart-count>0</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

export function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <img src="images/logo.png" alt="${COMPANY.name}" class="footer-logo" loading="lazy" />
          <p class="footer-desc">Premium shopping bags in Erbil. Luxury quality, best prices, fast delivery across Iraq.</p>
          <div class="social-icons">
            <a href="${COMPANY.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="${COMPANY.social.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            </a>
            <a href="${COMPANY.social.telegram}" target="_blank" rel="noopener" aria-label="Telegram">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </a>
            <a href="${COMPANY.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
          </div>
        </div>
        <div class="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="shop.html">Shop</a></li>
            <li><a href="services.html">Services</a></li>
            <li><a href="cart.html">Cart</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="footer-contact">
          <h4>Contact Us</h4>
          <ul>
            <li><a href="tel:+9647510445798">${COMPANY.phone}</a></li>
            <li><a href="mailto:${COMPANY.email}">${COMPANY.email}</a></li>
            <li>${COMPANY.location}</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="container">
          <p>&copy; ${new Date().getFullYear()} ${COMPANY.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `;
}

export function renderCartDrawer() {
  return `
    <div class="cart-drawer-overlay"></div>
    <aside class="cart-drawer" aria-label="Shopping cart">
      <div class="cart-drawer-header">
        <h3>Your Cart</h3>
        <button class="cart-drawer-close" aria-label="Close cart">&times;</button>
      </div>
      <div class="cart-drawer-body" data-cart-drawer-items></div>
      <div class="cart-drawer-footer">
        <div class="cart-drawer-total">
          <span>Total</span>
          <strong data-cart-drawer-total>IQD 0</strong>
        </div>
        <a href="cart.html" class="btn btn-primary btn-3d btn-block">View Cart</a>
        <a href="checkout.html" class="btn btn-outline btn-3d btn-block">Checkout</a>
      </div>
    </aside>
  `;
}

export function initLayout(activePage = "") {
  const headerEl = document.getElementById("site-header");
  const footerEl = document.getElementById("site-footer");
  const drawerEl = document.getElementById("cart-drawer");

  if (headerEl) headerEl.innerHTML = renderHeader(activePage);
  if (footerEl) footerEl.innerHTML = renderFooter();
  if (drawerEl) drawerEl.innerHTML = renderCartDrawer();

  initNavigation();
  initCartDrawer();
  updateCartCount();
}

function initNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");

  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => nav.classList.remove("open"));
  });
}

function initCartDrawer() {
  const drawer = document.querySelector(".cart-drawer");
  const overlay = document.querySelector(".cart-drawer-overlay");
  const closeBtn = document.querySelector(".cart-drawer-close");

  const openDrawer = () => {
    drawer?.classList.add("open");
    overlay?.classList.add("open");
    document.body.classList.add("no-scroll");
    renderCartDrawerItems();
  };

  const closeDrawer = () => {
    drawer?.classList.remove("open");
    overlay?.classList.remove("open");
    document.body.classList.remove("no-scroll");
  };

  document.querySelectorAll(".cart-trigger").forEach((btn) => {
    btn.addEventListener("click", openDrawer);
  });

  closeBtn?.addEventListener("click", closeDrawer);
  overlay?.addEventListener("click", closeDrawer);

  window.addEventListener("cart-updated", renderCartDrawerItems);
}

function renderCartDrawerItems() {
  const container = document.querySelector("[data-cart-drawer-items]");
  const totalEl = document.querySelector("[data-cart-drawer-total]");
  if (!container) return;

  const cart = getCart();
  if (!cart.length) {
    container.innerHTML = `<p class="cart-empty">Your cart is empty</p>`;
    if (totalEl) totalEl.textContent = "IQD 0";
    return;
  }

  container.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-drawer-item">
        <img src="${item.image}" alt="${item.name}" loading="lazy" />
        <div>
          <h4>${item.name}</h4>
          <p>${item.quantity} × IQD ${item.price.toLocaleString()}</p>
        </div>
      </div>
    `
    )
    .join("");

  if (totalEl) {
    totalEl.textContent = `IQD ${getCartTotal().toLocaleString()}`;
  }
}

export function openCartDrawer() {
  document.querySelector(".cart-drawer")?.classList.add("open");
  document.querySelector(".cart-drawer-overlay")?.classList.add("open");
  document.body.classList.add("no-scroll");
  renderCartDrawerItems();
}
