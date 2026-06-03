import { initLayout } from "./cart.js";
import { initAllAnimations } from "./animations.js";
import { fetchCategories, fetchProducts } from "./firestore.js";
import {
  renderProductCard,
  bindProductEvents,
  filterProducts,
  openProductModal,
} from "./products.js";
import { renderCategoryCard } from "./categories.js";
import { debounce } from "./config.js";
import { showLoading, showEmpty, showError, MESSAGES } from "./ui-states.js";

let allProducts = [];
let allCategories = [];
let selectedCategoryId = "";

function renderCategoryFilters(container) {
  if (!container) return;

  if (!allCategories.length) {
    showEmpty(container, MESSAGES.categoriesEmpty);
    return;
  }

  const cards = [
    renderCategoryCard(null, {
      mode: "filter",
      active: !selectedCategoryId,
    }),
    ...allCategories.map((c) =>
      renderCategoryCard(c, {
        mode: "filter",
        active: selectedCategoryId === c.id,
      })
    ),
  ];

  container.innerHTML = cards.join("");

  if (selectedCategoryId) {
    const activeCard = container.querySelector(".shop-category-card.active");
    activeCard?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

function renderProducts(grid, searchInput) {
  if (!allProducts.length) {
    showEmpty(grid, MESSAGES.productsEmpty);
    return;
  }

  const filtered = filterProducts(allProducts, {
    search: searchInput?.value || "",
    categoryId: selectedCategoryId,
  });

  if (!filtered.length) {
    showEmpty(grid, MESSAGES.productsNotFound);
    return;
  }

  grid.innerHTML = filtered.map((p) => renderProductCard(p)).join("");
}

function setSelectedCategory(categoryId, categoriesList, grid, searchInput) {
  selectedCategoryId = categoryId;

  const url = new URL(window.location.href);
  if (categoryId) {
    url.searchParams.set("category", categoryId);
  } else {
    url.searchParams.delete("category");
  }
  window.history.replaceState({}, "", url);

  renderCategoryFilters(categoriesList);
  renderProducts(grid, searchInput);
}

async function initShop() {
  const grid = document.getElementById("shop-grid");
  const searchInput = document.getElementById("search-input");
  const categoriesList = document.getElementById("shop-categories-list");
  const params = new URLSearchParams(window.location.search);
  selectedCategoryId = params.get("category") || "";

  showLoading(categoriesList);
  showLoading(grid);

  try {
    [allProducts, allCategories] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
    ]);
  } catch {
    showError(categoriesList, MESSAGES.categoriesError);
    showError(grid, MESSAGES.productsError);
    return;
  }

  if (selectedCategoryId && !allCategories.some((c) => c.id === selectedCategoryId)) {
    selectedCategoryId = "";
  }

  renderCategoryFilters(categoriesList);
  renderProducts(grid, searchInput);
  bindProductEvents(allProducts, grid);

  categoriesList?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;
    setSelectedCategory(btn.dataset.category, categoriesList, grid, searchInput);
  });

  searchInput?.addEventListener(
    "input",
    debounce(() => renderProducts(grid, searchInput), 250)
  );

  window.addEventListener("wishlist-updated", () => renderProducts(grid, searchInput));
}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("shop");
  initAllAnimations();
  initShop();
});

export { openProductModal };
