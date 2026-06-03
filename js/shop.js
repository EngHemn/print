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
let dataLoaded = false;
let productsLoadFailed = false;
let categoriesLoadFailed = false;

function normalizeCategoryId(value) {
  if (value == null || value === "" || value === "all") return "";
  return String(value).trim();
}

function renderCategoryFilters(container) {
  if (!container || categoriesLoadFailed) return;

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
  if (!grid || productsLoadFailed) return;

  if (!dataLoaded) {
    showLoading(grid);
    return;
  }

  if (!allProducts.length) {
    showEmpty(grid, MESSAGES.productsEmpty);
    return;
  }

  const filtered = filterProducts(allProducts, {
    search: searchInput?.value || "",
    categoryId: selectedCategoryId,
  });

  if (!filtered.length) {
    const message = selectedCategoryId
      ? MESSAGES.productsInCategoryEmpty
      : MESSAGES.productsNotFound;
    showEmpty(grid, message);
    return;
  }

  grid.innerHTML = filtered.map((p) => renderProductCard(p)).join("");
}

function setSelectedCategory(categoryId, categoriesList, grid, searchInput) {
  if (!dataLoaded) return;

  selectedCategoryId = normalizeCategoryId(categoryId);

  const url = new URL(window.location.href);
  if (selectedCategoryId) {
    url.searchParams.set("category", selectedCategoryId);
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
  selectedCategoryId = normalizeCategoryId(params.get("category"));

  showLoading(categoriesList);
  showLoading(grid);

  const [productsResult, categoriesResult] = await Promise.allSettled([
    fetchProducts(),
    fetchCategories(),
  ]);

  if (productsResult.status === "fulfilled") {
    allProducts = productsResult.value;
    productsLoadFailed = false;
  } else {
    allProducts = [];
    productsLoadFailed = true;
    showError(grid, MESSAGES.productsError);
  }

  if (categoriesResult.status === "fulfilled") {
    allCategories = categoriesResult.value;
    categoriesLoadFailed = false;
  } else {
    allCategories = [];
    categoriesLoadFailed = true;
    showError(categoriesList, MESSAGES.categoriesError);
  }

  dataLoaded = true;

  if (selectedCategoryId && !allCategories.some((c) => c.id === selectedCategoryId)) {
    selectedCategoryId = "";
  }

  if (!categoriesLoadFailed) {
    renderCategoryFilters(categoriesList);
  }

  if (!productsLoadFailed) {
    renderProducts(grid, searchInput);
    bindProductEvents(allProducts, grid);
  }

  categoriesList?.addEventListener("click", (e) => {
    const btn = e.target.closest(".shop-category-card");
    if (!btn) return;

    const filterId = btn.getAttribute("data-filter");
    if (filterId === null) return;

    setSelectedCategory(filterId, categoriesList, grid, searchInput);
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
