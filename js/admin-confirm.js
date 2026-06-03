function ensureConfirmMarkup() {
  if (document.getElementById("admin-confirm")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="admin-confirm" id="admin-confirm" aria-hidden="true" role="alertdialog" aria-modal="true">
      <div class="admin-confirm-overlay" id="admin-confirm-overlay"></div>
      <div class="admin-confirm-box glass-card">
        <h4 class="admin-confirm-title" id="admin-confirm-title">Confirm</h4>
        <p class="admin-confirm-message" id="admin-confirm-message"></p>
        <div class="admin-confirm-actions">
          <button type="button" class="btn btn-outline" id="admin-confirm-cancel">Cancel</button>
          <button type="button" class="btn btn-danger btn-3d" id="admin-confirm-ok">Delete</button>
        </div>
      </div>
    </div>
  `
  );

  function close() {
    const el = document.getElementById("admin-confirm");
    el?.classList.remove("open");
    el?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }

  window.__adminConfirmClose = close;
}

/**
 * @param {{ title: string, message: string, confirmLabel?: string, danger?: boolean }} options
 * @returns {Promise<boolean>}
 */
export function showConfirm({
  title = "Are you sure?",
  message = "",
  confirmLabel = "Delete",
  danger = true,
} = {}) {
  ensureConfirmMarkup();

  const el = document.getElementById("admin-confirm");
  document.getElementById("admin-confirm-title").textContent = title;
  document.getElementById("admin-confirm-message").textContent = message;

  const okBtn = document.getElementById("admin-confirm-ok");
  okBtn.textContent = confirmLabel;
  okBtn.className = danger ? "btn btn-danger btn-3d" : "btn btn-primary btn-3d";

  return new Promise((resolve) => {
    const cancelBtn = document.getElementById("admin-confirm-cancel");
    const overlay = document.getElementById("admin-confirm-overlay");

    function finish(result) {
      okBtn.removeEventListener("click", onOk);
      cancelBtn?.removeEventListener("click", onCancel);
      overlay?.removeEventListener("click", onCancel);
      window.__adminConfirmClose?.();
      resolve(result);
    }

    function onOk() {
      finish(true);
    }
    function onCancel() {
      finish(false);
    }

    okBtn.addEventListener("click", onOk);
    cancelBtn?.addEventListener("click", onCancel);
    overlay?.addEventListener("click", onCancel);
    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  });
}
