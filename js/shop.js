import { initLayout } from "./cart.js";
import { initAllAnimations } from "./animations.js";
import { fetchCategories, fetchProducts } from "./firestore.js";
import {
  renderProductCard,
  bindProductEvents,
  filterProducts,
  openProductModal,
} from "./products.js";
import { debounce } from "./config.js";

let allProducts = [];
let allCategories = [];

async function initShop() {
  const grid = document.getElementById("shop-grid");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const params = new URLSearchParams(window.location.search);
  const initialCategory = params.get("category") || "";

  try {
    [allProducts, allCategories] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
    ]);
  } catch {
    grid.innerHTML = `<p class="empty-state">Failed to load products.</p>`;
    return;
  }

  if (categoryFilter) {
    categoryFilter.innerHTML =
      `<option value="">All Categories</option>` +
      allCategories
        .map((c) => `<option value="${c.id}">${c.name}</option>`)
        .join("");
    categoryFilter.value = initialCategory;
  }

  const render = () => {
    const filtered = filterProducts(allProducts, {
      search: searchInput?.value || "",
      categoryId: categoryFilter?.value || "",
    });

    if (!filtered.length) {
      grid.innerHTML = `<p class="empty-state">No products found.</p>`;
      return;
    }

    grid.innerHTML = filtered.map((p) => renderProductCard(p)).join("");
  };

  render();
  bindProductEvents(allProducts, grid);

  searchInput?.addEventListener("input", debounce(render, 250));
  categoryFilter?.addEventListener("change", render);

  window.addEventListener("wishlist-updated", render);
}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("shop");
  initAllAnimations();
  initShop();
});

export { openProductModal };
