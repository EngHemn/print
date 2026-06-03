import { escapeHtml } from "./config.js";

/**
 * @param {HTMLElement} container
 * @param {{ value: string, label: string }[]} options
 * @param {{ value?: string, placeholder?: string, onChange?: (value: string) => void }} config
 */
export function initCustomDropdown(container, options, config = {}) {
  if (!container) return null;

  const placeholder = config.placeholder || "Select…";
  let selectedValue = config.value ?? "";

  const selected = options.find((o) => o.value === selectedValue);
  const labelText = selected?.label || placeholder;

  container.classList.add("custom-dropdown");
  container.innerHTML = `
    <button type="button" class="custom-dropdown-toggle" aria-haspopup="listbox" aria-expanded="false">
      <span class="custom-dropdown-label">${escapeHtml(labelText)}</span>
      <span class="custom-dropdown-chevron" aria-hidden="true"></span>
    </button>
    <input type="hidden" class="custom-dropdown-value" value="${escapeHtml(selectedValue)}" />
    <ul class="custom-dropdown-menu" role="listbox" hidden>
      ${options
        .map(
          (o) => `
        <li>
          <button type="button" class="custom-dropdown-option${o.value === selectedValue ? " selected" : ""}" role="option" data-value="${escapeHtml(o.value)}" aria-selected="${o.value === selectedValue}">
            ${escapeHtml(o.label)}
          </button>
        </li>
      `
        )
        .join("")}
    </ul>
  `;

  const toggle = container.querySelector(".custom-dropdown-toggle");
  const menu = container.querySelector(".custom-dropdown-menu");
  const hidden = container.querySelector(".custom-dropdown-value");
  const labelEl = container.querySelector(".custom-dropdown-label");

  function setValue(value) {
    selectedValue = value;
    hidden.value = value;
    const opt = options.find((o) => o.value === value);
    labelEl.textContent = opt?.label || placeholder;
    container.querySelectorAll(".custom-dropdown-option").forEach((btn) => {
      const active = btn.dataset.value === value;
      btn.classList.toggle("selected", active);
      btn.setAttribute("aria-selected", active);
    });
    config.onChange?.(value);
  }

  function close() {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    container.classList.remove("open");
  }

  function open() {
    document.querySelectorAll(".custom-dropdown.open").forEach((dd) => {
      if (dd !== container) {
        dd.classList.remove("open");
        dd.querySelector(".custom-dropdown-menu")?.setAttribute("hidden", "");
        dd.querySelector(".custom-dropdown-toggle")?.setAttribute("aria-expanded", "false");
      }
    });
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    container.classList.add("open");
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (container.classList.contains("open")) close();
    else open();
  });

  container.querySelectorAll(".custom-dropdown-option").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setValue(btn.dataset.value);
      close();
    });
  });

  document.addEventListener("click", close);

  return { getValue: () => hidden.value, setValue, close };
}
