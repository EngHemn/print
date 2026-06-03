import { formatPrice, formatDate, escapeHtml } from "./config.js";
import { showToast } from "./cart.js";
import { uploadImage } from "../cloudinary.js";
import {
  fetchCategories,
  fetchOrders,
  addCategory,
  updateCategory,
  deleteCategory,
  updateOrderStatus,
  getStats,
} from "./firestore.js";
import { initAdminLayout } from "./admin-layout.js";
import { showConfirm } from "./admin-confirm.js";
import { ADMIN_MESSAGES } from "./admin-messages.js";

let categories = [];
let orders = [];
let editingCategoryId = null;

const sections = {
  dashboard: document.getElementById("section-dashboard"),
  categories: document.getElementById("section-categories"),
  orders: document.getElementById("section-orders"),
};

const DASHBOARD_SECTIONS = ["dashboard", "categories", "orders"];

function resolveSection(name) {
  return DASHBOARD_SECTIONS.includes(name) ? name : "dashboard";
}

function closeSidebar() {
  document.getElementById("admin-sidebar")?.classList.remove("open");
}

function showSection(name) {
  const section = resolveSection(name);
  Object.entries(sections).forEach(([key, el]) => {
    el?.classList.toggle("active", key === section);
  });
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === section);
  });
  const base = window.location.pathname.split("/").pop() || "admin-dashboard.html";
  const nextHash = section === "dashboard" ? "" : `#${section}`;
  history.replaceState(null, "", `${base}${nextHash}`);
}

function initDashboardSidebar() {
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      const page = link.dataset.page;
      if (page === "products") {
        closeSidebar();
        return;
      }
      if (!DASHBOARD_SECTIONS.includes(page)) return;

      e.preventDefault();
      showSection(page);
      closeSidebar();
    });
  });
}

function setListState(prefix, type, message) {
  const loading = document.getElementById(`${prefix}-loading`);
  const error = document.getElementById(`${prefix}-error`);
  const empty = document.getElementById(`${prefix}-empty`);
  const wrap = document.getElementById(`${prefix}-table-wrap`);

  loading?.toggleAttribute("hidden", type !== "loading");
  error?.toggleAttribute("hidden", type !== "error");
  empty?.toggleAttribute("hidden", type !== "empty");
  wrap?.toggleAttribute("hidden", type !== "data");

  if (type === "error" && error?.querySelector("p") && message) {
    error.querySelector("p").textContent = message;
  }
  if (type === "empty" && empty?.querySelector("p") && message) {
    empty.querySelector("p").textContent = message;
  }
}

async function loadStats() {
  const ids = ["stat-products", "stat-categories", "stat-orders", "stat-revenue"];
  const errEl = document.getElementById("stats-error");
  errEl?.setAttribute("hidden", "");

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="stat-loading">…</span>';
  });

  try {
    const stats = await getStats();
    document.getElementById("stat-products").textContent = stats.totalProducts;
    document.getElementById("stat-categories").textContent = stats.totalCategories;
    document.getElementById("stat-orders").textContent = stats.totalOrders;
    document.getElementById("stat-revenue").textContent = formatPrice(stats.totalRevenue);
  } catch (err) {
    console.error("[Admin] Stats failed:", err);
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "—";
    });
    errEl?.removeAttribute("hidden");
    showToast(ADMIN_MESSAGES.statsError, "error");
  }
}

