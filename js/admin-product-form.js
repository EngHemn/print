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
import {
  MAX_GALLERY_IMAGES,
  parseGalleryUrls,
  renderImagePreview,
  updateQuantityPreview,
  syncGalleryHint,
} from "./admin-product-utils.js";

let editingProductId = null;
let categoryDropdown = null;
let categories = [];

function setFormLoading(loading) {
  const form = document.getElementById("product-form");
  const overlay = document.getElementById("form-loading");
  form?.querySelectorAll("input, textarea, button").forEach((el) => {
    if (el.id !== "form-retry") el.disabled = loading;
  });
  overlay?.toggleAttribute("hidden", !loading);
}

function showFormError(message) {
  const el = document.getElementById("form-error");
  if (!el) return;
  el.hidden = false;
  el.querySelector("p").textContent = message;
}

function hideFormError() {
  document.getElementById("form-error")?.setAttribute("hidden", "");
}

function setGalleryUrls(urls) {
  const form = document.getElementById("product-form");
  if (!form) return;
  const list = urls.slice(0, MAX_GALLERY_IMAGES);
  form.querySelector('[name="galleryUrls"]').value = JSON.stringify(list);
  syncGalleryHint(list.length);

  const galleryPreview = document.getElementById("gallery-preview");
  galleryPreview.innerHTML = "";
  list.forEach((url, index) => {
    renderImagePreview(galleryPreview, url, {
      removable: true,
      onRemove: () => {
        const next = parseGalleryUrls(form.querySelector('[name="galleryUrls"]').value);
        next.splice(index, 1);
        setGalleryUrls(next);
      },
    });
  });
}

function resetProductForm() {
  const form = document.getElementById("product-form");
  if (!form) return;
  form.reset();
  form.packUnit.value = "bag";
  form.querySelector('[name="imageUrl"]').value = "";
  form.querySelector('[name="galleryUrls"]').value = "[]";
  document.getElementById("main-image-preview").innerHTML = "";
  document.getElementById("gallery-preview").innerHTML = "";
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
  const galleryFiles = form.querySelector('[name="galleryImages"]').files;
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
    if (galleryFiles?.length) {
      galleryUrls = await uploadGalleryFiles(galleryFiles, galleryUrls);
    }

    const data = {
      name: form.name.value.trim(),
      description: form.description.value.trim(),
      price: form.price.value,
      stock: form.stock.value,
      categoryId,
      packQuantity: Number(form.packQuantity.value),
      packUnit: form.packUnit.value.trim() || "bag",
      image: imageUrl,
      images: galleryUrls,
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
  form.packUnit.value = prod.packUnit || "bag";
  form.querySelector('[name="imageUrl"]').value = prod.image || "";
  const catId = prod.categoryId || "";
  categoryDropdown?.setValue(catId);
  const hiddenCat = document.querySelector('#product-form [name="categoryId"]');
  if (hiddenCat) hiddenCat.value = catId;

  const mainPreview = document.getElementById("main-image-preview");
  mainPreview.innerHTML = "";
  if (prod.image) renderImagePreview(mainPreview, prod.image);

  setGalleryUrls(Array.isArray(prod.images) ? prod.images : []);
  form.querySelector('[type="submit"]').textContent = "Update Product";
  document.getElementById("prod-form-title").textContent = "Edit Product";
  updateQuantityPreview();
}

function setupProductFormListeners() {
  const form = document.getElementById("product-form");
  if (!form) return;

  ["packQuantity", "packUnit", "price"].forEach((name) => {
    form[name]?.addEventListener("input", updateQuantityPreview);
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
    const existing = parseGalleryUrls(form.querySelector('[name="galleryUrls"]').value);
    const newFiles = Array.from(e.target.files || []);
    const total = existing.length + newFiles.length;

    if (total > MAX_GALLERY_IMAGES) {
      showToast(`Maximum ${MAX_GALLERY_IMAGES} gallery images allowed`, "error");
      e.target.value = "";
      return;
    }

    setGalleryUrls(existing);
    const preview = document.getElementById("gallery-preview");
    newFiles.forEach((file) => {
      renderImagePreview(preview, URL.createObjectURL(file), { removable: false });
    });
    syncGalleryHint(total);
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
