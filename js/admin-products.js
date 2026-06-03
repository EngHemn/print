import { escapeHtml } from "./config.js";
import { showToast } from "./cart.js";
import { fetchCategories, fetchProducts, deleteProduct } from "./firestore.js";
import { initAdminLayout, setTopbarTitle } from "./admin-layout.js";
import { initCustomDropdown } from "./admin-dropdown.js";
import { showConfirm } from "./admin-confirm.js";
import { ADMIN_MESSAGES } from "./admin-messages.js";
import { formatQuantityLabel } from "./admin-product-utils.js";
import { adminProductViewUrl } from "./product-detail.js";
import { applyPanelState } from "./admin-ui-states.js";

let categories = [];
let products = [];
let productSearch = "";
let productCategoryFilter = "";
let productsLoadError = false;
let filterDropdown = null;

const panelEls = () => ({
  loading: document.getElementById("products-loading"),
  error: document.getElementById("products-error"),
  empty: document.getElementById("products-empty"),
  content: document.getElementById("products-table-wrap"),
});

function showPanelState(type, message) {
  applyPanelState(panelEls(), type);

  const error = document.getElementById("products-error");
  const empty = document.getElementById("products-empty");

  if (type === "error" && error) {
    error.querySelector("p").textContent = message || ADMIN_MESSAGES.productsError;
  }
  if (type === "empty" && empty) {
    empty.querySelector("p").textContent = message || ADMIN_MESSAGES.productsEmpty;
  }
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

function buildFilterDropdownOptions() {
  return [
    { value: "", label: "All categories" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];
}

function renderProductsTable() {
  const tbody = document.getElementById("products-table");
  if (!tbody || productsLoadError) return;

  if (!products.length) {
    showPanelState("empty", ADMIN_MESSAGES.productsEmpty);
    return;
  }

  const filtered = getFilteredProducts();

  if (!filtered.length) {
    tbody.innerHTML = "";
    showPanelState("empty", ADMIN_MESSAGES.productsNotFound);
    return;
  }

  showPanelState("data");

  tbody.innerHTML = filtered
    .map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      const gallery = Array.isArray(p.images) ? p.images : [];
      return `
        <tr>
          <td><img src="${p.image || "images/placeholder-bag.svg"}" alt="" class="table-thumb" /></td>
          <td>${escapeHtml(p.name)}</td>
          <td><span class="quantity-label">${escapeHtml(formatQuantityLabel(p))}</span></td>
          <td>${p.stock ?? "—"}</td>
          <td>${escapeHtml(cat?.name || "—")}</td>
          <td>${gallery.length ? `${gallery.length} img` : "—"}</td>
          <td class="table-actions">
            <a href="${adminProductViewUrl(p.id)}" class="btn btn-sm btn-outline">View</a>
            <a href="admin-product-form.html?id=${p.id}" class="btn btn-sm btn-outline">Edit</a>
            <button type="button" class="btn btn-sm btn-danger delete-prod" data-id="${p.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function initFilterDropdown() {
  const el = document.getElementById("product-filter-dropdown");
  if (!el) return;
  filterDropdown = initCustomDropdown(el, buildFilterDropdownOptions(), {
    value: productCategoryFilter,
    placeholder: "All categories",
    onChange: (value) => {
      productCategoryFilter = value;
      renderProductsTable();
    },
  });
}

async function loadProductsPage() {
  productsLoadError = false;
  showPanelState("loading");

  try {
    [categories, products] = await Promise.all([fetchCategories(), fetchProducts()]);
    initFilterDropdown();
    if (!products.length) {
      showPanelState("empty", ADMIN_MESSAGES.productsEmpty);
    } else {
      renderProductsTable();
    }
  } catch (err) {
    console.error("[Admin] Products load failed:", err);
    productsLoadError = true;
    showPanelState("error", ADMIN_MESSAGES.productsError);
    showToast(ADMIN_MESSAGES.productsError, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminLayout("products");
  setTopbarTitle("Products", {
    actionHtml: `<a href="admin-product-form.html" class="btn btn-primary btn-3d">+ Add Product</a>`,
  });

  document.getElementById("product-search")?.addEventListener("input", (e) => {
    productSearch = e.target.value;
    if (!productsLoadError && products.length) renderProductsTable();
  });

  document.getElementById("products-retry")?.addEventListener("click", loadProductsPage);

  document.getElementById("products-table")?.addEventListener("click", async (e) => {
    const delBtn = e.target.closest(".delete-prod");
    if (!delBtn) return;

    const prod = products.find((p) => p.id === delBtn.dataset.id);
    const confirmed = await showConfirm({
      title: ADMIN_MESSAGES.deleteProductTitle,
      message: prod
        ? `"${prod.name}" will be removed permanently.`
        : ADMIN_MESSAGES.deleteProductMessage,
      confirmLabel: "Delete",
    });

    if (!confirmed) return;

    delBtn.disabled = true;
    try {
      await deleteProduct(delBtn.dataset.id);
      showToast("Product deleted");
      await loadProductsPage();
    } catch {
      showToast("Failed to delete product", "error");
      delBtn.disabled = false;
    }
  });

  loadProductsPage();
});