async function loadCategories() {
  setListState("categories", "loading");

  try {
    categories = await fetchCategories();
    const tbody = document.getElementById("categories-table");
    if (!tbody) return;

    if (!categories.length) {
      setListState("categories", "empty", ADMIN_MESSAGES.categoriesEmpty);
      tbody.innerHTML = "";
      return;
    }

    setListState("categories", "data");
    tbody.innerHTML = categories
      .map(
        (c) => `
        <tr>
          <td><img src="${c.image || "images/placeholder-bag.svg"}" alt="" class="table-thumb" /></td>
          <td>${escapeHtml(c.name)}</td>
          <td>
            <button class="btn btn-sm btn-outline edit-cat" data-id="${c.id}">Edit</button>
            <button class="btn btn-sm btn-danger delete-cat" data-id="${c.id}">Delete</button>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    console.error("[Admin] Categories failed:", err);
    setListState("categories", "error", ADMIN_MESSAGES.categoriesError);
    showToast(ADMIN_MESSAGES.categoriesError, "error");
  }
}

async function loadOrders() {
  setListState("orders", "loading");

  try {
    orders = await fetchOrders();
    const tbody = document.getElementById("orders-table");
    if (!tbody) return;

    if (!orders.length) {
      setListState("orders", "empty", ADMIN_MESSAGES.ordersEmpty);
      tbody.innerHTML = "";
      return;
    }

    setListState("orders", "data");
    tbody.innerHTML = orders
      .map(
        (o) => `
        <tr>
          <td>${escapeHtml(o.fullName)}</td>
          <td>${escapeHtml(o.phone)}</td>
          <td>${escapeHtml(o.city)}, ${escapeHtml(o.street)}</td>
          <td>${formatPrice(o.total)}</td>
          <td>${(o.products || []).map((p) => escapeHtml(p.name)).join(", ")}</td>
          <td>
            <select class="order-status" data-id="${o.id}">
              ${["Pending", "Processing", "Delivered"]
                .map(
                  (s) =>
                    `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`
                )
                .join("")}
            </select>
          </td>
          <td>${formatDate(o.createdAt)}</td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    console.error("[Admin] Orders failed:", err);
    setListState("orders", "error", ADMIN_MESSAGES.ordersError);
    showToast(ADMIN_MESSAGES.ordersError, "error");
  }
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type="submit"]');
  const file = form.querySelector('[name="image"]').files[0];

  btn.disabled = true;

  try {
    let imageUrl = form.querySelector('[name="imageUrl"]').value;
    if (file) imageUrl = await uploadImage(file);

    const data = { name: form.name.value.trim(), image: imageUrl };

    if (editingCategoryId) {
      await updateCategory(editingCategoryId, data);
      showToast("Category updated");
    } else {
      await addCategory(data);
      showToast("Category added");
    }

    form.reset();
    editingCategoryId = null;
    form.querySelector('[type="submit"]').textContent = "Add Category";
    document.getElementById("cat-form-title").textContent = "Add Category";
    await loadCategories();
    await loadStats();
  } catch {
    showToast("Failed to save category", "error");
  } finally {
    btn.disabled = false;
  }
}

function initHashRouting() {
  const hash = window.location.hash.replace("#", "");
  showSection(hash || "dashboard");

  window.addEventListener("hashchange", () => {
    const h = window.location.hash.replace("#", "");
    showSection(h || "dashboard");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initAdminLayout("dashboard");
  initDashboardSidebar();
  initHashRouting();

  document.getElementById("category-form")?.addEventListener("submit", handleCategorySubmit);
  document.getElementById("stats-retry")?.addEventListener("click", loadStats);
  document.getElementById("categories-retry")?.addEventListener("click", loadCategories);
  document.getElementById("orders-retry")?.addEventListener("click", loadOrders);

  document.getElementById("categories-table")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-cat");
    if (editBtn) {
      const cat = categories.find((c) => c.id === editBtn.dataset.id);
      if (cat) {
        editingCategoryId = cat.id;
        const form = document.getElementById("category-form");
        form.name.value = cat.name;
        form.querySelector('[name="imageUrl"]').value = cat.image || "";
        form.querySelector('[type="submit"]').textContent = "Update Category";
        document.getElementById("cat-form-title").textContent = "Edit Category";
        showSection("categories");
      }
      return;
    }

    const delBtn = e.target.closest(".delete-cat");
    if (!delBtn) return;

    const cat = categories.find((c) => c.id === delBtn.dataset.id);
    const confirmed = await showConfirm({
      title: ADMIN_MESSAGES.deleteCategoryTitle,
      message: cat
        ? `"${cat.name}" will be removed permanently.`
        : ADMIN_MESSAGES.deleteCategoryMessage,
      confirmLabel: "Delete",
    });

    if (!confirmed) return;

    delBtn.disabled = true;
    try {
      await deleteCategory(delBtn.dataset.id);
      showToast("Category deleted");
      await loadCategories();
      await loadStats();
    } catch {
      showToast("Failed to delete category", "error");
      delBtn.disabled = false;
    }
  });

  document.getElementById("orders-table")?.addEventListener("change", async (e) => {
    if (e.target.classList.contains("order-status")) {
      try {
        await updateOrderStatus(e.target.dataset.id, e.target.value);
        showToast("Order status updated");
      } catch {
        showToast("Failed to update order", "error");
      }
    }
  });

  await Promise.all([loadStats(), loadCategories(), loadOrders()]);
});
