/* ============================================================================
   tr1stan.de — behaviour
   Progressive enhancement only. Every block guards its own elements so this
   file runs unchanged on the legal pages and on 404. Nothing here is required
   to read or operate the site.
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
     Pause the ambient drift whenever the tab is not being looked at
     ------------------------------------------------------------------------ */
  (function pauseWhenHidden() {
    function sync() { root.classList.toggle("is-hidden", document.hidden); }
    document.addEventListener("visibilitychange", sync);
    sync();
  })();

  /* --------------------------------------------------------------------------
     Mobile navigation (legal pages and 404 only — the home page has no nav)
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
     Scroll reveal
     ------------------------------------------------------------------------ */
  (function reveal() {
    var targets = $$("[data-reveal]");
    if (!targets.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });

    targets.forEach(function (el) { io.observe(el); });
  })();

  /* --------------------------------------------------------------------------
     Custom cursor

     Deliberately narrow entry conditions: a real hovering pointer, no reduced
     motion request, and a browser that can run this at all. Only once every
     condition holds does `has-cursor` go on the root element, and only that
     class hides the native pointer. Any failure above leaves the native
     cursor untouched.
     ------------------------------------------------------------------------ */
  (function customCursor() {
    if (reduceMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (!window.requestAnimationFrame) return;

    var dot = document.createElement("div");
    var ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    dot.setAttribute("aria-hidden", "true");
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var rx = tx, ry = ty;
    var running = false;
    var armed = false;   // stay invisible until the pointer has actually moved

    function frame() {
      // ring trails the pointer; the crosshair itself stays exact
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.transform = "translate3d(" + rx.toFixed(2) + "px," + ry.toFixed(2) + "px,0)";
      dot.style.transform = "translate3d(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px,0)";

      if (Math.abs(tx - rx) < 0.1 && Math.abs(ty - ry) < 0.1) { running = false; return; }
      window.requestAnimationFrame(frame);
    }

    function kick() {
      if (running || document.hidden) return;
      running = true;
      window.requestAnimationFrame(frame);
    }

    document.addEventListener("mousemove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
      if (!armed) {
        // first real movement: place the ring under the pointer, then reveal
        armed = true;
        rx = tx;
        ry = ty;
        ring.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
        root.classList.add("has-cursor");
      }
      kick();
    }, { passive: true });

    // state change over anything the visitor can actually act on
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest("a, button, [role='button']")) root.classList.add("cursor-hot");
    }, { passive: true });

    document.addEventListener("mouseout", function (e) {
      if (e.target.closest("a, button, [role='button']")) root.classList.remove("cursor-hot");
    }, { passive: true });

    document.addEventListener("mouseleave", function () {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    });
    document.addEventListener("mouseenter", function () {
      dot.style.opacity = "";
      ring.style.opacity = "";
    });

    document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });
  })();
})();
