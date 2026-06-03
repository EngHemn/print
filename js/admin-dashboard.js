import { formatPrice, formatDate, escapeHtml } from "./config.js";
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

const MAX_GALLERY_IMAGES = 15;

if (sessionStorage.getItem("admin_auth") !== "true") {
  window.location.href = "admin-login.html";
}

let categories = [];
let products = [];
let orders = [];
let editingCategoryId = null;
let editingProductId = null;
let productSearch = "";
let productCategoryFilter = "";

const sections = {
  dashboard: document.getElementById("section-dashboard"),
  categories: document.getElementById("section-categories"),
  products: document.getElementById("section-products"),
  orders: document.getElementById("section-orders"),
};

function formatQuantityLabel(product) {
  const qty = product.packQuantity ?? product.quantity;
  const unit = product.packUnit || "bag";
  const price = product.price;
  if (qty != null && qty !== "") {
    return `${qty} ${unit} by ${formatPrice(price)}`;
  }
  if (product.quantityLabel) return product.quantityLabel;
  return formatPrice(price);
}

function parseGalleryUrls(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function showSection(name) {
  Object.entries(sections).forEach(([key, el]) => {
    el?.classList.toggle("active", key === name);
  });
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.section === name);
  });
  document.getElementById("header-add-product")?.toggleAttribute("hidden", name !== "products");
}

function getFilteredProducts() {
  const search = productSearch.trim().toLowerCase();
  const catId = productCategoryFilter;

  return products.filter((p) => {
    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(search) ||
      (p.description || "").toLowerCase().includes(search) ||
      formatQuantityLabel(p).toLowerCase().includes(search);
    const matchCategory = !catId || p.categoryId === catId;
    return matchSearch && matchCategory;
  });
}

function updateQuantityPreview() {
  const preview = document.getElementById("quantity-preview");
  const form = document.getElementById("product-form");
  if (!preview || !form) return;
  const qty = form.packQuantity?.value || "—";
  const unit = form.packUnit?.value?.trim() || "bag";
  const price = form.price?.value;
  preview.textContent =
    price !== "" && price != null
      ? `Preview: ${qty} ${unit} by ${formatPrice(Number(price))}`
      : `Preview: ${qty} ${unit}`;
}

function renderImagePreview(container, url, { removable = false, onRemove } = {}) {
  if (!container || !url) return;
  const wrap = document.createElement("div");
  wrap.className = "preview-thumb-wrap";
  wrap.innerHTML = `
    <img src="${escapeHtml(url)}" alt="" class="preview-thumb" />
    ${removable ? `<button type="button" class="preview-remove" aria-label="Remove image">&times;</button>` : ""}
  `;
  if (removable && onRemove) {
    wrap.querySelector(".preview-remove")?.addEventListener("click", onRemove);
  }
  container.appendChild(wrap);
}

function syncGalleryHint(count) {
  const hint = document.getElementById("gallery-hint");
  if (hint) hint.textContent = `${count} / ${MAX_GALLERY_IMAGES} gallery images`;
}

function setGalleryUrls(urls) {
  const form = document.getElementById("product-form");
  if (!form) return;
  const list = urls.slice(0, MAX_GALLERY_IMAGES);
  form.querySelector('[name="galleryUrls"]').value = JSON.stringify(list);
  syncGalleryHint(list.length);

  const galleryPreview = document.getElementById("gallery-preview");
  galleryPreview.innerHTML = "";
  list.forEach((url, index) => {
    renderImagePreview(galleryPreview, url, {
      removable: true,
      onRemove: () => {
        const next = parseGalleryUrls(form.querySelector('[name="galleryUrls"]').value);
        next.splice(index, 1);
        setGalleryUrls(next);
      },
    });
  });
}

