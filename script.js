const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const year = qs("#year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const clock = qs("#clock");
const updateClock = () => {
  if (!clock) return;
  clock.textContent = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
};
updateClock();
window.setInterval(updateClock, 1000);

const header = qs("[data-header]");
const setHeaderState = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 12);
};
setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

const navToggle = qs("#navToggle");
const siteNav = qs("#siteNav");
const closeNav = () => {
  if (!navToggle || !siteNav) return;
  navToggle.setAttribute("aria-expanded", "false");
  siteNav.classList.remove("is-open");
};

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    siteNav.classList.toggle("is-open", !isOpen);
  });

  qsa("a", siteNav).forEach((link) => {
    link.addEventListener("click", closeNav);
  });
}

const palette = qs("#commandPalette");
const openPalette = qs("#openPalette");
const closePalette = qs("#closePalette");
const paletteStatus = qs("#paletteStatus");

const showPalette = () => {
  if (!palette) return;
  if (typeof palette.showModal === "function") {
    if (!palette.open) palette.showModal();
  } else {
    palette.setAttribute("open", "");
  }
  paletteStatus && (paletteStatus.textContent = "Command Deck aktiv");
  qs(".palette-links a", palette)?.focus();
};

const hidePalette = () => {
  if (!palette) return;
  if (palette.open && typeof palette.close === "function") {
    palette.close();
  } else {
    palette.removeAttribute("open");
  }
  paletteStatus && (paletteStatus.textContent = "Bereit fuer Navigation");
  openPalette?.focus({ preventScroll: true });
};

openPalette?.addEventListener("click", showPalette);
closePalette?.addEventListener("click", hidePalette);
palette?.addEventListener("click", (event) => {
  if (event.target === palette) hidePalette();
});
qsa(".palette-links a").forEach((link) => {
  link.addEventListener("click", hidePalette);
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === "k") {
    event.preventDefault();
    showPalette();
  }
  if (event.key === "Escape") {
    closeNav();
    hidePalette();
  }
});

const copyButton = qs("#copyMail");
const copyHint = qs("#copyHint");
const fallbackCopy = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-999px";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  return copied;
};

copyButton?.addEventListener("click", async () => {
  const mail = copyButton.dataset.copy || "chef@tr1stan.de";
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(mail);
    } else if (!fallbackCopy(mail)) {
      throw new Error("copy failed");
    }

    copyButton.textContent = "Kopiert";
    copyHint && (copyHint.textContent = `${mail} liegt in der Zwischenablage.`);
    window.setTimeout(() => {
      copyButton.textContent = "Mail kopieren";
      copyHint && (copyHint.textContent = "Kopieren nutzt die Zwischenablage deines Browsers.");
    }, 2200);
  } catch {
    copyHint && (copyHint.textContent = "Kopieren ging nicht. Die Mail-Adresse kann manuell markiert werden.");
  }
});

const revealItems = qsa("[data-reveal]");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const navLinks = qsa(".site-nav a[href^='#']");
const sections = navLinks
  .map((link) => qs(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window && sections.length) {
  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-42% 0px -48% 0px", threshold: 0.01 });

  sections.forEach((section) => activeObserver.observe(section));
}

const hoverPanels = qsa(".identity-manifest div, .module-row, .mission-card, .contact-panel, .legal-panel");
hoverPanels.forEach((panel) => {
  panel.addEventListener("pointermove", (event) => {
    const rect = panel.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    panel.style.setProperty("--mx", `${x}%`);
    panel.style.setProperty("--my", `${y}%`);
  });
});

const canvas = qs("#gridCanvas");
const ctx = canvas?.getContext("2d");
let drops = [];
let rafId = 0;
let running = false;
const glyphs = "01<>[]{}#:/TR1STAN";

const resizeCanvas = () => {
  if (!canvas || !ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const columnCount = Math.max(12, Math.floor(window.innerWidth / 30));
  drops = Array.from({ length: columnCount }, () => Math.random() * window.innerHeight);
};

const drawCanvas = () => {
  if (!canvas || !ctx || !running) return;
  ctx.fillStyle = "rgba(5, 7, 13, 0.12)";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.font = "700 12px ui-monospace, SFMono-Regular, Consolas, monospace";

  drops.forEach((y, index) => {
    const x = index * 30;
    const char = glyphs[Math.floor(Math.random() * glyphs.length)];
    ctx.fillStyle = Math.random() > 0.96 ? "rgba(111, 255, 210, 0.82)" : "rgba(0, 229, 255, 0.18)";
    ctx.fillText(char, x, y);
    drops[index] = y > window.innerHeight + 120 ? Math.random() * -180 : y + 13;
  });

  rafId = window.requestAnimationFrame(drawCanvas);
};

const startCanvas = () => {
  if (!canvas || !ctx || prefersReducedMotion || window.innerWidth < 540) return;
  if (running) return;
  running = true;
  resizeCanvas();
  drawCanvas();
};

const stopCanvas = () => {
  running = false;
  if (rafId) window.cancelAnimationFrame(rafId);
};

if (canvas && ctx) {
  startCanvas();
  window.addEventListener("resize", () => {
    if (window.innerWidth < 540) {
      stopCanvas();
      return;
    }
    resizeCanvas();
    startCanvas();
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopCanvas();
    else startCanvas();
  });
}
