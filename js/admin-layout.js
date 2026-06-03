import { initPageTransition } from "./animations.js";

export function requireAdminAuth() {
  if (sessionStorage.getItem("admin_auth") !== "true") {
    window.location.href = "admin-login.html";
    return false;
  }
  return true;
}

export function initAdminLayout(activePage) {
  if (!requireAdminAuth()) return;

  initPageTransition();

  document.querySelectorAll(".sidebar-link").forEach((link) => {
    const page = link.dataset.page;
    if (page) link.classList.toggle("active", page === activePage);
  });

  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    document.getElementById("admin-sidebar")?.classList.toggle("open");
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    sessionStorage.removeItem("admin_auth");
    window.location.href = "admin-login.html";
  });
}

export function setTopbarTitle(title, { backHref, actionHtml } = {}) {
  const topbar = document.querySelector(".admin-topbar");
  if (!topbar) return;

  const start = topbar.querySelector(".admin-topbar-start");
  if (start) {
    start.innerHTML = `
      <button class="admin-menu-toggle" id="menu-toggle" aria-label="Toggle menu">☰</button>
      ${backHref ? `<a href="${backHref}" class="admin-back-link" aria-label="Back">←</a>` : ""}
      <h2>${title}</h2>
    `;
    document.getElementById("menu-toggle")?.addEventListener("click", () => {
      document.getElementById("admin-sidebar")?.classList.toggle("open");
    });
  }

  const actions = topbar.querySelector(".admin-topbar-actions");
  if (actions && actionHtml != null) actions.innerHTML = actionHtml;
}
