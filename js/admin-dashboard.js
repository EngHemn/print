import { formatPrice, formatDate } from "./config.js";
import { showToast } from "./cart.js";
import { initPageTransition } from "./animations.js";
import { uploadImage } from "../cloudinary.js";
import {
  fetchCategories,
  fetchProducts,
  fetchOrders,
  addCategory,
  updateCategory,
  deleteCategory,
  addProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus,
  getStats,
} from "./firestore.js";

if (sessionStorage.getItem("admin_auth") !== "true") {
  window.location.href = "admin-login.html";
}

let categories = [];
let products = [];
let orders = [];
let editingCategoryId = null;
let editingProductId = null;

const sections = {
  dashboard: document.getElementById("section-dashboard"),
  categories: document.getElementById("section-categories"),
  products: document.getElementById("section-products"),
  orders: document.getElementById("section-orders"),
};

function showSection(name) {
  Object.entries(sections).forEach(([key, el]) => {
    el?.classList.toggle("active", key === name);
  });
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.section === name);
  });
}

async function loadStats() {
  try {
    const stats = await getStats();
    document.getElementById("stat-products").textContent = stats.totalProducts;
    document.getElementById("stat-categories").textContent = stats.totalCategories;
    document.getElementById("stat-orders").textContent = stats.totalOrders;
    document.getElementById("stat-revenue").textContent = formatPrice(stats.totalRevenue);
  } catch {
    showToast("Failed to load statistics", "error");
  }
}

async function loadCategories() {
  categories = await fetchCategories();
  const tbody = document.getElementById("categories-table");
  if (!tbody) return;

  tbody.innerHTML = categories
    .map(
      (c) => `
      <tr>
        <td><img src="${c.image || "images/placeholder-bag.svg"}" alt="" class="table-thumb" /></td>
        <td>${c.name}</td>
        <td>
          <button class="btn btn-sm btn-outline edit-cat" data-id="${c.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-cat" data-id="${c.id}">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");

  populateCategorySelect();
}

function populateCategorySelect() {
  const select = document.getElementById("product-category");
  if (!select) return;
  select.innerHTML = categories
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
    .join("");
}

async function loadProducts() {
  products = await fetchProducts();
  const tbody = document.getElementById("products-table");
  if (!tbody) return;

  tbody.innerHTML = products
    .map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      return `
        <tr>
          <td><img src="${p.image || "images/placeholder-bag.svg"}" alt="" class="table-thumb" /></td>
          <td>${p.name}</td>
          <td>${formatPrice(p.price)}</td>
          <td>${p.stock}</td>
          <td>${cat?.name || "—"}</td>
          <td>
            <button class="btn btn-sm btn-outline edit-prod" data-id="${p.id}">Edit</button>
            <button class="btn btn-sm btn-danger delete-prod" data-id="${p.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function loadOrders() {
  orders = await fetchOrders();
  const tbody = document.getElementById("orders-table");
  if (!tbody) return;

  tbody.innerHTML = orders
    .map(
      (o) => `
      <tr>
        <td>${o.fullName}</td>
        <td>${o.phone}</td>
        <td>${o.city}, ${o.street}</td>
        <td>${formatPrice(o.total)}</td>
        <td>${(o.products || []).map((p) => p.name).join(", ")}</td>
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
}

async function handleCategorySubmit(e) {
  e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    const file = form.querySelector('[name="image"]').files[0];

    btn.disabled = true;

    try {
      let imageUrl = form.querySelector('[name="imageUrl"]').value;
      if (file) {
        imageUrl = await uploadImage(file);
      }

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
    await loadCategories();
    await loadStats();
  } catch {
    showToast("Failed to save category", "error");
  } finally {
    btn.disabled = false;
  }
}

async function handleProductSubmit(e) {
  e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    const file = form.querySelector('[name="image"]').files[0];

    btn.disabled = true;

    try {
      let imageUrl = form.querySelector('[name="imageUrl"]').value;
      if (file) {
        imageUrl = await uploadImage(file);
      }

      const data = {
        name: form.name.value.trim(),
        description: form.description.value.trim(),
        price: form.price.value,
        stock: form.stock.value,
        categoryId: form.categoryId.value,
        image: imageUrl,
      };

    if (editingProductId) {
      await updateProduct(editingProductId, data);
      showToast("Product updated");
    } else {
      await addProduct(data);
      showToast("Product added");
    }

    form.reset();
    editingProductId = null;
    form.querySelector('[type="submit"]').textContent = "Add Product";
    await loadProducts();
    await loadStats();
  } catch {
    showToast("Failed to save product", "error");
  } finally {
    btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initPageTransition();

  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    sessionStorage.removeItem("admin_auth");
    window.location.href = "admin-login.html";
  });

  document.getElementById("category-form")?.addEventListener("submit", handleCategorySubmit);
  document.getElementById("product-form")?.addEventListener("submit", handleProductSubmit);

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
        showSection("categories");
      }
      return;
    }

    const delBtn = e.target.closest(".delete-cat");
    if (delBtn && confirm("Delete this category?")) {
      await deleteCategory(delBtn.dataset.id);
      showToast("Category deleted");
      await loadCategories();
      await loadStats();
    }
  });

  document.getElementById("products-table")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-prod");
    if (editBtn) {
      const prod = products.find((p) => p.id === editBtn.dataset.id);
      if (prod) {
        editingProductId = prod.id;
        const form = document.getElementById("product-form");
        form.name.value = prod.name;
        form.description.value = prod.description || "";
        form.price.value = prod.price;
        form.stock.value = prod.stock;
        form.categoryId.value = prod.categoryId;
        form.querySelector('[name="imageUrl"]').value = prod.image || "";
        form.querySelector('[type="submit"]').textContent = "Update Product";
        showSection("products");
      }
      return;
    }

    const delBtn = e.target.closest(".delete-prod");
    if (delBtn && confirm("Delete this product?")) {
      await deleteProduct(delBtn.dataset.id);
      showToast("Product deleted");
      await loadProducts();
      await loadStats();
    }
  });

  document.getElementById("orders-table")?.addEventListener("change", async (e) => {
    if (e.target.classList.contains("order-status")) {
      await updateOrderStatus(e.target.dataset.id, e.target.value);
      showToast("Order status updated");
    }
  });

  showSection("dashboard");
  await loadCategories();
  await loadProducts();
  await loadOrders();
  await loadStats();
});
