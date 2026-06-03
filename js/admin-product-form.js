import { showToast } from "./cart.js";
import { uploadImage } from "../cloudinary.js";
import {
  fetchCategories,
  fetchProducts,
  addProduct,
  updateProduct,
  getProductById,
} from "./firestore.js";
import { initAdminLayout, setTopbarTitle } from "./admin-layout.js";
import { initCustomDropdown } from "./admin-dropdown.js";
import { ADMIN_MESSAGES } from "./admin-messages.js";
import { setElementVisible } from "./admin-ui-states.js";
import {
  MAX_GALLERY_IMAGES,
  parseGalleryUrls,
  renderImagePreview,
  updateQuantityPreview,
  syncGalleryHint,
} from "./admin-product-utils.js";
import {
  MAX_PRODUCT_COLORS,
  normalizeHexColor,
  normalizeColors,
} from "./product-colors.js";
import { escapeHtml } from "./config.js";

let editingProductId = null;
let categoryDropdown = null;
let categories = [];
/** @type {File[]} New gallery files chosen locally (accumulated across multiple picks) */
let pendingGalleryFiles = [];
/** @type {string[]} Blob URLs for pending previews — revoked on re-render */
let pendingGalleryBlobUrls = [];
let productColors = [];

function syncColorsHidden() {
  const form = document.getElementById("product-form");
  const input = form?.querySelector('[name="colors"]');
  if (input) input.value = JSON.stringify(productColors);
  const hint = document.getElementById("colors-hint");
  if (hint) hint.textContent = `${productColors.length} / ${MAX_PRODUCT_COLORS} colors`;
}

function renderProductColorsList() {
  const list = document.getElementById("product-colors-list");
  if (!list) return;

  list.innerHTML = productColors
    .map(
      (hex, index) => `
      <div class="color-swatch-edit" role="listitem">
        <span class="color-swatch color-swatch--edit" style="background-color: ${hex}" title="${escapeHtml(hex)}"></span>
        <button type="button" class="color-swatch-remove" data-index="${index}" aria-label="Remove color ${escapeHtml(hex)}">&times;</button>
      </div>
    `
    )
    .join("");

  syncColorsHidden();
}

function setProductColors(colors) {
  productColors = normalizeColors(colors);
  renderProductColorsList();
}

function addProductColor(hex) {
  const normalized = normalizeHexColor(hex);
  if (!normalized) {
    showToast("Invalid color", "error");
    return;
  }
  if (productColors.includes(normalized)) {
    showToast("Color already added", "error");
    return;
  }
  if (productColors.length >= MAX_PRODUCT_COLORS) {
    showToast(`Maximum ${MAX_PRODUCT_COLORS} colors allowed`, "error");
    return;
  }
  productColors.push(normalized);
  renderProductColorsList();
}

function setFormLoading(loading) {
  const form = document.getElementById("product-form");
  const overlay = document.getElementById("form-loading");
  form?.querySelectorAll("input, textarea, button").forEach((el) => {
    if (el.id !== "form-retry") el.disabled = loading;
  });
  setElementVisible(overlay, loading);
}

function showFormError(message) {
  const el = document.getElementById("form-error");
  if (!el) return;
  setElementVisible(el, true);
  el.querySelector("p").textContent = message;
}

function hideFormError() {
  setElementVisible(document.getElementById("form-error"), false);
}

function revokePendingBlobUrls() {
  pendingGalleryBlobUrls.forEach((url) => URL.revokeObjectURL(url));
  pendingGalleryBlobUrls = [];
}

function getGalleryCount() {
  const form = document.getElementById("product-form");
  const saved = parseGalleryUrls(form?.querySelector('[name="galleryUrls"]')?.value);
  return saved.length + pendingGalleryFiles.length;
}

function setGalleryUrls(urls) {
  const form = document.getElementById("product-form");
  if (!form) return;
  const list = urls.slice(0, MAX_GALLERY_IMAGES);
  form.querySelector('[name="galleryUrls"]').value = JSON.stringify(list);
  renderGalleryPreview();
}

