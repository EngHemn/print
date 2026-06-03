export const MESSAGES = {
  loading: "Loading...",
  categoriesEmpty: "No categories available yet.",
  productsEmpty: "No products available yet.",
  productsNotFound: "No products match your search or filter.",
  categoriesError: "Could not load categories. Please refresh the page.",
  productsError: "Could not load products. Please refresh the page.",
};

export function showLoading(container, message = MESSAGES.loading) {
  if (!container) return;
  container.innerHTML = `
    <div class="state-message loading-state" role="status">
      <span class="loading-spinner" aria-hidden="true"></span>
      <p>${message}</p>
    </div>
  `;
}

export function showEmpty(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="state-message empty-state" role="status">
      <p>${message}</p>
    </div>
  `;
}

export function showError(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="state-message error-state" role="alert">
      <p>${message}</p>
    </div>
  `;
}
