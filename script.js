const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const scrollbar = document.getElementById("scrollbar");
const setScroll = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
  if (scrollbar) scrollbar.style.width = `${progress}%`;
};
window.addEventListener("scroll", setScroll, { passive: true });
setScroll();

const glow = document.getElementById("cursorGlow");
if (glow && window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("pointermove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  });
}

const menuButton = document.getElementById("menuButton");
const mobileNav = document.getElementById("mobileNav");
if (menuButton && mobileNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

const revealElements = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

revealElements.forEach((element) => observer.observe(element));

document.querySelectorAll(".panel, .skill-card, .project-card, .lab-card, .contact-shell").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mx", `${x}%`);
    card.style.setProperty("--my", `${y}%`);
  });
});

const copyButton = document.getElementById("copyMail");
const copyHint = document.getElementById("copyHint");
if (copyButton && copyHint) {
  copyButton.addEventListener("click", async () => {
    const mail = "chef@tr1stan.de";
    try {
      await navigator.clipboard.writeText(mail);
      copyHint.textContent = "Kopiert. chef@tr1stan.de liegt in deiner Zwischenablage.";
      copyButton.textContent = "kopiert";
      setTimeout(() => {
        copyButton.textContent = "kopieren";
        copyHint.textContent = "Klick auf „kopieren“, dann ist die Mail in der Zwischenablage.";
      }, 2200);
    } catch {
      copyHint.textContent = "Kopieren ging nicht automatisch. Markier die Mail manuell.";
    }
  });
}
