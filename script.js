/* ============================================================================
   tr1stan.de — behaviour
   Progressive enhancement only. Every block guards its own elements, so this
   file runs unchanged on the legal pages and on 404.

   The reveal effects deliberately set their start state from here, never from
   the stylesheet: if this script does not run, nothing is hidden and the page
   is simply fully visible.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* --------------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------------ */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* --------------------------------------------------------------------------
     Freeze the scene while the tab is in the background
     ------------------------------------------------------------------------ */
  (function pauseWhenHidden() {
    function sync() { root.classList.toggle("is-hidden", document.hidden); }
    document.addEventListener("visibilitychange", sync);
    sync();
  })();

  /* --------------------------------------------------------------------------
     Mobile navigation (legal pages and 404 — the home page has no nav)
     ------------------------------------------------------------------------ */
  (function mobileNav() {
    var toggle = $("#navToggle");
    var nav = $("#siteNav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Navigation schließen" : "Navigation öffnen");
      if (open) nav.setAttribute("data-open", "true");
      else nav.removeAttribute("data-open");
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });

    var wide = window.matchMedia("(min-width: 761px)");
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener("change", onChange);
    else if (wide.addListener) wide.addListener(onChange);
  })();

  /* --------------------------------------------------------------------------
     Copy the mail address
     ------------------------------------------------------------------------ */
  (function copyMail() {
    var buttons = $$(".copy[data-copy]");
    if (!buttons.length) return;

    function legacyCopy(text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var done = false;
      try { done = document.execCommand("copy"); } catch (err) { done = false; }
      document.body.removeChild(ta);
      return done;
    }

    buttons.forEach(function (btn) {
      var out = $("[data-copy-text]", btn) || btn;
      var idle = btn.getAttribute("data-label") || out.textContent;
      var timer = null;

      function feedback(done) {
        out.textContent = done ? "kopiert" : "fehlgeschlagen";
        var live = $("#liveStatus");
        if (live) {
          live.textContent = "";
          window.setTimeout(function () {
            live.textContent = done ? "Mail-Adresse kopiert." : "Kopieren nicht möglich.";
          }, 40);
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { out.textContent = idle; }, 2000);
      }

      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy") || "";
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(
            function () { feedback(true); },
            function () { feedback(legacyCopy(text)); }
          );
        } else {
          feedback(legacyCopy(text));
        }
      });
    });
  })();

  /* --------------------------------------------------------------------------
     Scroll-coupled scene

     Writes the scroll offset into a single custom property; the stylesheet
     decides what moves and by how much. Only transforms read it, so this
     never triggers layout. Off on phones — the scene is not fixed there — and
     off entirely under reduced motion.
     ------------------------------------------------------------------------ */
  (function scrollScene() {
    if (reduceMotion) return;
    if (!window.matchMedia("(min-width: 761px)").matches) return;

    var ticking = false;
    var last = -1;

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      if (y === last) return;
      last = y;
      root.style.setProperty("--sc", y + "px");
    }

    function onScroll() {
      if (ticking || document.hidden) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) onScroll(); });
    update();
  })();

  /* --------------------------------------------------------------------------
     Scroll reveals

     Three kinds, one mechanism:
       [data-reveal]   blocks fade in and rise slightly
       [data-draw]     neon rules draw themselves in from the left
       [data-stagger]  children of a list come in one after another

     Each element is armed here — inline start state, transitions suppressed
     for that one frame — and released when it first comes into view. Under
     reduced motion nothing is armed at all.
     ------------------------------------------------------------------------ */
  (function reveals() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var armed = [];

    function arm(el, styles, cls, delay) {
      el.style.transition = "none";
      for (var k in styles) el.style[k] = styles[k];
      armed.push({ el: el, cls: cls, delay: delay || 0 });
    }

    $$("[data-reveal]").forEach(function (el) {
      arm(el, { opacity: "0", transform: "translateY(16px)" }, "will-reveal");
    });

    $$("[data-draw]").forEach(function (el) {
      arm(el, { transform: "scaleX(0)" }, "will-draw");
    });

    $$("[data-stagger]").forEach(function (list) {
      Array.prototype.forEach.call(list.children, function (child, i) {
        arm(child, { opacity: "0", transform: "translateY(10px)" },
            "will-reveal", Math.min(i * 60, 300));
      });
    });

    if (!armed.length) return;

    // One forced reflow, so the start state is the value the transition
    // animates away from rather than something the browser skips over.
    void document.body.offsetWidth;
    armed.forEach(function (a) {
      a.el.style.transition = "";
      a.el.classList.add(a.cls);
      if (a.delay) a.el.style.transitionDelay = a.delay + "ms";
    });

    /* Release when an element comes into view. An observer alone is not
       enough: jumping straight to the bottom never changes the state of the
       blocks that were skipped over, so they would stay invisible forever.
       A cheap scroll sweep catches exactly those. */
    var pending = armed.map(function (a) { return a.el; });

    function release(el) {
      var i = pending.indexOf(el);
      if (i === -1) return;
      pending.splice(i, 1);
      el.style.opacity = "";
      el.style.transform = "";
      io.unobserve(el);
      if (!pending.length) teardown();
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) release(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    var ticking = false;
    function sweep() {
      ticking = false;
      var edge = window.innerHeight * 0.92;
      pending.slice().forEach(function (el) {
        if (el.getBoundingClientRect().top < edge) release(el);
      });
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sweep);
    }
    function teardown() {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }

    armed.forEach(function (a) { io.observe(a.el); });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  })();
})();