function renderGalleryPreview() {
  const form = document.getElementById("product-form");
  const galleryPreview = document.getElementById("gallery-preview");
  if (!form || !galleryPreview) return;

  const savedUrls = parseGalleryUrls(form.querySelector('[name="galleryUrls"]').value);

  revokePendingBlobUrls();
  galleryPreview.innerHTML = "";

  savedUrls.forEach((url, index) => {
    renderImagePreview(galleryPreview, url, {
      removable: true,
      onRemove: () => {
        const next = parseGalleryUrls(form.querySelector('[name="galleryUrls"]').value);
        next.splice(index, 1);
        form.querySelector('[name="galleryUrls"]').value = JSON.stringify(next);
        renderGalleryPreview();
      },
    });
  });

  pendingGalleryFiles.forEach((file, index) => {
    const blobUrl = URL.createObjectURL(file);
    pendingGalleryBlobUrls.push(blobUrl);
    renderImagePreview(galleryPreview, blobUrl, {
      removable: true,
      onRemove: () => {
        pendingGalleryFiles.splice(index, 1);
        renderGalleryPreview();
      },
    });
  });

  syncGalleryHint(getGalleryCount());
}

function resetProductForm() {
  const form = document.getElementById("product-form");
  if (!form) return;
  form.reset();
  form.querySelector('[name="imageUrl"]').value = "";
  setProductColors([]);
  form.querySelector('[name="galleryUrls"]').value = "[]";
  pendingGalleryFiles = [];
  revokePendingBlobUrls();
  document.getElementById("main-image-preview").innerHTML = "";
  document.getElementById("gallery-preview").innerHTML = "";
  const galleryInput = form.querySelector('[name="galleryImages"]');
  if (galleryInput) galleryInput.value = "";
  syncGalleryHint(0);
  const v = categories[0]?.id || "";
  categoryDropdown?.setValue(v);
  const hiddenCat = document.querySelector('#product-form [name="categoryId"]');
  if (hiddenCat) hiddenCat.value = v;
  updateQuantityPreview();
}

async function uploadGalleryFiles(files, existingUrls) {
  const slotsLeft = MAX_GALLERY_IMAGES - existingUrls.length;
  const toUpload = Array.from(files).slice(0, slotsLeft);
  const uploaded = await Promise.all(toUpload.map((f) => uploadImage(f)));
  return [...existingUrls, ...uploaded].slice(0, MAX_GALLERY_IMAGES);
}

async function handleProductSubmit(e) {
  e.preventDefault();
  hideFormError();
  const form = e.target;
  const btn = form.querySelector('[type="submit"]');
  const mainFile = form.querySelector('[name="mainImage"]').files[0];
  const categoryId = categoryDropdown?.getValue() || form.categoryId?.value;

  if (!categoryId) {
    showToast("Please select a category", "error");
    return;
  }

  btn.disabled = true;
  setFormLoading(true);

  try {
    let imageUrl = form.querySelector('[name="imageUrl"]').value;
    if (mainFile) imageUrl = await uploadImage(mainFile);

    if (!imageUrl && !editingProductId) {
      showToast("Please add a main product image", "error");
      return;
    }

    let galleryUrls = parseGalleryUrls(form.querySelector('[name="galleryUrls"]').value);
    if (pendingGalleryFiles.length) {
      galleryUrls = await uploadGalleryFiles(pendingGalleryFiles, galleryUrls);
    }

    const data = {
      name: form.name.value.trim(),
      description: form.description.value.trim(),
      price: form.price.value,
      stock: form.stock.value,
      categoryId,
      packQuantity: Number(form.packQuantity.value),
      image: imageUrl,
      images: galleryUrls,
      colors: productColors,
    };

    if (editingProductId) {
      await updateProduct(editingProductId, data);
      showToast("Product updated");
    } else {
      await addProduct(data);
      showToast("Product added");
    }

    window.location.href = "admin-products.html";
  } catch (err) {
    console.error("[Admin] Save product failed:", err);
    showFormError("Failed to save product. Please try again.");
    showToast("Failed to save product", "error");
  } finally {
    btn.disabled = false;
    setFormLoading(false);
  }
}

