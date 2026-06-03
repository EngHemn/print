import { ADMIN_PASSWORD } from "./config.js";
import { showToast } from "./cart.js";
import { initPageTransition, initScrollAnimations } from "./animations.js";

document.addEventListener("DOMContentLoaded", () => {
  initPageTransition();
  initScrollAnimations();
  const form = document.getElementById("admin-login-form");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = form.password.value;
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_auth", "true");
      window.location.href = "admin-dashboard.html";
    } else {
      showToast("Invalid password", "error");
    }
  });
});
