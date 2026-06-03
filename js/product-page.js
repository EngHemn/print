import { initLayout } from "./cart.js";
import { initAllAnimations } from "./animations.js";
import { fetchCategories, getProductById } from "./firestore.js";
import { showLoading, showEmpty, showError, MESSAGES } from "./ui-states.js";
import { addToCart, showToast } from "./cart.js";
import {
  renderProductDetailMarkup,
  bindProductGallery,
  bindProductQuantity,
} from "./product-detail.js";

async function initProductPage() {
  const root = document.getElementById("product-view-root");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id")?.trim();

  if (!id) {
    showEmpty(root, "Product not found.");
    return;
  }

  showLoading(root);

  try {
    const [product, categories] = await Promise.all([
      getProductById(id),
      fetchCategories(),
    ]);

    if (!product) {
      showEmpty(root, "This product does not exist or was removed.");
      return;
    }

    const cat = categories.find((c) => c.id === product.categoryId);
    document.title = `${product.name} | Shopping Bag`;
    const breadcrumb = document.getElementById("breadcrumb-name");
    if (breadcrumb) breadcrumb.textContent = product.name;

    root.innerHTML = renderProductDetailMarkup(product, {
      categoryName: cat?.name || "",
      showActions: true,
    });

    bindProductGallery(root);
    const qtyInput = bindProductQuantity(root);

    document.getElementById("product-add-cart")?.addEventListener("click", () => {
      const qty = Number(qtyInput?.value) || 1;
      addToCart(product, qty);
      showToast(`${product.name} added to cart`);
      window.location.href = "shop.html";
    });
  } catch (err) {
    console.error("[Product] Load failed:", err);
    showError(root, MESSAGES.productsError);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("shop");
  initAllAnimations();
  initProductPage();
});
