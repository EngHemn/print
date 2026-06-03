import { initLayout, showToast } from "./cart.js";
import { initAllAnimations } from "./animations.js";
import { addContact } from "./firestore.js";

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type="submit"]');

  const data = {
    fullName: form.fullName.value.trim(),
    email: form.email.value.trim(),
    message: form.message.value.trim(),
  };

  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    await addContact(data);
    showToast("Message sent successfully!");
    form.reset();
  } catch {
    showToast("Failed to send message. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Send Message";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initLayout("contact");
  initAllAnimations();
  document.getElementById("contact-form")?.addEventListener("submit", handleSubmit);
});