function resetProductForm() {
  const form = document.getElementById("product-form");
  if (!form) return;
  form.reset();
  form.packUnit.value = "bag";
  form.querySelector('[name="imageUrl"]').value = "";
  form.querySelector('[name="galleryUrls"]').value = "[]";
  document.getElementById("main-image-preview").innerHTML = "";
  document.getElementById("gallery-preview").innerHTML = "";
  syncGalleryHint(0);
  editingProductId = null;
  form.querySelector('[type="submit"]').textContent = "Add Product";
  document.getElementById("prod-form-title").textContent = "Add Product";
  updateQuantityPreview();
}

function openProductModal(isEdit = false) {
  const modal = document.getElementById("product-modal");
  if (!modal) return;
  if (!isEdit) resetProductForm();
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeProductModal() {
  const modal = document.getElementById("product-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
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
        <td>${escapeHtml(c.name)}</td>
        <td>
          <button class="btn btn-sm btn-outline edit-cat" data-id="${c.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-cat" data-id="${c.id}">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");

  populateCategorySelects();
}

function populateCategorySelects() {
  const formSelect = document.getElementById("product-category");
  const filterSelect = document.getElementById("product-filter-category");
  const options = categories
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join("");

  if (formSelect) {
    const current = formSelect.value;
    formSelect.innerHTML = options;
    if (current) formSelect.value = current;
  }

  if (filterSelect) {
    const current = filterSelect.value;
    filterSelect.innerHTML =
      `<option value="">All categories</option>` + options;
    filterSelect.value = current;
  }
}

function renderProductsTable() {
  const tbody = document.getElementById("products-table");
  const emptyEl = document.getElementById("products-empty");
  const countEl = document.getElementById("products-count");
  if (!tbody) return;

  const filtered = getFilteredProducts();

  if (countEl) {
    const label = filtered.length === 1 ? "product" : "products";
    countEl.textContent =
      filtered.length === products.length
        ? `${products.length} ${label}`
        : `${filtered.length} of ${products.length} ${label}`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyEl?.removeAttribute("hidden");
    return;
  }

  emptyEl?.setAttribute("hidden", "");

  tbody.innerHTML = filtered
    .map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      const gallery = Array.isArray(p.images) ? p.images : [];
      const galleryCount = gallery.length;
      return `
        <tr>
          <td><img src="${p.image || "images/placeholder-bag.svg"}" alt="" class="table-thumb" /></td>
          <td>${escapeHtml(p.name)}</td>
          <td><span class="quantity-label">${escapeHtml(formatQuantityLabel(p))}</span></td>
          <td>${p.stock ?? "—"}</td>
          <td>${escapeHtml(cat?.name || "—")}</td>
          <td>${galleryCount ? `${galleryCount} img` : "—"}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-outline edit-prod" data-id="${p.id}">Edit</button>
            <button class="btn btn-sm btn-danger delete-prod" data-id="${p.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function loadProducts() {
  products = await fetchProducts();
  renderProductsTable();
}

async function loadOrders() {
  orders = await fetchOrders();
  const tbody = document.getElementById("orders-table");
  if (!tbody) return;

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

async function uploadGalleryFiles(files, existingUrls) {
  const slotsLeft = MAX_GALLERY_IMAGES - existingUrls.length;
  const toUpload = Array.from(files).slice(0, slotsLeft);
  const uploaded = await Promise.all(toUpload.map((f) => uploadImage(f)));
  return [...existingUrls, ...uploaded].slice(0, MAX_GALLERY_IMAGES);
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type="submit"]');
  const mainFile = form.querySelector('[name="mainImage"]').files[0];
  const galleryFiles = form.querySelector('[name="galleryImages"]').files;

  btn.disabled = true;

  try {
    let imageUrl = form.querySelector('[name="imageUrl"]').value;
    if (mainFile) {
      imageUrl = await uploadImage(mainFile);
    }

    if (!imageUrl && !editingProductId) {
      showToast("Please add a main product image", "error");
      return;
    }

    let galleryUrls = parseGalleryUrls(form.querySelector('[name="galleryUrls"]').value);
    if (galleryFiles?.length) {
      galleryUrls = await uploadGalleryFiles(galleryFiles, galleryUrls);
    }

    const data = {
      name: form.name.value.trim(),
      description: form.description.value.trim(),
      price: form.price.value,
      stock: form.stock.value,
      categoryId: form.categoryId.value,
      packQuantity: Number(form.packQuantity.value),
      packUnit: form.packUnit.value.trim() || "bag",
      image: imageUrl,
      images: galleryUrls,
    };

    if (editingProductId) {
      await updateProduct(editingProductId, data);
      showToast("Product updated");
    } else {
      await addProduct(data);
      showToast("Product added");
    }

    closeProductModal();
    resetProductForm();
    await loadProducts();
    await loadStats();
  } catch {
    showToast("Failed to save product", "error");
  } finally {
    btn.disabled = false;
  }
}

function fillProductForm(prod) {
  const form = document.getElementById("product-form");
  if (!form) return;

  editingProductId = prod.id;
  form.name.value = prod.name;
  form.description.value = prod.description || "";
  form.price.value = prod.price;
  form.stock.value = prod.stock;
  form.categoryId.value = prod.categoryId;
  form.packQuantity.value = prod.packQuantity ?? "";
  form.packUnit.value = prod.packUnit || "bag";
  form.querySelector('[name="imageUrl"]').value = prod.image || "";

  const mainPreview = document.getElementById("main-image-preview");
  mainPreview.innerHTML = "";
  if (prod.image) {
    renderImagePreview(mainPreview, prod.image);
  }

  const gallery = Array.isArray(prod.images) ? prod.images : [];
  setGalleryUrls(gallery);
  form.querySelector('[type="submit"]').textContent = "Update Product";
  document.getElementById("prod-form-title").textContent = "Edit Product";
  updateQuantityPreview();
}

function setupProductFormListeners() {
  const form = document.getElementById("product-form");
  if (!form) return;

  ["packQuantity", "packUnit", "price"].forEach((name) => {
    form[name]?.addEventListener("input", updateQuantityPreview);
  });

  form.querySelector('[name="mainImage"]')?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById("main-image-preview");
    preview.innerHTML = "";
    if (file) {
      const url = URL.createObjectURL(file);
      renderImagePreview(preview, url);
    } else if (form.querySelector('[name="imageUrl"]').value) {
      renderImagePreview(preview, form.querySelector('[name="imageUrl"]').value);
    }
  });

  form.querySelector('[name="galleryImages"]')?.addEventListener("change", (e) => {
    const existing = parseGalleryUrls(form.querySelector('[name="galleryUrls"]').value);
    const newFiles = Array.from(e.target.files || []);
    const total = existing.length + newFiles.length;

    if (total > MAX_GALLERY_IMAGES) {
      showToast(`Maximum ${MAX_GALLERY_IMAGES} gallery images allowed`, "error");
      e.target.value = "";
      return;
    }

    setGalleryUrls(existing);

    const preview = document.getElementById("gallery-preview");
    newFiles.forEach((file) => {
      renderImagePreview(preview, URL.createObjectURL(file), { removable: false });
    });

    syncGalleryHint(total);
  });
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

  document.getElementById("header-add-product")?.addEventListener("click", () => {
    showSection("products");
    openProductModal(false);
  });

  document.getElementById("product-modal-close")?.addEventListener("click", closeProductModal);
  document.getElementById("product-modal-overlay")?.addEventListener("click", closeProductModal);
  document.getElementById("product-form-cancel")?.addEventListener("click", () => {
    closeProductModal();
    resetProductForm();
  });

  document.getElementById("product-search")?.addEventListener("input", (e) => {
    productSearch = e.target.value;
    renderProductsTable();
  });

  document.getElementById("product-filter-category")?.addEventListener("change", (e) => {
    productCategoryFilter = e.target.value;
    renderProductsTable();
  });

  setupProductFormListeners();

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
        fillProductForm(prod);
        showSection("products");
        openProductModal(true);
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
