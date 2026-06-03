import { initLayout } from "./cart.js";
import { initAllAnimations, observeAnimatedElements } from "./animations.js";
import { fetchCategories, fetchProducts } from "./firestore.js";
import { renderProductCard, filterProducts } from "./products.js";
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
  observeAnimatedElements(container);

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
    console.log("[Shop] No products to show:", {
      filter: selectedCategoryId || "all",
      search: searchInput?.value || "",
      total: allProducts.length,
    });
    showEmpty(grid, message);
    return;
  }

  console.log("[Shop] Showing products:", filtered.length, "of", allProducts.length);
  grid.innerHTML = filtered.map((p) => renderProductCard(p)).join("");
  observeAnimatedElements(grid);
}

function setSelectedCategory(categoryId, categoriesList, grid, searchInput) {
  if (!dataLoaded) return;

  selectedCategoryId = normalizeCategoryId(categoryId);
  console.log("[Shop] Category selected:", selectedCategoryId || "all");

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
    console.log("[Shop] Products loaded:", allProducts.length);
  } else {
    allProducts = [];
    productsLoadFailed = true;
    console.error("[Shop] Failed to load products:", productsResult.reason);
    showError(grid, MESSAGES.productsError);
  }

  if (categoriesResult.status === "fulfilled") {
    allCategories = categoriesResult.value;
    categoriesLoadFailed = false;
    console.log("[Shop] Categories loaded:", allCategories.length);
  } else {
    allCategories = [];
    categoriesLoadFailed = true;
    console.error("[Shop] Failed to load categories:", categoriesResult.reason);
    showError(categoriesList, MESSAGES.categoriesError);
  }

  dataLoaded = true;
  console.log("[Shop] Ready — filter:", selectedCategoryId || "all");

  if (selectedCategoryId && !allCategories.some((c) => c.id === selectedCategoryId)) {
    console.warn("[Shop] Unknown category in URL, showing all:", selectedCategoryId);
    selectedCategoryId = "";
  }

  if (!categoriesLoadFailed) {
    renderCategoryFilters(categoriesList);
  }

  if (!productsLoadFailed) {
    renderProducts(grid, searchInput);

    if (
      selectedCategoryId &&
      allProducts.length > 0 &&
      !filterProducts(allProducts, { categoryId: selectedCategoryId }).length
    ) {
      console.warn(
        "[Shop] No products for category",
        selectedCategoryId,
        "— showing all products"
      );
      selectedCategoryId = "";
      const url = new URL(window.location.href);
      url.searchParams.delete("category");
      window.history.replaceState({}, "", url);
      renderCategoryFilters(categoriesList);
      renderProducts(grid, searchInput);
    }

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

}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("shop");
  initAllAnimations();
  initShop();
});

