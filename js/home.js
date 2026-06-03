import { initLayout } from "./cart.js";
import { initAllAnimations } from "./animations.js";
import { fetchCategories, fetchProducts } from "./firestore.js";
import { renderProductCard, bindProductEvents } from "./products.js";
import { renderCategoryCard } from "./categories.js";
import { showLoading, showEmpty, showError, MESSAGES } from "./ui-states.js";

const HOME_PRODUCT_LIMIT = 8;
let homeProducts = [];

async function initHome() {
  const categoriesGrid = document.getElementById("home-categories-grid");
  const productsGrid = document.getElementById("home-products-grid");

  if (!categoriesGrid && !productsGrid) return;

  showLoading(categoriesGrid);
  showLoading(productsGrid);

  try {
    const [categories, products] = await Promise.all([
      fetchCategories(),
      fetchProducts(),
    ]);
    console.log("[Home] Loaded:", { categories: categories.length, products: products.length });

    if (categoriesGrid) {
      if (!categories.length) {
        showEmpty(categoriesGrid, MESSAGES.categoriesEmpty);
      } else {
        categoriesGrid.innerHTML = categories
          .map((c) => renderCategoryCard(c, { mode: "link" }))
          .join("");
      }
    }

    if (productsGrid) {
      homeProducts = products;
      renderHomeProducts(productsGrid);
    }
  } catch (err) {
    console.error("[Home] Failed to load data:", err);
    showError(categoriesGrid, MESSAGES.categoriesError);
    showError(productsGrid, MESSAGES.productsError);
  }
}

function renderHomeProducts(productsGrid) {
  const featured = homeProducts.slice(0, HOME_PRODUCT_LIMIT);
  if (!featured.length) {
    showEmpty(productsGrid, MESSAGES.productsEmpty);
    return;
  }
  productsGrid.innerHTML = featured.map((p) => renderProductCard(p)).join("");
  bindProductEvents(homeProducts, productsGrid);
}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("home");
  initAllAnimations();
  initHome();
});

window.addEventListener("wishlist-updated", () => {
  const grid = document.getElementById("home-products-grid");
  if (grid && homeProducts.length) renderHomeProducts(grid);
});
