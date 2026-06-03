import { formatPrice, escapeHtml } from "./config.js";
import { fetchCategories, getProductById } from "./firestore.js";
import { initAdminLayout } from "./admin-layout.js";
import { setElementVisible } from "./admin-ui-states.js";
import { formatQuantityLabel } from "./admin-product-utils.js";
import { getProductGallery, bindProductGallery } from "./product-detail.js";
import { renderColorSwatchesHTML } from "./product-colors.js";
import { ADMIN_MESSAGES } from "./admin-messages.js";

let productId = null;

function renderAdminProductView(product, categoryName) {
  const images = getProductGallery(product);
  const mainSrc = images[0] || "images/placeholder-bag.svg";

  return `
    <div class="admin-product-view">
      <div class="admin-product-view-gallery glass-card">
        <img src="${escapeHtml(mainSrc)}" alt="" class="product-view-main-img admin-view-main-img" id="admin-view-main-img" />
        ${
          images.length > 1
            ? `<div class="product-view-thumbs admin-view-thumbs">
            ${images
              .map(
                (url, i) => `
              <button type="button" class="product-view-thumb${i === 0 ? " active" : ""}" data-img="${escapeHtml(url)}">
                <img src="${escapeHtml(url)}" alt="" />
              </button>
            `
              )
              .join("")}
          </div>`
            : ""
        }
        ${
          images.length
            ? `<p class="field-hint">${images.length} image${images.length === 1 ? "" : "s"} total</p>`
            : ""
        }
      </div>
      <div class="admin-product-view-details">
        <h3 class="admin-view-name">${escapeHtml(product.name)}</h3>
        <dl class="admin-view-dl">
          <div><dt>Category</dt><dd>${escapeHtml(categoryName || "—")}</dd></div>
          <div><dt>Quantity / Price</dt><dd>${escapeHtml(formatQuantityLabel(product))}</dd></div>
          <div><dt>Price</dt><dd>${formatPrice(product.price)}</dd></div>
          <div><dt>Stock</dt><dd>${product.stock ?? "—"}</dd></div>
          <div><dt>Pack quantity</dt><dd>${product.packQuantity != null ? escapeHtml(String(product.packQuantity)) : "—"}</dd></div>
          <div><dt>Colors</dt><dd>${renderColorSwatchesHTML(product.colors, { size: "md" }) || "—"}</dd></div>
          <div><dt>Description</dt><dd>${escapeHtml(product.description || "—")}</dd></div>
        </dl>
        <div class="admin-view-footer">
          <a href="admin-product-form.html?id=${encodeURIComponent(product.id)}" class="btn btn-primary btn-3d">Edit Product</a>
          <a href="product.html?id=${encodeURIComponent(product.id)}" class="btn btn-outline btn-3d" target="_blank" rel="noopener">View on Store</a>
          <a href="admin-products.html" class="btn btn-outline">Back to List</a>
        </div>
      </div>
    </div>
  `;
}

async function loadProductView() {
  const root = document.getElementById("admin-product-view-root");
  const loading = document.getElementById("admin-view-loading");
  const error = document.getElementById("admin-view-error");
  const actions = document.getElementById("admin-view-actions");

  setElementVisible(loading, true);
  setElementVisible(error, false);
  root.querySelector(".admin-product-view")?.remove();

  if (!productId) {
    setElementVisible(loading, false);
    setElementVisible(error, true);
    if (error?.querySelector("p")) error.querySelector("p").textContent = "Missing product ID.";
    return;
  }

  try {
    const [product, categories] = await Promise.all([
      getProductById(productId),
      fetchCategories(),
    ]);

    setElementVisible(loading, false);

    if (!product) {
      setElementVisible(error, true);
      if (error?.querySelector("p")) error.querySelector("p").textContent = "Product not found.";
      return;
    }

    const cat = categories.find((c) => c.id === product.categoryId);
    document.querySelector(".admin-topbar h2").textContent = product.name;

    if (actions) {
      actions.innerHTML = `<a href="admin-product-form.html?id=${encodeURIComponent(product.id)}" class="btn btn-primary btn-3d">Edit</a>`;
    }

    root.insertAdjacentHTML("beforeend", renderAdminProductView(product, cat?.name));
    bindProductGallery(root);
  } catch (err) {
    console.error("[Admin] View product failed:", err);
    setElementVisible(loading, false);
    setElementVisible(error, true);
    if (error?.querySelector("p")) {
      error.querySelector("p").textContent = ADMIN_MESSAGES.productsError;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminLayout("products");
  productId = new URLSearchParams(window.location.search).get("id")?.trim();
  document.getElementById("admin-view-retry")?.addEventListener("click", loadProductView);
  loadProductView();
});