function fillProductForm(prod) {
  const form = document.getElementById("product-form");
  if (!form) return;

  form.name.value = prod.name;
  form.description.value = prod.description || "";
  form.price.value = prod.price;
  form.stock.value = prod.stock;
  form.packQuantity.value = prod.packQuantity ?? "";
  form.querySelector('[name="imageUrl"]').value = prod.image || "";
  setProductColors(prod.colors || []);
  const catId = prod.categoryId || "";
  categoryDropdown?.setValue(catId);
  const hiddenCat = document.querySelector('#product-form [name="categoryId"]');
  if (hiddenCat) hiddenCat.value = catId;

  const mainPreview = document.getElementById("main-image-preview");
  mainPreview.innerHTML = "";
  if (prod.image) renderImagePreview(mainPreview, prod.image);

  pendingGalleryFiles = [];
  revokePendingBlobUrls();
  setGalleryUrls(Array.isArray(prod.images) ? prod.images : []);
  form.querySelector('[name="galleryImages"]').value = "";
  form.querySelector('[type="submit"]').textContent = "Update Product";
  document.getElementById("prod-form-title").textContent = "Edit Product";
  updateQuantityPreview();
}

function setupProductFormListeners() {
  const form = document.getElementById("product-form");
  if (!form) return;

  ["packQuantity", "price"].forEach((name) => {
    form[name]?.addEventListener("input", updateQuantityPreview);
  });

  document.getElementById("prod-add-color")?.addEventListener("click", () => {
    const picker = document.getElementById("prod-color-picker");
    if (picker?.value) addProductColor(picker.value);
  });

  document.getElementById("product-colors-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".color-swatch-remove");
    if (!btn) return;
    const index = Number(btn.dataset.index);
    if (!Number.isNaN(index)) {
      productColors.splice(index, 1);
      renderProductColorsList();
    }
  });

  form.querySelector('[name="mainImage"]')?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById("main-image-preview");
    preview.innerHTML = "";
    if (file) renderImagePreview(preview, URL.createObjectURL(file));
    else if (form.querySelector('[name="imageUrl"]').value) {
      renderImagePreview(preview, form.querySelector('[name="imageUrl"]').value);
    }
  });

  form.querySelector('[name="galleryImages"]')?.addEventListener("change", (e) => {
    const input = e.target;
    const picked = Array.from(input.files || []);
    if (!picked.length) return;

    const slotsLeft = MAX_GALLERY_IMAGES - getGalleryCount();
    if (slotsLeft <= 0) {
      showToast(`Maximum ${MAX_GALLERY_IMAGES} gallery images allowed`, "error");
      input.value = "";
      return;
    }

    const toAdd = picked.slice(0, slotsLeft);
    if (toAdd.length < picked.length) {
      showToast(`Only ${slotsLeft} more image(s) can be added (max ${MAX_GALLERY_IMAGES})`, "error");
    }

    pendingGalleryFiles.push(...toAdd);
    input.value = "";
    renderGalleryPreview();
  });
}

async function initFormPage() {
  const params = new URLSearchParams(window.location.search);
  editingProductId = params.get("id");

  setFormLoading(true);
  hideFormError();

  try {
    categories = await fetchCategories();

    if (!categories.length) {
      showFormError(ADMIN_MESSAGES.categoriesEmpty);
      document.getElementById("product-form")?.setAttribute("hidden", "");
      setFormLoading(false);
      return;
    }

    const catOptions = categories.map((c) => ({ value: c.id, label: c.name }));
    const hiddenCat = document.querySelector('#product-form [name="categoryId"]');
    categoryDropdown = initCustomDropdown(
      document.getElementById("product-category-dropdown"),
      catOptions,
      {
        value: categories[0].id,
        placeholder: "Select category",
        onChange: (value) => {
          if (hiddenCat) hiddenCat.value = value;
        },
      }
    );
    if (hiddenCat) hiddenCat.value = categoryDropdown.getValue();

    if (editingProductId) {
      setTopbarTitle("Edit Product", {
        backHref: "admin-products.html",
        actionHtml: "",
      });
      const prod = await getProductById(editingProductId);
      if (!prod) {
        showFormError("Product not found.");
        showToast("Product not found", "error");
        return;
      }
      fillProductForm(prod);
    } else {
      setTopbarTitle("Add Product", {
        backHref: "admin-products.html",
        actionHtml: "",
      });
      resetProductForm();
      document.getElementById("prod-form-title").textContent = "Add Product";
    }
  } catch (err) {
    console.error("[Admin] Form init failed:", err);
    showFormError(ADMIN_MESSAGES.productsError);
    showToast(ADMIN_MESSAGES.productsError, "error");
  } finally {
    setFormLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminLayout("products");
  setupProductFormListeners();
  document.getElementById("product-form")?.addEventListener("submit", handleProductSubmit);
  document.getElementById("form-retry")?.addEventListener("click", initFormPage);
  initFormPage();
});
