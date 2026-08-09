/* ============================================================================
   tr1stan.de — behaviour
   Progressive enhancement only. Every block guards its own elements, so the
   same file runs unchanged on the legal pages and on 404.
   Nothing here animates on its own: reveals are scroll-triggered, the progress
   hairline follows scroll position, everything else reacts to input.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function announce(msg) {
    var live = $("#liveStatus");
    if (!live) return;
    live.textContent = "";
    window.setTimeout(function () { live.textContent = msg; }, 40);
  }

  /* --------------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------------ */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* --------------------------------------------------------------------------
     Keyboard hint: show the platform's real modifier
     ------------------------------------------------------------------------ */
  if (isApple) {
    $$("[data-kbd-hint]").forEach(function (el) { el.textContent = "⌘ K"; });
  }

  /* --------------------------------------------------------------------------
     Mobile navigation
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

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

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

    // Leaving the mobile breakpoint must not strand an open panel.
    var wide = window.matchMedia("(min-width: 861px)");
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
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }

    buttons.forEach(function (btn) {
      var out = $("[data-copy-text]", btn) || btn;
      var idle = btn.getAttribute("data-label") || out.textContent;
      var timer = null;

      function feedback(ok) {
        out.textContent = ok ? "kopiert" : "fehlgeschlagen";
        announce(ok ? "Mail-Adresse kopiert." : "Kopieren nicht möglich.");
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
     Command palette
     ------------------------------------------------------------------------ */
  (function palette() {
    var dlg = $("#commandPalette");
    var open = $("#openPalette");
    var close = $("#closePalette");
    var input = $("#cmdInput");
    var list = $("#cmdList");
    var empty = $("#cmdEmpty");
    if (!dlg || !input || !list || typeof dlg.showModal !== "function") return;

    var items = $$(".cmd-item", list);
    var visible = items.slice();
    var index = 0;

    function paint() {
      items.forEach(function (el) { el.removeAttribute("data-active"); });
      var el = visible[index];
      if (el) {
        el.setAttribute("data-active", "true");
        if (el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
      }
    }

    function filter(q) {
      var needle = q.trim().toLowerCase();
      visible = items.filter(function (el) {
        var hay = (el.textContent + " " + (el.getAttribute("data-k") || "")).toLowerCase();
        var hit = !needle || hay.indexOf(needle) !== -1;
        el.hidden = !hit;
        return hit;
      });
      index = 0;
      if (empty) empty.hidden = visible.length > 0;
      paint();
    }

    function show() {
      if (dlg.open) return;
      dlg.showModal();
      input.value = "";
      filter("");
      input.focus();
    }

    function hide() { if (dlg.open) dlg.close(); }

    if (open) open.addEventListener("click", show);
    if (close) close.addEventListener("click", hide);

    input.addEventListener("input", function () { filter(input.value); });

    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!visible.length) return;
        index = (index + (e.key === "ArrowDown" ? 1 : -1) + visible.length) % visible.length;
        paint();
      } else if (e.key === "Enter") {
        var target = visible[index];
        if (target) { e.preventDefault(); hide(); target.click(); }
      }
    });

    // Click on the backdrop closes.
    dlg.addEventListener("click", function (e) { if (e.target === dlg) hide(); });
    list.addEventListener("click", function (e) { if (e.target.closest("a")) hide(); });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (dlg.open) hide(); else show();
      }
    });
  })();

  /* --------------------------------------------------------------------------
     Scroll reveal — the only entrance motion
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
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });
  })();

  /* --------------------------------------------------------------------------
     Scroll progress hairline + active section
     ------------------------------------------------------------------------ */
  (function scrollState() {
    var bar = $("#scrollProgress");
    var sections = $$("main section[id]");
    var links = $$('.nav a[href^="#"], .rail a[href^="#"]');
    if (!bar && !sections.length) return;

    var ticking = false;

    function update() {
      ticking = false;
      if (bar) {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    if (!sections.length || !links.length || !("IntersectionObserver" in window)) return;

    var current = "";
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        if (id === current) return;
        current = id;
        links.forEach(function (a) {
          var match = a.getAttribute("href") === "#" + id;
          if (match) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    sections.forEach(function (s) { io.observe(s); });
  })();
})();
