/**
 * Show/hide admin panel state blocks. Uses hidden + .is-hidden so loading always clears.
 */
export function setElementVisible(el, visible) {
  if (!el) return;
  if (visible) {
    el.removeAttribute("hidden");
    el.classList.remove("is-hidden");
  } else {
    el.setAttribute("hidden", "");
    el.classList.add("is-hidden");
  }
}

export function applyPanelState(elements, state) {
  const { loading, error, empty, content } = elements;
  setElementVisible(loading, state === "loading");
  setElementVisible(error, state === "error");
  setElementVisible(empty, state === "empty");
  setElementVisible(content, state === "data");
}
