export function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  document
    .querySelectorAll(
      ".fade-in, .slide-up, .slide-left, .slide-right, .scale-in, .stagger-children"
    )
    .forEach((el) => observer.observe(el));
}

export function initParallax() {
  const hero = document.querySelector(".hero-image-wrap");
  if (!hero) return;

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY * 0.15;
      hero.style.transform = `translateY(${y}px)`;
    },
    { passive: true }
  );
}

export function initFloatingElements() {
  document.querySelectorAll(".float").forEach((el, i) => {
    el.style.animationDelay = `${i * 0.4}s`;
  });
}

export function initPageTransition() {
  document.body.classList.add("page-loaded");
}

export function initGradientText() {
  document.querySelectorAll(".color-shift").forEach((el) => {
    el.setAttribute("data-text", el.textContent);
  });
}

export function initAllAnimations() {
  initScrollAnimations();
  initParallax();
  initFloatingElements();
  initPageTransition();
  initGradientText();
}
