import { initLayout } from "./cart.js";
import { initAllAnimations } from "./animations.js";
import { fetchCategories, fetchProducts } from "./firestore.js";
import { renderProductCard, bindProductEvents } from "./products.js";
import { DEFAULT_CATEGORIES } from "./config.js";

async function loadFeaturedProducts() {
  const grid = document.getElementById("featured-products");
  if (!grid) return;

  try {
    const products = await fetchProducts();
    const featured = products.slice(0, 8);

    if (!featured.length) {
      grid.innerHTML = `<p class="empty-state">Products coming soon. Visit our shop!</p>`;
      return;
    }

    grid.innerHTML = featured.map((p) => renderProductCard(p)).join("");
    bindProductEvents(products, grid);
  } catch {
    grid.innerHTML = `<p class="empty-state">Unable to load products. Please try again later.</p>`;
  }
}

async function loadCategories() {
  const grid = document.getElementById("categories-grid");
  if (!grid) return;

  try {
    let categories = await fetchCategories();

    if (!categories.length) {
      categories = DEFAULT_CATEGORIES.map((c, i) => ({
        id: c.slug,
        name: c.name,
        image: `images/cat-${i + 1}.svg`,
      }));
    }

    grid.innerHTML = categories
      .map(
        (cat) => `
        <a href="shop.html?category=${cat.id}" class="category-card card-3d slide-up">
          <div class="category-image">
            <img src="${cat.image || "images/placeholder-bag.svg"}" alt="${cat.name}" loading="lazy" />
          </div>
          <h3>${cat.name}</h3>
        </a>
      `
      )
      .join("");
  } catch {
    grid.innerHTML = DEFAULT_CATEGORIES.map(
      (c, i) => `
      <a href="shop.html" class="category-card card-3d slide-up">
        <div class="category-image">
          <img src="images/cat-${i + 1}.svg" alt="${c.name}" loading="lazy" />
        </div>
        <h3>${c.name}</h3>
      </a>
    `
    ).join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("home");
  initAllAnimations();
  loadCategories();
  loadFeaturedProducts();
});
