export const COMPANY = {
  name: "Shopping Bag",
  location: "Erbil, Iraq",
  phone: "+964 751 044 5798",
  email: "Abdulrahmansherzad14@gmail.com",
  social: {
    facebook: "https://facebook.com",
    whatsapp: "https://wa.me/9647510445798",
    telegram: "https://t.me",
    instagram: "https://instagram.com",
  },
};

export const ADMIN_PASSWORD = "amena";

export function formatPrice(price) {
  return new Intl.NumberFormat("en-IQ", {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
}

export function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
