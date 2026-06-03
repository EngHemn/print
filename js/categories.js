import { escapeHtml } from "./config.js";

export function renderCategoryCard(category, options = {}) {
  const {
    mode = "link",
    active = false,
    allLabel = "All",
  } = options;

  const isAll = mode === "filter" && !category;
  const name = isAll ? allLabel : escapeHtml(category.name);
  const image = isAll
    ? "images/placeholder-bag.svg"
    : category.image || "images/placeholder-bag.svg";
  const activeClass = active ? " active" : "";

  if (mode === "link" && category) {
    return `
      <a href="shop.html?category=${category.id}" class="category-card card-3d glass-card fade-in">
        <div class="category-image">
          <img src="${image}" alt="${name}" loading="lazy" />
        </div>
        <h3>${name}</h3>
      </a>
    `;
  }

  const filterId = isAll ? "all" : category.id;
  return `
    <button
      type="button"
      class="category-card shop-category-card card-3d glass-card${activeClass}"
      data-filter="${filterId}"
      aria-pressed="${active}"
    >
      <div class="category-image">
        <img src="${image}" alt="${name}" loading="lazy" />
      </div>
      <h3>${name}</h3>
    </button>
  `;
}
